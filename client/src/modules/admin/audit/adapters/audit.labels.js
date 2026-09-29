export const AUDIT_MODULES = Object.freeze({ auth: 'الدخول والحسابات', attendance: 'الحضور والانصراف', customers: 'العملاء', delivery: 'التوصيل', employees: 'الموظفون', inventory: 'المخزون', invoices: 'الفواتير', orders: 'الطلبات', payments: 'المدفوعات', purchases: 'المشتريات', 'purchase-returns': 'مرتجعات المشتريات', reviews: 'التقييمات', suppliers: 'الموردون', tables: 'الطاولات', 'table-services': 'خدمات الطاولات', 'table-experience': 'طلبات ضيوف الطاولات', 'customer-experience': 'طلبات العملاء', 'order-cases': 'حالات الطلبات', drawer: 'الدرج', media: 'الصور', products: 'المنتجات', reports: 'التقارير', roles: 'الأدوار والصلاحيات' });
export const ENTITY_LABELS = Object.freeze({ Order: 'طلب', OrderReview: 'تقييم', Supplier: 'مورد', SupplierAccount: 'حساب مورد', SupplierAccountEntry: 'معاملة مورد', RawMaterial: 'مادة خام', RawMaterialBatch: 'دفعة مخزون', Employee: 'موظف', EmployeeDevice: 'جهاز موظف', AuthSession: 'جلسة دخول', MediaAsset: 'صورة', Customer: 'عميل', Invoice: 'فاتورة', DeliveryAssignment: 'مهمة توصيل', Delegate: 'مندوب', Table: 'طاولة', TableSession: 'جلسة طاولة', TableServiceRequest: 'طلب خدمة', TableOrderProposal: 'طلب طاولة', PurchaseReturn: 'مرتجع شراء', CashDrawerShift: 'وردية درج', CashDrawerTransaction: 'حركة درج', Role: 'دور وظيفي', OrderPayment: 'دفعة طلب', Product: 'منتج' });
export const normalizeEventType = (value) => String(value ?? '').replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[.\-]/g, '_').toUpperCase();
export const EXTRA_EVENT_LABELS = Object.freeze({
  AUTH_LOGOUT: 'تسجيل خروج', AUTH_LOGOUT_ALL: 'تسجيل خروج من جميع الأجهزة', AUTH_LOGIN: 'تسجيل دخول',
  MEDIA_UPLOADED: 'رفع صورة', MEDIA_DELETED: 'حذف صورة', MEDIA_RELEASED: 'إزالة صورة لم تعد مستخدمة',
  ACCESS_SESSION_CREATED: 'إنشاء جلسة عميل', CREDENTIALS_ISSUED: 'إصدار بيانات متابعة الطلب',
  ATTENDANCE_CLOSED: 'تسجيل انصراف', ATTENDANCE_ADJUSTED: 'تصحيح سجل حضور', ATTENDANCE_CHECKED_OUT: 'تسجيل انصراف',
  CANCELLATION_REQUESTED: 'طلب إلغاء طلب', CANCELLATION_APPROVED: 'قبول إلغاء طلب', CANCELLATION_REJECTED: 'رفض إلغاء طلب',
  CUSTOMER_UPDATED: 'تعديل بيانات عميل', DELEGATE_UPDATED: 'تعديل بيانات مندوب',
  DELIVERY_CASH_SETTLED: 'تسوية تحصيل مندوب', DELIVERY_FAILED: 'تسجيل تعثر توصيل', DELIVERY_REASSIGNED: 'تغيير مندوب التوصيل', DELIVERY_RETURNED: 'تسجيل رجوع طلب توصيل', DELIVERY_WHATSAPP_OPENED: 'فتح تواصل مع المندوب',
  DRAWER_SHIFT_OPEN_TOO_LONG: 'تنبيه وردية مفتوحة لفترة طويلة', DRAWER_OPENED: 'فتح وردية درج', DRAWER_CLOSED: 'إغلاق وردية درج',
  INVOICE_PRINTED: 'طباعة فاتورة', BATCH_EXPIRY_UPDATED: 'تعديل صلاحية دفعة مخزون',
  MATERIAL_CREATED: 'إضافة مادة خام', MATERIAL_UPDATED: 'تعديل مادة خام',
  ORDER_CREATED: 'إنشاء طلب', ORDER_PREPARING: 'بدء تجهيز طلب', ORDER_OUT_FOR_DELIVERY: 'خروج طلب للتوصيل', ORDER_ITEMS_ADDED: 'إضافة أصناف إلى طلب', ORDER_STATUS_CHANGED: 'تغيير حالة طلب',
  PAYMENT_SETTLED: 'تسوية مدفوعات طلب', PAYMENT_REFUNDED: 'رد مبلغ لعميل',
  PROPOSAL_CREATED: 'إنشاء طلب طاولة', PROPOSAL_CONFIRMED: 'اعتماد طلب طاولة', PROPOSAL_CANCELLED: 'إلغاء طلب طاولة', PROPOSAL_REVIEWED: 'مراجعة طلب طاولة', PROPOSAL_CHANGES_REQUESTED: 'طلب تعديل أصناف الطاولة',
  PURCHASE_RETURN_CREATED: 'تسجيل مرتجع مشتريات',
  REVIEW_SUBMITTED: 'إضافة تقييم', REVIEW_UPDATED: 'تعديل تقييم', REVIEW_MODERATED: 'مراجعة ظهور تقييم',
  SUPPLIER_DELETED: 'حذف مورد', SUPPLIER_ACCOUNT_DEBT_PAYMENT: 'سداد دين مورد', SUPPLIER_ACCOUNT_RECEIVABLE_COLLECTION: 'تحصيل مستحق من مورد', SUPPLIER_ACCOUNT_UPDATED: 'تحديث حساب مورد', SUPPLIER_ACCOUNT_ENTRY_UPDATED: 'تعديل معاملة مورد', SUPPLIER_ACCOUNT_ENTRY_DELETED: 'حذف معاملة مورد',
  TABLE_SERVICE_CANCELLED: 'إلغاء خدمة طاولة', TABLE_SERVICE_ORDER_ATTACHED: 'ربط طلب بخدمة طاولة', TABLE_SESSION_CANCELLED: 'إلغاء جلسة طاولة',
  ROLE_UPDATED: 'تعديل دور وظيفي', ROLE_DELETED: 'حذف دور وظيفي', ROLE_PERMISSIONS_REPLACED: 'تعديل صلاحيات دور',
  EMPLOYEE_DEVICE_APPROVED: 'اعتماد جهاز موظف', EMPLOYEE_DEVICE_BLOCKED: 'حظر جهاز موظف', EMPLOYEE_DEVICE_PENDING: 'إعادة جهاز لانتظار الاعتماد',
});
export function formatAuditTime(value) {
  if (!value || Number.isNaN(new Date(value).getTime())) return 'وقت غير متاح';
  return new Intl.DateTimeFormat('ar-EG', { timeZone: 'Africa/Cairo', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}
const FIELD_LABELS = { amount: 'المبلغ', occurredOn: 'تاريخ المعاملة', reason: 'السبب', notes: 'ملاحظات', name: 'الاسم', status: 'الحالة', rating: 'التقييم', comment: 'التعليق', quantity: 'الكمية', quantitySmall: 'الكمية بالوحدة الصغيرة', debtBalance: 'رصيد الدين', receivableBalance: 'رصيد المستحق', orderNumber: 'رقم الطلب', invoiceNo: 'رقم الفاتورة', assetNo: 'رقم الصورة', tableNumber: 'رقم الطاولة', expiryOn: 'تاريخ الصلاحية', receivedOn: 'تاريخ الاستلام', before: 'قبل التعديل', after: 'بعد التعديل', newStatus: 'الحالة الجديدة', previousStatus: 'الحالة السابقة', source: 'المصدر', direction: 'الاتجاه', method: 'طريقة الدفع', total: 'الإجمالي', paid: 'المدفوع', balance: 'الرصيد', displayName: 'الاسم الظاهر', attendanceDate: 'تاريخ الحضور', note: 'ملاحظة', version: 'نسخة السجل' };
const VALUES = { SUCCESS: 'ناجح', FAILED: 'فاشل', DENIED: 'مرفوض', OPEN: 'مفتوح', CLOSED: 'مغلق', ACTIVE: 'نشط', INACTIVE: 'غير نشط', COMPLETED: 'مكتمل', CANCELLED: 'ملغي', PENDING: 'قيد الانتظار', CONFIRMED: 'مؤكد', ADMIN_OVERRIDE: 'تأكيد إداري', CUSTOMER: 'العميل', EMPLOYEE: 'الموظف', SYSTEM: 'النظام', CASH: 'نقدي', IN: 'وارد', OUT: 'صادر', READY: 'جاهز', DELETED: 'محذوف', VISIBLE: 'ظاهر', HIDDEN: 'مخفي', OUT_FOR_DELIVERY: 'في الطريق', IN_PROGRESS: 'قيد التنفيذ', DELIVERED: 'تم التوصيل', DEBT: 'دين', RECEIVABLE: 'مستحق', DEBT_PAYMENT: 'سداد دين', RECEIVABLE_COLLECTION: 'تحصيل مستحق' };
const safeValue = (value) => value == null ? '—' : typeof value === 'boolean' ? (value ? 'نعم' : 'لا') : VALUES[value] ?? (/^[A-Z][A-Z_\d.-]+$/.test(String(value)) ? 'قيمة غير معرّفة' : String(value).slice(0, 1000));
export function auditDetailRows(event = {}) {
  const rows = [];
  const visit = (obj, prefix = '', depth = 0) => {
    if (!obj || typeof obj !== 'object' || depth > 2) return;
    for (const [key, value] of Object.entries(obj)) {
      if (!FIELD_LABELS[key] || rows.length >= 24) continue;
      const label = prefix + FIELD_LABELS[key];
      if (value && typeof value === 'object') visit(value, label + ' · ', depth + 1);
      else rows.push({ label, value: safeValue(value) });
    }
  };
  visit({ ...(event.metadataSafe ?? {}), ...(event.reason ? { reason: event.reason } : {}) });
  visit(event.changesSafe);
  visit(event.financialContext);
  visit(event.inventoryContext);
  return rows;
}
