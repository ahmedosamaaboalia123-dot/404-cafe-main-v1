import mongoose from 'mongoose';
import { describe, expect, it, vi } from 'vitest';
import { resolveGuestSession } from '../src/modules/table-experience/table-experience.middleware.js';
import {
  bootstrapGuestSession,
  cancelProposal,
  confirmProposal,
  getGuestActiveOrder,
  reviewProposal,
  submitGuestReview,
  submitProposal
} from '../src/modules/table-experience/table-experience.service.js';
import { submitOrderReview } from '../src/modules/reviews/review.service.js';
import { hashToken } from '../src/shared/utils/hash-token.js';
import { toApiString, toDecimal128 } from '../src/platform/database/decimal.js';

const id = () => new mongoose.Types.ObjectId(),
  chain = (value) => ({ session: async () => value }),
  lean = (value) => ({ lean: async () => value, session: async () => value });
const infrastructure = () => ({
  session: {},
  actorId: id(),
  actorType: 'EMPLOYEE',
  requestId: 'test-request',
  sequenceModel: { findOneAndUpdate: async () => ({ value: 4 }) },
  auditModel: { create: async ([v]) => [v] },
  outboxModel: { create: async ([v]) => [v] }
});
const money = (value) => toDecimal128(value);
const QR = 'qr-secret-value-0123456789abcdef';
const snap = () => ({
  product: { id: String(id()), name: 'لاتيه' },
  type: { id: String(id()), name: 'ساخن' },
  size: { id: String(id()), name: 'وسط' },
  unitSellingPrice: '60',
  addons: [],
  recipe: [],
  recipeVersion: 1
});
const tableDoc = (overrides = {}) => ({
  _id: id(),
  tableNumber: 5,
  outOfService: false,
  version: 0,
  qrVersion: 1,
  currentQrSecretHash: hashToken(QR),
  save: vi.fn(),
  ...overrides
});
const guestDoc = (overrides = {}) => ({
  _id: id(),
  tableId: id(),
  tableNumber: 5,
  status: 'ACTIVE',
  expiresAt: new Date(Date.now() + 3600000),
  save: vi.fn(),
  ...overrides
});
const proposalDoc = (overrides = {}) => ({
  _id: id(),
  version: 0,
  status: 'WAITING_WAITER',
  tableId: id(),
  guestSessionId: id(),
  items: [{ productId: id(), productSizeId: id(), quantity: 2, addonIds: [], notes: null }],
  save: vi.fn(),
  ...overrides
});
const proposalInput = () => ({
  items: [{ productId: String(id()), productSizeId: String(id()), quantity: 2 }]
});

