# تقرير المرحلة 16 — ترحيل بوابة الطلبات القديمة

## التعريف

الدين الأكبر المعلن في المرحلة 15. المفاجأة: `adminOrdersGateway` كانت 20 سطرًا فقط وواجهة رقيقة فوق v1 — الدين الحقيقي كان (أ) شاشات مبنية على نموذج حالات غير موجود في الباك، (ب) سوكت خام وحالة محلية بدل React Query.

## اكتشاف حرج

الباك **لا يعرف حالة `PENDING` للطلبات** (موجودة للمدفوعات فقط). شاشة `IncomingOnlineOrdersPage` (فلتر PENDING + تأكيد PENDING) كانت فارغة دائمًا وأزرارها ترمي استثناءات — وتدفق `busy/:type/:id` كان يعرض حقولًا غير موجودة (`item.product.name` كان سيُسقط الصفحة، و`closeAdminTable(tableNumber)` يمرر رقم طاولة بدل معرف جلسة).

## المنفذ

- **حذف**: `IncomingOnlineOrdersPage` (ومسار `/incoming` وبطاقة الرئيسية) + `useRealtimeOrders/usePrepOrders/useTableSummaries` (ميتة) + `TableInvoiceModal` الإداري (ميت) + `adminOrdersGateway.js` + `ordersService.js`.
- **إعادة كتابة `BusyCardPage` على v1**: تفاصيل حقيقية (`productName/sizeName/lineSubtotal`)، خط زمني من الخادم، إلغاء مسبب، إتمام تيك أواي، تعليم البنود جاهزة، إسناد مندوب، `useRealtimeRoom`، وصلاحيات دقيقة (`orders.cancel/complete` و`preparation.update` و`delivery.manage` بدل `orders.manage` غير الموجودة).
- **إعادة كتابة `TableOrderTrackPage`**: قراءة فقط على v1 مع تحديث لحظي.
- **`useTableServiceRequests`**: نفس الواجهة (`services/loading/error/pendingId/changeStatus/refresh/meta`) من الداخل React Query + `useRealtimeRoom` + أخطاء عربية — `TableServicesPage` لم تُمس.
- **`SalesPage`**: الإنشاء عبر `useCreateOrder/useOpenTableOrder/useAddSessionItems` مباشرة بدل البوابة.

## إصلاح اختبار متقطع

فشل `router-smoke` تحت الحمل الكامل فقط (مهلة 5 ثوانٍ لتحويل مخطط التطبيق المتنامي) — رُفعت `testTimeout/hookTimeout` إلى 30 ثانية في `vitest.config.js` بعد إثبات السبب (ينجح منفردًا ويفشل جماعيًا، ويخضر بالمهلة الأطول).

## البوابة

- الاختبارات: 100/100 (23 ملفًا، شملت `orders-v1migration` الجديد). `lint` نظيف. `build` أخضر. `audit:check --strict` أخضر (339 ملفًا، 0 حظر).
