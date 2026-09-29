# خطة التنفيذ الكاملة لتهيئة الفرونت وربطه بالباك إند

> تاريخ الخطة: 12 سبتمبر 2026  
> نطاق التنفيذ: `new desktop` فقط  
> مصدر العقد الثابت: `404-coffee-backend-v2` مع وثائق `backend-design/final-2`  
> قيد ملزم: **لن يُعدّل أي ملف في الباك إند.** أي اختلاف يُحل داخل الفرونت عن طريق endpoint صحيح أو DTO adapter أو تعديل الواجهة.

## 1. هدف التنفيذ

تحويل الفرونت الحالي من واجهات مرتبطة جزئياً بعقد قديم وبيانات محلية إلى تطبيق إنتاجي كامل يعتمد على `/api/v1`، ويغطي لوحة الإدارة وتجربة العميل وتجربة الطاولة. الباك إند هو مصدر الحقيقة للطلبات والمخزون والمال والحضور والصلاحيات، بينما يستخدم التخزين المحلي فقط للبيانات التي نصت عليها المواصفات مثل آخر بيانات العميل، مفاتيح التتبع، وسلة لم تُرسل بعد.

النتيجة المطلوبة بعد آخر مرحلة:

- كل صفحة تعمل على endpoint موجود فعلياً في route manifest الحالي.
- كل request وresponse يطابق validation والـDTO الفعليين.
- جميع الموديولات المطلوبة مكتملة وظيفياً.
- لا توجد mock data أو مسارات API قديمة في تشغيل الإنتاج.
- كل الجداول تستخدم server pagination بحد 10.
- كل العمليات الحساسة محمية من الضغط المكرر والـrace conditions.
- realtime يعمل مع REST catch-up بعد الانقطاع.
- رحلات الإدارة والعميل والطاولة تعمل من البداية للنهاية.

## 2. قواعد التنفيذ الملزمة

1. لا تعديل في `404-coffee-backend-v2` لأي سبب.
2. لا نغيّر business rule في الفرونت لتعويض رفض الباك؛ نعرض رد الباك بدقة.
3. كل Mongo ID يبقى `String`.
4. الأسعار والكميات المالية تعامل كـdecimal strings عند النقل، ولا تعتمد على Float في القرارات.
5. أي شاشة قائمة تستخدم `page` و`limit=10` وبيانات `meta` من السيرفر.
6. أي command مالي أو مخزني أو طلبي يستخدم `Idempotency-Key`.
7. أي command يدعم optimistic concurrency يرسل `expectedVersion`.
8. الـSocket وسيلة إشعار؛ REST response وREST sync هما مصدر الحقيقة.
9. لا يستدعي component الـAxios مباشرة.
10. لا تُكتب endpoint strings داخل page أو component.
11. نحافظ على RTL وmobile-first وأزرار لمس لا تقل عن 44px.
12. لا تعاد كتابة تصميم ناجح من الصفر؛ نبدل مصدر البيانات ونضيف الحالات الناقصة.

### 2.1. قواعد العقد الملزمة (مطابقة `route-manifest.json` — 187 route بتاريخ 2026-09-12)

1. `Idempotency-Key` يُرسل للتوثيق فقط؛ ميدلوير منع التكرار **غير موصّل** في الباك، والحماية الحقيقية من الضغط المزدوج هي `expected*Version`. لا يُبنى أي retry يتوقع `409` من نفس المفتاح.
2. الباك `z.strict()`: أي حقل زائد في الجسم → `400`. لا تُرسل حقولًا غير منصوصة في validation.
3. مسارات ممنوعة (غير موجودة في الباك — لا تُستدعى أبدًا): أي `DELETE` للمواد/الوحدات/الدفعات/الموردين/الطلبات/المرتجعات/الفواتير، و`PATCH /orders`، و`GET /batches`، و`/raw-material-withdrawals` (الصحيح `GET /withdrawals`)، وعكس الدرج من مسار الشيفت (الصحيح `POST /cash-drawer-transactions/:id/reverse`)، وعكس قيد المورد من مسار المورد (الصحيح `POST /supplier-account-entries/:id/reverse`).
4. أجسام فارغة إجبارية `{}` (وليست غائبة): `POST /attendance/check-in`، و`POST /cash-refunds/sweep`، و`POST /notifications/:id/read`، وإلغاء proposal الطاولة.
5. حذف يتطلب جسمًا: `DELETE /purchase-groups/:id` و`DELETE /media/:id` يتطلبان `{expectedVersion}` في الجسم (مسودة/مجموعة فقط حسب العقد).
6. الدفع نقدي فقط: `method=CASH` حرفيًا، و`collectionMode=DIRECT|COD` فقط. لا واجهة لبطاقات أو تحويلات.
7. فصل التوكنات: `X-Tracking-Read-Token` للتتبع فقط، و`X-Order-Action-Token` للتعديل فقط، و`X-Customer-Session` لمسار `/customer/orders` فقط، و`X-Table-Token` لمسارات الضيف فقط. الكتالوج العام بـ `If-None-Match`، ومحتوى الميديا بـ `?sig&exp`.
8. التواريخ: `YYYY-MM-DD` للحركات والفلاتر (`occurredOn/receivedOn/returnDate/invoiceDate/from/to`)، وdatetime مع offset للتدقيق والدرج والتقارير. المنطقة الزمنية `Africa/Cairo` دائمًا، وتواريخ الخادم (`businessToday/evaluatedAt/serverTime`) هي المرجع.
9. أنواع التحذيرات المعتمدة فقط: `LOW_STOCK/EXPIRING/EXPIRED/OPEN_SHIFT_LONG` (لا يوجد `OUT_OF_STOCK`)، والخطورة `CRITICAL/WARNING` فقط (لا `HIGH/MEDIUM/LOW`).
10. `split-by-supplier` استدعاء خادم واحد: `POST /purchase-groups/:id/split-by-supplier` مع `expectedVersion` — وليست fan-out من الفرونت.

## 3. استراتيجية الانتقال من غير تعطيل المشروع

يتم الانتقال بأسلوب vertical slices. كل موديول يمر بالترتيب التالي قبل الانتقال لغيره:

1. تعريف endpoints وschemas.
2. إنشاء API adapter.
3. إنشاء React Query hooks.
4. توصيل الصفحة وإلغاء الاستدعاءات القديمة الخاصة بها.
5. إضافة loading/empty/error/conflict states.
6. إضافة realtime invalidation إن كان الموديول لحظياً.
7. كتابة اختبارات العقد والواجهة.
8. إزالة service/mock القديم بعد التأكد من عدم وجود imports له.

لا يتم تغيير `baseURL` إلى `/api/v1` دفعة واحدة قبل ترحيل جميع الاستدعاءات، حتى لا تتعطل الصفحات القديمة. في المرحلة الأولى ننشئ `v1Client` صريحاً، ثم بعد انتهاء الترحيل يصبح هو العميل الوحيد.

## 4. الهيكل المستهدف

```text
src/
  api/
    v1Client.js
    envelope.js
    apiError.js
    pagination.js
    idempotency.js
    requestCancellation.js
    queryKeys.js
  realtime/
    socketManager.js
    sequenceStore.js
    syncClient.js
    eventQueryMap.js
  auth/
    permission.js
  shared/
    components/
      AsyncState/
      Pagination/
      ConfirmAction/
      ConflictDialog/
      PrintDocument/
      Money/
      DateTime/
    utils/
      decimal.js
      phone.js
      date.js
  modules/<module>/
    api/<module>.api.js
    adapters/<module>.adapter.js
    schemas/<module>.schema.js
    hooks/<module>.queries.js
    hooks/<module>.mutations.js
    pages/
    components/
```

## 5. المرحلة صفر — تثبيت خط الأساس ومنع كسر الموجود

### الملفات

- تعديل `package.json` لإضافة `lint`, `test`, `test:run`, `test:contract`, `test:e2e`.
- إضافة `vitest.config.js` و`src/test/setup.js`.
- إضافة `.env.example` بقيم `VITE_API_BASE_URL` و`VITE_SOCKET_URL` من دون أسرار.
- إضافة `src/test/server.js` لإعداد MSW.

### الوظائف

- اختبار render للrouter والlayouts.
- اختبار أن build ينجح.
- script يفحص source code ويرفض endpoint نصية داخل pages.
- script يقارن endpoints المستخدمة بقائمة routes من نسخة manifest منسوخة للفرونت وقت التنفيذ؛ النسخة للقراءة والاختبار فقط ولا تغير الباك.

### معيار الإتمام

- build ناجح.
- test runner يعمل.
- تقرير baseline يحصي المسارات القديمة وmock imports وتحويلات IDs إلى Number.

## 6. المرحلة الأولى — منصة API موحدة

### `src/api/v1Client.js`

