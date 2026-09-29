import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    assetNo: { type: String, required: true, unique: true },
    purpose: {
      type: String,
      enum: ['PRODUCT_IMAGE'],
      required: true,
      default: 'PRODUCT_IMAGE'
    },
    mimeType: { type: String, required: true },
    sizeBytes: { type: Number, required: true, min: 1 },
    checksum: { type: String, required: true },
    // Logical key. For CLOUDINARY assets no file exists on disk, so the key stays
    // metadata-only while the bytes live in the remote provider.
    storageKey: { type: String, required: true, unique: true },
    provider: {
      type: String,
      enum: ['CLOUDINARY', 'LOCAL'],
      required: true,
      default: 'CLOUDINARY'
    },
    publicId: { type: String, default: null },
    secureUrl: { type: String, default: null },
    format: { type: String, default: null },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
    status: {
      type: String,
      enum: ['UPLOADING', 'READY', 'QUARANTINED', 'DELETED'],
      required: true,
      default: 'READY'
    },
    quarantineReason: String,
    referenceVersion: { type: Number, default: 0 },
    cleanupStatus: { type: String, enum: ['PENDING', 'DONE'] },
    cleanupNextAttemptAt: Date,
    cleanupLeaseUntil: Date,
    cleanupAttempts: { type: Number, default: 0 },
    cleanupErrorCode: String,
    uploadedBy: mongoose.Schema.Types.ObjectId,
    uploadedAt: { type: Date, required: true, default: Date.now },
    deletedAt: Date,
    deleteReason: String,
    operationRequestId: mongoose.Schema.Types.ObjectId
  },
  { timestamps: true, versionKey: 'version', optimisticConcurrency: true }
);
schema.index({ purpose: 1, status: 1, uploadedAt: -1, _id: -1 });
schema.index({ publicId: 1 }, { sparse: true });
schema.index({ cleanupStatus: 1, cleanupNextAttemptAt: 1, cleanupLeaseUntil: 1 });

export const MediaAsset = mongoose.models.MediaAsset ?? mongoose.model('MediaAsset', schema);
