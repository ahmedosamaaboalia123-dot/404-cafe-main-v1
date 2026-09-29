import 'dotenv/config';
import process from 'node:process';
import console from 'node:console';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { EJSON } from 'bson';
import mongoose from 'mongoose';
import { add, compare, subtract, toApiString, toDecimal128 } from '../src/platform/database/decimal.js';
import { rebuildDrawerShift } from '../src/modules/drawer/drawer-supplier.service.js';
import { CashDrawerShift, CashDrawerTransaction } from '../src/modules/drawer/drawer.models.js';
import { OrderPayment } from '../src/modules/payments/payment.models.js';
import { Order } from '../src/modules/orders/order.models.js';

// Self-contained copy of the retired cash-refund schema: the feature was
// removed from src/, so this script carries the exact shape it needs to read
// (and delete) the historical documents. Explicit collection name guarantees
// it targets 'cashrefunds' regardless of pluralization rules.
const refundSchema = new mongoose.Schema(
  {
    paymentId: { type: mongoose.Schema.Types.ObjectId, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true },
    refundNo: { type: String, required: true, unique: true },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    status: { type: String, enum: ['COMPLETED', 'PENDING_CASH_REFUND'], required: true },
    reason: { type: String, required: true },
    drawerTransactionId: mongoose.Schema.Types.ObjectId,
    requestedAt: { type: Date, required: true, default: Date.now },
    requestedBy: mongoose.Schema.Types.ObjectId,
    completedAt: Date,
    operationRequestId: mongoose.Schema.Types.ObjectId
  },
  { timestamps: true, versionKey: 'version', optimisticConcurrency: true }
);
const CashRefund =
  mongoose.models.CashRefund ?? mongoose.model('CashRefund', refundSchema, 'cashrefunds');

// Removes the cash-refund feature data completely:
// - deletes every CashRefund document (pending ones have no side effects),
// - deletes the drawer OUT movements created for completed refunds and rebuilds
//   the affected shifts from the remaining movements,
// - zeroes refundedAmount on payments/orders and restores their statuses.
//
// DRY RUN by default. To apply: --apply --database=<name> --i-have-backup
// with ALLOW_DESTRUCTIVE_MIGRATIONS=true in the environment.
const apply = process.argv.includes('--apply');
const backupConfirmed = process.argv.includes('--i-have-backup');
if (apply && process.env.ALLOW_DESTRUCTIVE_MIGRATIONS !== 'true')
  throw new Error('Refusing to apply without ALLOW_DESTRUCTIVE_MIGRATIONS=true');
const expectedDb = process.argv.find((arg) => arg.startsWith('--database='))?.slice(11);
if (!expectedDb) throw new Error('Explicit --database is required');
if (apply && !backupConfirmed) throw new Error('Refusing to apply without --i-have-backup');

const ZERO = '0';
const orderStatusAfter = (paidAmount, total) => {
  const paid = toApiString(paidAmount ?? ZERO);
  const due = toApiString(subtract(toApiString(total ?? ZERO), paid));
  if (compare(paid, ZERO) <= 0) return { due, paymentStatus: 'PENDING' };
  return { due, paymentStatus: compare(due, ZERO) <= 0 ? 'SETTLED' : 'COLLECTED' };
};

