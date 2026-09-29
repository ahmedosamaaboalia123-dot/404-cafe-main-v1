import { z } from "zod";

export const reviewModerationSchema = z.object({
  status: z.enum(["VISIBLE", "HIDDEN"]),
  reason: z.string().trim().min(3, "اكتب سببًا من 3 أحرف على الأقل").max(500),
  expectedVersion: z.number().int().min(0),
}).strict();

export const reviewUpdateSchema = z.object({
  rating: z.number().int().min(1).max(5).optional(),
  comment: z.string().trim().max(1000).nullable().optional(),
  expectedVersion: z.number().int().min(0),
}).strict().refine((value) => value.rating !== undefined || value.comment !== undefined, {
  message: "حدد تقييمًا أو تعليقًا على الأقل",
  path: ["rating"],
});

export function firstReviewFormError(result) {
  return result.success ? null : result.error.issues[0]?.message || "راجع البيانات";
}
