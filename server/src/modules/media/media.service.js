import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { z } from 'zod';
import { validateService } from '../../platform/http/validate-service.js';
import { runInTransaction } from '../../platform/database/transaction.js';
import { writeAudit } from '../../platform/audit/audit-writer.js';
import { nextSequence } from '../../platform/database/sequence.js';
import { ApiError } from '../../platform/http/api-error.js';
import { logger } from '../../platform/observability/logger.js';
import { Product } from '../products/product.models.js';
import { cloudinaryConfig, destroyCloudinaryImage, isCloudinaryReady, uploadCloudinaryImage } from './cloudinary.service.js';
import { MediaAsset } from './media.models.js';

const MAX_BYTES = 2 * 1024 * 1024;
const ALLOWED = [
  { mime: 'image/jpeg', extension: '.jpg', magic: [0xff, 0xd8, 0xff] },
  { mime: 'image/png', extension: '.png', magic: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  {
    mime: 'image/webp',
    extension: '.webp',
    prefix: [0x52, 0x49, 0x46, 0x46],
    suffix: [0x57, 0x45, 0x42, 0x50],
    suffixAt: 8
  }
];

function detectImage(buffer) {
  for (const type of ALLOWED) {
    const head = type.magic ?? type.prefix;
    if (!head.every((byte, index) => buffer[index] === byte)) continue;
    if (type.suffix && !type.suffix.every((byte, index) => buffer[type.suffixAt + index] === byte))
      continue;
    return type;
  }
  return null;
}

export function mediaConfig(context = {}) {
  return {
    storageDir: resolve(
      context.mediaConfig?.storageDir ?? process.env.MEDIA_STORAGE_DIR ?? './uploads'
    ),
    urlSecret: context.mediaConfig?.urlSecret ?? process.env.MEDIA_URL_SECRET ?? '',
    maxBytes: context.mediaConfig?.maxBytes ?? MAX_BYTES
  };
}

export async function uploadAsset(file, input = {}, context = {}) {
  const models = context.mediaModels ?? { MediaAsset };
  const config = mediaConfig(context);
  if (!file?.buffer || file.buffer.length === 0)
    throw new ApiError({ code: 'MEDIA_EMPTY_FILE', status: 422, messageAr: 'ملف الصورة فارغ' });
  if (file.buffer.length > config.maxBytes)
    throw new ApiError({
      code: 'MEDIA_TOO_LARGE',
      status: 413,
      messageAr: 'حجم الصورة أكبر من المسموح'
    });
  const detected = detectImage(file.buffer);
  if (!detected)
    throw new ApiError({
      code: 'MEDIA_TYPE_REJECTED',
      status: 422,
      messageAr: 'نوع الملف غير مدعوم (صور فقط)'
    });
  input = validateService(z.object({ purpose: z.literal('PRODUCT_IMAGE').optional(), folder: z.string().regex(/^[a-zA-Z0-9/_-]+$/).max(100).optional() }).strict(), input);
  if (context.session) throw new ApiError({ code: 'MEDIA_UPLOAD_TRANSACTION_UNSUPPORTED', status: 409, messageAr: 'رفع الصورة يجب أن يكتمل قبل حفظ المنتج' });
  const sequence = await nextSequence('media-asset', context);
  const assetNo = `MED-${String(sequence).padStart(8, '0')}`;
  const checksum = createHash('sha256').update(file.buffer).digest('hex');
  const storageKey = `${assetNo}${detected.extension}`;
  const base = {
    assetNo,
    purpose: input.purpose ?? 'PRODUCT_IMAGE',
    mimeType: detected.mime,
    sizeBytes: file.buffer.length,
    checksum,
    storageKey,
    uploadedBy: context.actorId,
    operationRequestId: context.operationRequestId
  };

  if (!isCloudinaryReady(context))
    throw new ApiError({
      code: 'MEDIA_CLOUD_NOT_CONFIGURED',
      status: 503,
      messageAr: 'تخزين الصور السحابي غير مُعد'
    });

  const now = context.now ?? new Date();
  const folder = input.folder ?? cloudinaryConfig(context).folder;
  const [pending] = await models.MediaAsset.create([{ ...base, status: 'UPLOADING', provider: 'CLOUDINARY', publicId: folder + '/' + assetNo, cleanupStatus: 'PENDING', cleanupNextAttemptAt: new Date(now.getTime() + 15 * 60000) }]);
  try {
    const remote = await uploadCloudinaryImage(file.buffer, { publicId: assetNo, folder, filenameOverride: assetNo }, context);
    return await runInTransaction(async (tx) => {
      const asset = await models.MediaAsset.findOneAndUpdate({ _id: pending._id, status: 'UPLOADING' }, { $set: { ...remote, status: 'READY', cleanupStatus: 'DONE' }, $unset: { cleanupNextAttemptAt: '', cleanupErrorCode: '' } }, { new: true, session: tx.session });
      if (!asset) throw new ApiError({ code: 'MEDIA_UPLOAD_EXPIRED', status: 409, messageAr: 'انتهت مهلة رفع الصورة، أعد المحاولة' });
      await recordMedia('MEDIA_UPLOADED', asset, { ...context, ...tx });
      return asset;
    }, context, context.transactionOptions);
  } catch (error) {
    // The staging row already records the deterministic provider ID, even if MongoDB is unavailable now.
    await models.MediaAsset.updateOne({ _id: pending._id, status: 'UPLOADING' }, { $set: { status: 'DELETED', cleanupNextAttemptAt: now } }).catch(() => null);
    await processMediaCleanup({ ...context, assetId: pending._id }).catch(() => null);
    throw error;
  }
}

async function recordMedia(eventType, asset, context) {
  await writeAudit({ eventType, category: 'BUSINESS', module: 'media', action: eventType, actor: { type: context.actorType ?? 'EMPLOYEE', id: context.actorId }, entity: { type: 'MediaAsset', id: asset._id }, result: 'SUCCESS', severity: 'INFO', metadataSafe: { assetNo: asset.assetNo }, requestId: context.requestId }, context);
}

export async function assertReadyAsset(assetId, context = {}) {
  const models = context.mediaModels ?? { MediaAsset };
  // A real write serializes product attachment against deletion of this same asset.
  const asset = await models.MediaAsset.findOneAndUpdate({ _id: assetId, status: 'READY' }, { $inc: { referenceVersion: 1 } }, { new: true, session: context.session }).lean();
  if (!asset) throw new ApiError({ code: 'ASSET_NOT_READY', status: 409, messageAr: 'الصورة غير موجودة أو غير متاحة للاستخدام' });
  return asset;
}

export function signAssetUrl(assetId, context = {}) {
  const config = mediaConfig(context);
  if (!config.urlSecret)
    throw new ApiError({ code: 'MEDIA_URL_DISABLED', status: 503, messageAr: 'روابط الصور معطلة' });
  const exp = Math.floor(Date.now() / 1000) + 15 * 60;
  const data = `${assetId}.${exp}`;
  const sig = createHmac('sha256', config.urlSecret).update(data).digest('hex');
  return { url: `/media/${assetId}/content?sig=${sig}&exp=${exp}`, exp };
}

export function verifyAssetUrl(assetId, sig, exp, context = {}) {
  const config = mediaConfig(context);
  if (!config.urlSecret || !sig || !exp) return false;
  if (Number(exp) * 1000 <= Date.now()) return false;
  const expected = createHmac('sha256', config.urlSecret).update(`${assetId}.${exp}`).digest();
  const supplied = Buffer.from(String(sig), 'hex');
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

async function markAssetForDeletion(assetId, input, context, unusedOnly) {
  return runInTransaction(async (tx) => {
    const scope = { ...context, ...tx };
    const models = context.mediaModels ?? { MediaAsset };
    const asset = await models.MediaAsset.findOne({ _id: assetId, ...(unusedOnly ? {} : { version: input.expectedVersion }) }).session(tx.session);
    if (!asset || asset.status === 'DELETED') {
      if (unusedOnly) return null;
      throw new ApiError({ code: 'ASSET_VERSION_CONFLICT', status: 409, messageAr: 'الصورة غير موجودة أو تغيرت' });
    }
    const isReferenced = context.mediaProductsPort?.isReferenced ?? (async (targetId) => (await (context.productModels ?? { Product }).Product.countDocuments({ imageId: targetId }).session(tx.session)) > 0);
    if (await isReferenced(asset._id, scope)) {
      if (unusedOnly) return null;
      throw new ApiError({ code: 'ASSET_IN_USE', status: 409, messageAr: 'الصورة مستخدمة في منتج ولا يمكن حذفها' });
    }
    asset.status = 'DELETED';
    asset.deletedAt = context.now ?? new Date();
    asset.deleteReason = input.reason ?? (unusedOnly ? 'image-replaced' : 'admin-delete');
    asset.cleanupStatus = 'PENDING';
    asset.cleanupNextAttemptAt = context.now ?? new Date();
    await asset.save({ session: tx.session });
    await recordMedia(unusedOnly ? 'MEDIA_RELEASED' : 'MEDIA_DELETED', asset, scope);
    return asset;
  }, context, context.transactionOptions);
}

export async function deleteAsset(assetId, input, context = {}) {
  input = validateService(z.object({ expectedVersion: z.number().int().min(0), reason: z.string().trim().max(500).optional() }).strict(), input);
  const asset = await markAssetForDeletion(assetId, input, context, false);
  if (!context.session) await processMediaCleanup({ ...context, assetId }).catch((error) => logger.warn('media.cleanup-deferred', { code: error?.code ?? 'UNKNOWN' }));
  return asset;
}

export async function releaseUnusedAsset(assetId, context = {}) {
  if (!assetId) return null;
  const asset = await markAssetForDeletion(assetId, {}, context, true);
  if (asset && !context.session) await processMediaCleanup({ ...context, assetId }).catch((error) => logger.warn('media.cleanup-deferred', { code: error?.code ?? 'UNKNOWN' }));
  return asset;
}

export async function processMediaCleanup(context = {}) {
  if (context.session) throw new Error('Media cleanup must run after commit');
  const model = context.mediaModels?.MediaAsset ?? MediaAsset;
  const now = context.now ?? new Date();
  let processed = 0, failed = 0;
  for (let index = 0; index < (context.assetId ? 1 : 10); index += 1) {
    const asset = await model.findOneAndUpdate({
      ...(context.assetId ? { _id: context.assetId } : {}),
      status: { $in: ['DELETED', 'UPLOADING'] }, cleanupStatus: 'PENDING', cleanupNextAttemptAt: { $lte: now },
      $or: [{ cleanupLeaseUntil: { $exists: false } }, { cleanupLeaseUntil: { $lte: now } }],
    }, { $set: { status: 'DELETED', cleanupLeaseUntil: new Date(now.getTime() + 5 * 60000) }, $inc: { cleanupAttempts: 1 } }, { new: true, sort: { cleanupNextAttemptAt: 1, _id: 1 } });
    if (!asset) break;
    try {
      if (asset.publicId) {
        const result = await destroyCloudinaryImage(asset.publicId, context);
        if (!['ok', 'not found'].includes(result?.result)) throw new Error('REMOTE_CLEANUP_UNCONFIRMED');
      }
      if (asset.provider === 'LOCAL' && asset.storageKey) {
        const directory = mediaConfig(context).storageDir, target = resolve(directory, asset.storageKey), offset = relative(directory, target);
        if (!offset || offset.startsWith('..') || isAbsolute(offset)) throw new Error('MEDIA_PATH_OUTSIDE_STORAGE');
        await unlink(target).catch((error) => { if (error.code !== 'ENOENT') throw error; });
      }
      await model.updateOne({ _id: asset._id, cleanupLeaseUntil: asset.cleanupLeaseUntil }, { $set: { cleanupStatus: 'DONE' }, $unset: { cleanupLeaseUntil: '', cleanupErrorCode: '', cleanupNextAttemptAt: '' } });
      processed += 1;
    } catch (error) {
      failed += 1;
      const delay = Math.min(24 * 60, 2 ** Math.min(asset.cleanupAttempts ?? 1, 10)) * 60000;
      await model.updateOne({ _id: asset._id, cleanupLeaseUntil: asset.cleanupLeaseUntil }, { $set: { cleanupErrorCode: error.code ?? 'CLEANUP_FAILED', cleanupNextAttemptAt: new Date(now.getTime() + delay) }, $unset: { cleanupLeaseUntil: '' } });
    }
  }
  return { processed, failed };
}
