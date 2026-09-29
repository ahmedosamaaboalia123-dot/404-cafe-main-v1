import React from "react";
import { X, Printer, Share2, Receipt } from "lucide-react";
import { PrintPortal, usePrintSheet } from "@/shared/components";
import TableInvoiceSheet from "./TableInvoiceSheet";

export default function TableInvoiceModal({ order, isOpen, onClose }) {
  const printSheet = usePrintSheet();
  if (!isOpen || !order) return null;

  const sheet = <TableInvoiceSheet order={order} />;

  const handlePrint = () => {
    printSheet.print();
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `فاتورة طاولة ${order.tableNumber || 4} - طلب #${order.orderNumber}`,
        text: `تفاصيل فاتورة 404 كافيه لطاولة رقم ${order.tableNumber || 4}`,
        url: window.location.href,
      });
    }
  };

  return (
    <>
      <div className="tbl-modal-backdrop" onClick={onClose}>
        <div
          className="tbl-modal-card tbl-invoice-modal-card"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label="فاتورة ضيافة الطاولة"
        >
          <div className="tbl-modal-header">
            <div className="tbl-modal-title-row">
              <Receipt size={20} className="tbl-modal-title-icon" />
              <h3 className="tbl-modal-title">فاتورة ضيافة الطاولة الإلكترونية</h3>
            </div>
            <button
              type="button"
              className="tbl-modal-close-btn"
              onClick={onClose}
              aria-label="إغلاق الفاتورة"
            >
              <X size={18} />
            </button>
          </div>

          <div className="tbl-invoice-modal-body">{sheet}</div>

          <div className="tbl-invoice-modal-actions">
            <button type="button" className="tbl-invoice-action tbl-invoice-action--primary" onClick={handlePrint}>
              <Printer size={16} />
              <span>طباعة الفاتورة</span>
            </button>
            <button type="button" className="tbl-invoice-action" onClick={handleShare}>
              <Share2 size={16} />
              <span>مشاركة</span>
            </button>
          </div>
        </div>
      </div>

      {/* Outside the backdrop on purpose: React events bubble through the React
          tree, so a portal nested inside would close the modal on any click. */}
      <PrintPortal owner={printSheet.owner} persistent={printSheet.persistent}>{sheet}</PrintPortal>
    </>
  );
}
