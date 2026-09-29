import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export default function LiveClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const weekday = now.toLocaleDateString("ar-EG-u-nu-latn", { weekday: "long", timeZone: "Africa/Cairo" });
  const date = now.toLocaleDateString("ar-EG-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Cairo" });
  const time = now.toLocaleTimeString("ar-EG-u-nu-latn", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true, timeZone: "Africa/Cairo" });
  return (
    <div className="live-clock">
      <Clock size={16} className="live-clock__icon" />
      <div className="live-clock__text">
        <span className="live-clock__time">{time}</span>
        <span className="live-clock__date">{weekday} • {date}</span>
      </div>
    </div>
  );
}
