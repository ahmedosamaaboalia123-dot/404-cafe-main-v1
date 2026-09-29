import { ApiError } from './api-error.js';

export function validateService(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success) throw new ApiError({
    code: 'VALIDATION_ERROR', status: 422, messageAr: 'البيانات المدخلة غير صالحة، راجع الحقول المطلوبة',
    details: result.error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })),
  });
  return result.data;
}