ينشئ Axios instance على `${VITE_API_BASE_URL}/v1` إذا كانت القيمة `/api`، أو يستخدم القيمة مباشرة إذا انتهت بـ`/api/v1`.

الدوال والمسؤوليات:

- `resolveApiBaseUrl()`: يمنع `/v1/v1` ويطبع خطأ تطوير واضح عند config غير صالح.
- `attachAccessToken(config)`: يضيف Bearer token لمسارات الموظفين فقط.
- `refreshAccessTokenOnce()`: promise واحدة لكل موجة 401، وتستخدم refresh token نفسه.
- `retryOriginalRequest(error)`: يعيد الطلب مرة واحدة بعد refresh.
- `clearAdminSession()`: يمسح tokens/store/socket عند فشل refresh.
- `emitAvailability(status)`: يحدّث حالة الاتصال من دون اعتبار 4xx انقطاعاً.
- `attachRequestId(config)`: ينشئ client request id للتتبع.

### `src/api/envelope.js`

- `unwrapData(payload)`: يقبل `{ok,data,meta}` فقط، ويعيد data.
- `unwrapWithMeta(payload)`: يعيد `{data,meta}`.
- `unwrapPage(payload, itemKey?)`: يوحد items وبيانات الصفحة من العقد الفعلي.
- يفشل بصوت واضح في development عند response غير متوقع.

### `src/api/apiError.js`

- `normalizeApiError(error)`: يعيد `{status,code,message,details,fieldErrors,requestId,retryable}`.
- `messageForCode(code)`: ترجمة عربية ثابتة لأكواد business المعروفة.
- `isConflict(error)`, `isPermissionDenied(error)`, `isDevicePending(error)`.

### `src/api/idempotency.js`

- `createOperationKey(scope)`: مفتاح للعملية الجديدة.
- `getOrCreateAttemptKey(formId)`: يحتفظ بالمفتاح خلال retry لنفس submit.
- `clearAttemptKey(formId)`: بعد success نهائي أو إلغاء المستخدم.
- `mutationHeaders({idempotencyKey,expectedVersion})`.

### `src/api/pagination.js`

- `normalizePageParams({page,limit,search,...filters})`: يفرض limit 10.
- `pageFromMeta(meta)`: مصدر وحيد لحالة paginator.
- `useUrlPagination()`: يزامن page/search/filter مع URL.

### القبول

- refresh واحد عند عشرة requests ترجع 401 معاً.
- 409 لا يعاد تلقائياً.
- network/422/403/409 تظهر بأكواد ورسائل مختلفة.
- لا يتكرر `/v1` في URL.

## 7. المرحلة الثانية — Auth وBootstrap والصلاحيات

### التعديلات

- تحديث `endpoints.js` لمسارات auth v1، مع إبقاء aliases المؤقتة للموديولات غير المرحلة فقط.
- تعديل `loginService.js` ليقرأ response الفعلي ويحافظ على بصمة الجهاز string.
- تعديل `authService.js` ليستخدم login/refresh/logout/bootstrap الحالية فقط.
- تعديل interceptor refresh إلى endpoint v1.
- إنشاء `src/auth/permission.js`.

### الدوال

- `login(credentials,device)`: يعالج success و`DEVICE_APPROVAL_REQUIRED` وBLOCKED.
- `bootstrapSession()`: يعيد employee/role/permissions/notifications/currentShift.
- `can(permissionKey)`: قرار action permission.
- `canSeePage(pageKey)`: قرار route/sidebar من بيانات bootstrap.
- `requireAny(...permissions)` و`requireAll(...permissions)` للاستخدام في المكونات.

### تعديل الواجهة

- شاشة انتظار اعتماد الجهاز مع زر إعادة المحاولة.
- sidebar يبنى من بيانات الباك مع mapping عرض مركزي فقط.
- الأزرار الحساسة تختفي/تتعطل حسب permission، وتعرض 403 لو تغيرت الصلاحية أثناء الجلسة.

### القبول

- approved device يدخل ويسجل bootstrap.
- pending device لا يدخل لوحة الإدارة.
- blocked device يعرض السبب.
- تغير permissionsVersion ينهي صلاحية الجلسة القديمة بصورة سليمة.

## 8. المرحلة الثالثة — المكونات المشتركة وRealtime

### المكونات

- `ServerPagination`: السابق/التالي/رقم الصفحة/الإجمالي، limit ثابت 10.
- `AsyncState`: loading/empty/error/retry.
- `ConflictDialog`: يعرض أن السجل تغير وزر تحميل أحدث نسخة.
- `ConfirmAction`: يمنع الضغط المتكرر ويطلب السبب حين يلزم.
- `PrintDocument`: يطبع payload القادم من print-data فقط.
- `Money` و`Quantity`: عرض decimal آمن.

### realtime

- `getAdminSocket()` اتصال singleton.
- `createTrackingSocket(readToken)` للعميل.
- `createTableSocket(tableToken)` للطاولة.
- `acceptEvent(room,event)`: يرفض sequence المكرر.
- `syncRoom(room,afterSequence)`: يستدعي `/realtime/sync` بعد reconnect/gap.
- `invalidateForEvent(event,queryClient)`: يحدّث query محددة بدل reload عام.

### القبول

- reconnect يعيد الأحداث المفقودة.
- الحدث المكرر لا يضيف كارتاً أو إشعاراً مرتين.
- unmount يزيل listeners ولا يضاعفها عند العودة للصفحة.

## 9. المرحلة الرابعة — الموردون

### ملفات API المطلوبة

- `suppliers.api.js`: screen/create/details/update/status/entries/createEntry/reverseEntry.
- `supplier.adapter.js`: يحول balances/materials/entries إلى UI model من دون إعادة حساب الأرصدة.
- `supplier.schema.js`: تحقق forms فقط بما يطابق الباك.
- query/mutation hooks مستقلة.

### تعديل الصفحات

- القائمة من `/suppliers-screen` مع page/limit/search.
- الصفحة الشخصية من details، والقيد من account-entries.
- استبدال delete بتفعيل/تعطيل.
- إضافة عكس القيد، التاريخ، المنشئ، reason، وحالة reversal.
- في الدفعات الأكبر من الرصيد يعرض رد الباك ولا ينشئ رصيداً سالباً محلياً.

### القبول

- الدين والمستحق لا يحركان الدرج.
- دفع الدين وتحصيل المستحق يظهران في حساب المورد والدرج.
- duplicate submit لا ينشئ قيدين.

## 10. المرحلة الخامسة — المواد الخام والتحذيرات

### المواد الخام

- API للشاشة والإنشاء والتفاصيل والتعديل والحالة والسحب والأولوية والسجل.
- المورد يحدد أثناء الإنشاء.
- إزالة إنشاء/تعديل/حذف batch من صفحة المادة.
- batch تظهر read-only عدا ترتيب أولوية البيع.
- السحب النهائي يرسل batch/quantity/reason/idempotency/version.
- تحويل الوحدة في الواجهة للعرض والمساعدة فقط؛ القيمة النهائية تطابق DTO.

### التحذيرات

- استخدام warnings-screen وsummary.
- server filters وpagination.
- دعم LOW_STOCK/EXPIRING/EXPIRED/OPEN_SHIFT_LONG.
- كل 12 ساعة تظهر alert جديدة وفق بيانات الباك، من دون timer ينشئ تحذيراً محلياً.

### القبول

- المادة المنتهية تظهر في التحذيرات ولا يمنعها الفرونت من البيع.
- السحب يغير كل الشاشات عن طريق response/event.
- لا يمكن تسجيل batch إلا من purchases UI.

## 11. المرحلة السادسة — المشتريات والمرتجعات

### المشتريات

- إعادة كتابة `purchasesService` حول purchase groups/items.
- شاشة الإنشاء تحمل material options مرة واحدة وتبحث محلياً في الخيارات المحملة أو server search debounced حسب العقد.
- إنشاء draft group، تعديلها، حذف المسموح، split-by-supplier، register item/register-many، وprint-data.
- تسجيل expiry والكمية لكل item ينشئ batch في الباك؛ الفرونت لا ينشئ batch منفصلة.
- حساب الإجمالي اللحظي للعرض مع اعتماد الإجمالي النهائي من response.

### المرتجعات

- استخدام purchase return context لاختيار batches القابلة للإرجاع.
- create return وscreen/details/print-data.
- منع إدخال أعلى من المتاح كتجربة مستخدم، مع إبقاء الباك صاحب القرار النهائي.

### القبول

- فاتورة تضم أكثر من مورد تنقسم إلى فواتير موردين صحيحة.
- تسجيل كل العناصر ينقل المجموعة إلى المدرجة.
- الطباعة تعكس snapshot الخادم.
- المرتجع يخصم batch مرة واحدة ويسجل أثره.

## 12. المرحلة السابعة — المنتجات والوسائط والكتالوج

