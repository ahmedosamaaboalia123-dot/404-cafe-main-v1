# خطة المراجعة الشاملة وضبط الأداء

## الهدف القابل للقياس

- زمن API المعتاد: median بين 500ms أو أقل وهدف أعلى 1s، مع تسجيل كل طلب يتجاوز 500ms.
- hard deadline: 3s لمنع قطع طلب سليم على Atlas ثم تكوين retry storm.
- التحميل الأولي للفرونت: JavaScript مضغوط لا يتجاوز 145KB، ولا يحمل QR أو Fingerprint أو الرسوم قبل احتياجها.
- كل شاشة رئيسية تستخدم screen endpoint مجمعًا، وكل جدول بحد أقصى 10، ولا N+1 في لوحات التجميع.
- لا endpoint قديم مستخدم، ولا mock في production، ولا ObjectId يتحول إلى رقم.

## مراحل التنفيذ

1. **تثبيت خط الأساس:** تشغيل lint/tests/build/audit/route coverage، وقياس health/catalog، وقراءة manifest بدل الاعتماد على تقارير قديمة.
2. **مطابقة العقود:** مطابقة 195 مسارًا، فحص envelopes وpagination وexpectedVersion وidempotency، ثم smoke-import للراوتر.
3. **سلامة بدء الفرونت:** إصلاح أي import غير معرف، lazy لكل route، وفصل مكتبات login/QR/realtime/forms/charts.
4. **أداء الشاشات:** endpoint واحد لكل شاشة مجمعة، React Query cache، staleTime مناسب، وإعادة محاولة واحدة فقط بعد 300ms.
5. **أداء المصادقة:** إبقاء فحص الموظف والجهاز والجلسة حيًا، مع cache للصلاحيات بمفتاح نسخة الصلاحيات وإعادة استخدام snapshot المصادقة في bootstrap.
6. **أداء Mongo:** استخدام lean/projections/indexes وbulk queries، وإزالة N+1، وstale-while-revalidate للإسقاطات الثقيلة.
7. **منع دوائر الفشل:** deadline 3s، منع double response بعد timeout، وتسجيل path/status/duration مع headers قياس.
8. **سلامة البيانات:** migrate status، index diff، integrity checks، Outbox/dead letters، ثم اختبارات العقود والوحدات.
9. **بوابة الإصدار:** frontend/backend lint + tests + contracts + audit + build + bundle budget، ثم قياسات live موثقة.

## مصفوفة الموديولات التي شملتها المراجعة

- الموردون والحسابات اليدوية والدفعات: عقود v1، Decimal، درج التسويات، pagination.
- المواد الخام والدفعات والسحب والتحذيرات: الأولويات والصلاحية والمخزون وscreen aggregation.
- المشتريات والمرتجعات: التسجيل المرحلي، الدفعات، الطباعة، وعدم ربط دين المورد تلقائيًا.
- المنتجات والوصفات: الوحدات الصغيرة، التكلفة الفعلية من الدفعات، الكتالوج والصور.
- الدرج والتقارير: الورديات، الرصيد الافتتاحي، التسويات، التحذير الدوري، جودة البيانات.
- الموظفون: المصادقة والأجهزة والحضور والصلاحيات وسجل الشخص.
- الطلبات والتحضير والطاولات والخدمات: المخزون والحالات والإلغاء والإضافة والتتبع والـrealtime.
- العملاء والمناديب: الحساب التلقائي، التقييم، الإسناد والتسليم والرجوع والكاش وWhatsApp.
- التدقيق والإشعارات والاستردادات: السجل الشامل، moderation، pending cash recovery.
- العميل العام والطاولة والباريستا: التوكنات المحدودة وLocalStorage المسموح والكتالوج العام فقط.

## بوابات تمنع رجوع المشكلة

- `npm run audit:check`: يمنع endpoints النصية القديمة وproduction mocks وnumeric Mongo IDs.
- `npm run test:contract`: يطابق manifest المسارات مع الباك.
- `router-smoke.test.jsx`: يمنع صفحة بيضاء بسبب ReferenceError وقت تهيئة الراوتر.
- `npm run perf:budget`: يبني manifest ويحسب dependency graph للتحميل الأولي ويُفشل التجاوز.
- اختبارات timeout تمنع الرد مرتين، واختبار لوحة الطاولات يثبت نتيجة الـbulk query.

## حدود القياس

- زمن Atlas يتغير حسب الشبكة والمنطقة والـcold connection؛ الهدف مراقب لكنه لا يمكن ضمانه أثناء انقطاع خارجي.
- لا Chromium أو Playwright حسب قرار المشروع؛ التحقق الآلي هو Vitest/jsdom/contracts والبناء الحقيقي.
- قياس endpoints المحمية آليًا لا يقرأ كلمة مرور أو بصمة من قاعدة البيانات؛ القياس يتم من headers أثناء الاستخدام الطبيعي.
