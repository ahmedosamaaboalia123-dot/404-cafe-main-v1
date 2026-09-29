import mongoose from 'mongoose';

const money = { type: mongoose.Schema.Types.Decimal128, required: true };
const paymentSchema = new mongoose.Schema(
  {
    orderId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    paymentNo: { type: String, required: true, unique: true },
    method: { type: String, enum: ['CASH'], required: true, default: 'CASH' },
    collectionMode: { type: String, enum: ['DIRECT', 'COD'], required: true },
    status: {
      type: String,
      enum: ['PENDING', 'COLLECTED', 'SETTLED', 'PARTIALLY_REFUNDED', 'REFUNDED'],
      required: true
    },
    amount: money,
    refundedAmount: money,
    collectedByType: { type: String, enum: ['EMPLOYEE', 'DELEGATE'], required: true },
    collectedById: { type: mongoose.Schema.Types.ObjectId, required: true },
    collectedAt: { type: Date, required: true },
    settledAt: Date,
    settledBy: mongoose.Schema.Types.ObjectId,
    cashDrawerTransactionId: mongoose.Schema.Types.ObjectId,
    refundTransactionIds: [mongoose.Schema.Types.ObjectId],
    operationRequestId: mongoose.Schema.Types.ObjectId
  },
  { timestamps: true, versionKey: 'version', optimisticConcurrency: true }
);
paymentSchema.index({ orderId: 1, paymentNo: 1 }, { unique: true });
paymentSchema.index({ cashDrawerTransactionId: 1 }, { unique: true, sparse: true });
paymentSchema.index({ collectionMode: 1, status: 1, collectedAt: -1, _id: -1 });
paymentSchema.index({ operationRequestId: 1 }, { unique: true, sparse: true });

export const OrderPayment =
  mongoose.models.OrderPayment ?? mongoose.model('OrderPayment', paymentSchema);
