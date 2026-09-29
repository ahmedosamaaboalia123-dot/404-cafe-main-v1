import { formatDecimal } from "@/shared/utils/decimal";

export default function Money({ value, currency = "ج.م", fractionDigits = 2, className = "" }) {
  return <span className={className} dir="rtl">{formatDecimal(value, { minimumFractionDigits: fractionDigits, maximumFractionDigits: fractionDigits })} {currency}</span>;
}
