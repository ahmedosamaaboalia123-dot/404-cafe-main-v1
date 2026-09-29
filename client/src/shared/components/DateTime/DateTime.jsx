export default function DateTime({ value, withTime = true, className = "" }) {
  const date = value ? new Date(value) : null;
  const valid = date && !Number.isNaN(date.getTime());
  const text = valid ? new Intl.DateTimeFormat("ar-EG", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(date) : "—";
  return <time className={className} dateTime={valid ? date.toISOString() : undefined}>{text}</time>;
}
