import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Coffee, Minus, Plus, X } from "lucide-react";
import "../styles/SalesPage.css";

const money = (value) => `${(Number(value) || 0).toFixed(2)} ج.م`;

/**
 * Option picker for the admin sales screen (online orders and table orders).
 *
 * Unlike the customer-facing picker, this one never falls back to demo options:
 * the counter has to sell exactly what the catalog defines, because the server
 * re-prices the line from `productSizeId` + `addonIds` and reserves inventory
 * from the size's recipe.
 *
 * Confirm stays disabled until a size is picked, because the size is what the
 * server prices and what identifies the recipe.
 */
export default function SalesOptionsDialog({ product, isOpen, initial = null, onClose, onConfirm }) {
  const types = product?.variants || [];
  const addons = product?.addons || [];
  const [typeId, setTypeId] = useState(null);
  const [sizeId, setSizeId] = useState(null);
  const [selectedAddons, setSelectedAddons] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");
  const dialogRef = useRef(null);

  // Seed from the line being edited, or from the catalog defaults for a new pick.
  useEffect(() => {
    if (!isOpen) return;
    const firstType = types[0] || null;
    setTypeId(initial?.typeId ?? firstType?.id ?? null);
    setSizeId(initial?.sizeId ?? firstType?.sizes?.[0]?.id ?? null);
    setSelectedAddons(initial?.addonIds ?? []);
    setQuantity(initial?.quantity ?? 1);
    setNotes(initial?.notes ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, product?.id, initial]);

  const sizes = useMemo(
    () => types.find((t) => t.id === typeId)?.sizes || [],
    [types, typeId]
  );

  // Switching type must never leave a size selected that the new type lacks.
  useEffect(() => {
    if (sizeId && !sizes.some((s) => s.id === sizeId)) setSizeId(sizes[0]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKeyDown = (event) => { if (event.key === "Escape") onClose?.(); };
    document.addEventListener("keydown", onKeyDown);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const selectedSize = sizes.find((s) => s.id === sizeId) || null;
  const chosenAddons = addons.filter((a) => selectedAddons.includes(a.id));
  const unitPrice =
    (Number(selectedSize?.sellingPrice) || 0) +
    chosenAddons.reduce((sum, a) => sum + (Number(a.price) || 0), 0);

  const toggleAddon = (addonId) =>
    setSelectedAddons((prev) => (prev.includes(addonId) ? prev.filter((id) => id !== addonId) : [...prev, addonId]));

  const submit = () => {
    if (!selectedSize) return;
    onConfirm?.({
      product,
      type: types.find((t) => t.id === typeId) || null,
      size: selectedSize,
      addons: chosenAddons,
      quantity,
      notes: notes.trim(),
    });
  };

  return (
    <div className="sales-dialog-backdrop" onClick={onClose}>
      <div
        className="sales-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`خيارات ${product.name}`}
        tabIndex={-1}
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="sales-dialog-head">
          <h3>{product.name}</h3>
          <button type="button" className="sales-dialog-close" onClick={onClose} aria-label="إغلاق">
            <X size={18} />
          </button>
        </header>

        <div className="sales-dialog-body">
          {types.length > 1 && (
            <section className="sales-dialog-section">
              <h4 className="sales-dialog-title"><Coffee size={15} />النوع</h4>
              <div className="sales-dialog-pills" role="group" aria-label="النوع">
                {types.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    className={`sales-dialog-pill ${typeId === type.id ? "active" : ""}`}
                    aria-pressed={typeId === type.id}
                    onClick={() => setTypeId(type.id)}
                  >
                    {typeId === type.id && <Check size={12} strokeWidth={3} />}
                    {type.type}
                  </button>
                ))}
              </div>
            </section>
          )}

          <section className="sales-dialog-section">
            <h4 className="sales-dialog-title">الحجم</h4>
            {sizes.length ? (
              <div className="sales-dialog-sizes" role="group" aria-label="الحجم">
                {sizes.map((size) => (
                  <button
                    key={size.id}
                    type="button"
                    className={`sales-dialog-size ${sizeId === size.id ? "active" : ""}`}
                    aria-pressed={sizeId === size.id}
                    onClick={() => setSizeId(size.id)}
                  >
                    <span className="sales-dialog-size-name">{size.name}</span>
                    <span className="sales-dialog-size-price">{money(size.sellingPrice)}</span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="sales-dialog-empty">لا توجد أحجام متاحة لهذا النوع.</p>
            )}
          </section>

          {addons.length > 0 && (
            <section className="sales-dialog-section">
              <h4 className="sales-dialog-title">إضافات</h4>
              <div className="sales-dialog-addons" role="group" aria-label="إضافات">
                {addons.map((addon) => {
                  const checked = selectedAddons.includes(addon.id);
                  return (
                    <label key={addon.id} className={`sales-dialog-addon ${checked ? "active" : ""}`}>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleAddon(addon.id)}
                      />
                      <span className="sales-dialog-addon-name">{addon.name}</span>
                      <span className="sales-dialog-addon-price">+{money(addon.price)}</span>
                    </label>
                  );
                })}
              </div>
            </section>
          )}

          <section className="sales-dialog-section">
            <h4 className="sales-dialog-title">ملاحظات</h4>
            <input
              className="sales-dialog-notes"
              value={notes}
              maxLength={500}
              placeholder="ملاحظة للمطبخ (اختياري)"
              aria-label="ملاحظات"
              onChange={(e) => setNotes(e.target.value)}
            />
          </section>
        </div>

        <footer className="sales-dialog-foot">
          <div className="sales-dialog-qty" role="group" aria-label="الكمية">
            <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="إنقاص الكمية">
              <Minus size={16} />
            </button>
            <span aria-live="polite">{quantity}</span>
            <button type="button" onClick={() => setQuantity((q) => Math.min(100, q + 1))} aria-label="زيادة الكمية">
              <Plus size={16} />
            </button>
          </div>

          <div className="sales-dialog-total">
            <span>الإجمالي</span>
            <strong>{money(unitPrice * quantity)}</strong>
          </div>

          <button
            type="button"
            className="btn-confirm-invoice"
            disabled={!selectedSize}
            onClick={submit}
          >
            إضافة للفاتورة
          </button>
        </footer>
      </div>
    </div>
  );
}