### API والعمليات

- category create/update/status حسب العقد.
- product create/update/status/menu visibility.
- type create/update.
- size create/update مع sale price.
- recipe replace/update بكميات الوحدة الصغيرة.
- expected-cost endpoint/field من الباك.
- media upload وربط media id.
- catalog endpoint موحد للإدارة والعميل والطاولة حسب projection المسموح.

### تعديل ProductsPage

- تحويل الفورم الكبير إلى خطوات محفوظة: بيانات أساسية → أنواع → أحجام → وصفة → صورة → مراجعة ونشر.
- حالة draft واضحة عند نجاح بعض الخطوات وفشل التالية.
- التكلفة المتوقعة والربح يعرضان من الباك.
- إزالة multipart configuration القديم والحذف غير المطابق.

### القبول

- منتج كامل يظهر في المنيو عند تفعيل الظهور.
- تعديل سعر batch يغير expected cost بعد invalidation.
- الوصفات لا تظهر في customer/table/AI responses.

## 13. المرحلة الثامنة — الموظفون والأجهزة والحضور والصلاحيات

### الموظفون

- employees-screen/create/details/update.
- includes حسب تبويب الصفحة وصلاحية المستخدم لتقليل الطلبات.
- عرض password فقط عند وجود permission ومن response الباك.

### الأجهزة

- صفحة/تبويب pending من `/employee-devices`.
- approve وblock مع reason وidempotency.
- تحديث القائمة والموظف بعد القرار.

### الصلاحيات

- permission matrix كاملة بدلاً من page access القديم.
- roles list/create/update/permissions.
- preview لتأثير DENY/ALLOW في الواجهة قبل الحفظ إن كانت البيانات متاحة.

### الحضور

- attendance list/details مع pagination.
- check-out إداري، adjustment، force-close.
- عند رفض الانصراف بسبب درج مفتوح يظهر زر فتح صفحة الدرج.

### القبول

- دخول واحد لا ينشئ حضورين OPEN.
- أكثر من جهاز يمكن اعتماده.
- تغيير الصلاحية ينعكس على sidebar/actions بعد إعادة bootstrap.

## 14. المرحلة التاسعة — الدرج

### API

- cash-drawer-screen للشاشة الأولى.
- shifts list/details، transactions، alerts.
- open/cash-in/cash-out/close/reverse/print-data.

### منطق الواجهة

- opening balance حقل مستقل لا يضاف إلى الإيرادات/المصروفات.
- close dialog يعرض expected، counted، difference، shortage/overage.
- الحركة تعرض source type/entity/date/employee/reversal.
- كل 12 ساعة يعرض warning القادم من الباك.
- عكس الحركة ينشئ حركة مقابلة ويترك الأصل ظاهراً.

### القبول

- لا يمكن فتح درج ثانٍ مخالف للقواعد.
- إغلاق الوردية يسجل الفرق الصحيح.
- الطباعة تستخدم `/print-data`.

## 15. المرحلة العاشرة — طلبات الإدارة والطاولات والتحضير

### طبقة الطلبات

إنشاء `orders.api.js` و`orders.adapter.js` يغطيان screen endpoints وcommands الفعلية في الباك. تزال كل تحويلات `Number(id)` وكل المسارات القديمة.

### البيع أونلاين/تيك أواي

- تحميل catalog مرة واحدة مع cache.
- DELIVERY: اسم/هاتف/عنوان. PICKUP: اسم/هاتف.
- تأكيد الطلب بمفتاح idempotency ثابت للضغط الحالي.
- الكارت يأتي من response ثم realtime.
- إضافة صنف، إلغاء صنف، طلب إلغاء كامل، دفع، إنهاء وطباعة حسب حالات الباك.

### الطاولات للإدارة

- `/tables-board` يعرض 1–20 وحالة كل طاولة.
- فتح الطلب وإضافة الأصناف وإلغاء session/إغلاقها من endpoints الحالية.
- لا توجد بيانات عميل للطاولة.
- الإغلاق يحصل كاش ويطبع الفاتورة.

### التحضير

- `/preparation-screen` بطلب واحد لكل tab/filter.
- تحديث حالة كل item مع expectedVersion.
- عند اكتمال الأصناف ينتقل الطلب للجاهز من response/event.
- إضافة صنف إلى READY تعيده للحالية تلقائياً.

### سجل الطلبات

- `/order-history-screen` بجدولين/فلتر channel أو fulfillment حسب عقد الشاشة.
- زر طباعة لكل طلب من `/orders/:id/print-data`.

### القبول

- تأكيد الطلب يخصم المخزون مرة واحدة.
- الإلغاء يعيد المخزون مرة واحدة.
- نفاد مكون أو conflict يعرض رسالة قابلة للتصرف.
- جميع حالات المنتج والطلب متزامنة في الشاشات الثلاث.

## 16. المرحلة الحادية عشرة — تجربة الطاولة وخدمات الجرسون

### الدخول

- حذف redirect إلى `/table/4`.
- QR يمرر tableNumber وqrSecret إلى bootstrap.
- table token يحفظ في `sessionStorage` ومربوط بالطاولة الحالية.

### السلة والطلب

- السلة المحلية مسودة فقط.
- زر “طلب الجرسون” يرسل proposal ولا يؤكد order.
- عرض حالات proposal وملاحظات طلب التعديل.
- بعد تأكيد الإدارة يتم التتبع من الباك realtime.

### الخدمات

- WAITER/WATER/SURPRISE/BILL/PROBLEM حسب enums الفعلية.
- الطلب يظهر فوراً للإدارة.
- الضيف يمكنه إلغاء المفتوح فقط.
- الإدارة تحله مع الموظف والوقت والسبب.

### تعديلات إلزامية

- إزالة chatbot من routes وnavigation وصفحات الطاولة.
- عدم إعادة قسم العروض.
- إبقاء التقييم وربطه بالطلب المؤكد.

### القبول

- تغيير رقم URL وحده لا يفتح طاولة من دون secret/token صالح.
- proposal لا يخصم المخزون قبل تأكيد الإدارة.
- service request لا يتكرر بعد reconnect.

## 17. المرحلة الثانية عشرة — العميل الأونلاين والتيك أواي

### التخزين المحلي

ينشأ `customerStorage.js` ويحفظ فقط:

- آخر name/phone/address.
- orderNumber/barcode.
- readToken/actionToken/access session المسموح.
- لا يحفظ order items/status/totals كمصدر حقيقة.

### العمليات

- checkout v1.
- إنشاء customer access session واسترجاع history.
- lookup بالرقم والهاتف.
- tracking بالread token.
- add items/cancellation request بالaction token وexpectedVersion.
- receive والتقييم.
- socket خاص بالطلب ثم REST sync بعد reconnect.

### حالات التسليم

- DELIVERY: زر الاستلام معطل حتى handover، ثم يؤكد العميل الاستلام ويفتح التقييم.
- PICKUP: الإدارة تنهي الطلب، ثم تظهر خانة التقييم للعميل.
- لو ضاع token تستخدم lookup لاستصدار/استرجاع الوصول بالطريقة التي يسمح بها الباك.

### القبول

- refresh لا يفقد الوصول للطلب.
- فتح جهاز آخر بالبيانات الصحيحة يعرض history من السيرفر.
- إضافة صنف لا تغير آخر profile إلا عند checkout جديد.

## 18. المرحلة الثالثة عشرة — العملاء والمناديب والتوصيل

### العملاء

- customers-screen/details/update/create حسب الحاجة الإدارية.
- تبويب الطلبات paginated، الفاتورة، والتقييمات.
- إزالة delete إن لم يدعمه العقد.
- normalized phone هو مفتاح المطابقة الذي يعيده الباك.

### المناديب

- delegates-screen/create/details/update.
- الطلبات paginated.
- assign → handover → delivered/failed/returned → cash settlement.
- WhatsApp يفتح `wa.me` ببيانات print/share الآمنة ثم يسجل share-opened.
- استبدال `MOCK_CUSTOMERS` ببحث API حقيقي.
- توحيد العملة على `ج.م`.

### القبول

- لا يعتبر assign تسليماً.
- cash settlement يظهر في الدرج.
- reassign يحتفظ بتاريخ التعيينات.

## 19. المرحلة الرابعة عشرة — التقارير والسجل والتقييمات والإشعارات

### التقارير

- financial-reports-screen للتحميل الأول.
- sales/inventory/drawer/suppliers/delegates عند فتح التفاصيل.
- export job مع backoff أو realtime حتى الجاهزية.
- لا يعاد حساب التقرير من بيانات الجداول الموجودة في المتصفح.

### سجل الأحداث

- إضافة `/admin/audit-events` وsidebar permission.
- screen/details/entity timeline/export.
- فلاتر actor/action/entity/date/requestId وpagination.
- before/after/details تعرض read-only.

