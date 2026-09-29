import { useEffect, useState } from "react";
import "./ApiStatusBanner.css";

export default function ApiStatusBanner() {
  const [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    const update = (event) => setUnavailable(event.detail?.available === false);
    const offline = () => setUnavailable(true);
    const online = () => setUnavailable(false);
    window.addEventListener("api-availability", update);
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    return () => {
      window.removeEventListener("api-availability", update);
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, []);
  if (!unavailable) return null;
  return (
    <div className="api-status-banner" role="alert">
      <span>الاتصال بالبيانات غير مستقر. نحتفظ بآخر بيانات ظاهرة وسنحاول مجددًا.</span>
      <button type="button" onClick={() => window.location.reload()}>إعادة المحاولة</button>
    </div>
  );
}
