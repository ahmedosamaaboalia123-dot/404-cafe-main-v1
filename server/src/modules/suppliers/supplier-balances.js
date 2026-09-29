import { add, compare, subtract, toDecimal128 } from '../../platform/database/decimal.js';

export function entryEffect(kind, amount) {
  if (kind === 'DEBT') return { debt: amount, receivable: '0' };
  if (kind === 'RECEIVABLE') return { debt: '0', receivable: amount };
  if (kind === 'DEBT_PAYMENT') return { debt: subtract('0', amount), receivable: '0' };
  if (kind === 'RECEIVABLE_COLLECTION') return { debt: '0', receivable: subtract('0', amount) };
  throw new Error('INVALID_SUPPLIER_ENTRY_KIND');
}

export function displayBalances(debt, receivable) {
  if (compare(debt, '0') >= 0 && compare(receivable, '0') >= 0) return { debt, receivable };
  const net = subtract(debt, receivable);
  return compare(net, '0') >= 0 ? { debt: net, receivable: '0' } : { debt: '0', receivable: subtract('0', net) };
}

export function applyEntryChange(account, kind, amountDelta) {
  const effect = entryEffect(kind, amountDelta);
  const debt = add(account.debtLedgerBalance ?? account.debtBalance, effect.debt);
  const receivable = add(account.receivableLedgerBalance ?? account.receivableBalance, effect.receivable);
  const visible = displayBalances(debt, receivable);
  account.debtLedgerBalance = toDecimal128(debt);
  account.receivableLedgerBalance = toDecimal128(receivable);
  account.debtBalance = toDecimal128(visible.debt);
  account.receivableBalance = toDecimal128(visible.receivable);
}