### التقييمات

- إضافة `/admin/reviews`.
- list/by-order/moderation.
- ربط submit/update لتجربتي العميل والطاولة وفق الصلاحيات والعقد.

### الإشعارات

- notification center وunread badge.
- read/read-all إن كانت موجودة في العقد الحالي.
- events تحدث cache ولا تعيد bootstrap كاملاً.

### القبول

- أرقام التقارير تطابق invoices/drawer.
- كل رحلة حرجة تظهر في audit.
- التقييم لا يتكرر لنفس الطلب خلاف قواعد الباك.

## 20. المرحلة الخامسة عشرة — التنظيف النهائي والأداء

### إزالة القديم

- حذف old endpoint groups بعد صفر references.
- حذف `customerOrdersService` و`tableOrdersService` أو تقليصهما إلى draft storage فقط.
- حذف `MOCK_*` من production paths.
- حذف direct `apiClient` imports من pages/components.
- حذف dead routes ومنها table chatbot.

### الأداء

- فصل Recharts في chunk مستقل وتحميله داخل صفحات التقارير فقط.
- تقسيم Dashboard widgets.
- debounce البحث وcancel الطلب السابق.
- screen endpoints للتحميل الأول، وdetail endpoint عند فتح العنصر فقط.
- ضبط staleTime حسب طبيعة البيانات: catalog أطول، operational screens أقصر.
- قياس p50/p95 وحجم payload وعدد requests لكل رحلة.

### أهداف عدد الطلبات

- فتح Dashboard: طلب bootstrap الموجود + طلب dashboard واحد.
- فتح شاشة موردين/مخزون/مشتريات/تحضير: طلب screen واحد.
- فتح تفاصيل عنصر: طلب details واحد، والتبويبات الثقيلة عند الطلب فقط.
- mutation: طلب command واحد، ثم cache update؛ sync إضافي فقط عند gap/conflict.

## 21. خطة الاختبارات

### Unit

- envelope parsing.
- error mapping.
- pagination serialization.
- ID preservation.
- decimal display.
- status adapters.
- permission resolution.
- sequence deduplication.

### Contract

- كل method/path مستخدم موجود في manifest.
- request schemas المهمة مطابقة بأمثلة valid/invalid.
- response fixtures تمر عبر adapters بلا حقول undefined حرجة.

### Integration بـMSW

- login/pending device/refresh.
- المورد وحركات الحساب.
- purchase → register batch → warning.
- product recipe/cost.
- order confirm/add/cancel/prepare/finish.
- drawer open/move/close.
- delivery handover/receive/settle.

### اختبارات الرحلات المتكاملة

تنفذ الرحلات التالية باختبارات تكامل Vitest وMSW، ثم تحقق يدوي على المتصفح المثبت لدى المستخدم من دون تنزيل Chromium ضمن أدوات المشروع:

1. رحلة مسؤول كاملة.
2. رحلة موظف بجهاز جديد.
3. رحلة DELIVERY.
4. رحلة PICKUP.
5. رحلة طاولة من QR إلى إغلاق وطباعة.
6. race بين نافذتين على الطلب نفسه.
7. انقطاع socket ثم الاستعادة.

### Accessibility وResponsive

- keyboard navigation وfocus داخل dialogs.
- labels/errors مرتبطة بالحقول.
- contrast وحالات اللون معها نص.
- 320/375/768/1024/1440px.
- RTL للجداول والقوائم والطباعة.

## 22. بوابات الانتقال بين المراحل

لا تعتبر أي مرحلة مكتملة إلا بعد:

- build ناجح.
- lint ناجح.
- unit/contract tests الخاصة بها ناجحة.
- لا توجد endpoint قديمة للموديول.
- لا توجد mock data في مساره.
- فحص يدوي للموبايل والديسكتوب.
- توثيق request count وزمن الاستجابة للرحلة الأساسية.
- تحديث قائمة الترحيل بالحالة والدليل.

## 23. تعريف الإنجاز النهائي

المشروع كامل عندما تنجح الرحلات التالية على الباك الحالي من دون أي تعديل فيه:

1. المورد → المادة الخام → فاتورة شراء → batch → تحذير.
2. المنتج → النوع → الحجم → الوصفة → التكلفة → الظهور بالمنيو.
3. موظف → جهاز معتمد → صلاحيات → حضور → درج → انصراف.
4. طلب إدارة/عميل/طاولة → خصم مخزون → تحضير → جاهز → دفع/توصيل → فاتورة → تقييم.
5. إلغاء صنف/طلب → عكس المخزون والحسابات مرة واحدة.
6. خدمة طاولة → ظهور لحظي → تم التعامل → سجل منتهٍ.
7. كل ما سبق يظهر في التقارير وسجل الأحداث والإشعارات.
8. refresh/reconnect/double-click/concurrent edit لا ينتج فقداً أو تكراراً أو بيانات غير متسقة.

## 24. ترتيب التنفيذ العملي المختصر

```text
0 اختبارات الأساس
→ 1 API core
→ 2 Auth/Permissions
→ 3 Shared UI/Realtime
→ 4 Suppliers
→ 5 Inventory/Warnings
→ 6 Purchases/Returns
→ 7 Products/Media/Catalog
→ 8 Employees/Devices/Attendance
→ 9 Drawer
→ 10 Admin Orders/Tables/Preparation
→ 11 Table Guest/Services
→ 12 Customer Experience
→ 13 Customers/Delegates/Delivery
→ 14 Reports/Audit/Reviews/Notifications
→ 15 Cleanup/Performance/Full Integration Verification
```

هذه الخطة تعتمد الباك الحالي كعقد غير قابل للتعديل. إذا ظهر اختلاف أثناء التنفيذ، يتم أولاً إثبات السلوك من route وvalidation وcontroller في الباك، ثم تعديل adapter أو الشاشة في الفرونت فقط، وتسجيل الحالة في اختبار contract يمنع عودتها.

## 25. إضافات المراجعة النهائية

بعد مطابقة الخطة مع `route-manifest.json` الذي يحتوي على 195 route، ظهرت وظائف تحتاج إلى ذكر صريح حتى لا تضيع داخل عناوين عامة. البنود التالية أصبحت جزءاً إلزامياً من التنفيذ.

### 25.1 وحدات القياس

تضاف داخل مرحلة المواد الخام طبقة `measurementUnits.api.js` وتبويب إدارة وحدات القياس لمن يملك الصلاحية:

- `listMeasurementUnits()` من `GET /measurement-units`.
- `createMeasurementUnit(payload)` من `POST /measurement-units`.
- `updateMeasurementUnit(id,payload)` من `PATCH /measurement-units/:id`.
- تستخدم المادة `measurementUnitId` والقيم التي يعيدها الباك بدلاً من constants ثابتة.
- يعرض الاسم الكبير والصغير ومعامل التحويل وحالة الوحدة.
- منع تعديل معامل مستخدم بطريقة توهم المستخدم أن كميات الدفعات القديمة تغيرت؛ تعرض نتيجة الباك ورسالة التعارض.

معيار القبول: الوحدة المنشأة تظهر في إضافة المادة، والتحويل المعروض يطابق الوحدة المختارة، ولا توجد قائمة وحدات hard-coded كمصدر حقيقة.

### 25.2 سجل فواتير البيع المستقل

تضاف داخل مرحلة الطلبات صفحة/تبويب invoices يعتمد على:

- `GET /invoices?page&limit&...` للقائمة.
- `GET /invoices/:id` للتفاصيل.
- `GET /invoices/:id/print-data` لإنشاء النسخة القابلة للطباعة.
- `POST /invoices/:id/print-events` بعد بدء الطباعة فعلياً لتسجيل الحدث.
- `GET /orders/:id/invoice-preview` قبل الإنهاء.
- `POST /orders/:id/invoice-finalize` عند استحقاق إصدار الفاتورة وفق حالة الطلب.

لا تنشئ الواجهة رقم فاتورة ولا totals ولا ضريبة من نفسها. تمنع الطباعة المزدوجة من إنشاء فاتورتين، بينما يمكن تكرار الطباعة ويسجل كل print event.

### 25.3 الدفع والتسوية ورد الأموال

تضاف state machine واضحة للدفع داخل مرحلة الطلبات والدرج:

- `POST /orders/:id/payments` للتحصيل النقدي.
- `GET /orders/:id/payments` لعرض سجل المدفوعات.
- `POST /order-payments/:id/settle` للتسوية عندما يطلبها العقد.
- `POST /order-payments/:id/refunds` لإنشاء رد مبلغ.
- `POST /cash-refunds/:id/complete` لإتمام رد الكاش من درج مفتوح.
- `POST /cash-refunds/:id/retry` لإعادة محاولة رد فشل.
- `POST /cash-refunds/sweep` لمعالجة الحالات المعلقة بصلاحية الإدارة.

