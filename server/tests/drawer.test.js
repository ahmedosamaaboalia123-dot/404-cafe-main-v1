import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { toApiString, toDecimal128 } from '../src/platform/database/decimal.js';
import {
  closeShift,
  createCashTransaction,
  openShift
} from '../src/modules/drawer/drawer.service.js';
import { openBody } from '../src/modules/drawer/drawer.validation.js';
import { getPrintData, getShift } from '../src/modules/drawer/drawer.queries.js';
const id = () => new mongoose.Types.ObjectId(),
  chain = (v) => ({ session: async () => v });
function shift() {
  const s = {
    _id: id(),
    scopeId: id(),
    status: 'OPEN',
    currency: 'EGP',
    openingBalance: toDecimal128('500'),
    totalCashIn: toDecimal128('0'),
    totalCashOut: toDecimal128('0'),
    netCashMovement: toDecimal128('0'),
    expectedClosingBalance: toDecimal128('500'),
    transactionCount: 0,
    version: 0,
    save: vi.fn(async () => {
      s.version += 1;
    })
  };
  return s;
}
describe('cash drawer invariants', () => {
  it('keeps opening balance outside income and expenses', async () => {
    const created = [];
    const models = {
      CashDrawerShift: {
        exists: () => chain(null),
        create: async ([v]) => {
          created.push({ _id: id(), version: 0, ...v });
          return created;
        }
      }
    };
    const s = await openShift(
      { openingBalance: '500', scopeId: id() },
      {
        session: {},
        actorId: id(),
        drawerModels: models,
        sequenceModel: { findOneAndUpdate: async () => ({ value: 1 }) },
        now: new Date('2026-09-11T08:00:00Z')
      }
    );
    expect(toApiString(s.openingBalance)).toBe('500');
    expect(toApiString(s.totalCashIn)).toBe('0');
    expect(toApiString(s.totalCashOut)).toBe('0');
    expect(toApiString(s.expectedClosingBalance)).toBe('500');
    expect(s.shiftNo).toMatch(/^SH-\d{6}$/);
  });
  it('rejects any client-supplied shift reference number', () => {
    expect(openBody.safeParse({ openingBalance: '500', shiftNo: 'SH-000001' }).success).toBe(false);
    expect(openBody.safeParse({ openingBalance: '500' }).success).toBe(true);
  });
  it('updates the projection and rejects an OUT above drawer balance', async () => {
    const s = shift(),
      rows = [];
    const models = {
      CashDrawerShift: { findOne: () => chain(s) },
      CashDrawerTransaction: {
        create: async ([v]) => {
          rows.push({ _id: id(), ...v });
          return [rows[0]];
        }
      }
    };
    await createCashTransaction(
      {
        shiftId: s._id,
        direction: 'IN',
        amount: '100',
        sourceType: 'MANUAL',
        sourceId: 'one',
        accountingClass: 'OTHER_INCOME',
        description: 'وارد',
        expectedVersion: 0
      },
      { session: {}, drawerModels: models }
    );
    expect(toApiString(s.expectedClosingBalance)).toBe('600');
    await expect(
      createCashTransaction(
        {
          shiftId: s._id,
          direction: 'OUT',
          amount: '601',
          sourceType: 'MANUAL',
          sourceId: 'two',
          accountingClass: 'EXPENSE',
          description: 'صادر',
          expectedVersion: 1
        },
        { session: {}, drawerModels: models }
      )
    ).rejects.toMatchObject({ code: 'DRAWER_INSUFFICIENT_CASH' });
  });
  it('rejects non-positive amounts before touching the shift', async () => {
    const s = shift();
    const models = {
      CashDrawerShift: { findOne: () => chain(s) },
      CashDrawerTransaction: { create: vi.fn() }
    };
    for (const amount of ['-5', '0']) {
      await expect(
        createCashTransaction(
          {
            shiftId: s._id,
            direction: 'OUT',
            amount,
            sourceType: 'MANUAL',
            sourceId: `bad-${amount}`,
            accountingClass: 'EXPENSE',
            description: 'صادر',
            expectedVersion: 0
          },
          { session: {}, drawerModels: models }
        )
      ).rejects.toMatchObject({ code: 'DRAWER_INVALID_AMOUNT', status: 422 });
    }
    expect(models.CashDrawerTransaction.create).not.toHaveBeenCalled();
    expect(s.save).not.toHaveBeenCalled();
  });
  it('wraps direct calls without a session in their own transaction', async () => {
    const s = shift(),
      rows = [];
    const models = {
      CashDrawerShift: { findOne: () => chain(s) },
      CashDrawerTransaction: {
        create: async ([v]) => {
          rows.push({ _id: id(), ...v });
          return [rows[0]];
        }
      }
    };
    // No session in context: the function must still complete atomically.
    // startSession is stubbed so the test never touches a real connection.
    const fakeSession = {
      withTransaction: async (fn) => {
        await fn();
      },
      endSession: async () => {}
    };
    const result = await createCashTransaction(
      {
        shiftId: s._id,
        direction: 'IN',
        amount: '50',
        sourceType: 'MANUAL',
        sourceId: 'solo',
        accountingClass: 'OTHER_INCOME',
        description: 'وارد',
        expectedVersion: 0
      },
      {
        drawerModels: models,
        transactionOptions: { startSession: async () => fakeSession }
      }
    );
    expect(toApiString(s.expectedClosingBalance)).toBe('550');
    expect(result.transaction).toBe(rows[0]);
  });
  it('blocks close when ledger totals differ from the shift projection', async () => {
    const s = shift();
    s.totalCashIn = toDecimal128('100');
    const models = {
      CashDrawerShift: { findOne: () => chain(s) },
      CashDrawerTransaction: { find: () => chain([]) }
    };
    await expect(
      closeShift(
        s._id,
        { actualClosingBalance: '500', expectedVersion: 0 },
        { session: {}, drawerModels: models }
      )
    ).rejects.toMatchObject({ code: 'DRAWER_LEDGER_MISMATCH' });
    expect(s.status).toBe('OPEN');
  });

});

