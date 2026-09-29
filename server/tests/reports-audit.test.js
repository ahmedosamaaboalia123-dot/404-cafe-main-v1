import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { screenQuery } from '../src/modules/reports/reports.validation.js';
import {
  getDelegateReport,
  getDrawerReport,
  getFinancialReportScreen,
  getSalesReport,
  requestReportExport
} from '../src/modules/reports/reports.service.js';
import {
  getAuditEvent,
  getAuditScreen,
  getEntityTimeline
} from '../src/modules/audit/audit.queries.js';
import {
  createNotifications,
  markAllNotificationsRead,
  markNotificationRead
} from '../src/modules/notifications/notifications.service.js';
import { listNotifications } from '../src/modules/notifications/notifications.queries.js';
import { toDecimal128 } from '../src/platform/database/decimal.js';

const id = () => new mongoose.Types.ObjectId();
const money = (value) => toDecimal128(value);
// Fully chainable query mock: select/sort/limit/skip/session in any order,
// then lean. Mirrors how the snapshot-read builders thread the session.
const q = (rows = []) => {
  const query = {
    select: () => query,
    sort: () => query,
    limit: () => query,
    skip: () => query,
    session: () => query,
    lean: async () => rows
  };
  return query;
};
// Awaitable count that also supports an optional trailing .session().
const counted = (n = 0) => {
  const promise = Promise.resolve(n);
  promise.session = async () => n;
  return promise;
};
const infrastructure = () => ({
  session: {},
  actorId: id(),
  actorType: 'EMPLOYEE',
  requestId: 'test-request',
  sequenceModel: { findOneAndUpdate: async () => ({ value: 9 }) },
  auditModel: { create: async ([v]) => [v] },
  outboxModel: { create: async ([v]) => [v] },
  now: new Date('2026-09-11T10:00:00Z')
});
const fullModels = (overrides = {}) => ({
  Order: {
    find: () => q([]),
    countDocuments: () => counted(0)
  },
  OrderItem: { find: () => q([]) },
  OrderPayment: { find: () => q([]) },
  CashDrawerTransaction: {
    find: () => q([])
  },
  CashDrawerShift: { countDocuments: () => counted(0) },
  RawMaterial: { find: () => q([]) },
  RawMaterialBatch: { find: () => q([]) },
  InventoryMovement: {
    find: () => q([])
  },
  Supplier: { find: () => q([]) },
  SupplierAccount: { find: () => q([]) },
  SupplierAccountEntry: {
    find: () => q([])
  },
  Delegate: { find: () => q([]) },
  DeliveryAssignment: {
    find: () => q([])
  },
  FinancialReportCache: {
    findOne: () => ({ lean: async () => null }),
    findOneAndUpdate: async () => ({})
  },
  ...overrides
});
const orderRow = (overrides = {}) => ({
  _id: id(),
  total: money('120'),
  actualInventoryCost: money('70'),
  channel: 'ADMIN',
  createdAt: new Date('2026-09-10T10:00:00Z'),
  ...overrides
});

