import mongoose from 'mongoose';

const supplierSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    normalizedName: { type: String, required: true },
    contactPerson: { type: String, required: true, trim: true },
    phone: { type: String, required: true },
    phoneNormalized: { type: String, required: true },
    city: { type: String, required: true, trim: true },
    createdBy: mongoose.Schema.Types.ObjectId,
    updatedBy: mongoose.Schema.Types.ObjectId
  },
  { timestamps: true, versionKey: 'version', optimisticConcurrency: true }
);
supplierSchema.index({ createdAt: -1, _id: -1 });
supplierSchema.index({ phoneNormalized: 1 });
supplierSchema.index({ normalizedName: 1 });
supplierSchema.index({ city: 1 });

const accountSchema = new mongoose.Schema(
  {
    supplierId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Supplier',
      required: true,
      unique: true
    },
    currency: { type: String, required: true, default: 'EGP' },
    debtLedgerBalance: mongoose.Schema.Types.Decimal128,
    receivableLedgerBalance: mongoose.Schema.Types.Decimal128,
    debtBalance: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: () => mongoose.Types.Decimal128.fromString('0')
    },
    receivableBalance: {
      type: mongoose.Schema.Types.Decimal128,
      required: true,
      default: () => mongoose.Types.Decimal128.fromString('0')
    }
  },
  { timestamps: true, versionKey: 'version', optimisticConcurrency: true }
);

const entrySchema = new mongoose.Schema(
  {
    supplierId: { type: mongoose.Schema.Types.ObjectId, ref: 'Supplier', required: true },
    sequenceNo: { type: Number, required: true },
    kind: {
      type: String,
      enum: ['DEBT', 'RECEIVABLE', 'DEBT_PAYMENT', 'RECEIVABLE_COLLECTION'],
      required: true
    },
    amount: { type: mongoose.Schema.Types.Decimal128, required: true },
    occurredOn: { type: String, required: true },
    recordedAt: { type: Date, default: Date.now },
    recordedBy: { type: mongoose.Schema.Types.ObjectId, required: true },
    notes: String,
    updatedAt: Date,
    updatedBy: mongoose.Schema.Types.ObjectId,
    debtBalanceAfter: { type: mongoose.Schema.Types.Decimal128, required: true },
    receivableBalanceAfter: { type: mongoose.Schema.Types.Decimal128, required: true },
    origin: { type: String, enum: ['MANUAL'], default: 'MANUAL' },
    operationRequestId: mongoose.Schema.Types.ObjectId,
    drawerTransactionId: mongoose.Schema.Types.ObjectId
  },
  { timestamps: false, versionKey: false }
);
entrySchema.index({ supplierId: 1, sequenceNo: 1 }, { unique: true });
entrySchema.index({ operationRequestId: 1 }, { unique: true, sparse: true });
entrySchema.index({ supplierId: 1, occurredOn: -1, _id: -1 });
export const Supplier = mongoose.models.Supplier ?? mongoose.model('Supplier', supplierSchema);
export const SupplierAccount =
  mongoose.models.SupplierAccount ?? mongoose.model('SupplierAccount', accountSchema);
export const SupplierAccountEntry =
  mongoose.models.SupplierAccountEntry ?? mongoose.model('SupplierAccountEntry', entrySchema);