/**
 * A full drawer lifecycle against one shift document, so the projection is
 * produced by the write path itself instead of being hand-written into the fake.
 * This is the exact production sequence: post a movement, then close.
 */
function liveShiftModels({ openingBalance = '500' } = {}) {
  const s = shift();
  s.openingBalance = toDecimal128(openingBalance);
  s.expectedClosingBalance = toDecimal128(openingBalance);
  const rows = [];
  const models = {
    CashDrawerShift: { findOne: () => chain(s) },
    CashDrawerTransaction: {
      create: async ([v]) => {
        const row = { _id: id(), ...v };
        rows.push(row);
        return [row];
      },
      find: () => chain(rows),
      findById: (target) => chain(rows.find((r) => String(r._id) === String(target)) ?? null)
    }
  };
  return { s, rows, models };
}
const manualMove = (s, models, direction, amount, extra = {}) =>
  createCashTransaction(
    {
      shiftId: s._id,
      direction,
      amount,
      sourceType: 'MANUAL',
      sourceId: 'x',
      accountingClass: 'EXPENSE',
      description: 'حركة',
      expectedVersion: s.version,
      ...extra
    },
    { session: {}, drawerModels: models }
  );
const close = (s, models, actualClosingBalance) =>
  closeShift(
    s._id,
    { actualClosingBalance, expectedVersion: s.version },
    { session: {}, actorId: id(), drawerModels: models }
  );

describe('drawer closing', () => {
  it('reconciles normal incoming and outgoing movements', async () => {
    const { s, models } = liveShiftModels();
    await manualMove(s, models, 'IN', '250');
    await manualMove(s, models, 'OUT', '100');
    expect(toApiString(s.totalCashIn)).toBe('250');
    expect(toApiString(s.totalCashOut)).toBe('100');
    const result = await close(s, models, '650');
    expect(result.reconciliationStatus).toBe('MATCHED');
  });
});

/**
 * A query chain that records every link so the tests can assert on the exact
 * call sequence instead of only on the returned value.
 */