describe('financial reports', () => {
  it('validates report ranges at the boundary', () => {
    expect(screenQuery.safeParse({}).success).toBe(true);
    expect(screenQuery.safeParse({ from: '2026-13-01' }).success).toBe(false);
    expect(screenQuery.safeParse({ compare: 'none' }).success).toBe(true);
  });
  it('builds screen cards from every source at once', async () => {
    const screen = await getFinancialReportScreen(
      { from: '2026-09-01', to: '2026-09-10', compare: 'none' },
      {
        ...infrastructure(),
        reportsModels: fullModels({
          Order: {
            find: () => q([orderRow(), orderRow()])
          },
          CashDrawerTransaction: {
            find: () =>
              q([
                { direction: 'IN', amount: money('500'), accountingClass: 'ORDER_CASH_SALE' },
                { direction: 'OUT', amount: money('100'), accountingClass: 'EXPENSE' }
              ])
          },
          SupplierAccount: {
            find: () =>
              q([{ supplierId: id(), debtBalance: money('300'), receivableBalance: money('40') }])
          },
          DeliveryAssignment: {
            find: () =>
              q([
                {
                  cashExpected: money('80'),
                  cashSettledTotal: money('0'),
                  status: 'IN_PROGRESS',
                  updatedAt: new Date()
                }
              ])
          }
        })
      }
    );
    expect(screen.cards).toMatchObject({
      netSales: '240',
      cogs: '140',
      grossProfit: '100',
      cashIn: '500',
      cashOut: '100',
      supplierDebt: '300',
      supplierReceivable: '40',
      delegateOutstanding: '80'
    });
    expect(screen.dataQuality).toBe('COMPLETE');
    expect(screen.charts.salesTrend).toHaveLength(1);
    expect(screen.period).toMatchObject({ from: '2026-09-01', to: '2026-09-10' });
  });
  it('fails the snapshot instead of faking zeroes when a source is down', async () => {
    const cacheWrite = vi.fn();
    await expect(
      getFinancialReportScreen(
        { from: '2026-09-01', to: '2026-09-10', compare: 'none' },
        {
          ...infrastructure(),
          reportsModels: fullModels({
            Order: {
              find: () => {
                throw new Error('down');
              }
            },
            FinancialReportCache: {
              findOne: () => ({ lean: async () => null }),
              findOneAndUpdate: cacheWrite
            }
          })
        }
      )
    ).rejects.toThrow('down');
    // No partial snapshot may be cached as if it were complete.
    expect(cacheWrite).not.toHaveBeenCalled();
  });
  it('serves repeated screens from cache without re-querying', async () => {
    const find = vi.fn(() => q([orderRow()]));
    let cached = null;
    const models = fullModels({
      Order: { find },
      FinancialReportCache: {
        findOne: () => ({ lean: async () => cached }),
        findOneAndUpdate: async (query, update) => {
          cached = { cacheKey: query.cacheKey, payload: update.$set.payload };
          return cached;
        }
      }
    });
    // No session: the real snapshot-transaction path runs (with a stubbed
    // starter) so the cache is actually exercised instead of bypassed.
    const fakeSession = {
      withTransaction: async (fn) => {
        await fn();
      },
      endSession: async () => {}
    };
    const base = { ...infrastructure(), reportsModels: models };
    delete base.session;
    base.transactionOptions = { startSession: async () => fakeSession };
    const filters = { from: '2026-09-01', to: '2026-09-10', compare: 'none' };
    await getFinancialReportScreen(filters, { ...base });
    await getFinancialReportScreen(filters, { ...base });
    expect(find).toHaveBeenCalledTimes(1);
  });
  it('ranks top products and channels in sales details', async () => {
    const orders = [orderRow(), orderRow({ channel: 'CUSTOMER_WEB' })];
    const report = await getSalesReport(
      { from: '2026-09-01', to: '2026-09-10', page: 1, limit: 10 },
      {
        ...infrastructure(),
        reportsModels: fullModels({
          Order: {
            find: () => q(orders)
          },
          OrderItem: {
            find: () =>
              q([
                {
                  productName: 'لاتيه',
                  sizeName: 'وسط',
                  quantity: 2,
                  lineSubtotal: money('120')
                },
                {
                  productName: 'اسبريسو',
                  sizeName: 'صغير',
                  quantity: 1,
                  lineSubtotal: money('40')
                }
              ])
          }
        })
      }
    );
    expect(report.summary).toMatchObject({ netSales: '240', orders: 2 });
    expect(report.breakdowns.topProducts[0]).toMatchObject({ product: 'لاتيه' });
    expect(report.breakdowns.channelMix).toHaveLength(2);
    expect(report.pageMeta.totalItems).toBe(1);
  });
  it('exports reports with a stable checksum payload', async () => {
    const rows = [{ direction: 'IN', amount: money('500') }];
    let storedJob = null;
    const jobRef = () => {
      const promise = Promise.resolve(storedJob);
      promise.lean = async () => {
        const rest = { ...storedJob };
        delete rest.save;
        return rest;
      };
      return promise;
    };
    const jobModel = {
      create: async ([v]) => {
        storedJob = { _id: id(), status: 'QUEUED', ...v };
        storedJob.save = vi.fn(async () => storedJob);
        return [storedJob];
      },
      findById: () => jobRef()
    };
    const models = fullModels({
      CashDrawerTransaction: {
        find: () => q(rows)
      },
      ReportExport: jobModel
    });
    const first = await requestReportExport(
      { reportType: 'drawer', from: '2026-09-01', to: '2026-09-10', format: 'CSV' },
      { ...infrastructure(), reportsModels: models }
    );
    expect(first.export.statusUrl).toBe(`/financial-reports/exports/${first.export.id}`);
    expect(first.export.status).toBe('READY');
    await expect(
      requestReportExport(
        { reportType: 'nope', format: 'CSV' },
        { ...infrastructure(), reportsModels: models }
      )
    ).rejects.toMatchObject({ code: 'REPORT_TYPE_UNKNOWN' });
  });
  it('summarizes delegate ledgers with outstanding math', async () => {
    const report = await getDelegateReport(
      { from: '2026-09-01', to: '2026-09-10', page: 1, limit: 10 },
      {
        ...infrastructure(),
        reportsModels: fullModels({
          DeliveryAssignment: {
            find: () =>
              q([
                {
                  _id: id(),
                  delegateId: id(),
                  status: 'IN_PROGRESS',
                  cashExpected: money('80'),
                  cashSettledTotal: money('0'),
                  updatedAt: new Date('2026-09-05T10:00:00Z')
                }
              ])
          }
        })
      }
    );
    expect(report.summary).toMatchObject({ outstanding: '80', assignments: 1 });
    expect(report.pageMeta.totalItems).toBe(1);
  });
});

