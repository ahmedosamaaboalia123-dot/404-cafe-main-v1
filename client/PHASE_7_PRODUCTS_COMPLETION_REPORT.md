# تقرير إكمال المرحلة 7 — المنتجات والكتالوج والوسائط

## الخلاصة التنفيذية

تم توصيل شاشة المنتجات على طبقة `v1` دون أي تعديل في الباك. لا حذف لأي كيان (منتج/قسم/نوع/حجم)، والصور عبر أصول `READY` فقط، والتكلفة/الربح من `costPreview` الخادم حصرًا، والوصفات بكميات الوحدة الصغيرة لمواد نشطة.

## الطبقة الجديدة

- `products/api/products.api.js`: المسارات الـ12 (`products-screen`، `product-categories`، التفاصيل، الأنواع، الأحجام، الإضافات، `product-addons/:id`، `product-sizes/:id/recipe`، `catalog`).
- `products/adapters/product.adapter.js`: `toProductsScreen/toProductDetails/toCategoryOptions` — يقبل ملخص الباك بمفاتيح كبيرة (`ACTIVE/INACTIVE`)، ويبني `recipeBySize` و`costBySize` للوصول المباشر.
- `products/schemas/product.schema.js`: تسعة schemas مطابقة لتحقق الباك (نقود برقمين عشريين، كميات بستة، `ObjectId`، منع تكرار مكون الوصفة).
- `products/hooks/product.queries.js/mutations.js`: تسعة mutations مع `Idempotency-Key`؛ `addonId` و`productSizeId` يُفصلان عن الجسم (الباك `strict`).
- `products/api/media.api.js` + `hooks/media.hooks.js`: رفع `multipart` (حقل `image`، حد 2MB)، قائمة، تفاصيل، حذف ببودي، وبناء رابط المحتوى الموقّع من `signed.url`.

## الشاشة

- `ProductsTable`: بحث وفلاتر قسم/حالة من الخادم وترقيمه، بدون أعداد مخترعة وبدون صور مكسورة (مصغرات موقعة أو أيقونة).
- `ProductWizard` (5 خطوات حفظ فوري): أساسية + صورة ← أنواع ← أحجام ← وصفة لكل حجم ← مراجعة بالتكلفة.
- `ProductDetails`: تعديل البيانات والحالة والظهور والصورة، إدارة الأنواع/الأحجام/الوصفات/الإضافات، والتكلفة لكل حجم من الخادم فقط.
- `CategoryManager`: إنشاء وإعادة تسمية وإيقاف (بلا حذف — غير موجود في الباك).
- `MediaPicker`: رفع جديد أو اختيار من الجاهزة مع معاينة موقعة.
- صلاحيات `products.create/manage`، و`ConflictDialog` عند 409.

## التنظيف

- حُذفت: `hooks/useProducts.js` و`services/productsService.js` والمودالات الأربعة القديمة بعد التحقق من انعدام مستورديها.
- تدقيق العقد الآلي: لا findings في موديول المنتجات.

## الاختبارات

- ملف جديد `tests/products-contract.test.jsx` (5 اختبارات): المسارات، adapters (شملت `costPreview` وملخص الباك)، schemas التسعة (شملت رفض `addonId` داخل الجسم ورفض تكرار المكون)، ورندر القائمة والتفاصيل مع غياب أي زر حذف.
- إجمالي الاختبارات: 70 ناجحة (14 ملفًا). `lint` نظيف و`build` أخضر.
