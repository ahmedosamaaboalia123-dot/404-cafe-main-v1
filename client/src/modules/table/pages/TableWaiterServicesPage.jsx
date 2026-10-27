import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import TableWaiterServicesGrid from "../components/TableWaiterServicesGrid";
import WaiterSuccessPopup from "../components/WaiterSuccessPopup";
import { useTable } from "../context/TableContext";
import { createV1TableService } from "../services/tableGateway";
import "../styles/TableExperience.css";

export default function TableWaiterServicesPage() {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const { showToast, tableToken, hasTableAccess, accessError, tableNumber } = useTable();
  const [pendingType, setPendingType] = useState("");
  const [notice, setNotice] = useState(null);
  const send = async (type, title) => {
    if (pendingType) return;
    setPendingType(type); setNotice(null);
    try {
      if (!hasTableAccess) throw new Error(accessError || "امسح رمز QR للطاولة أولًا");
      await createV1TableService({ type, details: title, ...(type === "WATER_REQUEST" ? { requestedQuantity: 1 } : {}) }, tableToken);
      showToast(`تم إرسال: ${title}`);
      setNotice({ tone: "success", reason: title });
    }
    catch (reason) {
      setNotice({ tone: "error", message: reason?.response?.data?.error?.messageAr || reason.message || "تعذر إرسال الطلب" });
    }
    finally { setPendingType(""); }
  };
  return <div className="table-experience-page" dir="rtl"><header><button onClick={() => navigate(`/table/${tableId}`)}><ArrowRight/>الرئيسية</button><div><span>طاولة رقم {tableId}</span><strong>خدمات الجرسون</strong></div></header><main><div className="experience-hero"><span>خدمة أسرع</span><h1>ماذا تحتاج على الطاولة؟</h1><p>اختر الخدمة وسيصل طلبك للجرسون.</p></div><TableWaiterServicesGrid pendingType={pendingType} onRequest={send}/></main>{notice && <WaiterSuccessPopup tone={notice.tone} reason={notice.reason} message={notice.message} tableNumber={tableNumber || tableId} onClose={() => setNotice(null)} />}</div>;
}
