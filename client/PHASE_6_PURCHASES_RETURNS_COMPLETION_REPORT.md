# تقرير إكمال المرحلة 6 — المشتريات والمرتجعات

## الخلاصة التنفيذية

تم توصيل شاشتي المشتريات والمرتجعات على طبقة `v1` الجديدة دون أي تعديل في الباك. المجموعة الشرائية هي الفاتورة الإنشائية متعددة الموردين (المورد يُلتقط من المادة نفسها)، والدفعات لا تُنشأ إلا عبر تسجيل البنود، والمرتجعات دفعية-الأساس ونهائية.

## طبقة المشتريات الجديدة

- `purchases/api/purchases.api.js`: التسع مسارات (`purchases-screen`، `purchase-groups`، التفاصيل، التعديل، الحذف **ببودي** `{expectedVersion}`، `split-by-supplier`، `purchase-items/:id/register`، `register-many`، `print-data` المجموعة وفاتورة المورد).
- `purchases/adapters/purchase.adapter.js`: `toPurchasesScreen/toPurchaseGroupDetails/toPurchasePrintData` — نقود وكميات نصية، IDs نصية، تسميات الحالات (مسودة/مقسمة/مسجلة جزئيًا/مسجلة، بانتظار التسجيل/مسجل).
- `purchases/schemas/purchase.schema.js`: مطابقة لتحقق الباك (بنود 1–100 بلا تكرار مادة، `register-many` حتى 50 بلا تكرار بند، تواريخ `YYYY-MM-DD`).
- `purchases/hooks/purchase.queries.js/mutations.js`: هوكات مستقلة مع `Idempotency-Key` وinvalidate للمشتريات والمواد والحركات والتحذيرات والموردين.
- تنبيه مطبق: `purchaseItemId` في مسار التسجيل فقط ويُحذف من الجسم (الباك `strict`).

## شاشة المشتريات

- تبويب إنشاء: بنود ديناميكية (بحث مواد debounced من الخادم + سعر/كمية)، منع تكرار المادة، `invoiceDate` افتراضي اليوم.
- تبويب المجموعات: فلتر `unregistered/registered/all` وعدادات الملخص وترقيم الخادم.
- تفاصيل المجموعة: تسجيل كل بند (`receivedOn/expiryOn` + `expectedItemVersion`) أو تسجيل الكل، تقسيم حسب المورد (استدعاء خادم واحد — DRAFT/SPLIT فقط)، تعديل البنود قبل أول تسجيل، حذف المسودة فقط، فواتير الموردين بعد التقسيم، وطباعة من snapshot الخادم عبر `PrintDocument`.
- كل الأوامر بـ `ConfirmAction` و`ConflictDialog` عند 409، وصلاحيات `purchases.create/manage/register`.

## طبقة المرتجعات والشاشة

- `returns/api/returns.api.js` + `adapters/return.adapter.js` + `schemas/return.schema.js` + `hooks/return.queries.js/mutations.js`: الشاشة (فلتر مورد/فترة) والتفاصيل والطباعة والإنشاء.
- نموذج الإنشاء: بنود دفعية (مادة ← دفعة متاحة ← كمية كبيرة ← سبب 3 أحرف + `expectedBatchVersion`)، بحد 50 وبلا تكرار دفعة، وتأكيد أن المرتجع نهائي.
- السجل: ملخص العدد والقيمة المخزنية، صفوف قابلة للتوسع، وطباعة لكل مرتجع. لا تعديل ولا حذف (immutable في الباك).

## التنظيف

- حُذفت الخدمات القديمة الثلاث بعد انعدام مستورديها: `purchasesService.js` و`returnsService.js` و`inventoryService.js` (آخرها كان يخدم المرتجعات فقط) مع مجلدات `services` الفارغة.
- حُذفت مكونات المشتريات القديمة: `CreateInvoiceTab/InvoicesListTab/GroupedInvoicesPanel/InvoiceViewModal/ReturnModal/SearchableMaterialSelect`.
- تدقيق العقد الآلي: لا findings في `purchases/returns/inventory/warnings`.

## الاختبارات

- ملف جديد `tests/purchases-returns-contract.test.jsx` (6 اختبارات): المسارات التسعة + مسارات المرتجعات الأربعة، adapters، schemas مطابقة للباك (شملت رفض تكرار المادة/البند/الدفعة)، ورندر الصفحتين مع غياب واجهات الـ legacy.
- إجمالي الاختبارات: 65 ناجحة (13 ملفًا). `lint` نظيف و`build` أخضر.
