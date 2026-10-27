import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { Printer } from "lucide-react";
import PrintPortal, { claimPrintLayer, releasePrintLayer } from "./PrintPortal";
import { openPrintWindow } from "./openPrintWindow";
import "./PrintDocument.css";

export { openPrintWindow };

export default function PrintDocument({ printData: suppliedData, loadPrintData, recordPrintEvent, title = "فاتورة", render, disabled = false, buttonLabel = "طباعة", previewLabel = "معاينة" }) {
  const [loadedData, setLoadedData] = useState(null);
  const [pending, setPending] = useState(false);
  const [previewPending, setPreviewPending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [error, setError] = useState(null);
  // Stable identity for this instance's claim on the shared print layer.
  const ownerRef = useRef(null);
  if (ownerRef.current === null) ownerRef.current = { title };
  const printData = suppliedData ?? loadedData;
  const ensureData = async () => {
    if (suppliedData) return suppliedData;
    if (loadedData) return loadedData;
    const data = await loadPrintData?.();
    if (!data) throw new Error("بيانات الطباعة غير متاحة");
    flushSync(() => setLoadedData(data));
    return data;
  };
  const openPreview = async () => {
    if (previewPending) return;
    setPreviewPending(true); setError(null);
    try {
      await ensureData();
      setShowPreview(true);
    } catch (cause) { setError(cause); }
    finally { setPreviewPending(false); }
  };
  const print = async () => {
    if (pending) return;
    setPending(true); setError(null);
    const owner = ownerRef.current;
    try {
      const data = suppliedData ?? await loadPrintData?.();
      if (!data) throw new Error("بيانات الطباعة غير متاحة");
      // Commit the sheet before claiming the layer so it is mounted, and drop
      // the payload afterwards so the layer never holds stale documents.
      flushSync(() => setLoadedData(data));
      claimPrintLayer(owner);
      try {
        openPrintWindow();
      } finally {
        releasePrintLayer(owner);
        if (suppliedData === undefined) setLoadedData(null);
      }
      await recordPrintEvent?.(data);
    } catch (cause) { setError(cause); }
    finally { setPending(false); }
  };
  return <section className="print-document">
    <button type="button" className="print-document__button print-document__button--ghost" onClick={openPreview} disabled={disabled || previewPending || (!suppliedData && !loadPrintData)} aria-label={`معاينة ${title}`}>{previewPending ? "جاري تجهيز المعاينة..." : previewLabel}</button>
    <button type="button" className="print-document__button" onClick={print} disabled={disabled || pending || (!suppliedData && !loadPrintData)} aria-label={`طباعة ${title}`}><Printer size={18}/>{pending ? "جاري تجهيز الطباعة..." : buttonLabel}</button>
    {error && <p className="print-document__error" role="alert">{error.message || "تعذر تجهيز الطباعة"}</p>}
    {showPreview && printData && (
      <div className="print-document__preview-backdrop" onClick={() => setShowPreview(false)}>
        <div className="print-document__preview-modal" role="dialog" aria-modal="true" aria-label={`معاينة ${title}`} onClick={(e) => e.stopPropagation()}>
          <div className="print-document__preview-actions no-print">
            <button type="button" className="print-document__button" onClick={() => { setShowPreview(false); print(); }} disabled={pending}><Printer size={18}/>طباعة</button>
            <button type="button" className="print-document__button print-document__button--ghost" onClick={() => setShowPreview(false)}>إغلاق</button>
          </div>
          <div className="print-document__preview-body">
            {typeof render === "function" ? render(printData) : <pre>{JSON.stringify(printData, null, 2)}</pre>}
          </div>
        </div>
      </div>
    )}
    {printData && <PrintPortal owner={ownerRef.current} persistent={Boolean(suppliedData)}>
      <article className="print-sheet print-document__sheet" aria-label={title}>
        {typeof render === "function" ? render(printData) : <pre>{JSON.stringify(printData, null, 2)}</pre>}
      </article>
    </PrintPortal>}
  </section>;
}