تضاف صفحة أو تبويب “حالات مالية معلقة” تعرض cash refunds المعلقة من بيانات الشاشة/التفاصيل المتاحة في العقد، مع الحالة والسبب والمحاولات والطلب والدفع والدرج. لا تعتبر عملية الإلغاء مكتملة مالياً إذا كان رد المبلغ ما زال معلقاً.

معيار القبول: الدفع ورد المبلغ والتسوية كل منها idempotent، وحالة الطلب وحالة الدفع وحركة الدرج متوافقة بعد refresh.

### 25.4 طلبات إلغاء العميل

تضاف داخل إدارة الطلبات queue مستقلة أو تبويب واضح:

- `GET /order-cancellation-requests` مع pagination والفلاتر.
- `GET /order-cancellation-requests/:id` للتفاصيل.
- `POST /order-cancellation-requests/:id/approve` للموافقة.
- `POST /order-cancellation-requests/:id/reject` للرفض مع السبب.

طلب العميل عبر `/public-orders/:orderNumber/cancellation-request` لا يلغي الطلب فوراً. تعرض تجربة العميل حالة الطلب “طلب الإلغاء قيد المراجعة”، وتعرض الإدارة أثر الموافقة المتوقع قبل التأكيد. بعد القرار تعتمد الشاشتان على response وrealtime.

معيار القبول: لا يمكن اتخاذ قرارين لنفس الطلب، والموافقة تعكس المخزون/المال حسب الباك، والرفض يعيد الطلب لمساره الصحيح مع السبب.

### 25.5 شاشة الطلبات الأونلاين المجمعة

تستخدم صفحة الإدارة `GET /orders-online-screen` بدلاً من بناء الكروت بعدة استدعاءات. يجب أن تغطي الصفحة الطلبات النشطة، الجاهزية، العدادات، وبيانات الإجراء التي يعيدها الباك. تفاصيل الطلب فقط تحمل عند فتح الكارت.

### 25.6 شاشة مراجعة اقتراحات الطاولات للإدارة

لا يكفي إرسال الاقتراح من العميل. تضاف للإدارة العمليات الست كاملة:

- قائمة `/table-order-proposals`.
- تفاصيل `/:id`.
- بدء المراجعة `/:id/start-review`.
- طلب تعديل `/:id/request-changes`.
- رفض `/:id/reject`.
- تأكيد `/:id/confirm`، وهو وحده الذي ينشئ الطلب ويبدأ أثر المخزون.

كل قرار يرسل reason/version/idempotency حسب validation الفعلي، وتظهر التغييرات للطاولة realtime.

### 25.7 إدارة الطاولات وQR

تضاف صراحة داخل شاشة الطاولات:

- تفاصيل الطاولة من `GET /tables/:id`.
- تفعيل/تعطيل أو تغيير الحالة من `PATCH /tables/:id`.
- إنشاء طلب الإدارة من `POST /tables/:id/admin-orders`.
- تدوير QR من `POST /tables/:id/rotate-qr` مع confirmation لأن الرمز القديم يفقد صلاحيته.
- تفاصيل الجلسة وإضافة الأصناف والإلغاء والإغلاق والطباعة عبر `table-sessions`.

يمنع تخزين qrSecret في logs أو رسائل الخطأ أو analytics.

### 25.8 إدارة الإضافات والوصفة

داخل مرحلة المنتجات تضاف الدوال الصريحة:

- `createProductType(productId,payload)`.
- `createProductSize(productId,payload)`.
- `replaceSizeRecipe(sizeId,payload)` عبر `PUT /product-sizes/:id/recipe`.
- `createProductAddon(productId,payload)`.
- `updateProductAddon(addonId,payload)`.

الحفظ المتدرج يحتفظ بمعرفات الاستجابة، ولا يستخدم index الصف كمعرف. أي خطوة فاشلة لا تعيد تنفيذ الخطوات الناجحة عند retry.

### 25.9 قائمة المواد المسحوبة

تضاف `GET /withdrawals?page&limit&...` صراحة لتبويب المواد المسحوبة. القائمة read-only وتعرض المادة والدفعة والكمية والسبب والموظف والتاريخ ومرجع العملية، من دون زر استرجاع أو تشغيل.

### 25.10 فحص التشغيل وتوافق النسخة

قبل تحميل التطبيق الإداري بالكامل:

- `GET /health/live` يستخدم فقط لمؤشر وصول الخدمة عند الحاجة.
- `GET /health/ready` يستخدم في صفحة انقطاع/صيانة، وليس polling مستمراً.
- `GET /system/version` يقارن نسخة العقد التي بني عليها الفرونت.
- `GET /api/v1/` يمكن استخدامه لفحص معلومات API العامة إن احتاجتها شاشة التشخيص.

تضاف `CompatibilityGate` تمنع تشغيل نسخة Frontend غير متوافقة عندما يعلن endpoint الإصدار عن اختلاف breaking موثق، وتعرض رسالة تحديث واضحة. لا تتحول health checks إلى طلبات دورية كثيفة.

### 25.11 دورة رفع الصور كاملة

تفصيل media flow:

1. فحص extension/MIME/size في الفرونت لتحسين التجربة.
2. `POST /media/uploads` كـmultipart بالاسم الذي يطلبه multer.
3. حفظ media id/URL من response.
4. ربط المعرف بالمنتج في command المنتج.
5. عرض المحتوى العام عبر `/media/:id/content` بالـquery المدعوم.
6. قائمة وتفاصيل media للإدارة.
7. `DELETE /media/:id` مع body السبب عند كون الحذف مسموحاً.

إذا فشل ربط المنتج بعد نجاح الرفع، تعرض الواجهة الملف كوسيط غير مربوط يمكن إعادة استخدامه أو حذفه، ولا تعيد رفعه تلقائياً.

### 25.12 سياسات النماذج والتنقل

- كل form يمنع submit أثناء pending.
- dirty form يعرض تأكيداً قبل الخروج.
- server field errors توضع بجوار الحقول.
- التاريخ يرسل ISO وفق timezone العقد، ويعرض بتوقيت Africa/Cairo.
- البحث لا يبدأ قبل الحد الأدنى المنطقي للحروف إن حدده العقد.
- reset filters يعيد page إلى 1.
- تغيير filter يعيد page إلى 1 ويلغي request السابق.
- الرجوع من التفاصيل يحفظ page/filter/scroll للشاشة السابقة.

### 25.13 حالات الاتصال والأمان في المتصفح

- لا تسجل tokens أو passwords أو qrSecret أو tracking/action tokens في console أو error telemetry.
- password الظاهر للموظف لا يدخل cache دائم ولا localStorage.
- منع إرسال Authorization إلى media/public URLs خارج أصل الـAPI.
- تنظيف socket listeners وAbortControllers عند logout/unmount.
- عند offline تعرض آخر cache للقراءة بعلامة “قديمة”، وتعطل commands؛ لا تصطف عمليات مالية لإرسالها تلقائياً عند عودة الشبكة.
- تصفية أي HTML قادم من notes/reviews قبل عرضه، وعدم استخدام `dangerouslySetInnerHTML` لبيانات المستخدم.

## 26. مصفوفة تغطية عائلات الـAPI

هذه المصفوفة هي checklist إلزامية في اختبار العقد. العدد المرجعي هو **195 route** ويشمل health/version. المطلوب تغطية كل route يستخدمه المنتج، ووضع الباقي كـ`intentionally unused` مع سبب مكتوب؛ لا يترك route بلا قرار.

- التشغيل: root، health live/ready، system version.
- الجلسة: auth، admin bootstrap.
- الموارد البشرية: employees، employee-devices، attendance، permissions، roles.
- الموردون: suppliers، supplier account entries، reverse entry.
- المخزون: raw-materials، measurement-units، withdrawals، warnings.
- المشتريات: purchases-screen، purchase-groups، purchase-items، supplier purchase print، purchase-returns.
- المنتجات: products-screen، products، categories، types، sizes، recipes، addons، catalog، media.
- الطلبات: orders-online-screen، orders، order history، preparation، cancellation requests.
- الطاولات: tables board، tables، table sessions، table proposals، table experience، table services.
- العميل: public orders، access sessions، customer orders، customers، customer AI.
- التوصيل: delegates، delivery assignments.
- المال: payments، refunds، drawer، invoices.
- المتابعة: reviews، notifications، audit، entity timeline، realtime sync، financial reports.

ينشأ `src/api/routeCoverage.test.js` ويقرأ frontend endpoint registry، ثم يقارنه بنسخة manifest مثبتة. يفشل الاختبار عند:

- method أو path غير موجودين.
- endpoint production مكتوبة خارج registry.
- route مستخدمة بلا adapter test.
- route اعتُبرت غير مستخدمة من دون سبب في allowlist.

