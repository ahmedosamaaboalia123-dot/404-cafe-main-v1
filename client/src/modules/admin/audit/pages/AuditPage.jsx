import { AUDIT_MODULES, ENTITY_LABELS, auditDetailRows, formatAuditTime } from '../adapters/audit.labels';
import { Fragment, useMemo, useState } from "react";
import { History } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import Button from "@/shared/components/Button/Button";
import Input from "@/shared/components/Input/Input";
import Select from "@/shared/components/Select/Select";
import { AsyncState, ServerPagination } from "@/shared/components";
import { can } from "@/modules/auth/permissions/permission";
import { useAuthStore } from "@/store/authStore";
import { AUDIT_RESULTS, AUDIT_SEVERITIES, EVENT_TYPE_LABELS } from "../adapters/audit.adapter";
import {
  useAuditEvent,
  useAuditExportStatus,
  useAuditScreen,
  useEntityTimeline,
} from "../hooks/audit.queries";
import { useRequestAuditExport } from "../hooks/audit.mutations";
import {
  auditExportSchema,
  auditFilterSchema,
  firstAuditFormError,
} from "../schemas/audit.schema";
import "./AuditPage.css";

const PAGE_LIMIT = 10;
const EXPORT_FORMAT_OPTIONS = [
  { value: "PDF", label: "PDF" },
  { value: "XLSX", label: "جدول بيانات" },
  { value: "CSV", label: "CSV" },
];
const EXPORT_STATUS_LABELS = { PROCESSING: "قيد التجهيز", READY: "جاهز", FAILED: "فشل" };

const emptyDraft = { module: "", eventType: "", actorId: "", result: "", severity: "", from: "", to: "" };

const toIsoWithOffset = (localValue) => {
  if (!localValue) return undefined;
  const date = new Date(localValue);
  return Number.isNaN(date.getTime()) ? localValue : date.toISOString();
};

