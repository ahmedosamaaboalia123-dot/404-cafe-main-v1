import { sendCreated, sendSuccess } from '../../platform/http/response.js';
import { paymentDto } from './payment.mapper.js';
import {
  collectCash,
  settleCodPayment
} from './payment.service.js';
import { listOrderPayments } from './payment.queries.js';
import { transactionDto } from '../drawer/drawer.service.js';
const ctx = (r, d) => ({
  ...r.auth,
  ...d.serviceContext,
  operationRequestId: r.operationRequestId
});
const resultDto = (x) => ({
  payment: paymentDto(x.payment),
  order: x.order,
  drawerTransaction: x.drawerTransaction ? transactionDto(x.drawerTransaction) : null
});
export function createPaymentController(d) {
  return {
    collect: async (r, s) =>
      sendCreated(
        s,
        resultDto(await collectCash(r.validated.params.id, r.validated.body, ctx(r, d)))
      ),
    settle: async (r, s) =>
      sendSuccess(
        s,
        resultDto(await settleCodPayment(r.validated.params.id, r.validated.body, ctx(r, d)))
      ),
    list: async (r, s) =>
      sendSuccess(s, await listOrderPayments(r.validated.params.id, r.validated.query, ctx(r, d)))
  };
}