describe('audit trail ui', () => {
  const auditModels = (overrides = {}) => ({
    find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [] }) }) }) }),
    countDocuments: async () => 0,
    aggregate: async () => [],
    findById: () => ({ lean: async () => null }),
    ...overrides
  });
  it('summarizes audit outcomes with applied filters', async () => {
    const screen = await getAuditScreen(
      { module: 'orders', page: 1, limit: 10 },
      {
        auditModel: {
          ...auditModels(),
          find: () => ({
            sort: () => ({
              skip: () => ({
                limit: () => ({
                  lean: async () => [
                    {
                      eventNo: 1,
                      eventType: 'ORDER_CREATED',
                      module: 'orders',
                      action: 'CREATE',
                      result: 'SUCCESS',
                      severity: 'INFO'
                    }
                  ]
                })
              })
            })
          }),
          aggregate: async () => [
            { _id: { result: 'SUCCESS', severity: 'INFO' }, count: 1 },
            { _id: { result: 'DENIED', severity: 'CRITICAL' }, count: 2 }
          ]
        }
      }
    );
    expect(screen.summary).toMatchObject({
      total: 0,
      success: 1,
      failed: 0,
      denied: 2,
      warning: 0,
      critical: 2
    });
    expect(screen.filters).toMatchObject({ module: 'orders' });
    expect(screen.items).toHaveLength(1);
  });
  it('maps stored events to stable public ids', async () => {    const event = {
      _id: id(),
      eventNo: 7,
      eventType: 'ORDER_CREATED',
      module: 'orders',
      result: 'SUCCESS'
    };
    const result = await getAuditEvent(event._id, {
      auditModel: { findById: () => ({ lean: async () => event }) }
    });
    expect(result.event.id).toBe(String(event._id));
    expect(result.event).not.toHaveProperty('_id');
    await expect(
      getAuditEvent(id(), { auditModel: { findById: () => ({ lean: async () => null }) } })
    ).rejects.toMatchObject({ code: 'AUDIT_NOT_FOUND' });
  });
  it('builds entity timelines in reverse time order', async () => {
    const rows = [
      {
        eventNo: 2,
        eventType: 'B',
        action: 'UPDATE',
        actor: {},
        result: 'SUCCESS',
        severity: 'INFO',
        occurredAt: new Date()
      },
      {
        eventNo: 1,
        eventType: 'A',
        action: 'CREATE',
        actor: {},
        result: 'SUCCESS',
        severity: 'INFO',
        occurredAt: new Date()
      }
    ];
    const timeline = await getEntityTimeline(
      'Order',
      String(id()),
      { page: 1, limit: 10 },
      {
        auditModel: {
          find: () => ({
            sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => rows }) }) })
          }),
          countDocuments: async () => 2
        }
      }
    );
    expect(timeline.items[0]).toMatchObject({ eventNo: 2, summary: 'UPDATE SUCCESS' });
    expect(timeline.pageMeta.totalItems).toBe(2);
  });
  it('enriches employee actors with names in one lookup', async () => {
    const employeeId = String(id());
    const rows = [
      { eventNo: 1, eventType: 'A', actor: { type: 'EMPLOYEE', id: employeeId }, result: 'SUCCESS', severity: 'INFO' },
      { eventNo: 2, eventType: 'B', actor: { type: 'EMPLOYEE', id: String(id()) }, result: 'SUCCESS', severity: 'INFO' },
      { eventNo: 3, eventType: 'C', actor: { type: 'SYSTEM' }, result: 'SUCCESS', severity: 'INFO' }
    ];
    const getNamesByIds = vi.fn(async (_ids) => ({ [employeeId]: 'أحمد' }));
    const screen = await getAuditScreen(
      { page: 1, limit: 10 },
      {
        auditModel: {
          find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => rows }) }) }) }),
          countDocuments: async () => 3,
          aggregate: async () => []
        },
        employeeDirectoryPort: { getNamesByIds }
      }
    );
    expect(getNamesByIds).toHaveBeenCalledTimes(1);
    expect(getNamesByIds.mock.calls[0][0].sort()).toEqual([employeeId, rows[1].actor.id].sort());
    expect(screen.items[0].actor).toMatchObject({ type: 'EMPLOYEE', name: 'أحمد' });
    expect(screen.items[1].actor.name).toBeNull();
    expect(screen.items[2].actor).toMatchObject({ type: 'SYSTEM' });
    expect(screen.items[2].actor).not.toHaveProperty('name');
  });
  it('leaves actors unchanged when no directory is available', async () => {
    const rows = [
      { eventNo: 1, eventType: 'A', actor: { type: 'EMPLOYEE', id: String(id()) }, result: 'SUCCESS', severity: 'INFO' }
    ];
    const screen = await getAuditScreen(
      { page: 1, limit: 10 },
      {
        auditModel: {
          find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => rows }) }) }) }),
          countDocuments: async () => 1,
          aggregate: async () => []
        }
      }
    );
    expect(screen.items[0].actor).toEqual(rows[0].actor);
  });
});