let session;
try {
  const uriKey = Object.keys(process.env).find((key) => /MONGO.*URI|DATABASE_URL/.test(key));
  await mongoose.connect(process.env[uriKey], { autoIndex: false, autoCreate: false });
  const db = mongoose.connection.db;
  if (db.databaseName !== expectedDb) throw new Error('Database target mismatch');
  session = await mongoose.startSession();
  session.startTransaction();

  const refunds = await CashRefund.find({}).session(session).lean();
  const pending = refunds.filter((row) => row.status === 'PENDING_CASH_REFUND');
  const completed = refunds.filter((row) => row.status === 'COMPLETED');
  const unknown = refunds.filter(
    (row) => row.status !== 'PENDING_CASH_REFUND' && row.status !== 'COMPLETED'
  );
  if (unknown.length) throw new Error(`Unexpected refund statuses: ${unknown.length}`);

  // Every completed refund must have exactly one drawer movement; otherwise stop.
  const movements = [];
  for (const row of completed) {
    const found = await CashDrawerTransaction.find({
      sourceType: 'CASH_REFUND',
      sourceId: row.refundNo
    }).session(session).lean();
    if (found.length !== 1 || found[0].direction !== 'OUT')
      throw new Error(`Unmatched drawer movement for refund ${row.refundNo}`);
    movements.push(found[0]);
  }
  const shiftTotals = new Map();
  for (const movement of movements) {
    const key = String(movement.shiftId);
    shiftTotals.set(key, add(shiftTotals.get(key) ?? ZERO, toApiString(movement.amount)));
  }

  const paymentIds = [...new Set(completed.map((row) => String(row.paymentId)))];
  const orderIds = [...new Set(completed.map((row) => String(row.orderId)))];

  const backup = {
    cashrefunds: refunds,
    cashdrawermovements: movements,
    orderpayments: paymentIds.length
      ? await OrderPayment.find({ _id: { $in: paymentIds } }).session(session).lean()
      : [],
    orders: orderIds.length ? await Order.find({ _id: { $in: orderIds } }).session(session).lean() : [],
    cashdrawershifts: shiftTotals.size
      ? await CashDrawerShift.find({ _id: { $in: [...shiftTotals.keys()] } }).session(session).lean()
      : []
  };
  if (backup.orderpayments.length !== paymentIds.length) throw new Error('Missing payment document');
  if (backup.orders.length !== orderIds.length) throw new Error('Missing order document');

  // 1. Delete every refund document (pending ones never touched money).
  if (refunds.length)
    await db.collection('cashrefunds').deleteMany({ _id: { $in: refunds.map((row) => row._id) } }, { session });
  // 2. Delete the drawer OUT movements created for completed refunds.
  if (movements.length)
    await db
      .collection('cashdrawertransactions')
      .deleteMany({ _id: { $in: movements.map((row) => row._id) } }, { session });
  // 3. Rebuild every affected shift from its remaining movements.
  for (const shiftId of shiftTotals.keys()) {
    const shift = await CashDrawerShift.findById(shiftId).session(session);
    if (!shift) throw new Error(`Missing shift ${shiftId}`);
    await rebuildDrawerShift(shift, { CashDrawerShift, CashDrawerTransaction }, session);
  }
  // 4. Zero refunded amounts on payments and restore a non-refund status.
  for (const payment of backup.orderpayments) {
    await db.collection('orderpayments').updateOne(
      { _id: payment._id },
      {
        $set: {
          refundedAmount: toDecimal128(ZERO),
          refundTransactionIds: [],
          status: payment.settledAt ? 'SETTLED' : 'COLLECTED'
        },
        $inc: { version: 1 }
      },
      { session }
    );
  }
  // 5. Zero refunded amounts on orders and recompute due/status from paid vs total.
  for (const order of backup.orders) {
    const { due, paymentStatus } = orderStatusAfter(order.paidAmount, order.total);
    await db.collection('orders').updateOne(
      { _id: order._id },
      {
        $set: { refundedAmount: toDecimal128(ZERO), balanceDue: toDecimal128(due), paymentStatus },
        $inc: { version: 1 }
      },
      { session }
    );
  }

  // Verification: nothing refund-related may remain.
  const remaining = {
    refunds: await db.collection('cashrefunds').countDocuments({}, { session }),
    refundMovements: await db
      .collection('cashdrawertransactions')
      .countDocuments({ sourceType: 'CASH_REFUND' }, { session }),
    paymentsWithRefunded: await db
      .collection('orderpayments')
      .countDocuments({ refundedAmount: { $gt: toDecimal128(ZERO) } }, { session }),
    ordersWithRefunded: await db
      .collection('orders')
      .countDocuments({ refundedAmount: { $gt: toDecimal128(ZERO) } }, { session })
  };
  if (Object.values(remaining).some((count) => count !== 0))
    throw new Error(`Cleanup incomplete: ${JSON.stringify(remaining)}`);

  let backupPath;
  if (apply) {
    const directory = resolve('backups');
    await mkdir(directory, { recursive: true });
    backupPath = resolve(directory, `before-remove-cash-refunds-${Date.now()}.json`);
    await writeFile(
      backupPath,
      EJSON.stringify({ database: db.databaseName, createdAt: new Date(), collections: backup }, { relaxed: false }),
      { flag: 'wx' }
    );
    await session.commitTransaction();
  } else await session.abortTransaction();
  console.log(
    JSON.stringify({
      applied: apply,
      refundsDeleted: refunds.length,
      pendingDeleted: pending.length,
      drawerMovementsDeleted: movements.length,
      paymentsReset: backup.orderpayments.length,
      ordersReset: backup.orders.length,
      reversedPerShift: [...shiftTotals.entries()].map(([shiftId, total]) => ({
        shiftId,
        total: toApiString(total)
      })),
      backupPath
    })
  );
} catch (error) {
  if (session?.inTransaction()) await session.abortTransaction();
  console.error(JSON.stringify({ failed: true, name: error.name, code: error.code, message: error.message?.replace(/mongodb[^ ]*/g, '[redacted]') }));
  process.exitCode = 1;
} finally {
  await session?.endSession();
  await mongoose.disconnect();
}
