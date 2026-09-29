import { z } from 'zod';
import mongoose from 'mongoose';
import { Notification } from './notifications.models.js';
import { runInTransaction } from '../../platform/database/transaction.js';
import { validateService } from '../../platform/http/validate-service.js';
const recipient = z.union([z.string().regex(/^[a-f\d]{24}$/i), z.instanceof(mongoose.Types.ObjectId)]).transform(String);
const payloadSchema = z.object({ type: z.string().min(1).max(100), title: z.string().min(1).max(300), message: z.string().max(2000).optional(), severity: z.enum(['INFO','NOTICE','WARNING','CRITICAL']).default('INFO'), deduplicationKey: z.string().min(1).max(300), entityType: z.string().optional(), entityId: z.union([z.string(), z.instanceof(mongoose.Types.ObjectId)]).optional(), link: z.string().optional(), metadataSafe: z.record(z.string(), z.unknown()).optional() }).strict();

export async function createNotifications(recipients, payload, context = {}) {
  const ids = [...new Set(validateService(z.array(recipient).max(1000), recipients))];
  payload = validateService(payloadSchema, payload);
  return runInTransaction(async (tx) => {
    const models = context.notificationModels ?? { Notification };
    let created = 0;
    for (const recipientId of ids) {
      const result = await models.Notification.updateOne(
        { recipientEmployeeId: recipientId, deduplicationKey: payload.deduplicationKey },
        { $setOnInsert: { ...payload, recipientEmployeeId: recipientId, entityId: payload.entityId ? String(payload.entityId) : undefined, createdAt: context.now ?? new Date() } },
        { upsert: true, session: tx.session },
      );
      created += result.upsertedCount ?? 0;
    }
    return { created, skipped: recipients.length - created };
  }, context, { ...context.transactionOptions, retryDuplicateKeys: true });
}

export async function markNotificationRead(id, employeeId, context = {}) {
  validateService(recipient, id); validateService(recipient, employeeId);
  return runInTransaction(async (tx) => {
    const models = context.notificationModels ?? { Notification };
    const row = await models.Notification.findOneAndUpdate(
      { _id: id, recipientEmployeeId: employeeId, readAt: null },
      { $set: { readAt: context.now ?? new Date() } }, { new: true, session: tx.session },
    );
    const unreadCount = await models.Notification.countDocuments({ recipientEmployeeId: employeeId, readAt: null }).session(tx.session);
    return { updatedCount: row ? 1 : 0, unreadCount };
  }, context, context.transactionOptions);
}

export async function markAllNotificationsRead(employeeId, before, context = {}) {
  validateService(recipient, employeeId);
  if (before !== undefined) validateService(z.iso.datetime({ offset: true }), before);
  const now = context.now ?? new Date();
  const cutoff = before ? new Date(Math.min(new Date(before).getTime(), now.getTime())) : now;
  return runInTransaction(async (tx) => {
    const models = context.notificationModels ?? { Notification };
    const result = await models.Notification.updateMany(
      { recipientEmployeeId: employeeId, readAt: null, createdAt: { $lte: cutoff } },
      { $set: { readAt: now } }, { session: tx.session },
    );
    const unreadCount = await models.Notification.countDocuments({ recipientEmployeeId: employeeId, readAt: null }).session(tx.session);
    return { updatedCount: result.modifiedCount ?? 0, unreadCount };
  }, context, context.transactionOptions);
}