describe('notifications inbox', () => {
  it('dedupes repeat notifications for the same key', async () => {
    const updateOne = vi
      .fn()
      .mockResolvedValueOnce({ upsertedCount: 1 })
      .mockResolvedValueOnce({ upsertedCount: 0 });
    const first = await createNotifications(
      ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439012'],
      { type: 'SHIFT_OPEN_TOO_LONG', title: 'وردية مفتوحة', deduplicationKey: 'shift:1:12' },
      { session: {}, notificationModels: { Notification: { updateOne } } }
    );
    expect(first).toMatchObject({ created: 1, skipped: 1 });
    // A repeated recipient list collapses to a single upsert.
    updateOne.mockClear();
    updateOne.mockResolvedValue({ upsertedCount: 0 });
    const second = await createNotifications(
      ['507f1f77bcf86cd799439011', '507f1f77bcf86cd799439011'],
      { type: 'SHIFT_OPEN_TOO_LONG', title: 'وردية مفتوحة', deduplicationKey: 'shift:1:12' },
      { session: {}, notificationModels: { Notification: { updateOne } } }
    );
    expect(updateOne).toHaveBeenCalledTimes(1);
    expect(second).toMatchObject({ created: 0, skipped: 2 });
  });
  it('lists unread counts and marks reads', async () => {
    const row = {
      _id: id(),
      type: 'INFO',
      severity: 'INFO',
      title: 'ت',
      createdAt: new Date(),
      readAt: null
    };
    const listed = await listNotifications(
      '507f1f77bcf86cd799439011',
      { page: 1, limit: 10 },
      {
        notificationModels: {
          Notification: {
            find: () => ({
              sort: () => ({ skip: () => ({ limit: () => ({ lean: async () => [row] }) }) })
            }),
            countDocuments: (query) => counted(query.readAt === null && !query.createdAt ? 3 : 1)
          }
        }
      }
    );
    expect(listed).toMatchObject({ unreadCount: 3 });
    expect(listed.items).toHaveLength(1);
    const read = await markNotificationRead(row._id, '507f1f77bcf86cd799439011', {
      session: {},
      notificationModels: {
        Notification: {
          findOneAndUpdate: async () => row,
          countDocuments: () => counted(2)
        }
      }
    });
    expect(read).toMatchObject({ updatedCount: 1, unreadCount: 2 });
    const readAll = await markAllNotificationsRead('507f1f77bcf86cd799439011', undefined, {
      session: {},
      notificationModels: {
        Notification: {
          updateMany: async () => ({ modifiedCount: 2 }),
          countDocuments: () => counted(0)
        }
      }
    });
    expect(readAll).toMatchObject({ updatedCount: 2, unreadCount: 0 });
  });
  it('reports normal drawer movements with matching directional totals', async () => {
    const drawer = await getDrawerReport(
      { from: '2026-09-01', to: '2026-09-10' },
      {
        ...infrastructure(),
        reportsModels: fullModels({
          CashDrawerTransaction: {
            find: () =>
              q([
                { direction: 'IN', amount: money('250'), accountingClass: 'OTHER_INCOME' },
                { direction: 'OUT', amount: money('100'), accountingClass: 'EXPENSE' },
                {
                  direction: 'IN',
                  amount: money('100'),
                  accountingClass: 'OTHER_INCOME'
                }
              ])
          }
        })
      }
    );
    expect(drawer.summary).toMatchObject({ cashIn: '350', cashOut: '100', net: '250' });
    expect(drawer.breakdowns.byAccountingClass).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ accountingClass: 'OTHER_INCOME', in: '350' }),
        expect.objectContaining({ accountingClass: 'EXPENSE', out: '100' })
      ])
    );
  });
});