function recordingQuery(result) {
  const calls = [];
  const chain = {
    sort: (v) => (calls.push(['sort', v]), chain),
    skip: (v) => (calls.push(['skip', v]), chain),
    limit: (v) => (calls.push(['limit', v]), chain),
    select: (v) => (calls.push(['select', v]), chain),
    session: (v) => (calls.push(['session', v]), chain),
    lean: async () => result
  };
  return { calls, chain };
}
function transactionRow(overrides = {}) {
  return {
    _id: id(),
    shiftId: id(),
    sequenceNo: 1,
    direction: 'IN',
    amount: toDecimal128('100'),
    balanceAfter: toDecimal128('600'),
    currency: 'EGP',
    sourceType: 'MANUAL',
    sourceId: 'x',
    accountingClass: 'OTHER_INCOME',
    description: 'حركة',
    recordedAt: new Date('2026-09-11T09:00:00Z'),
    ...overrides
  };
}
function closedShift() {
  const s = shift();
  s.status = 'CLOSED';
  s.shiftNo = 'SH-000042';
  s.totalCashIn = toDecimal128('500');
  s.totalCashOut = toDecimal128('30');
  s.netCashMovement = toDecimal128('470');
  s.expectedClosingBalance = toDecimal128('970');
  s.actualClosingBalance = toDecimal128('970');
  s.reconciliationStatus = 'MATCHED';
  s.reconciliationDifference = toDecimal128('0');
  s.transactionCount = 12;
  s.closedAt = new Date('2026-09-11T18:00:00Z');
  return s;
}
function drawerModels({ shiftRow, ledgerRows = [], alertRows = [] }) {
  const shiftQuery = recordingQuery(shiftRow);
  const ledgerQuery = recordingQuery(ledgerRows);
  const alertQuery = recordingQuery(alertRows);
  return {
    shiftQuery,
    ledgerQuery,
    alertQuery,
    models: {
      CashDrawerShift: {
        findById: () => ({ lean: async () => shiftQuery.chain.lean() }),
        find: () => ({ sort: () => ({ limit: () => ledgerQuery.chain }) })
      },
      CashDrawerTransaction: { find: () => ledgerQuery.chain },
      DrawerShiftAlert: { find: () => alertQuery.chain }
    }
  };
}

/**
 * Regression: the printed shift report used to reuse the screen query, which caps
 * the ledger at the newest 10 rows. A printed ledger has to be the whole shift,
 * oldest first, otherwise the report silently loses movements.
 */
describe('cash drawer print query', () => {
  it('returns the whole ledger oldest first instead of the newest 10 rows', async () => {
    const s = closedShift();
    const rows = Array.from({ length: 12 }, (_, i) =>
      transactionRow({ sequenceNo: i + 1, amount: toDecimal128(String((i + 1) * 10)) })
    );
    const { ledgerQuery, models } = drawerModels({ shiftRow: s, ledgerRows: rows });

    const data = await getPrintData(s._id, { drawerModels: models });

    expect(data.documentType).toBe('CASH_DRAWER_SHIFT');
    expect(data.transactions).toHaveLength(12);
    expect(data.transactions.map((t) => t.sequenceNo)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12
    ]);
    // Ascending, deterministic ordering - not the screen's newest-first sort.
    expect(ledgerQuery.calls).toContainEqual(['sort', { sequenceNo: 1, _id: 1 }]);
    // Bounded, but far above the screen limit of 10.
    expect(ledgerQuery.calls).toContainEqual(['limit', 2000]);
    expect(data.totals).toEqual({ transactionCount: 12 });
    expect(data.shift.shiftNo).toBe('SH-000042');
    expect(data.reconciliation.status).toBe('MATCHED');
  });

  it('keeps the screen query on its newest-10 contract', async () => {
    const s = closedShift();
    const rows = [transactionRow({ sequenceNo: 12 })];
    const { ledgerQuery, models } = drawerModels({ shiftRow: s, ledgerRows: rows });

    const data = await getShift(s._id, { drawerModels: models });

    expect(ledgerQuery.calls).toContainEqual(['sort', { sequenceNo: -1 }]);
    expect(ledgerQuery.calls).toContainEqual(['limit', 10]);
    expect(data.transactions.items).toHaveLength(1);
  });

  it('fails with DRAWER_SHIFT_NOT_FOUND instead of printing an empty sheet', async () => {
    const models = {
      CashDrawerShift: { findById: () => ({ lean: async () => null }) },
      CashDrawerTransaction: { find: () => recordingQuery([]).chain },
      DrawerShiftAlert: { find: () => recordingQuery([]).chain }
    };
    await expect(getPrintData(id(), { drawerModels: models })).rejects.toMatchObject({
      code: 'DRAWER_SHIFT_NOT_FOUND',
      status: 404
    });
  });
});
