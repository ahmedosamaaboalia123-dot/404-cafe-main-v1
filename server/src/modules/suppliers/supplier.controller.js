import { sendCreated, sendSuccess } from '../../platform/http/response.js';
import { toAccountDto, toEntryDto, toSupplierDto } from './supplier.mapper.js';
import { getSupplierDetails, getSuppliersScreen, listSupplierEntries } from './supplier.queries.js';
import {
  createSupplier,
  createSupplierAccountEntry,
  deleteSupplier,
  deleteSupplierEntry,
  updateSupplierEntry,
  updateSupplier
} from './supplier.service.js';

const contextFrom = (req, dependencies) => ({
  ...req.auth,
  currency: dependencies.config.business.currency,
  operationRequestId: req.operationRequestId,
  ...dependencies.serviceContext
});
const cashDto = (value) =>
  value
    ? {
        id: String((value.transaction ?? value).id ?? (value.transaction ?? value)._id),
        direction: (value.transaction ?? value).direction,
        amount: (value.transaction ?? value).amount?.toString(),
        balanceAfter: (value.transaction ?? value).balanceAfter?.toString()
      }
    : null;
export function createSupplierController(dependencies) {
  return {
    screen: async (req, res) =>
      sendSuccess(
        res,
        await getSuppliersScreen(req.validated.query, contextFrom(req, dependencies))
      ),
    create: async (req, res) => {
      const result = await createSupplier(req.validated.body, contextFrom(req, dependencies));
      return sendCreated(res, {
        supplier: toSupplierDto(result.supplier),
        account: toAccountDto(result.account)
      });
    },
    details: async (req, res) =>
      sendSuccess(
        res,
        await getSupplierDetails(
          req.validated.params.id,
          String(req.query.include ?? '')
            .split(',')
            .filter(Boolean),
          contextFrom(req, dependencies)
        )
      ),
    update: async (req, res) => {
      const result = await updateSupplier(
        req.validated.params.id,
        req.validated.body,
        contextFrom(req, dependencies)
      );
      return sendSuccess(res, { supplier: toSupplierDto(result.supplier) });
    },
    deleteSupplier: async (req, res) => sendSuccess(res, await deleteSupplier(req.validated.params.id, req.validated.body, contextFrom(req, dependencies))),
    createEntry: async (req, res) => {
      const result = await createSupplierAccountEntry(
        req.validated.params.id,
        req.validated.body,
        contextFrom(req, dependencies)
      );
      return sendCreated(res, {
        entry: toEntryDto(result.entry),
        account: toAccountDto(result.account),
        drawerTransaction: cashDto(result.drawerTransaction)
      });
    },
    entries: async (req, res) =>
      sendSuccess(
        res,
        await listSupplierEntries(
          req.validated.params.id,
          req.validated.query,
          contextFrom(req, dependencies)
        )
      ),
    deleteEntry: async (req, res) => {
      const result = await deleteSupplierEntry(req.validated.params.id, req.validated.body, contextFrom(req, dependencies));
      return sendSuccess(res, { deleted: result.deleted, entryId: result.entryId, account: toAccountDto(result.account), drawerTransaction: cashDto(result.drawerTransaction) });
    },
    updateEntry: async (req, res) => {
      const result = await updateSupplierEntry(req.validated.params.id, req.validated.body, contextFrom(req, dependencies));
      return sendSuccess(res, { entry: toEntryDto(result.entry), account: toAccountDto(result.account), drawerTransaction: cashDto(result.drawerTransaction) });
    }
  };
}
