import React from "react";
import { X, Printer, Share2, RotateCcw } from "lucide-react";
import { PrintPortal, usePrintSheet } from "@/shared/components";
import CustomerInvoiceSheet from "./CustomerInvoiceSheet";

export default function CustomerInvoiceModal({ isOpen, order, onClose, onReorder }) {
  const printSheet = usePrintSheet();
  if (!isOpen || !order) return null;

  // Single source of truth: the sheet is mounted once for the on-screen preview
  // and once inside the shared print layer, so print output can never drift from
  // what the customer was shown.
  const sheet = <CustomerInvoiceSheet order={order} />;

  const handlePrint = () => {
    printSheet.print();
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `فاتورة طلب 404 كافيه - ${order.id}`,
          text: `فاتورة رقم ${order.id} من 404 كافيه بقيمة ${order.pricing?.total || 0} EGP`,
          url: window.location.href,
        });
      } catch (err) {
        console.log("Share cancelled or failed", err);
      }
    } else {
      navigator.clipboard?.writeText(
        `فاتورة طلب 404 كافيه رقم ${order.id}\nالإجمالي: ${order.pricing?.total || 0} EGP\nالتاريخ: ${order.dateFormatted}`
      );
      alert("تم نسخ بيانات الفاتورة إلى الحافظة بنجاح!");
    }
  };

  return (
    <>
      <div className="invoice-modal-backdrop" onClick={onClose}>
        <div
          className="customer-invoice-modal-card"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="الفاتورة"
        >
          <div className="invoice-modal-top-bar no-print">
            <div className="invoice-top-actions-left">
              <button
                type="button"
                className="invoice-action-pill-btn"
                onClick={handlePrint}
                title="طباعة الفاتورة"
              >
                <Printer size={16} />
                <span>طباعة</span>
              </button>
              <button
                type="button"
                className="invoice-action-pill-btn"
                onClick={handleShare}
                title="مشاركة الفاتورة"
              >
                <Share2 size={16} />
                <span>مشاركة</span>
              </button>
            </div>

            <button
              type="button"
              className="invoice-close-round-btn"
              onClick={onClose}
              aria-label="إغلاق الفاتورة"
            >
              <X size={20} />
            </button>
          </div>

          {sheet}

          <div className="invoice-modal-bottom-bar no-print">
            <button type="button" className="invoice-close-btn" onClick={onClose}>
              إغلاق
            </button>

            {onReorder && (
              <button type="button" className="invoice-reorder-btn" onClick={() => onReorder(order)}>
                <RotateCcw size={16} />
                <span>إعادة طلب هذه الأصناف</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Deliberately outside the backdrop: React events bubble through the React
          tree, so a portal nested inside the backdrop would let clicks on the
          printed sheet close the modal. */}
      <PrintPortal owner={printSheet.owner} persistent={printSheet.persistent}>{sheet}</PrintPortal>
    </>
  );
}
