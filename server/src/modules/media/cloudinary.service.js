import { v2 as cloudinarySdk } from 'cloudinary';
import { ApiError } from '../../platform/http/api-error.js';

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/**
 * Resolves the Cloudinary connection settings. Values come from the injected
 * service context (built from the environment) and fall back to process.env so the
 * service stays usable in scripts and tests. No secret is ever logged.
 */
export function cloudinaryConfig(context = {}) {
  const source = context.cloudinaryConfig ?? {};
  const cloudName = text(source.cloudName ?? process.env.CLOUDINARY_CLOUD_NAME);
  const apiKey = text(source.apiKey ?? process.env.CLOUDINARY_API_KEY);
  const apiSecret = text(source.apiSecret ?? process.env.CLOUDINARY_API_SECRET);
  const folder = text(source.folder ?? process.env.CLOUDINARY_FOLDER) || 'products';
  return { cloudName, apiKey, apiSecret, folder, enabled: Boolean(cloudName && apiKey && apiSecret) };
}

export function isCloudinaryReady(context = {}) {
  if (context.cloudinaryPort) return true;
  return cloudinaryConfig(context).enabled;
}

function clientFor(context = {}) {
  if (context.cloudinaryPort) return context.cloudinaryPort;
  const config = cloudinaryConfig(context);
  if (!config.enabled)
    throw new ApiError({
      code: 'MEDIA_CLOUD_NOT_CONFIGURED',
      status: 503,
      messageAr: 'تخزين الصور السحابي غير مُعد'
    });
  cloudinarySdk.config({
    cloud_name: config.cloudName,
    api_key: config.apiKey,
    api_secret: config.apiSecret,
    secure: true
  });
  return cloudinarySdk;
}

// `upload()` only accepts a path or a remote URL, so raw bytes go through
// `upload_stream`. Both helpers use the v2 signature: (args..., options, callback)
// where the callback is node-style (error, result).
function uploadBuffer(client, buffer, options) {
  return new Promise((resolve, reject) => {
    let stream;
    try {
      stream = client.uploader.upload_stream(options, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    } catch (error) {
      reject(error);
      return;
    }
    if (!stream || typeof stream.end !== 'function') {
      reject(new Error('cloudinary-stream-unavailable'));
      return;
    }
    stream.on('error', reject);
    stream.end(buffer);
  });
}

function destroyRemote(client, publicId, options) {
  return new Promise((resolve, reject) => {
    let pending;
    try {
      pending = client.uploader.destroy(publicId, options, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    } catch (error) {
      reject(error);
      return;
    }
    if (pending && typeof pending.then === 'function')
      pending.then(
        (result) => resolve(result),
        (error) => reject(error)
      );
  });
}

/**
 * Uploads raw image bytes and returns the remote coordinates. `secure_url` is the
 * URL stored in the database, `public_id` is what a later destroy needs. The
 * caller owns both; this function never persists anything.
 */
export async function uploadCloudinaryImage(buffer, input = {}, context = {}) {
  const config = cloudinaryConfig(context);
  const client = clientFor(context);
  const filename = text(input.filenameOverride) || text(input.publicId) || 'upload';
  let result;
  try {
    result = await uploadBuffer(client, buffer, {
      resource_type: 'image',
      timeout: 60000,
      folder: text(input.folder) || config.folder,
      public_id: text(input.publicId) || undefined,
      filename: filename
    });
  } catch (error) {
    throw new ApiError({
      code: 'MEDIA_UPLOAD_FAILED',
      status: 502,
      messageAr: 'تعذر رفع الصورة إلى التخزين السحابي',
      details: { provider: 'cloudinary' },
      cause: error
    });
  }
  if (!result?.secure_url || !result?.public_id)
    throw new ApiError({
      code: 'MEDIA_UPLOAD_FAILED',
      status: 502,
      messageAr: 'تعذر رفع الصورة',
      details: { provider: 'cloudinary' }
    });
  return {
    publicId: result.public_id,
    secureUrl: result.secure_url,
    format: result.format ?? null,
    width: result.width ?? null,
    height: result.height ?? null,
    bytes: result.bytes ?? null
  };
}

/**
 * Removes a previously uploaded image. Without a confirmed public_id nothing is
 * called, so an asset we cannot address is never destroyed blindly.
 */
export async function destroyCloudinaryImage(publicId, context = {}) {
  const target = text(publicId);
  if (!target) return null;
  const client = clientFor(context);
  try {
    const result = await destroyRemote(client, target, {
      resource_type: 'image',
      timeout: 60000,
      invalidate: true
    });
    return { result: result?.result ?? 'unknown' };
  } catch (error) {
    throw new ApiError({
      code: 'MEDIA_REMOTE_DELETE_FAILED',
      status: 502,
      messageAr: 'تعذر حذف الصورة من التخزين السحابي',
      details: { provider: 'cloudinary' },
      cause: error
    });
  }
}
