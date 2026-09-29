import { z } from "zod";
const mongoId = z.string().regex(/^[a-f\d]{24}$/i, "المعرف غير صالح");
const item = z.object({ productId: mongoId, productSizeId: mongoId, quantity: z.number().int().min(1).max(100), addonIds: z.array(mongoId).max(20).optional(), notes: z.string().trim().max(500).optional() });
export const createOrderSchema = z.object({ fulfillmentType: z.enum(["TAKEAWAY", "DELIVERY", "DINE_IN"]), customer: z.object({ name: z.string().trim().min(2), phone: z.string().trim().min(7), address: z.string().trim().max(500).optional() }), items: z.array(item).min(1).max(50), tableSessionId: mongoId.optional() });
export const reasonSchema = z.string().trim().min(3, "اكتب سببًا من 3 أحرف على الأقل").max(500);
export const cashSchema = z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/, "أدخل مبلغًا صحيحًا أكبر من صفر").refine((v) => Number(v) > 0);
export const parseOrderInput = (value) => createOrderSchema.parse(value);