## 27. مراجعة الاكتمال النهائية قبل بدء التنفيذ

بعد الإضافات السابقة أصبحت الخطة تغطي كل المجالات الموجودة في الباك والوثيقة، وتشمل كذلك الحالات التي كانت ناقصة في الإصدار الأول من الخطة: وحدات القياس، الفواتير المستقلة، أحداث الطباعة، الدفع والتسوية، refunds المعلقة وإعادة المحاولة، طلبات الإلغاء الإدارية، proposals الإدارية، تدوير QR، وإصدار/جاهزية النظام.

تبقى حقيقة واحدة يجب إثباتها أثناء التنفيذ: تفاصيل أسماء الحقول والـenums لكل request وresponse لا تؤخذ من التخمين أو من الفرونت القديم؛ تؤخذ من validation/controller والـAPI doc الحاليين وتثبت باختبار adapter. هذا إجراء تنفيذ داخل الفرونت ولا يتطلب أي تعديل في الباك.

## 28. الشرح التنفيذي التفصيلي للـ16 مرحلة

هذا القسم هو مرجع التنفيذ اليومي. أسماء الدوال المقترحة قد تتغير شكلياً أثناء البرمجة، لكن مسؤولياتها وحدودها ومعايير قبولها ملزمة.

### المرحلة 0 — تثبيت خط الأساس وأدوات الجودة

#### التعديلات

- تجهيز Vitest وReact Testing Library وMSW وESLint من دون Playwright أو متصفح مضمّن، للحفاظ على حجم المشروع.
- توثيق متغيرات البيئة من دون قيم سرية.
- حفظ تقرير آلي بالحالة الحالية: endpoints القديمة، الاستدعاءات المباشرة، mocks، التخزين المحلي، وتحويل IDs لأرقام.
- عدم تغيير سلوك أي شاشة في هذه المرحلة.

#### الملفات والدوال

- `src/test/setup.js`: يشغل DOM matchers، ينظف React Query والـstorage والـlisteners بعد كل اختبار.
- `src/test/server.js`: ينشئ `setupServer()` ويمنع أي network request غير mock داخل الاختبارات.
- `src/test/renderApp.js`: الدالة `renderApp({route,auth,handlers})` تشغل الصفحة بنفس providers الحقيقية.
- `scripts/audit-frontend-contract.mjs`:
  - `scanEndpointLiterals()` يبحث عن URL مكتوبة خارج registry.
  - `scanLegacyImports()` يجد الخدمات القديمة وملفات mock.
  - `scanNumericIds()` يجد `Number/parseInt` على حقول المعرفات.
  - `writeBaselineReport()` يحفظ الأعداد وأسماء الملفات للمقارنة.
- `src/api/route-manifest.snapshot.json`: نسخة اختبارية من route manifest الحالي.

#### التحقق

- `npm run build`, `npm run lint`, `npm run test:run` تعمل.
- baseline لا يفشل البناء في أول مرة، لكنه يصبح gate بعد نهاية مرحلة التنظيف.

### المرحلة 1 — تأسيس API Core

#### التعديلات

- إضافة عميل `/api/v1` مستقل.
- توحيد envelope والأخطاء والـpagination والـheaders.
- منع refresh storms، وإضافة cancellation وrequest identifiers.

#### الملفات والدوال

- `src/api/v1Client.js`:
  - `resolveV1BaseUrl(rawUrl)` يطبع base صحيحاً في التطوير والإنتاج.
  - `createV1Client(options)` ينشئ Axios instance بسياسة timeout موحدة.
  - `attachAdminAuth(config)` يضيف access token فقط عندما يلزم.
  - `refreshAccessTokenOnce()` ينفذ refresh واحداً لكل مجموعة 401.
  - `replayAfterRefresh(request)` يعيد الطلب مرة واحدة.
  - `clearExpiredSession()` يغلق socket ويمسح store والتخزين.
- `src/api/envelope.js`:
  - `assertEnvelope(payload)` يتحقق من `ok/data/meta`.
  - `unwrapData(payload)` يعيد البيانات.
  - `unwrapWithMeta(payload)` يعيد البيانات والـmeta.
  - `unwrapPage(payload,key)` يعيد items وpage/limit/total/pages.
- `src/api/apiError.js`:
  - `normalizeApiError(error)` يحفظ status/code/details/fieldErrors/requestId.
  - `getArabicErrorMessage(error)` يترجم الأكواد المعروفة.
  - `applyFieldErrors(form,error)` يربط أخطاء 422 بالحقول.
- `src/api/idempotency.js`:
  - `beginOperation(scope)` ينشئ key ويحفظه حتى نهاية المحاولة.
  - `operationHeaders(operation,version)` يضيف idempotency/version headers أو body وفق العقد.
  - `finishOperation(scope)` يمسح المفتاح بعد النتيجة النهائية.
- `src/api/pagination.js`: `normalizePageParams`, `readPageMeta`, `resetPageOnFilterChange`.
- `src/api/requestCancellation.js`: `replacePendingRequest(key)` و`cancelPendingRequest(key)`.

#### حالات يجب تغطيتها

- 401 متزامن، refresh فاشل، 403، 404، 409، 413، 422، 429، 503، timeout، offline.
- لا يعاد تلقائياً أي POST حساس بعد timeout مجهول النتيجة؛ يعاد الاستعلام أو retry بالمفتاح نفسه.

### المرحلة 2 — المصادقة والـBootstrap والصلاحيات

#### التعديلات

- نقل login/refresh/logout/bootstrap للعقد الحالي.
- استكمال انتظار اعتماد الجهاز.
- جعل permission keys مصدر إظهار الصفحات والأفعال.

#### الملفات والدوال

- `auth.api.js`: `login`, `refresh`, `logout`, `getAdminBootstrap`.
- `deviceFingerprint.js`: `getDeviceFingerprint()` و`buildDevicePayload()`؛ يحمل FingerprintJS مرة واحدة.
- `auth.adapter.js`: `toAuthSession(dto)` و`toPendingDeviceState(error)`.
- `authStore.js`: `hydrateSession`, `replaceTokens`, `setPendingDevice`, `clearSession`, `applyBootstrap`.
- `permission.js`: `can`, `canAny`, `canAll`, `canSeePage`, `filterAllowedActions`.
- `AuthBootstrap.jsx`: `bootstrap()`، ويتوقف عند عدم وجود token، ويمنع redirect loop.
- `ProtectedRoute.jsx`: يختبر page permission ويعرض forbidden state.

#### تعديلات الواجهة

- حالة جهاز PENDING تعرض رقم/اسم الجهاز ورسالة انتظار وزر `retryBootstrap`.
- BLOCKED يعرض رسالة نهائية ويتيح الرجوع للدخول.
- sidebar يبنى من permissions مع ترتيب عرض محلي ثابت.
- password لا يدخل Zustand persist أو localStorage.

#### التحقق

- اختبارات login الناجح والمعلق والمحظور؛ refresh single-flight؛ logout؛ session invalidation؛ DENY يغلب ALLOW.

### المرحلة 3 — Shared UI وReact Query وRealtime

#### التعديلات

- توحيد الاستعلامات والحالات المرئية والطباعة.
- إنشاء اتصال realtime واحد لكل context مع sequence recovery.

#### الملفات والدوال

- `queryClient.js`: `createQueryClient()` بسياسة retries لا تعيد business errors.
- `queryKeys.js`: factories مثل `suppliers.list(params)`, `orders.details(id)` لمنع cache collisions.
- `ServerPagination.jsx`: `goToPage`, `goPrevious`, `goNext` مع meta السيرفر.
- `AsyncState.jsx`: `LoadingState`, `EmptyState`, `ErrorState`.
- `ConflictDialog.jsx`: `reloadLatest()` و`discardLocalChanges()`.
- `PrintDocument.jsx`: `loadPrintData`, `openPrintWindow`, `recordPrintEvent`.
- `socketManager.js`: `connectAdmin`, `connectTracking`, `connectTable`, `disconnectScope`.
- `sequenceStore.js`: `getLastSequence`, `acceptSequence`, `clearSequences`.
- `syncClient.js`: `syncMissedEvents`, `recoverRoomAfterReconnect`.
- `eventQueryMap.js`: `queriesForEvent` و`applyRealtimeEvent`.

#### الحالات

- event مكرر، event خارج الترتيب، gap، reconnect، token changed، component remount، أكثر من tab.
- يمنع invalidation storm بتجميع الأحداث المتقاربة في نافذة قصيرة.

### المرحلة 4 — الموردون

#### التعديلات

- استبدال كل supplier endpoints القديمة.
- server pagination، حالة المورد، الحساب اليدوي، التسوية من الدرج، وعكس القيود.

#### الدوال