describe('table guest experience', () => {
  it('bootstraps a guest session without a qr secret', async () => {
    const table = tableDoc();
    let stored;
    const result = await bootstrapGuestSession(
      { tableNumber: 5 },
      {
        ...infrastructure(),
        tableGuestModels: {
          Table: { findOne: async () => table },
          TableGuestSession: {
            create: async ([v]) => {
              stored = { _id: id(), ...v };
              return [stored];
            }
          },
          TableOrderProposal: {}
        }
      }
    );
    expect(result.tableToken).toBeDefined();
    expect(stored.tokenHash).toBe(hashToken(result.tableToken));
    expect(stored.qrVersion).toBe(1);
  });
  it('stores proposals as snapshots without touching orders or stock', async () => {
    const guest = guestDoc();
    let stored;
    const open = vi.fn(async () => ({}));
    const append = vi.fn(async () => ({}));
    const notifyProposal = vi.fn(async () => ({
      serviceRequest: { _id: id() },
      alreadyOpen: false
    }));
    const { proposal, serviceRequest } = await submitProposal(guest, proposalInput(), {
      ...infrastructure(),
      tableGuestModels: {
        TableOrderProposal: {
          findOne: () => chain(null),
          create: async ([v]) => {
            stored = { _id: id(), version: 0, status: 'WAITING_WAITER', ...v };
            return [stored];
          }
        }
      },
      guestProductsPort: { snapshot: async () => snap() },
      tablesModule: { open },
      orderModule: { append },
      tableServicesPort: { notifyProposal }
    });
    expect(proposal.status).toBe('WAITING_WAITER');
    expect(serviceRequest).toBeDefined();
    expect(notifyProposal).toHaveBeenCalledTimes(1);
    expect(stored.items).toHaveLength(1);
    expect(stored.items[0].productName).toBe('لاتيه');
    expect(open).not.toHaveBeenCalled();
    expect(append).not.toHaveBeenCalled();
  });
  it('blocks a second active proposal per guest session', async () => {
    const guest = guestDoc();
    await expect(
      submitProposal(guest, proposalInput(), {
        ...infrastructure(),
        tableGuestModels: {
          TableOrderProposal: { findOne: () => chain(proposalDoc({ guestSessionId: guest._id })) }
        },
        guestProductsPort: { snapshot: async () => snap() }
      })
    ).rejects.toMatchObject({ code: 'PROPOSAL_ALREADY_OPEN' });
  });

  it('prices the proposal from the real catalog snapshot when no products port is wired', async () => {
    const guest = guestDoc();
    const productId = id();
    const sizeId = id();
    const typeId = id();
    let stored;
    const { proposal } = await submitProposal(
      guest,
      { items: [{ productId: String(productId), productSizeId: String(sizeId), quantity: 2 }] },
      {
        ...infrastructure(),
        tableGuestModels: {
          TableOrderProposal: {
            findOne: () => chain(null),
            create: async ([v]) => {
              stored = { _id: id(), version: 0, status: 'WAITING_WAITER', ...v };
              return [stored];
            }
          }
        },
        productModels: {
          Product: { findOne: () => lean({ _id: productId, name: 'موكا', status: 'ACTIVE' }) },
          ProductSize: {
            findOne: () => lean({ _id: sizeId, productId, typeId, name: 'كبير', sellingPrice: toDecimal128('75'), isActive: true })
          },
          ProductType: { findOne: () => lean({ _id: typeId, productId, name: 'بارد', isActive: true }) },
          ProductAddon: { find: () => lean([]) },
          ProductRecipe: { findOne: () => lean({ version: 2, ingredients: [] }) }
        }
      }
    );
    expect(proposal.status).toBe('WAITING_WAITER');
    expect(stored.items[0]).toMatchObject({ productName: 'موكا', sizeName: 'كبير', typeName: 'بارد', quantity: 2 });
    expect(toApiString(stored.items[0].unitSellingPrice)).toBe('75');
    expect(toApiString(stored.subtotal)).toBe('150');
  });

  it('surfaces the catalog guard rails instead of a 503 when a selection is stale', async () => {
    const guest = guestDoc();
    await expect(
      submitProposal(guest, proposalInput(), {
        ...infrastructure(),
        tableGuestModels: { TableOrderProposal: { findOne: () => chain(null) } },
        productModels: {
          Product: { findOne: () => lean(null) },
          ProductSize: { findOne: () => lean(null) },
          ProductType: { findOne: () => lean(null) },
          ProductAddon: { find: () => lean([]) },
          ProductRecipe: { findOne: () => lean(null) }
        }
      })
    ).rejects.toMatchObject({ code: 'PRODUCT_SELECTION_UNAVAILABLE', status: 409 });
  });
  it('returns the table live order to a guest without leaking cost data', async () => {
    const guest = guestDoc();
    const orderId = id();
    const order = {
      _id: orderId,
      orderNumber: 'ORD-9',
      publicOrderNumber: 'PUB-9',
      status: 'PREPARING',
      fulfillmentType: 'DINE_IN',
      subtotal: money('120'),
      discount: money('0'),
      tax: money('18'),
      total: money('138'),
      balanceDue: money('138'),
      paymentStatus: 'PENDING',
      actualInventoryCost: money('40'),
      actualProfit: money('30')
    };
    const items = [
      {
        _id: id(),
        lineNo: 1,
        productName: 'لاتيه',
        typeName: 'ساخن',
        sizeName: 'كبير',
        addonNames: ['شوكولاتة'],
        notes: 'بدون سكر',
        quantity: 2,
        unitSellingPrice: money('60'),
        lineSubtotal: money('120'),
        actualInventoryCost: money('40'),
        actualProfit: money('20'),
        status: 'PREPARING'
      }
    ];
    const dto = await getGuestActiveOrder(guest, {
      tableSessionModels: {
        TableSession: { findOne: () => lean({ _id: id(), activeOrderId: orderId, status: 'OPEN' }) }
      },
      orderModels: {
        Order: { findById: () => lean(order) },
        OrderItem: { find: () => ({ sort: () => lean(items) }) }
      }
    });
    expect(dto.id).toBe(String(orderId));
    expect(dto.status).toBe('PREPARING');
    expect(dto.tableNumber).toBe(5);
    expect(dto.totals.total).toBe('138');
    expect(dto.items[0]).toMatchObject({
      productName: 'لاتيه',
      sizeName: 'كبير',
      addons: ['شوكولاتة'],
      notes: 'بدون سكر',
      lineSubtotal: '120'
    });
    const serialized = JSON.stringify(dto);
    expect(serialized).not.toContain('actualInventoryCost');
    expect(serialized).not.toContain('actualProfit');
  });
  it('answers with a null order instead of 404 while the table has no order yet', async () => {
    const guest = guestDoc();
    const sessionModels = { TableSession: { findOne: () => lean(null) } };
    const orderModels = { Order: { findById: vi.fn() }, OrderItem: { find: vi.fn() } };
    await expect(
      getGuestActiveOrder(guest, { tableSessionModels: sessionModels, orderModels })
    ).resolves.toBeNull();
    expect(orderModels.Order.findById).not.toHaveBeenCalled();

    const emptySession = { TableSession: { findOne: () => lean({ _id: id(), status: 'OPEN' }) } };
    await expect(
      getGuestActiveOrder(guest, { tableSessionModels: emptySession, orderModels })
    ).resolves.toBeNull();
    expect(orderModels.Order.findById).not.toHaveBeenCalled();
  });
  it('hides a cancelled order from the guest screen', async () => {
    const guest = guestDoc();
    const orderId = id();
    await expect(
      getGuestActiveOrder(guest, {
        tableSessionModels: {
          TableSession: { findOne: () => lean({ _id: id(), activeOrderId: orderId, status: 'OPEN' }) }
        },
        orderModels: {
          Order: { findById: () => lean({ _id: orderId, status: 'CANCELLED' }) },
          OrderItem: { find: vi.fn() }
        }
      })
    ).resolves.toBeNull();
  });
  it('lets guests cancel their open proposal', async () => {
    const guest = guestDoc();
    const proposal = proposalDoc({ guestSessionId: guest._id });
    const result = await cancelProposal(guest, String(proposal._id), {
      ...infrastructure(),
      tableGuestModels: { TableOrderProposal: { findOne: () => chain(proposal) } }
    });
    expect(result.status).toBe('CANCELLED');
    await expect(
      cancelProposal(guest, String(proposal._id), {
        ...infrastructure(),
        tableGuestModels: { TableOrderProposal: { findOne: () => chain(null) } }
      })
    ).rejects.toMatchObject({ code: 'PROPOSAL_CANCEL_CONFLICT' });
  });
  it('walks proposals through waiter review states', async () => {
    const proposal = proposalDoc();
    const models = { TableOrderProposal: { findOne: () => chain(proposal) } };
    const reviewed = await reviewProposal(
      proposal._id,
      { to: 'UNDER_REVIEW', expectedVersion: 0 },
      { ...infrastructure(), tableGuestModels: models }
    );
    expect(reviewed.status).toBe('UNDER_REVIEW');
    const changed = await reviewProposal(
      proposal._id,
      { to: 'NEEDS_CHANGES', note: 'وضح الحجم', expectedVersion: 0 },
      { ...infrastructure(), tableGuestModels: models }
    );
    expect(changed.status).toBe('NEEDS_CHANGES');
    expect(changed.reviewNote).toBe('وضح الحجم');
    await expect(
      reviewProposal(
        proposal._id,
        { to: 'UNDER_REVIEW', expectedVersion: 0 },
        { ...infrastructure(), tableGuestModels: models }
      )
    ).rejects.toMatchObject({ code: 'PROPOSAL_REVIEW_CONFLICT' });
  });
  it('confirms into the open session order when one exists', async () => {
    const table = tableDoc();
    const proposal = proposalDoc({ tableId: table._id });
    const active = { _id: id(), activeOrderId: id() };
    const order = { _id: active.activeOrderId, version: 2, status: 'PREPARING' };
    const fullOrder = { _id: order._id, save: vi.fn() };
    const append = vi.fn(async () => ({ order, addedItems: [{}], totals: {}, progress: {} }));
    const open = vi.fn(async () => ({}));
    const result = await confirmProposal(
      proposal._id,
      { expectedVersion: 0, expectedTableVersion: 0, expectedOrderVersion: 2 },
      {
        ...infrastructure(),
        tableGuestModels: {
          TableOrderProposal: { findOne: () => chain(proposal) },
          Table: { findOne: () => chain(table) }
        },
        tablesModels: { TableSession: { findOne: () => chain(active) } },
        tablesModule: { open },
        orderModule: { append },
        guestOrderModels: { Order: { findById: () => chain(fullOrder) } }
      }
    );
    expect(append).toHaveBeenCalledTimes(1);
    expect(open).not.toHaveBeenCalled();
    expect(result.proposal.status).toBe('CONFIRMED');
    expect(String(result.proposal.confirmedOrderId)).toBe(String(order._id));
    expect(String(fullOrder.tableGuestSessionId)).toBe(String(proposal.guestSessionId));
  });
  it('opens a fresh session order when the table is free', async () => {
    const table = tableDoc();
    const proposal = proposalDoc({ tableId: table._id });
    const order = { _id: id(), version: 0, status: 'CONFIRMED' };
    const session = { _id: id(), status: 'OPEN' };
    const fullOrder = { _id: order._id, save: vi.fn() };
    const open = vi.fn(async () => ({ table, session, order, items: [], totals: {} }));
    const result = await confirmProposal(
      proposal._id,
      { expectedVersion: 0, expectedTableVersion: 0 },
      {
        ...infrastructure(),
        tableGuestModels: {
          TableOrderProposal: { findOne: () => chain(proposal) },
          Table: { findOne: () => chain(table) }
        },
        tablesModels: { TableSession: { findOne: () => chain(null) } },
        tablesModule: { open },
        orderModule: { append: vi.fn() },
        guestOrderModels: { Order: { findById: () => chain(fullOrder) } }
      }
    );
    expect(open).toHaveBeenCalledTimes(1);
    expect(result.proposal.status).toBe('CONFIRMED');
  });
  it('rejects confirming an already confirmed proposal', async () => {
    const proposal = proposalDoc({ status: 'CONFIRMED' });
    await expect(
      confirmProposal(
        proposal._id,
        { expectedVersion: 0, expectedTableVersion: 0 },
        {
          ...infrastructure(),
          tableGuestModels: {
            TableOrderProposal: { findOne: () => chain(null) },
            Table: {}
          }
        }
      )
    ).rejects.toMatchObject({ code: 'PROPOSAL_CONFIRM_CONFLICT' });
  });
  it('isolates guest sessions by token', async () => {
    const correct = 'correct-token-value-0123456789ab';
    const session = guestDoc({ tokenHash: hashToken(correct) });
    const models = {
      TableGuestSession: {
        findOne: (query) => ({
          select: () =>
            query.tokenHash === hashToken(correct) ? { ...session, save: vi.fn() } : null
        })
      }
    };
    await expect(
      resolveGuestSession('wrong-token-value-0123456789abcdef', { tableGuestModels: models })
    ).rejects.toMatchObject({ code: 'TABLE_TOKEN_INVALID' });
    const expired = guestDoc({
      tokenHash: hashToken('expired-token-value-0123456789ab'),
      expiresAt: new Date(Date.now() - 1000),
      save: vi.fn()
    });
    await expect(
      resolveGuestSession('expired-token-value-0123456789ab', {
        tableGuestModels: {
          TableGuestSession: { findOne: () => ({ select: () => expired }) }
        }
      })
    ).rejects.toMatchObject({ code: 'TABLE_TOKEN_EXPIRED' });
    expect(expired.status).toBe('EXPIRED');
  });
  it('reviews dine-in orders only through their own guest session', async () => {
    const guest = guestDoc();
    const order = {
      _id: id(),
      status: 'COMPLETED',
      fulfillmentType: 'DINE_IN',
      customerId: null
    };
    const submit = vi.fn(async () => ({ _id: id() }));
    const models = {
      TableOrderProposal: {
        findOne: () => ({ session: () => ({ lean: async () => ({ _id: id(), status: 'CONFIRMED' }) }) })
      }
    };
    const result = await submitGuestReview(
      guest,
      order._id,
      { rating: 5, expectedOrderVersion: 0 },
      {
        ...infrastructure(),
        tableGuestModels: models,
        guestOrderModels: { Order: { findById: () => ({ session: () => ({ lean: async () => order }) }) } },
        guestReviewModule: { submit }
      }
    );
    expect(submit).toHaveBeenCalledWith(
      order._id,
      expect.objectContaining({ owner: { type: 'GUEST', guestSessionId: guest._id } }),
      expect.anything()
    );
    expect(result).toBeDefined();
    await expect(
      submitGuestReview(
        guest,
        order._id,
        { rating: 5, expectedOrderVersion: 0 },
        {
          ...infrastructure(),
          tableGuestModels: {
            TableOrderProposal: { findOne: () => ({ session: () => ({ lean: async () => null }) }) }
          },
          guestOrderModels: { Order: { findById: () => ({ session: () => ({ lean: async () => order }) }) } },
          guestReviewModule: { submit: vi.fn() }
        }
      )
    ).rejects.toMatchObject({ code: 'REVIEW_GUEST_NOT_LINKED' });
  });
  it('stores guest ownership on dine-in reviews', async () => {
    const guestId = id();
    const order = {
      _id: id(),
      version: 0,
      status: 'COMPLETED',
      fulfillmentType: 'DINE_IN',
      customerId: null
    };
    let stored;
    const review = await submitOrderReview(
      order._id,
      { rating: 4, expectedOrderVersion: 0, owner: { type: 'GUEST', guestSessionId: guestId } },
      {
        ...infrastructure(),
        reviewModels: {
          Order: { findById: () => chain(order) },
          OrderReview: {
            create: async ([v]) => {
              stored = { _id: id(), version: 0, ...v };
              return [stored];
            }
          },
          OrderReviewRevision: { create: vi.fn() }
        }
      }
    );
    expect(String(review.tableGuestSessionId)).toBe(String(guestId));
    expect(review.customerId).toBeUndefined();
    expect(money('1')).toBeDefined();
  });
  it('keeps dine-in reviews closed to the admin customer path', async () => {
    const order = {
      _id: id(),
      version: 0,
      status: 'COMPLETED',
      fulfillmentType: 'DINE_IN',
      customerId: null
    };
    await expect(
      submitOrderReview(
        order._id,
        { rating: 4, expectedOrderVersion: 0 },
        {
          ...infrastructure(),
          reviewModels: {
            Order: { findById: () => chain(order) },
            OrderReview: { create: vi.fn() },
            OrderReviewRevision: { create: vi.fn() }
          }
        }
      )
    ).rejects.toMatchObject({ code: 'REVIEW_FULFILLMENT_DEFERRED' });
  });
});
