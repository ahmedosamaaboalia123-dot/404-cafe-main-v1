import { ChevronLeft, ChevronRight } from "lucide-react";
import { readPageMeta } from "@/api/pagination";
import "./ServerPagination.css";

export default function ServerPagination({ meta, onPageChange, disabled = false, label = "عنصر" }) {
  const page = readPageMeta(meta);
  if (page.total === 0) return null;
  return <nav className="server-pagination" aria-label="التنقل بين الصفحات">
    <span>صفحة {page.page} من {page.pages} — إجمالي {page.total} {label}</span>
    <div>
      <button type="button" aria-label="الصفحة السابقة" disabled={disabled || !page.hasPrevious} onClick={() => onPageChange(page.page - 1)}><ChevronRight size={18}/></button>
      <strong aria-current="page">{page.page}</strong>
      <button type="button" aria-label="الصفحة التالية" disabled={disabled || !page.hasNext} onClick={() => onPageChange(page.page + 1)}><ChevronLeft size={18}/></button>
    </div>
  </nav>;
}
