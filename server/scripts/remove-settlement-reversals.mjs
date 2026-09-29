import 'dotenv/config';
import process from 'node:process';
import console from 'node:console';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { EJSON } from 'bson';
import mongoose from 'mongoose';
import { add, compare, toDecimal128 } from '../src/platform/database/decimal.js';
import { entryEffect, displayBalances } from '../src/modules/suppliers/supplier-balances.js';
import { rebuildDrawerShift } from '../src/modules/drawer/drawer-supplier.service.js';
import { CashDrawerShift, CashDrawerTransaction } from '../src/modules/drawer/drawer.models.js';

const apply = process.argv.includes('--apply');
if (apply && process.env.ALLOW_DESTRUCTIVE_MIGRATIONS !== 'true')
  throw new Error('Refusing to apply without ALLOW_DESTRUCTIVE_MIGRATIONS=true');
const expectedDb = process.argv.find((arg) => arg.startsWith('--database='))?.slice(11);
if (!expectedDb) throw new Error('Explicit --database is required');
let session;
try {
  const uriKey = Object.keys(process.env).find((key) => /MONGO.*URI|DATABASE_URL/.test(key));
  await mongoose.connect(process.env[uriKey], { autoIndex: false, autoCreate: false });
  const db = mongoose.connection.db;
  if (db.databaseName !== expectedDb) throw new Error('Database target mismatch');
  session = await mongoose.startSession();
  session.startTransaction();
  const names = ['supplieraccountentries', 'supplieraccounts', 'cashdrawertransactions', 'cashdrawershifts', 'permissions', 'rolepermissions', 'employeepermissions'];
  const backup = {};
  for (const name of names) backup[name] = await db.collection(name).find({}, { session }).toArray();
  const entries = backup.supplieraccountentries;
  const removeEntries = new Set();
  for (const row of entries.filter((entry) => entry.kind === 'REVERSAL')) {
    const original = entries.find((entry) => String(entry._id) === String(row.reversesEntryId));
    if (!original || compare(original.amount, row.amount) !== 0) throw new Error('Unmatched supplier cancellation');
    removeEntries.add(String(original._id));
    removeEntries.add(String(row._id));
  }
  const cash = backup.cashdrawertransactions;
  const removeCash = new Set();
  const affectedShifts = new Set();
  for (const row of cash.filter((entry) => entry.reversesTransactionId)) {
    const original = cash.find((entry) => String(entry._id) === String(row.reversesTransactionId));
    if (!original || String(original.shiftId) !== String(row.shiftId) || original.direction === row.direction || compare(original.amount, row.amount) !== 0) throw new Error('Unmatched drawer cancellation');
    removeCash.add(String(original._id));
    removeCash.add(String(row._id));
    affectedShifts.add(String(row.shiftId));
  }
  if (cash.some((row) => row.sourceType === 'SUPPLIER_ACCOUNT_ADJUSTMENT')) throw new Error('Unlinked adjustments require explicit reconciliation');
  const keptEntries = entries.filter((row) => !removeEntries.has(String(row._id)));
  for (const account of backup.supplieraccounts) {
    let debt = '0', receivable = '0';
    for (const row of keptEntries.filter((entry) => String(entry.supplierId) === String(account.supplierId)).sort((a, b) => a.sequenceNo - b.sequenceNo)) {
      const effect = entryEffect(row.kind, row.amount);
      debt = add(debt, effect.debt); receivable = add(receivable, effect.receivable);
      const visible = displayBalances(debt, receivable);
      await db.collection('supplieraccountentries').updateOne({ _id: row._id }, { $set: { debtBalanceAfter: toDecimal128(visible.debt), receivableBalanceAfter: toDecimal128(visible.receivable) }, $unset: { reversesEntryId: '', reversedByEntryId: '', replacesEntryId: '', originalKind: '' } }, { session });
      if (row.drawerTransactionId && removeCash.has(String(row.drawerTransactionId))) throw new Error('Active entry references removed cash');
    }
    const visible = displayBalances(debt, receivable);
    if (compare(visible.debt, account.debtBalance) !== 0 || compare(visible.receivable, account.receivableBalance) !== 0) throw new Error('Supplier balance would change');
    await db.collection('supplieraccounts').updateOne({ _id: account._id }, { $set: { debtLedgerBalance: toDecimal128(debt), receivableLedgerBalance: toDecimal128(receivable) }, $inc: { version: 1 } }, { session });
  }
  await db.collection('supplieraccountentries').deleteMany({ _id: { $in: entries.filter((row) => removeEntries.has(String(row._id))).map((row) => row._id) } }, { session });
  await db.collection('cashdrawertransactions').deleteMany({ _id: { $in: cash.filter((row) => removeCash.has(String(row._id))).map((row) => row._id) } }, { session });
  for (const shiftId of affectedShifts) {
    const shift = await CashDrawerShift.findById(shiftId).session(session);
    const previousBalance = shift.expectedClosingBalance;
    await rebuildDrawerShift(shift, { CashDrawerShift, CashDrawerTransaction }, session);
    if (compare(previousBalance, shift.expectedClosingBalance) !== 0) throw new Error('Drawer balance would change');
  }
  const removedPermissionIds = backup.permissions.filter((row) => row.key === 'suppliers.account.reverse').map((row) => row._id);
  for (const name of ['rolepermissions', 'employeepermissions']) await db.collection(name).deleteMany({ permissionId: { $in: removedPermissionIds } }, { session });
  await db.collection('permissions').deleteMany({ _id: { $in: removedPermissionIds } }, { session });
  let backupPath;
  if (apply) {
    const directory = resolve('backups');
    await mkdir(directory, { recursive: true });
    backupPath = resolve(directory, `before-remove-settlement-reversals-${Date.now()}.json`);
    await writeFile(backupPath, EJSON.stringify({ database: db.databaseName, createdAt: new Date(), collections: backup }, { relaxed: false }), { flag: 'wx' });
    await session.commitTransaction();
    for (const [collection, fields] of [['supplieraccountentries', ['reversesEntryId', 'replacesEntryId']], ['cashdrawertransactions', ['reversesTransactionId']]]) {
      for (const index of await db.collection(collection).indexes()) {
        if (fields.some((field) => Object.hasOwn(index.key, field))) await db.collection(collection).dropIndex(index.name);
      }
    }
  } else await session.abortTransaction();
  console.log(JSON.stringify({ applied: apply, supplierRowsRemoved: removeEntries.size, drawerRowsRemoved: removeCash.size, supplierAndDrawerBalancesPreserved: true, backupPath }));
} catch (error) {
  if (session?.inTransaction()) await session.abortTransaction();
  console.error(JSON.stringify({ failed: true, name: error.name, code: error.code, message: error.message?.replace(/mongodb[^ ]*/g, '[redacted]') }));
  process.exitCode = 1;
} finally {
  await session?.endSession();
  await mongoose.disconnect();
}
