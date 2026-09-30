import mongoose from 'mongoose';

const money = { type: mongoose.Schema.Types.Decimal128, required: true };

const customerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    normalizedName: { type: String, required: true, index: true },
    phone: { type: String, required: true },
    phoneNormalized: { type: String, required: true, unique: true },
    address: String,
    socialLinks: [String],
    status: {
      type: String,
      enum: ['ACTIVE', 'ARCHIVED', 'BLOCKED'],
      required: true,
      default: 'ACTIVE'
    },
    blockReason: String,
    orderCount: { type: Number, required: true, default: 0, min: 0 },
    completedOrderCount: { type: Number, required: true, default: 0, min: 0 },
    lifetimeValue: { ...money, default: undefined },
    lastOrderAt: Date,
    lastProfileOrderAt: Date,
    operationRequestId: mongoose.Schema.Types.ObjectId
  },
  { timestamps: true, versionKey: 'version', optimisticConcurrency: true }
);
customerSchema.index({ status: 1, createdAt: -1, _id: -1 });

export const Customer = mongoose.models.Customer ?? mongoose.model('Customer', customerSchema);

const marketingTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    greeting: { type: String, required: true, trim: true, maxlength: 500 },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' }
  },
  { timestamps: true, versionKey: 'version', optimisticConcurrency: true }
);

const marketingMessageSchema = new mongoose.Schema(
  {
    customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
    templateId: { type: mongoose.Schema.Types.ObjectId, ref: 'CustomerMarketingTemplate', required: true },
    templateName: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true, maxlength: 5000 },
    sentBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true }
  },
  { timestamps: true, versionKey: false }
);
marketingMessageSchema.index({ customerId: 1, createdAt: -1, _id: -1 });

export const CustomerMarketingTemplate =
  mongoose.models.CustomerMarketingTemplate ??
  mongoose.model('CustomerMarketingTemplate', marketingTemplateSchema);
export const CustomerMarketingMessage =
  mongoose.models.CustomerMarketingMessage ??
  mongoose.model('CustomerMarketingMessage', marketingMessageSchema);
