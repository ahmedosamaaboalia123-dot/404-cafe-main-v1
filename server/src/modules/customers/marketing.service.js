import { runInTransaction } from '../../platform/database/transaction.js';
import { ApiError } from '../../platform/http/api-error.js';
import { writeAudit } from '../../platform/audit/audit-writer.js';
import { Customer, CustomerMarketingMessage, CustomerMarketingTemplate } from './customer.models.js';

const defaults = { Customer, CustomerMarketingMessage, CustomerMarketingTemplate };

export async function listMarketingTemplates(context = {}) {
  const models = context.customerModels ?? defaults;
  return models.CustomerMarketingTemplate.find({ active: true }).sort({ updatedAt: -1, _id: -1 }).lean();
}

export async function createMarketingTemplate(input, context = {}) {
  return runInTransaction(async (tx) => {
    const models = context.customerModels ?? defaults;
    const [template] = await models.CustomerMarketingTemplate.create([
      { ...input, createdBy: context.actorId, updatedBy: context.actorId }
    ], { session: tx.session });
    await writeAudit({ eventType: 'CUSTOMER_MARKETING_TEMPLATE_CREATED', category: 'CUSTOMERS', module: 'customers', action: 'MARKETING_TEMPLATE_CREATED', actor: { type: context.actorType, id: context.actorId }, entity: { type: 'CustomerMarketingTemplate', id: template._id }, result: 'SUCCESS', severity: 'INFO', requestId: context.requestId }, { ...context, ...tx });
    return template;
  }, context, context.transactionOptions);
}

export async function recordMarketingMessage(customerId, input, context = {}) {
  return runInTransaction(async (tx) => {
    const models = context.customerModels ?? defaults;
    const [customer, template] = await Promise.all([
      models.Customer.findById(customerId).session(tx.session),
      models.CustomerMarketingTemplate.findById(input.templateId).session(tx.session)
    ]);
    if (!customer) throw new ApiError({ code: 'CUSTOMER_NOT_FOUND', status: 404, messageAr: 'العميل غير موجود' });
    if (!template || !template.active) throw new ApiError({ code: 'MARKETING_TEMPLATE_NOT_FOUND', status: 404, messageAr: 'قالب الرسالة غير متاح' });
    if (!customer.phoneNormalized) throw new ApiError({ code: 'CUSTOMER_PHONE_REQUIRED', status: 422, messageAr: 'لا يوجد رقم واتساب صالح للعميل' });
    const [message] = await models.CustomerMarketingMessage.create([{
      customerId: customer._id, templateId: template._id, templateName: template.name,
      phone: customer.phoneNormalized, message: input.message, sentBy: context.actorId
    }], { session: tx.session });
    await writeAudit({ eventType: 'CUSTOMER_MARKETING_MESSAGE_SENT', category: 'CUSTOMERS', module: 'customers', action: 'MARKETING_MESSAGE_SENT', actor: { type: context.actorType, id: context.actorId }, entity: { type: 'Customer', id: customer._id }, result: 'SUCCESS', severity: 'INFO', metadataSafe: { templateName: template.name }, requestId: context.requestId }, { ...context, ...tx });
    return message;
  }, context, context.transactionOptions);
}
