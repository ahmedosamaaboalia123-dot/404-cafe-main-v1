import { formatDecimal } from "@/shared/utils/decimal";

export default function Quantity({ value, unit, maximumFractionDigits = 3, className = "" }) {
  return <span className={className}>{formatDecimal(value, { maximumFractionDigits })}{unit ? ` ${unit}` : ""}</span>;
}
