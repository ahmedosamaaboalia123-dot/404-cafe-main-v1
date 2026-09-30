import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Check, MessageCircle, Plus, Send } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import { ServerPagination } from "@/shared/components";
import { beginOperation, finishOperation } from "@/api/idempotency";
import { customersApi } from "../api/customers.api";
import "../styles/MarketingMessagesPage.css";

const errorMessage = (error) => error?.response?.data?.error?.messageAr || error?.message || "تعذر إتمام العملية";
const personalize = (template, customer) => `${template?.greeting || ""}\n${template?.body || ""}`
  .replaceAll("{{اسم_العميل}}", customer?.name || "عميلنا العزيز").trim();
const whatsappNumber = (phone) => String(phone || "").replace(/\D/g, "").replace(/^00/, "").replace(/^20/, "20").replace(/^0/, "20");

export default function MarketingMessagesPage() {
  const navigate = useNavigate();
  const templateScope = useRef("customer-marketing:template");
  const sendScope = useRef("customer-marketing:send");
  const [templates, setTemplates] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerPage, setCustomerPage] = useState(1);
  const [customerPageMeta, setCustomerPageMeta] = useState({});
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [pending, setPending] = useState(null);
  const [form, setForm] = useState({ name: "", greeting: "أهلًا يا {{اسم_العميل}}", body: "" });
  const [error, setError] = useState("");
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = async () => {
    try {
      const [templateData, customerData] = await Promise.all([customersApi.templates(), customersApi.screen({ page: customerPage, limit: 10 })]);
      const nextTemplates = templateData.items || [];
      setTemplates(nextTemplates);
      setSelectedTemplateId((current) => current || nextTemplates[0]?.id || String(nextTemplates[0]?._id || ""));
      setCustomers(customerData.customers || []);
      setCustomerPageMeta(customerData.pageMeta || {});
      setError("");
    } catch (loadError) { setError(errorMessage(loadError)); }
  };
  useEffect(() => { load(); }, [customerPage]);
  const selectedTemplate = useMemo(() => templates.find((template) => String(template.id || template._id) === String(selectedTemplateId)), [templates, selectedTemplateId]);
  const createTemplate = async (event) => {
    event.preventDefault();
    setSavingTemplate(true);
    try {
      await customersApi.createTemplate(form, beginOperation(templateScope.current));
      finishOperation(templateScope.current);
      setForm({ name: "", greeting: "أهلًا يا {{اسم_العميل}}", body: "" });
      await load();
    } catch (saveError) { setError(errorMessage(saveError)); } finally { setSavingTemplate(false); }
  };
  const openWhatsApp = (customer) => {
    if (!selectedTemplate) return setError("اختر قالب الرسالة أولًا");
    const phone = whatsappNumber(customer.phone);
    if (phone.length < 11) return setError("رقم واتساب العميل غير صالح");
    const message = personalize(selectedTemplate, customer);
    setPending({ customer, phone, message });
    window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`, "_blank", "noopener,noreferrer");
  };
  const confirmSent = async () => {
    if (!pending || !selectedTemplate) return;
    setConfirming(true);
    try {
      await customersApi.recordMarketingMessage(pending.customer.id, { templateId: String(selectedTemplate.id || selectedTemplate._id), message: pending.message }, beginOperation(sendScope.current));
      finishOperation(sendScope.current);
      setPending(null);
      setError("");
    } catch (sendError) { setError(errorMessage(sendError)); } finally { setConfirming(false); }
  };
  return <div className="marketing-page">
    <PageHeader title="كتابة الرسائل التسويقية" breadcrumbs={["الرئيسية", "العملاء", "الرسائل التسويقية"]}/>
    <button className="marketing-back" type="button" onClick={() => navigate("/admin/customers")}><ArrowRight size={17}/> رجوع للعملاء</button>
    {error && <p className="marketing-error" role="alert">{error}</p>}
    <section className="marketing-template-card">
      <div><h2>القالب الحالي</h2><p>استخدم <b>{"{{اسم_العميل}}"}</b> لإدراج اسم العميل تلقائيًا.</p></div>
      <select value={selectedTemplateId} onChange={(event) => setSelectedTemplateId(event.target.value)} aria-label="اختيار قالب الرسالة">
        <option value="">اختر قالبًا محفوظًا</option>{templates.map((template) => <option key={template.id || template._id} value={template.id || template._id}>{template.name}</option>)}
      </select>
      {selectedTemplate && <div className="marketing-preview"><span>معاينة</span><pre>{personalize(selectedTemplate, { name: "أحمد" })}</pre></div>}
    </section>
    <section className="marketing-create-card"><h2><Plus size={18}/> إنشاء قالب جديد</h2><form onSubmit={createTemplate}><input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="اسم القالب، مثل عرض نهاية الأسبوع"/><textarea required value={form.greeting} onChange={(event) => setForm({ ...form, greeting: event.target.value })} placeholder="رسالة الترحيب"/><textarea required value={form.body} onChange={(event) => setForm({ ...form, body: event.target.value })} placeholder="محتوى الرسالة التسويقية"/><button disabled={savingTemplate} type="submit">حفظ القالب</button></form></section>
    <section className="marketing-customers"><h2>إرسال رسالة لعميل</h2><div className="marketing-table-wrap"><table><thead><tr><th>العميل</th><th>رقم واتساب</th><th>الإجراء</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.id}><td>{customer.name}</td><td dir="ltr">{customer.phone}</td><td><button type="button" onClick={() => openWhatsApp(customer)}><MessageCircle size={16}/> فتح واتساب</button></td></tr>)}</tbody></table></div><ServerPagination meta={customerPageMeta} label="عميل" onPageChange={setCustomerPage}/></section>
    {pending && <div className="marketing-modal-backdrop" role="dialog" aria-modal="true" aria-label="تأكيد الإرسال"><div className="marketing-modal"><h2>هل تم إرسال الرسالة؟</h2><p>إلى: <b>{pending.customer.name}</b> — {pending.customer.phone}</p><pre>{pending.message}</pre><div><button type="button" onClick={() => setPending(null)}>إلغاء</button><button className="marketing-confirm" type="button" disabled={confirming} onClick={confirmSent}><Check size={16}/> تم الإرسال</button></div></div></div>}
  </div>;
}
