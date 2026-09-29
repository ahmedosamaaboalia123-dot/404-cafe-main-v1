import{z}from'zod';const money=z.string().regex(/^(?:0|[1-9]\d*)(?:\.\d{1,2})?$/,'مبلغ غير صحيح');
export const openDrawerSchema=z.object({openingBalance:money,notes:z.string().trim().max(500).optional()}).strict();
export const movementSchema=z.object({amount:money.refine(v=>Number(v)>0,'المبلغ أكبر من صفر'),accountingClass:z.string().trim().min(2).max(80),description:z.string().trim().min(2).max(500),reason:z.string().trim().min(2).max(500),expectedVersion:z.number().int().min(0)}).strict();
export const closeDrawerSchema=z.object({actualClosingBalance:money,closingNotes:z.string().trim().max(500).optional(),differenceReason:z.string().trim().max(500).optional(),expectedVersion:z.number().int().min(0)}).strict();
