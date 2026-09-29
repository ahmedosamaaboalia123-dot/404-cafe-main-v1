import multer from 'multer';
import { sendCreated, sendSuccess } from '../../platform/http/response.js';
import { ApiError } from '../../platform/http/api-error.js';
import { deleteAsset, uploadAsset } from './media.service.js';
import { assetDto } from './media.queries.js';
import { getAssetContent, getSignedAsset, listAssets } from './media.queries.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024, files: 1 }
});

export const uploadSingleImage = upload.single('image');

const ctx = (r, d) => ({ ...r.auth, ...d.serviceContext });

export function createMediaController(d) {
  return {
    upload: async (r, s) => {
      if (!r.file)
        throw new ApiError({ code: 'MEDIA_EMPTY_FILE', status: 422, messageAr: 'ملف الصورة فارغ' });
      const asset = await uploadAsset(r.file, { purpose: 'PRODUCT_IMAGE' }, ctx(r, d));
      return sendCreated(s, { asset: assetDto(asset.toObject ? asset.toObject() : asset) });
    },
    list: async (r, s) => sendSuccess(s, await listAssets(r.validated.query, ctx(r, d))),
    details: async (r, s) => {
      const { asset, signed, directUrl } = await getSignedAsset(r.validated.params.id, ctx(r, d));
      return sendSuccess(s, {
        asset,
        signedUrl: signed.url,
        urlExpiresAt: signed.exp,
        directUrl: directUrl ?? asset.url ?? null
      });
    },
    content: async (r, s) => {
      const content = await getAssetContent(r.validated.params.id, r.validated.query, ctx(r, d));
      if (content.redirectUrl) return s.redirect(302, content.redirectUrl);
      return s.type(content.mimeType).sendFile(content.filePath, { maxAge: '15m', immutable: false });
    },
    remove: async (r, s) =>
      sendSuccess(s, {
        asset: assetDto(await deleteAsset(r.validated.params.id, r.validated.body, ctx(r, d)))
      })
  };
}
