import { describe, expect, it } from 'vitest';
import { toTransactionPage } from '@/modules/admin/drawer/adapters/drawer.adapter';
describe('drawer transactions without reversal actions', () => {
  it('returns normal movements without generating reversal flags', () => {
    const page = toTransactionPage({ items: [{ id: 'tx1', sourceType: 'MANUAL', direction: 'OUT', amount: '100' }], pageMeta: { page: 1, limit: 10, totalItems: 1 } });
    expect(page.items[0].amount).toBe('100');
    expect(page.items[0]).not.toHaveProperty('reversible');
    expect(page.items[0]).not.toHaveProperty('isReversal');
  });
});
