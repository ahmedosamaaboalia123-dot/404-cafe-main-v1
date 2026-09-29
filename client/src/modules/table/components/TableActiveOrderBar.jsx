import React from "react";
import { Link } from "react-router-dom";
import {
  Clock,
  CheckCircle2,
  Flame,
  ArrowRight,
  FileText,
  Activity,
  ArrowRightLeft,
  ChevronLeft,
} from "lucide-react";
import { useTable } from "../context/TableContext";

export default function TableActiveOrderBar({ onOpenInvoice }) {
  const { tableNumber, activeOrder, setIsTableSelectorOpen } = useTable();

  if (!activeOrder) {
    return (
      <div className="tbl-pinned-status-strip">
        <div className="tbl-pinned-status-inner">
          <div className="tbl-pinned-left-side">
            <span className="tbl-pinned-tag">
              🪑 أنت تتصفح الآن: <strong>طاولة رقم {tableNumber}</strong>
            </span>
            <span className="tbl-pinned-status-caption">
              لا توجد طلبات جارية حالياً على هذه الطاولة.
            </span>
          </div>

          <div className="tbl-pinned-actions-side">
            <button
              type="button"
              className="tbl-pinned-btn tbl-pinned-btn-switch"
              onClick={() => setIsTableSelectorOpen(true)}
            >
              <ArrowRightLeft size={13} />
              <span>تغيير الطاولة</span>
            </button>
            <Link
              to={`/table/${tableNumber}/menu`}
              className="tbl-pinned-btn tbl-pinned-btn-track"
            >
              <span>طلب جديد للطاولة</span>
              <ChevronLeft size={13} />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const readyItemsCount =
    activeOrder.items?.filter((it) => it.isReady).length || 0;
  const totalItemsCount = activeOrder.items?.length || 0;

  return (
    <div className="tbl-pinned-status-strip">
      <div className="tbl-pinned-status-inner">
        <div className="tbl-pinned-left-side">
          <span className="tbl-pinned-tag">
            🪑 طاولة رقم {tableNumber}
          </span>
          <span className="tbl-pinned-order-highlight">
            طلب رقم #{activeOrder.orderNumber}
          </span>
          <span className="tbl-pinned-status-caption">
            {activeOrder.status === "ready" ? (
              <>
                <CheckCircle2 size={14} className="text-emerald-400" />
                <span>جاهز للتقديم على طاولتك</span>
              </>
            ) : (
              <>
                <Flame size={14} className="text-amber-400" />
                <span>
                  {activeOrder.statusText || "جاري التحضير"} ({readyItemsCount}/{totalItemsCount} صنف جاهز)
                </span>
              </>
            )}
          </span>
        </div>

        <div className="tbl-pinned-actions-side">
          <button
            type="button"
            className="tbl-pinned-btn tbl-pinned-btn-switch"
            onClick={() => setIsTableSelectorOpen(true)}
            title="تبديل رقم الطاولة"
          >
            <ArrowRightLeft size={13} />
            <span>تبديل</span>
          </button>

          {onOpenInvoice && (
            <button
              type="button"
              className="tbl-pinned-btn tbl-pinned-btn-switch"
              onClick={() => onOpenInvoice(activeOrder)}
              title="عرض الفاتورة"
            >
              <FileText size={13} />
              <span>الفاتورة</span>
            </button>
          )}

          <Link
            to={`/table/${tableNumber}/orders/${activeOrder.id}/track`}
            className="tbl-pinned-btn tbl-pinned-btn-track"
            title="تتبع مباشر لحالة الأصناف"
          >
            <Activity size={13} />
            <span>تتبع الطلب</span>
            <ChevronLeft size={13} />
          </Link>
        </div>
      </div>
    </div>
  );
}
