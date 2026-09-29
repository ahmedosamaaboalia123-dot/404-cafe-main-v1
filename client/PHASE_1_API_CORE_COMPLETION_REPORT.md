# تقرير إتمام المرحلة 1 — API Core

> التاريخ: 12 سبتمبر 2026  
> النطاق: Frontend فقط. لم يتم تعديل الباك إند.

## المنفذ

- عميل Axios مستقل لعقد `/api/v1` مع تطبيع آمن للـbase URL.
- إضافة Bearer token و`X-Request-Id` مركزياً.
- refresh single-flight يمنع تكرار refresh عند عدة استجابات 401.
- تخزين حقول الباك الحالية `accessToken` و`refreshToken` بصورة صحيحة.
- إعادة الطلب مرة واحدة فقط بعد نجاح refresh.
- تنظيف الجلسة والطلبات المعلقة عند فشل المصادقة.
- parser صارم لعقد `{ok,data,meta}` وللقوائم.
- نموذج خطأ موحد يحفظ code/status/messageAr/fieldErrors/retryable/requestId.
- أدوات idempotency تحتفظ بالمفتاح نفسه طوال محاولة العملية.
- دعم `expectedVersion` من دون فقد القيمة صفر.
- pagination موحدة بحد أقصى 10.
- إلغاء request سابق يحمل نفس المفتاح عبر AbortController.
- query key factories لكل الموديولات الأساسية.
- public exports موحدة من `src/api/index.js`.

## سياسة الانتقال

لم يستبدل العميل القديم بعد، حتى لا تنكسر الموديولات التي لم تُرحّل. تبدأ المراحل التالية باستعمال `v1Client` موديولاً بعد موديول، ويحذف العميل القديم بعد وصول references إلى صفر.

## التحقق

- `npm run test:run`: ناجح — 6 ملفات و17 اختباراً.
- `npm run lint`: ناجح وفق بوابة baseline.
- `npm run build`: ناجح.
- اختبارات مضافة للـenvelope والأخطاء والحقول والـpagination والـquery keys وidempotency وcancellation وتطبيع URL والـrequest headers والـrefresh المتزامن.

## الملفات

- `src/api/v1Client.js`
- `src/api/envelope.js`
- `src/api/apiError.js`
- `src/api/pagination.js`
- `src/api/idempotency.js`
- `src/api/requestCancellation.js`
- `src/api/queryKeys.js`
- `src/api/index.js`
- `tests/api-envelope.test.js`
- `tests/api-error.test.js`
- `tests/api-operations.test.js`
- `tests/v1-client.test.js`

## ملاحظة الأداء

المهلة العامة للـv1 أصبحت 10 ثوانٍ كحد قطع، بينما هدف 500–1000ms يظل مقياس أداء وليس timeout يقطع العمليات السليمة. البحث المتكرر يمكنه إلغاء الطلب الأقدم، والـscreen endpoints ستقلل عدد الاستدعاءات عند ترحيل الموديولات.