- `listSuppliers(params)`, `createSupplier(body)`, `getSupplier(id)`, `updateSupplier(id,body)`, `changeSupplierStatus(id,body)`.
- `listSupplierEntries(id,params)`, `createSupplierEntry(id,body,key)`, `reverseSupplierEntry(entryId,body,key)`.
- `toSupplierRow`, `toSupplierDetails`, `toSupplierEntryRow`.
- hooks: `useSuppliers`, `useSupplier`, `useSupplierEntries`, `useCreateSupplier`, `useUpdateSupplier`, `useSupplierStatus`, `useCreateSupplierEntry`, `useReverseSupplierEntry`.

#### الحالات

- مورد مكرر، inactive، دفعة أكبر من الرصيد، لا يوجد درج مفتوح، قيد معكوس، ضغط مزدوج، صفحة حذفت منها آخر نتيجة.
- بعد mutation تحدث تفاصيل المورد والدرج والقائمة من response/events.

### المرحلة 5 — وحدات القياس والمواد الخام والتحذيرات

#### التعديلات

- استبدال constants بوحدات الباك.
- ربط المادة بالمورد عند الإنشاء.
- جعل الدفعات read-only خارج المشتريات.
- تنفيذ الأولوية والسحب والتحذيرات كاملة.

#### الدوال

- الوحدات: `listUnits`, `createUnit`, `updateUnit`, `toUnitOption`, `convertForDisplay`.
- المواد: `getMaterialsScreen`, `createMaterial`, `getMaterial`, `updateMaterial`, `updateBatchPriorities`, `withdrawMaterial`, `listWithdrawals`.
- التحذيرات: `getWarningsScreen`, `getWarningsSummary`, `toWarningRow`, `warningQueryFromFilters`.
- hooks مستقلة لكل query/mutation، مع invalidation للمادة والتحذيرات والمنتجات المتأثرة.

#### الحالات

- معامل تحويل غير صالح، تغيير مورد/وحدة مقفلة، batch منتهية، سحب أكبر من المتاح، دفعتان لهما نفس الأولوية، مادة بلا مخزون، تحذير وردية عند مضاعفات 12 ساعة.

### المرحلة 6 — المشتريات والمرتجعات

#### التعديلات

- اعتماد purchase group كالفاتورة الإنشائية متعددة الموردين.
- تسجيل كل item أو مجموعة items كدفعات.
- تقسيم وطباعة فواتير الموردين.
- بناء purchase returns على الدفعات المؤهلة.

#### الدوال

- `getPurchasesScreen`, `createPurchaseGroup`, `getPurchaseGroup`, `updatePurchaseGroup`, `deletePurchaseGroup`.
- `splitPurchaseGroupBySupplier`, `registerPurchaseItem`, `registerManyPurchaseItems`.
- `getPurchaseGroupPrintData`, `getSupplierPurchaseInvoicePrintData`.
- `getPurchaseReturnsScreen`, `createPurchaseReturn`, `getPurchaseReturn`, `getPurchaseReturnPrintData`.
- adapters: `toDraftInvoice`, `toPurchaseLine`, `toRegistrationForm`, `toReturnCandidate`, `toReturnRecord`.

#### الحالات

- المادة تتبع المورد بالفعل؛ لا يختار المستخدم مورداً مختلفاً للسطر.
- تعديل/حذف بعد تسجيل بعض العناصر، تسجيل item مرتين، صلاحية مفقودة، كمية صفرية، سعر سالب، فاتورة فارغة، split لمورد واحد، مرتجع أكبر من المتاح.
- لا تنشأ ديون مورد تلقائياً.

### المرحلة 7 — المنتجات والأقسام والأنواع والأحجام والوصفات والوسائط

#### التعديلات

- تفكيك product configuration القديم إلى commands الباك الحالية.
- بناء حفظ متدرج قابل للاستكمال.
- اعتماد expected cost من الباك والـcatalog الموحد.

#### الدوال

- `getProductsScreen`, `createProduct`, `getProduct`, `updateProduct`.
- `createCategory`, `updateCategory`.
- `createProductType`, `createProductSize`, `replaceSizeRecipe`.
- `createProductAddon`, `updateProductAddon`.
- `uploadMedia`, `listMedia`, `getMedia`, `getMediaContentUrl`, `deleteMedia`.
- `getCatalog`, `toMenuProduct`, `toProductEditor`, `toRecipeLine`, `toCostView`.
- `saveProductDraftStep(step,state)`: ينفذ الخطوة الحالية فقط.
- `resumeProductDraft(productId)`: يعيد بناء wizard من تفاصيل الباك.

#### الحالات

- منتج بلا نوع/حجم/وصفة، اسم مكرر، صورة كبيرة، upload نجح والربط فشل، مادة inactive، وصفة بكمية صفر، addon غير متاح، إخفاء منتج موجود في طلب قديم.

### المرحلة 8 — الموظفون والأجهزة والحضور والأدوار

#### التعديلات

- صفحات الموظفين والتفاصيل والأجهزة المعلقة والحضور والأدوار والصلاحيات.
- includes lazy حسب التبويب لمنع payload ضخم.

#### الدوال

- الموظفون: `getEmployeesScreen`, `createEmployee`, `getEmployee`, `updateEmployee`.
- الأجهزة: `listEmployeeDevices`, `approveDevice`, `blockDevice`.
- الصلاحيات: `listPermissions`, `replaceEmployeePermissionMatrix`, `listRoles`, `createRole`, `updateRole`, `replaceRolePermissions`.
- الحضور: `checkIn`, `listAttendance`, `getAttendance`, `adminCheckOut`, `adjustAttendance`, `forceCloseAttendance`.
- adapters: `toEmployeeDetails`, `toDeviceRow`, `toPermissionMatrix`, `toAttendanceRow`.

#### الحالات

- username مكرر، password ظاهر بلا صلاحية، جهاز سبق اعتماده/حظره، الموظف يعدل نفسه، آخر admin، attendance مفتوح، checkout مع درج مفتوح، تعديل ساعات ينتج مدة سالبة، force-close بلا سبب.

### المرحلة 9 — الدرج والحركات والتنبيهات

#### التعديلات

- شاشة مجمعة للوردية الحالية، سجل الأدراج، الحركات، التنبيهات، العكس والطباعة.
- تكامل مرئي مع مدفوعات المورد والطلبات والمناديب والمرتجعات.

#### الدوال

- `getDrawerScreen`, `listDrawerShifts`, `openDrawerShift`, `getDrawerShift`.
- `listDrawerTransactions`, `listDrawerAlerts`, `cashIn`, `cashOut`, `closeDrawerShift`, `reverseDrawerTransaction`, `getDrawerPrintData`.
- `calculateDisplayedDifference(counted,expected)` للعرض فقط؛ النتيجة النهائية من الباك.
- `toDrawerSummary`, `toDrawerTransaction`, `toDrawerCloseResult`.

#### الحالات

- درج مفتوح بالفعل، رصيد افتتاحي غير صالح، حركة بلا سبب، رصيد غير كاف، عكس حركة معكوسة، إغلاق بمبلغ مطابق/عجز/زيادة، command نتيجته مجهولة بعد timeout.

### المرحلة 10 — طلبات الإدارة والتحضير والطاولات والفواتير والمدفوعات

#### التعديلات

- استبدال gateway القديم بالكامل.
- توصيل online/takeaway/tables/preparation/history/invoices/payments/cancellations.

#### الدوال

- الشاشات: `getOnlineOrdersScreen`, `getPreparationScreen`, `getOrderHistoryScreen`, `getTablesBoard`.
- الطلب: `createOrder`, `getOrder`, `addOrderItems`, `cancelOrderItem`, `cancelOrder`, `completeTakeaway`.
- التحضير: `listPreparationOrders`, `getPreparationOrder`, `markOrderItemReady`.
- الطاولة: `getTable`, `updateTable`, `createTableAdminOrder`, `getTableSession`, `addTableSessionItems`, `cancelTableSession`, `closeTableSession`, `rotateTableQr`.
- الفواتير: `previewOrderInvoice`, `finalizeOrderInvoice`, `listInvoices`, `getInvoice`, `getInvoicePrintData`, `recordInvoicePrint`.
- الدفع: `collectOrderPayment`, `listOrderPayments`, `settleOrderPayment`, `createPaymentRefund`.
- الإلغاء الإداري: `listCancellationRequests`, `getCancellationRequest`, `approveCancellation`, `rejectCancellation`.
- adapters: order card/details/item/status/progress/invoice/payment/table.

#### الحالات

- مخزون غير كاف، batch منتهية مسموحة، صنف أُلغي أو جهز بالفعل، إضافة لصنف READY، إلغاء مدفوع، فاتورة finalized، دفع زائد/مكرر، طاولة مشغولة، جلستان للطاولة، conflict بين نافذتين، طلب إلغاء سبق اتخاذ قرار فيه.

