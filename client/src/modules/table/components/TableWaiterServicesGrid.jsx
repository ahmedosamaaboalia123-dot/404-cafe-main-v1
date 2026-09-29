import { ConciergeBell, Droplets, ReceiptText, PartyPopper, TriangleAlert } from "lucide-react";

const services = [
  { type: "CALL_WAITER", title: "مناداة جرسون", text: "اطلب حضور الجرسون للطاولة", icon: ConciergeBell },
  { type: "WATER_REQUEST", title: "طلب مياه", text: "اطلب مياه للطاولة", icon: Droplets },
  { type: "PARTY_SURPRISE", title: "تجهيز مفاجأة حفلة", text: "اطلب تجهيز مفاجأة للطاولة", icon: PartyPopper },
  { type: "BILL_REQUEST", title: "طلب الحساب", text: "اطلب تجهيز فاتورة الطاولة", icon: ReceiptText },
  { type: "REPORT_PROBLEM", title: "ظهور مشكلة", text: "أبلغ الجرسون عن مشكلة", icon: TriangleAlert },
];

export default function TableWaiterServicesGrid({ pendingType, onRequest }) {
  return <div className="waiter-services-grid">{services.map(({ type, title, text, icon: Icon }) => <button key={type} disabled={Boolean(pendingType)} onClick={() => onRequest(type, title)}><Icon/><strong>{pendingType === type ? "جاري الإرسال..." : title}</strong><span>{text}</span></button>)}</div>;
}
