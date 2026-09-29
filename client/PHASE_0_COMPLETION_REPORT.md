# تقرير إتمام المرحلة 0 — خط الأساس وأدوات الجودة

> التاريخ: 12 سبتمبر 2026  
> النطاق: Frontend فقط. لم يتم تعديل الباك إند.

## المنفذ

- إضافة Vitest وjsdom وReact Testing Library وjest-dom وuser-event.
- إضافة MSW مع إعداد يمنع مرور network request غير ممثل داخل الاختبارات.
- إضافة ESLint بإعداد baseline مناسب للكود الحالي.
- إضافة scripts للبناء والاختبارات والعقد والتدقيق.
- تثبيت snapshot لعقد الباك الحالي وعدده 195 route.
- إضافة فاحص آلي للمسارات المكتوبة مباشرة وmock imports وlocalStorage وتحويلات المعرفات الرقمية.
- إضافة تقرير baseline بصيغتي JSON وMarkdown.
- تحديث `.env.example` بعناوين API وSocket فقط، من دون أسرار.
- استبعاد ملفات الشهادات المؤقتة ونتائج الاختبارات من Git.
- إزالة Playwright وChromium من أدوات المشروع بناءً على طلب مالك المشروع؛ اختبارات الرحلات ستنفذ بـVitest/MSW وتحقق يدوي على المتصفح المتاح.

## نتيجة خط الأساس

- ملفات source المفحوصة: 253.
- endpoint literals تحتاج ترحيل: 8.
- mock imports إنتاجية: 1.
- استخدامات localStorage تحتاج تصنيفاً: 46.
- تحويلات IDs مشتبه بها تحتاج مراجعة: 90.

الأعداد تسجل الدين الحالي ولا يفترض إصلاحها في المرحلة 0. يصبح `npm run audit:check` إلزامياً بعد مراحل الترحيل والتنظيف.

## التحقق

- `npm run test:run`: ناجح، ملفان و3 اختبارات.
- `npm run test:contract`: ناجح، عقد 195 route مثبت.
- `npm run lint`: ناجح وفق بوابة baseline.
- `npm run build`: ناجح.
- Playwright وplaywright-core: غير موجودين في dependencies المشروع.

## الملفات الأساسية

- `vitest.config.js`
- `eslint.config.js`
- `src/test/setup.js`
- `src/test/server.js`
- `src/test/renderApp.jsx`
- `src/api/route-manifest.snapshot.json`
- `scripts/lib/frontend-audit.mjs`
- `scripts/audit-frontend-contract.mjs`
- `tests/frontend-audit.test.mjs`
- `tests/route-coverage.test.mjs`
- `reports/frontend-integration-baseline.json`
- `reports/frontend-integration-baseline.md`

## بوابة المرحلة التالية

المرحلة 1 تبدأ بإنشاء API Core الفعلي. لا تزال نتائج baseline مقبولة في المرحلة 0، وستنخفض تدريجياً عند ترحيل كل موديول حتى تصل النتائج المانعة إلى صفر في المرحلة 15.