### المرحلة 11 — تجربة الطاولة وخدمات الجرسون

#### التعديلات

- الدخول من QR، proposal بدلاً من التأكيد، التتبع، التقييم والخدمات realtime.
- إضافة شاشة مراجعة proposals للإدارة.
- إزالة عروض وchatbot الطاولة والرقم 4 الثابت.

#### الدوال

- الضيف: `bootstrapTableGuest`, `submitTableProposal`, `getCurrentTableProposal`, `cancelCurrentProposal`, `submitTableReview`.
- الخدمات: `createTableService`, `cancelTableService`, `getTableServicesScreen`, `getTableServiceRequest`, `resolveTableServiceRequest`.
- الإدارة: `listTableProposals`, `getTableProposal`, `startProposalReview`, `requestProposalChanges`, `rejectProposal`, `confirmProposal`.
- storage: `saveTableToken`, `readTableToken`, `clearTableSessionStorage`; لا يخزن qrSecret بعد bootstrap.

#### الحالات

- QR قديم بعد rotate، token لطاولة مختلفة، proposal قائم، proposal تعديله مطلوب، إلغاء بعد بدء المراجعة، خدمة مكررة، إلغاء خدمة تم حلها، تأكيد اقتراح تغيرت منتجاته.

### المرحلة 12 — تجربة العميل الأونلاين والتيك أواي والباريستا الذكي

#### التعديلات

- checkout وتتبع وتاريخ وإضافة وإلغاء واستلام وتقييم على v1 فقط.
- الاحتفاظ بآخر بيانات العميل محلياً كما طلبت المواصفات.
- الباريستا الذكي يرى catalog المنتجات فقط ولا يرى الوصفات.

#### الدوال

- `createPublicOrder`, `lookupPublicOrder`, `getPublicOrderTracking`, `addPublicOrderItems`, `requestPublicOrderCancellation`, `confirmPublicOrderReceipt`, `submitPublicOrderReview`.
- `createCustomerAccessSession`, `listCustomerOrderHistory`.
- `loadSavedCustomerProfile`, `saveLatestCustomerProfile`, `saveOrderAccess`, `getOrderAccess`, `forgetOrderAccess`.
- `connectOrderTracking`, `syncOrderTrackingAfterReconnect`.
- `sendCustomerAiMessage(message,context)`: يرسل السياق المسموح من الكتالوج فقط.

#### الحالات

- هاتف/عنوان ناقص، lookup لا يطابق، token مفقود/منتهي، إضافة بعد الإغلاق، إلغاء تحت المراجعة، استلام قبل handover، تقييم مكرر، تغير بيانات عميل في طلب جديد، history فارغ، AI timeout/rate limit.

### المرحلة 13 — العملاء والمناديب والتوصيل

#### التعديلات

- إدارة العملاء، المندوبين، ودورة التوصيل والكاش وWhatsApp.

#### الدوال

- العملاء: `getCustomersScreen`, `createCustomer`, `getCustomer`, `updateCustomer`.
- المناديب: `getDelegatesScreen`, `createDelegate`, `getDelegate`, `updateDelegate`.
- التوصيل: `assignDelegate`, `getDeliveryAssignment`, `handoverDelivery`, `reassignDelivery`, `failDelivery`, `markDeliveryReturned`, `adminConfirmDelivery`, `settleDeliveryCash`, `recordWhatsappShareOpened`.
- `buildWhatsappInvoiceUrl(printData,phone)`: ينشئ الرابط من بيانات آمنة ولا يرسل الرسالة تلقائياً.
- adapters للعملاء وطلباتهم والتقييمات وتاريخ التوصيل.

#### الحالات

- مندوب inactive، تعيين مكرر، إعادة تعيين لنفس المندوب، handover مرتين، فشل/رجوع بعد التسليم، تسليم من الإدارة بلا سبب، كاش تمت تسويته، رقم WhatsApp غير صالح، عميل بنفس الهاتف.

### المرحلة 14 — التقارير وسجل الأحداث والتقييمات والإشعارات والاستردادات

#### التعديلات

- استكمال الموديولات الرقابية التي لم تكن لها صفحات كاملة.
- إضافة مركز للحالات المالية المعلقة.

#### الدوال

- التقارير: `getFinancialReportsScreen`, `getSalesReport`, `getInventoryReport`, `getDrawerReport`, `getSuppliersReport`, `getDelegatesReport`, `startReportExport`, `getReportExportStatus`.
- التدقيق: `getAuditScreen`, `getAuditEvent`, `getEntityTimeline`, `startAuditExport`, `getAuditExportStatus`.
- التقييمات: `listReviews`, `getOrderReviews`, `submitAdminReview`, `updateReview`, `moderateReview`.
- الإشعارات: `listNotifications`, `markNotificationRead`, `markAllNotificationsRead`.
- الاستردادات: `completeCashRefund`, `retryCashRefund`, `sweepCashRefunds`.
- polling: `pollExportUntilReady(jobId,{signal,interval,maxDuration})` مع backoff وإلغاء عند مغادرة الصفحة.

#### الحالات

- فترة غير صالحة، تقرير فارغ، export pending/failed/expired، audit payload كبير، notification قرئت في جهاز آخر، moderation مكرر، refund لا يملك درجاً مفتوحاً، sweep جزئي النجاح.

### المرحلة 15 — إزالة القديم والتحقق الشامل والأداء

#### التعديلات

- حذف كل legacy paths/services/mocks بعد إثبات صفر imports.
- تفعيل audit script كفشل إلزامي.
- تقليل الحزم، مراجعة responsive/accessibility، وتشغيل اختبارات الرحلات المتكاملة والتحقق اليدوي الكامل.

#### الدوال والأدوات

- `assertNoLegacyEndpoints()` يفشل عند أي endpoint قديم.
- `assertNoProductionMocks()` يفشل عند mock import في production source.
- `assertNoNumericMongoIds()` يفشل عند تحويل ID معروف إلى رقم.
- `assertRouteCoverage()` يطابق registry مع 195 route وallowlist المبررة.
- `measureRouteRequests(route)` يسجل عدد requests عند فتح كل شاشة.
- `measureApiLatency(entries)` ينتج p50/p95 لكل عائلة.
- `checkBundleBudgets()` يفشل إذا تجاوزت الحزم الحدود المتفق عليها.
- test journey helpers: `loginAs`, `approveDevice`, `openDrawer`, `createOrder`, `prepareOrder`, `closeOrder`, `assertAuditTrail` باستخدام Vitest وMSW.

#### بوابة الإصدار

- build/lint/unit/contract/integration كلها ناجحة، مع قائمة تحقق يدوية للرحلات الكاملة على المتصفح المتاح.
- لا يوجد console error أو unhandled rejection.
- لا توجد request زائدة أو polling سريع.
- اختبار الديسكتوب والموبايل وRTL والطباعة ناجح.
- تقرير نهائي يربط كل requirement باختبار أو walkthrough.

## 29. خريطة شمول الموديولات داخل المراحل

- Platform/API/errors/pagination/idempotency: المراحل 0–3.
- Auth/bootstrap/permissions: المرحلة 2.
- Realtime: المرحلة 3 ثم يطبق في 5 و9–14.
- الموردون: المرحلة 4.
- وحدات القياس والمواد والدفعات والسحب والتحذيرات: المرحلة 5.
- المشتريات والمرتجعات: المرحلة 6.
- المنتجات والأقسام والأنواع والأحجام والوصفات والإضافات والصور والكتالوج: المرحلة 7.
- الموظفون والأجهزة والحضور والانصراف والأدوار والصلاحيات وسجل الشخص: المرحلة 8، وسجل الشخص يستمد timeline من المرحلة 14.
- الدرج والوارد والصادر والرصيد الافتتاحي والعجز والزيادة وتحذير 12 ساعة والطباعة: المرحلة 9.
- طلبات الإدارة والأونلاين والتيك أواي والطاولات والتحضير والسجل والفواتير والمدفوعات والإلغاء: المرحلة 10.
- تجربة الطاولة وproposals وخدمات الجرسون والتقييم: المرحلة 11.
- تجربة العميل وlocalStorage والتتبع والباركود والاستلام والتقييم والباريستا الذكي: المرحلة 12.
- العملاء والمناديب والتوصيل وWhatsApp وتسوية الكاش: المرحلة 13.
- التقارير المالية وسجل الأحداث الشامل والتقييمات والإشعارات والاستردادات: المرحلة 14.
- الجودة والأداء والأمان وإزالة القديم: المرحلة 15.

لا يوجد موديول مطلوب في المواصفات خارج هذه الخريطة، ولا يوجد موديول إعدادات أو بوابة دفع إلكتروني. التحصيل المالي المخطط له كاش فقط طبقاً للمواصفات.
