import { useRouteError } from "react-router-dom";
import "./RouteErrorPage.css";

export default function RouteErrorPage() {
  const error = useRouteError();
  const message = error?.status === 404 ? "الصفحة المطلوبة غير موجودة" : "حدث خطأ أثناء عرض الصفحة";
  return <main className="route-error-page" role="alert">
    <div><strong>{error?.status || "!"}</strong><h1>{message}</h1><p>يمكنك إعادة تحميل الصفحة أو الرجوع إلى الرئيسية.</p><div><button type="button" onClick={() => window.location.reload()}>إعادة تحميل الصفحة</button><a href="/">الرجوع للرئيسية</a></div></div>
  </main>;
}
