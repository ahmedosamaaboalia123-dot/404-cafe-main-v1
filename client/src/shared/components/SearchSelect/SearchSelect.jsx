import { useId, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import "./SearchSelect.css";

export default function SearchSelect({ id, label, value, search, onSearch, onSelect, options = [], loading, error, disabled, placeholder = "ابحث واختر" }) {
  const generatedId = useId();
  const inputId = id || generatedId;
  const listId = `${inputId}-list`;
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const activeIndex = active >= 0 && active < options.length ? active : -1;
  const choose = (option) => { onSelect(option); setOpen(false); setActive(-1); };
  const keyDown = (event) => {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); setOpen(true);
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = options.length ? (activeIndex + step + options.length) % options.length : -1;
      setActive(next);
      return;
    }
    if (event.key === "Enter" && open && activeIndex >= 0) { event.preventDefault(); choose(options[activeIndex]); }
  };
  return <div className="search-select" onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}>
    <label htmlFor={inputId}>{label}</label>
    <div className="search-select__control">
      <Search size={17} aria-hidden="true" />
      <input id={inputId} role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={listId}
        aria-activedescendant={open && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined}
        autoComplete="off" placeholder={placeholder} value={search} disabled={disabled}
        onFocus={() => setOpen(true)} onKeyDown={keyDown}
        onChange={(event) => { onSearch(event.target.value); setOpen(true); setActive(-1); }} />
      <button type="button" tabIndex={-1} disabled={disabled} aria-label={`فتح قائمة ${label}`} onClick={() => setOpen(!open)}><ChevronDown size={18} /></button>
    </div>
    {open && !disabled && <div className="search-select__menu">
      {loading && <p role="status">جاري البحث...</p>}
      {error && <p role="alert">تعذر تحميل النتائج، حاول مرة أخرى</p>}
      {!loading && !error && !options.length && <p role="status">لا توجد نتائج مطابقة</p>}
      <ul id={listId} role="listbox" aria-label={label} aria-busy={Boolean(loading)}>
        {!loading && !error && options.map((option, index) => <li id={`${listId}-${index}`} role="option" aria-selected={value === option.value}
          className={activeIndex === index ? "is-active" : ""} key={option.value}
          onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(option)}>
          <span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>
          {value === option.value && <Check size={18} aria-hidden="true" />}
        </li>)}
      </ul>
    </div>}
  </div>;
}
