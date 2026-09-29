import { useMemo, useState } from "react";
import { isConflict } from "@/api/apiError";
import { ConflictDialog, Money } from "@/shared/components";
import { useCreateProductSize } from "../hooks/product.mutations";
import { firstProductFormError, productSizeSchema } from "../schemas/product.schema";

const num = (value) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const lineCost = (qty, material) => {
  const factor = num(material.conversionFactor);
  const price = num(material.referenceLargeUnitPrice);
  if (qty <= 0 || factor <= 0 || price <= 0) return 0;
  return (qty / factor) * price;
};

export default function SizeAdderForm({ productId, types, canManage, onReload }) {
  const [form, setForm] = useState({ typeId: "", name: "", sellingPrice: "", quantities: {} });
  const [error, setError] = useState("");
  const mutation = useCreateProductSize(productId);
  if (!canManage) return null;

  const activeType = types.find((item) => String(item.id) === String(form.typeId));
  const allowedMaterials = activeType?.allowedMaterials || [];
  const materialsById = new Map(
    allowedMaterials.map((material) => [String(material.id), material]),
  );
  const setQuantity = (id, value) =>
    setForm((current) => ({ ...current, quantities: { ...current.quantities, [id]: value } }));

  const estimate = useMemo(() => {
    let cost = 0;
    for (const [id, qty] of Object.entries(form.quantities)) {
      const material = materialsById.get(id);
      if (material) cost += lineCost(num(qty), material);
    }
    const selling = num(form.sellingPrice);
    const profit = selling - cost;
    const margin = selling > 0 ? (profit / selling) * 100 : null;
    return { cost, profit, margin };
  }, [form.quantities, form.sellingPrice, materialsById]);

  const submit = (event) => {
    event.preventDefault();
    mutation.resetAttempt();
    setError("");
    const ingredients = allowedMaterials
      .map((material) => ({
        materialId: String(material.id),
        quantitySmall: String(form.quantities[String(material.id)] ?? "").trim(),
      }))
      .filter((item) => item.quantitySmall !== "");
    if (allowedMaterials.length > 0 && ingredients.length === 0) {
      setError("أدخل كمية مكون واحد على الأقل");
      return;
    }
    const parsed = productSizeSchema.safeParse({
      typeId: String(form.typeId),
      name: form.name.trim(),
      sellingPrice: String(form.sellingPrice).trim(),
      sortOrder: 0,
      ...(ingredients.length ? { ingredients } : {}),
    });
    if (!parsed.success) {
      setError(firstProductFormError(parsed));
      return;
    }
    mutation.mutate(parsed.data, {
      onSuccess: async () => {
        setForm({ typeId: "", name: "", sellingPrice: "", quantities: {} });
        await onReload?.();
      },
    });
  };
  const conflict = mutation.isError && isConflict(mutation.error);
  return (
    <>
      <form className="sizes-adder" onSubmit={submit}>
        <label>
          النوع
          <select
            aria-label="النوع"
            value={form.typeId}
            disabled={mutation.isPending}
            onChange={(event) => setForm({ ...form, typeId: event.target.value, quantities: {} })}
          >
            <option value="">اختر النوع</option>
            {types.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label>
          اسم الحجم
          <input
            placeholder="مثال: كبير / صغير"
            aria-label="اسم الحجم"
            value={form.name}
            disabled={mutation.isPending}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
          />
        </label>
        <label>
          سعر البيع
          <input
            placeholder="0.00"
            aria-label="سعر البيع"
            inputMode="decimal"
            value={form.sellingPrice}
            disabled={mutation.isPending}
            onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })}
          />
        </label>
        {allowedMaterials.length > 0 && (
          <fieldset className="sizes-quantities">
            <legend>كميات المكونات (الوحدة الصغيرة)</legend>
            {allowedMaterials.map((material) => (
              <label key={material.id} className="sizes-quantity">
                <span>
                  <strong>{material.name}</strong>
                  {material.smallUnitName && <small>({material.smallUnitName})</small>}
                </span>
                <input
                  inputMode="decimal"
                  placeholder="0"
                  aria-label={`كمية ${material.name}`}
                  value={String(form.quantities[String(material.id)] ?? "")}
                  disabled={mutation.isPending}
                  onChange={(event) => setQuantity(material.id, event.target.value)}
                />
              </label>
            ))}
          </fieldset>
        )}
        <div className="sizes-adder__footer">
          <div className="sizes-adder__estimate">
            <span>التكلفة التقديرية: <Money value={String(Math.round(estimate.cost * 100) / 100)} /></span>
            <span>الربح التقديري: <Money value={String(Math.round(estimate.profit * 100) / 100)} /></span>
            <span>{estimate.margin == null ? "الهامش: —" : `الهامش: ${estimate.margin.toFixed(1)}%`}</span>
          </div>
          <button type="submit" className="sizes-primary" disabled={mutation.isPending}>
            {mutation.isPending ? "جاري الحفظ..." : "إضافة حجم"}
          </button>
        </div>
        {(error || (mutation.isError && !conflict)) && (
          <p className="sizes-error" role="alert">{error || mutation.error?.message || "تعذر إضافة الحجم"}</p>
        )}
      </form>
      <ConflictDialog
        open={conflict}
        onClose={mutation.resetAttempt}
        onReload={async () => { mutation.resetAttempt(); await onReload?.(); }}
        pending={false}
      />
    </>
  );
}