# تقرير إكمال المرحلة 5 — المواد الخام والتحذيرات

## الخلاصة التنفيذية

تم توصيل شاشتي المخزون والتحذيرات على طبقة `v1` الجديدة (`/api/v1`) دون أي تعديل في الباك. الفروق الجوهرية عن الشاشات القديمة: لا حذف للمواد أو الدفعات، لا إنشاء دفعات من الواجهة (تُنشأ من المشتريات فقط)، السحب اليدوي نهائي، ترتيب أولوية السحب عبر `PUT`، والتحذيرات قراءة فقط ومشتقة من الخادم.

## الشاشة الرئيسية للمخزون

- الجدول يعمل على `GET /raw-materials-screen` مع بحث وأرشفة حالة من الخادم و`page/limit=10` من الخادم.
- ملخص البطاقة يعرض عدادات الخادم: `materials/lowStock/expiring/expired`.
- إيقاف/تفعيل المادة عبر `PATCH /raw-materials/:id` مع `expectedVersion` و`ConfirmAction` (مع سبب إجباري عند الإيقاف).
- لا يوجد أي زر حذف — الحذف غير مدعوم في الباك.
- التحديث اللحظي عبر `useRealtimeRoom` على غرفة `admin:orders` لأحداث `order.created/cancelled/completed` فقط.

## صفحة تفاصيل المادة

- التفاصيل عبر `GET /raw-materials/:id?include=batches,movements` مع البيانات العامة (الاسم/الحد الأدنى/أيام التنبيه) قابلة للتعديل مع `expectedVersion` و`ConflictDialog` عند 409.
- المورد والوحدات معروضان للقراءة فقط (مقفلان بعد أول دفعة حسب عقد الباك).
- جدول الدفعات قراءة فقط مرتبة حسب `salePriority`؛ تغيير الترتيب فقط عبر `PUT /raw-materials/:id/batch-priorities` مع `expectedPriorityVersion` والقائمة الكاملة `orderedBatchIds`.
- تم حذف أقسام إنشاء/تعديل/حذف الدفعات نهائيًا (كانت تستدعي مسارات غير موجودة).
- السحب اليدوي عبر `POST /raw-materials/:id/withdrawals` مع `expectedBatchVersion` و`Idempotency-Key` و`ConflictDialog`؛ الرسالة توضح أن السحب نهائي.
- سجل الحركات عبر `GET /withdrawals?materialId=` بنفس مكون الجدول العام.

## نموذج إضافة مادة

- الحقول مطابقة لتحقق الباك: معرفات `ObjectId`، `conversionFactor/smallQuantityStep` موجبان، الوحدتان مختلفتان، `expiryAlertDays` بين 0 و3650.
- قائمة الوحدات من `GET /measurement-units` (النشطة فقط) بصيغة `nameAr (code)`.
- قائمة الموردين ما زالت عبر جسر `getSupplierOptions` المؤقت (سيُستبدل بشاشة الموردين في مرحلة لاحقة).

## شاشة التحذيرات

- القائمة والملخص من `GET /warnings-screen` فقط (read-only) مع فلتر نوع يُرسل للخادم (`LOW_STOCK/EXPIRING/EXPIRED/OPEN_SHIFT_LONG`) وترقيم `page/limit=10` من الخادم.
- البطاقات الأربع تعرض `summary` الخادم؛ `openShiftLong` قد يكون `null` (يُعرض "—")، وعند `dataQuality=ERROR` يُعرض تنبيه بيانات جزئية.
- الخطورة من الخادم (`CRITICAL=حرجة` / `WARNING=تحذير`) ونص التفاصيل مبني من حقول الباك (`threshold/currentValue/daysUntilExpiry/expiryOn/batchNumber`).
- تم حذف البحث المحلي وفلتر التاريخ وأي إجراء "حل التحذير" (غير موجودة في الباك).
- التحديث اللحظي يعيد تحميل التحذيرات عند أحداث الطلبات فقط.

## ملاحظات التوافق

- `services/inventoryService.js` بقي مؤقتًا لأن شاشة المرتجعات (المرحلة 6) ما زالت تستخدم `getReturnableMaterialOptions` منه — يُحذف معها.
- ملفا `InventoryPage.css` و`WarningsPage.css` أُعيد إنشاؤهما بحد أدنى بعد فقدانهما من القرص؛ وأُضيفت قواعد صغيرة ناقصة (`mat-summary/supplier-readonly/data-state/severity-badge/no-warnings-state`).
- الملفات اليتيمة المحذوفة: `hooks/useCreateMaterial.js` (قديم)، `services/warningsService.js`، `constants/inventoryConstants.js`، `utils/inventoryMapper.js`، ومجلداتها الفارغة.
- `Money` لا يقبل خاصية `plain` — تُمرر القيم `String` من الـ adapters.
- تدقيق العقد الآلي (`frontend-audit`): لا findings في ملفات `inventory/warnings`. الـ 93 findings المتبقية في `--strict` تخص مراحل لاحقة لم تُهاجر بعد.

## الاختبارات

- ملف جديد `tests/inventory-warnings-contract.test.jsx` (7 اختبارات): مسارات حقيقية، adapters (نقود كنصوص/أولويات/وحدات/حركات/تحذيرات)، schemas مطابقة للباك (شملت `ObjectId` من 24 خانة)، ورندر الصفحات الثلاث مع غياب الأزرار المحذوفة (حذف/إضافة دفعة/حل التحذير).
- إجمالي الاختبارات بعد المرحلة: 58 ناجحة (12 ملفًا).
- `lint` نظيف و`build` أخضر.
