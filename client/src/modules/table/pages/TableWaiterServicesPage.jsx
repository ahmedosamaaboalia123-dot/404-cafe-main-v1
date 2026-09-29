import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import TableWaiterServicesGrid from "../components/TableWaiterServicesGrid";
import { useTable } from "../context/TableContext";
import { createV1TableService } from "../services/tableGateway";
import "../styles/TableExperience.css";

export default function TableWaiterServicesPage() {
  const navigate = useNavigate();
  const { tableId } = useParams();
  const { showToast, tableToken, hasTableAccess, accessError } = useTable();
  const [pendingType, setPendingType] = useState("");
  const [error, setError] = useState("");
  const send = async (type, title) => {
    if (pendingType) return;
    setPendingType(type); setError("");
    try { if (!hasTableAccess) throw new Error(accessError || "امسح رمز QR للطاولة أولًا"); await createV1TableService({ type, details: title, ...(type === "WATER_REQUEST" ? { requestedQuantity: 1 } : {}) }, tableToken); showToast(`تم إرسال: ${title}`); }
    catch (reason) { setError(reason?.response?.data?.error?.messageAr || reason.message || "تعذر إرسال الطلب"); }
    finally { setPendingType(""); }
  };
  return <div className="table-experience-page" dir="rtl"><header><button onClick={() => navigate(`/table/${tableId}`)}><ArrowRight/>الرئيسية</button><div><span>طاولة رقم {tableId}</span><strong>خدمات الجرسون</strong></div></header><main><div className="experience-hero"><span>خدمة أسرع</span><h1>ماذا تحتاج على الطاولة؟</h1><p>اختر الخدمة وسيصل طلبك للجرسون.</p></div>{error && <p role="alert">{error}</p>}<TableWaiterServicesGrid pendingType={pendingType} onRequest={send}/></main></div>;
}