function AuditTime({ value }) { return <time dateTime={value || undefined}>{formatAuditTime(value)}</time>; }
function AuditEventDetails({ event }) {
  const details = useAuditEvent(event.id);
  const full = details.data?.event || event;
  const rows = auditDetailRows(full);
  return <div className="audit-event-full" id={'audit-details-' + event.id}>
    {details.isLoading && <p className="audit-muted">جاري تحميل تفاصيل الحدث...</p>}
    {details.isError && <p className="audit-error" role="alert">تعذر تحميل تفاصيل الحدث. <button type="button" onClick={() => details.refetch()}>إعادة المحاولة</button></p>}
    <dl className="audit-event-grid">
      <div><dt>الحدث</dt><dd>{full.eventLabel}</dd></div>
      <div><dt>السجل المتأثر</dt><dd>{ENTITY_LABELS[full.entity?.type] || 'سجل بالنظام'}{full.entity?.snapshot?.name ? ' · ' + full.entity.snapshot.name : ''}</dd></div>
      {full.entity?.id && <div><dt>رقم مرجع السجل</dt><dd dir="ltr">{String(full.entity.id)}</dd></div>}
      <div><dt>الأهمية</dt><dd>{full.severityLabel}</dd></div>
      {rows.map((row, index) => <div key={row.label + index}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}
    </dl>
    {!details.isLoading && !details.isError && rows.length === 0 && <p className="audit-muted">لا توجد تفاصيل إضافية مسجّلة لهذا الحدث.</p>}
  </div>;
}
function AuditEventRow({ event, expanded, onToggle }) {
  const actor = event.actorName || (event.actorType === 'SYSTEM' ? 'النظام' : 'اسم غير متاح');
  return <Fragment>
    <tr className={expanded ? 'audit-row--expanded' : undefined}>
      <td className="audit-row-number">{event.eventNo || '—'}</td>
      <td className="audit-row-event"><strong>{event.eventLabel}</strong></td>
      <td><span className="audit-module-label">{event.moduleLabel}</span></td>
      <td><div className="audit-actor"><span className="audit-avatar" aria-hidden="true">{actor.charAt(0)}</span><div><strong>{actor}</strong><small>{event.actorLabel}</small></div></div></td>
      <td className="audit-row-time"><AuditTime value={event.occurredAt}/></td>
      <td><span className={'audit-result audit-result--' + String(event.result).toLowerCase()}>{event.resultLabel}</span></td>
      <td><button type="button" className="audit-expand-btn" aria-expanded={expanded} aria-controls={'audit-details-' + event.id} aria-label={'تفاصيل الحدث ' + event.eventNo} onClick={onToggle}>{expanded ? 'إخفاء' : 'التفاصيل'}</button></td>
    </tr>
    {expanded && <tr className="audit-detail-row"><td colSpan={7}><AuditEventDetails event={event}/></td></tr>}
  </Fragment>;
}

export default function AuditPage() {
  const permissions = useAuthStore((state) => state.permissions);
  const canRead = can(permissions, "audit.read");
  const canExport = can(permissions, "audit.export");

  const [draft, setDraft] = useState(emptyDraft);
  const [applied, setApplied] = useState({});
  const [formError, setFormError] = useState("");
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const [timelineDraft, setTimelineDraft] = useState({ entityType: "", entityId: "" });
  const [timelineLookup, setTimelineLookup] = useState(null);
  const [timelineError, setTimelineError] = useState("");

  const [format, setFormat] = useState("PDF");
  const [exportError, setExportError] = useState("");
  const [statusUrl, setStatusUrl] = useState(null);

  const params = useMemo(() => ({ ...applied, page, limit: PAGE_LIMIT }), [applied, page]);
  const screen = useAuditScreen(params);
  const timeline = useEntityTimeline(timelineLookup?.entityType, timelineLookup?.entityId);
  const requestExport = useRequestAuditExport({
    onSuccess: (data) => setStatusUrl(data?.export?.statusUrl || data?.statusUrl || null),
  });
  const exportStatus = useAuditExportStatus(statusUrl, { enabled: canExport && Boolean(statusUrl) });

  if (!canRead) {
    return (
      <div className="audit-page" dir="rtl">
        <PageHeader title="سجل الأحداث" breadcrumbs={["الإدارة", "سجل الأحداث"]} icon={History} />
        <p className="audit-error" role="alert">ليس لديك صلاحية لعرض سجل الأحداث.</p>
      </div>
    );
  }

  const summary = screen.data?.summary;
  const items = screen.data?.items || [];
  const job = exportStatus.data?.export || exportStatus.data || null;

  const applyFilters = (event) => {
    event.preventDefault();
    const parsed = auditFilterSchema.safeParse({
      ...(draft.module.trim() ? { module: draft.module.trim() } : {}),
      ...(draft.eventType.trim() ? { eventType: draft.eventType.trim() } : {}),
      ...(draft.actorId.trim() ? { actorId: draft.actorId.trim() } : {}),
      ...(draft.result ? { result: draft.result } : {}),
      ...(draft.severity ? { severity: draft.severity } : {}),
      ...(draft.from ? { from: toIsoWithOffset(draft.from) } : {}),
      ...(draft.to ? { to: toIsoWithOffset(draft.to) } : {}),
    });
    if (!parsed.success) { setFormError(firstAuditFormError(parsed)); return; }
    setFormError("");
    setApplied(parsed.data);
    setPage(1);
    setExpandedId(null);
  };

  const resetFilters = () => {
    setDraft(emptyDraft);
    setFormError("");
    setApplied({});
    setPage(1);
    setExpandedId(null);
  };

  const lookupTimeline = (event) => {
    event.preventDefault();
    const entityType = timelineDraft.entityType.trim();
    const entityId = timelineDraft.entityId.trim();
    if (!entityType || !entityId) { setTimelineError("أدخل نوع الكيان ومعرفه أولًا"); return; }
    setTimelineError("");
    setTimelineLookup({ entityType, entityId });
  };

  const submitExport = (event) => {
    event.preventDefault();
    const parsed = auditExportSchema.safeParse({ filters: applied, format });
    if (!parsed.success) { setExportError(firstAuditFormError(parsed)); return; }
    setExportError("");
    setStatusUrl(null);
    requestExport.mutate({ reportType: "audit:events", ...parsed.data });
  };

  const chips = [
    ["الإجمالي", summary?.total ?? 0],
    ["ناجح", summary?.success ?? 0],
    ["فاشل", summary?.failed ?? 0],
    ["مرفوض", summary?.denied ?? 0],
    ["تحذير", summary?.warning ?? 0],
    ["حرج", summary?.critical ?? 0],
  ];

  return (
    <div className="audit-page" dir="rtl">
      <PageHeader title="سجل الأحداث" breadcrumbs={["الإدارة", "سجل الأحداث"]} icon={History} />

      <form className="audit-filters" onSubmit={applyFilters}>
        <Select label="القسم" value={draft.module} onChange={(e) => setDraft((c) => ({ ...c, module: e.target.value }))} placeholder="كل الأقسام" options={Object.entries(AUDIT_MODULES).map(([value,label]) => ({value,label}))}/>
        <Select label="اسم الحدث" value={draft.eventType} onChange={(e) => setDraft((c) => ({ ...c, eventType: e.target.value }))} placeholder="كل الأحداث" options={Object.entries(EVENT_TYPE_LABELS).map(([value,label]) => ({value,label}))}/>
        <Input label="رقم الموظف" placeholder="اختياري" value={draft.actorId} onChange={(e) => setDraft((c) => ({ ...c, actorId: e.target.value }))} />
        <Select label="النتيجة" value={draft.result} onChange={(e) => setDraft((c) => ({ ...c, result: e.target.value }))} placeholder="الكل" options={Object.entries(AUDIT_RESULTS).map(([value, label]) => ({ value, label }))} />
        <Select label="الخطورة" value={draft.severity} onChange={(e) => setDraft((c) => ({ ...c, severity: e.target.value }))} placeholder="الكل" options={Object.entries(AUDIT_SEVERITIES).map(([value, label]) => ({ value, label }))} />
        <Input label="من" type="datetime-local" value={draft.from} onChange={(e) => setDraft((c) => ({ ...c, from: e.target.value }))} />
        <Input label="إلى" type="datetime-local" value={draft.to} onChange={(e) => setDraft((c) => ({ ...c, to: e.target.value }))} />
        <div className="audit-filters__actions">
          <Button type="submit" loading={screen.isFetching}>بحث</Button>
          <Button type="button" variant="secondary" onClick={resetFilters}>إعادة تعيين</Button>
        </div>
        {formError && <p className="audit-error audit-filters__error" role="alert">{formError}</p>}
      </form>

      <div className="audit-chips" aria-label="ملخص سجل الأحداث">
        {chips.map(([label, value]) => (
          <article key={label} className="audit-chip"><span>{label}</span><strong>{value}</strong></article>
        ))}
      </div>

      <section className="audit-card" aria-label="أحداث التدقيق">
        <div className="audit-table-heading"><div><h2>الأحداث المسجّلة</h2><p>من الأحدث إلى الأقدم · جميع الأوقات بتوقيت القاهرة</p></div><span>{screen.data?.pageMeta?.totalItems ?? items.length} حدث</span></div>
        <AsyncState loading={screen.isLoading} error={screen.error} onRetry={screen.refetch} empty={false}>
          {items.length === 0 ? (
            <p className="audit-muted">لا توجد أحداث مطابقة للفلاتر الحالية.</p>
          ) : (
            <div className="audit-table-wrap" tabIndex={0} role="region" aria-label="جدول سجل الأحداث">
              <table className="audit-table"><caption className="audit-sr-only">الأحداث المسجلة ومن نفذها وتوقيتها ونتيجتها</caption>
                <thead><tr>{['رقم', 'اسم الحدث', 'القسم', 'نفّذه', 'التاريخ والوقت', 'النتيجة', 'التفاصيل'].map((label) => <th key={label} scope="col">{label}</th>)}</tr></thead>
                <tbody>{items.map((item) => <AuditEventRow key={item.id} event={item} expanded={expandedId === item.id} onToggle={() => setExpandedId((current) => current === item.id ? null : item.id)}/>)}</tbody>
              </table>
            </div>
          )}
          <ServerPagination meta={screen.data?.pageMeta} onPageChange={(next) => { setPage(next); setExpandedId(null); }} disabled={screen.isFetching} label="حدث" />
        </AsyncState>
      </section>

      <section className="audit-card" aria-label="الخط الزمني لكيان">
        <h2>الخط الزمني لكيان</h2>
        <form className="audit-timeline-form" onSubmit={lookupTimeline}>
          <Select label="نوع السجل" value={timelineDraft.entityType} onChange={(e) => setTimelineDraft((c) => ({ ...c, entityType: e.target.value }))} placeholder="اختر نوع السجل" options={Object.entries(ENTITY_LABELS).map(([value,label]) => ({value,label}))}/>
          <Input label="رقم مرجع السجل" placeholder="رقم السجل المطلوب" value={timelineDraft.entityId} onChange={(e) => setTimelineDraft((c) => ({ ...c, entityId: e.target.value }))} />
          <div className="audit-timeline-form__actions">
            <Button type="submit" loading={timeline.isFetching}>عرض الخط الزمني</Button>
          </div>
        </form>
        {timelineError && <p className="audit-error" role="alert">{timelineError}</p>}
        {!timelineLookup ? (
          <p className="audit-muted">أدخل نوع الكيان ومعرفه ثم اضغط عرض الخط الزمني.</p>
        ) : (
          <AsyncState loading={timeline.isLoading} error={timeline.error} onRetry={timeline.refetch} empty={!timeline.isLoading && !timeline.isError && (timeline.data?.items?.length ?? 0) === 0} emptyText="لا توجد أحداث لهذا الكيان.">
            <ul className="audit-timeline">
              {(timeline.data?.items || []).map((entry) => (
                <li key={entry.id}>
                  <strong>{entry.eventLabel || "حدث مسجّل"}</strong>
                  <p>{entry.actorName || entry.actorLabel} — {entry.resultLabel}</p>
                  <AuditTime value={entry.occurredAt} />
                </li>
              ))}
            </ul>
          </AsyncState>
        )}
      </section>

      {canExport && (
        <section className="audit-card" aria-label="تصدير سجل الأحداث">
          <h2>تصدير سجل الأحداث</h2>
          <p className="audit-muted">يتم تصدير الأحداث المطابقة للفلاتر الحالية.</p>
          <form className="audit-export-form" onSubmit={submitExport}>
            <Select label="الصيغة" value={format} onChange={(e) => setFormat(e.target.value)} options={EXPORT_FORMAT_OPTIONS} placeholder="اختر الصيغة" />
            <div className="audit-export-form__actions">
              <Button type="submit" loading={requestExport.isPending}>طلب تصدير</Button>
            </div>
          </form>
          {exportError && <p className="audit-error" role="alert">{exportError}</p>}
          {requestExport.isError && <p className="audit-error" role="alert">{requestExport.error?.message || "تعذر طلب التصدير"}</p>}
          {requestExport.isSuccess && !statusUrl && <p className="audit-muted">تم استلام طلب التصدير.</p>}
          {statusUrl && (
            <div className="audit-export-status" role="status">
              <span>حالة التصدير: {job ? (EXPORT_STATUS_LABELS[job.status] || "قيد التجهيز") : "قيد التجهيز..."}</span>
              {exportStatus.isError && <p className="audit-error">تعذر متابعة حالة التصدير.</p>}
              {job?.status === "FAILED" && <p className="audit-error">{"تعذر تجهيز التصدير، أعد المحاولة"}</p>}
              {job?.status === "READY" && <p className="audit-muted">اكتمل التصدير: {job.rowCount ?? "—"} صف — بصمة التحقق {job.checksum || "—"} (الباك يعيد بيانات التصدير الوصفية فقط، بلا ملف للتنزيل).</p>}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
