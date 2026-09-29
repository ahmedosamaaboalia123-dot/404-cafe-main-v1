import { useState } from "react";
import { isConflict } from "@/api/apiError";
import { ConflictDialog, ConfirmAction, Money } from "@/shared/components";
import { useDeleteProductSize, useReplaceRecipe, useUpdateProductSize } from "../hooks/product.mutations";
import { firstProductFormError, productSizeUpdateSchema, recipeSchema } from "../schemas/product.schema";

const num = (value) => {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
};

const typeName = (types, size) =>
  types.find((item) => String(item.id) === String(size.typeId))?.name || "—";

export function SizeIngredients({ recipe }) {
  if (!recipe?.ingredients?.length) return <span className="details-empty">لا وصفة</span>;
  return (
    <div className="details-type-materials sizes-summary-chips">
      {recipe.ingredients.map((item, index) => (
        <span key={`${item.materialId}-${index}`}>
          {item.materialName || item.materialId}
          {" × "}
          {item.quantitySmall}
        </span>
      ))}
    </div>
  );
}

function SizeRowEditor({ productId, types, size, recipe, onReload }) {
  const originalType = String(size.typeId);
  const [form, setForm] = useState({
    typeId: types.some((item) => String(item.id) === originalType) ? originalType : (types[0]?.id ? String(types[0].id) : ""),
    name: size.name || "",
    sellingPrice: String(size.sellingPrice ?? ""),
    quantities: Object.fromEntries(
      (recipe?.ingredients || []).map((item) => [String(item.materialId), String(item.quantitySmall)]),
    ),
  });
  const [error, setError] = useState("");
  const updateSize = useUpdateProductSize(productId);
  const replaceRecipe = useReplaceRecipe(productId);

  const activeType = types.find((item) => String(item.id) === String(form.typeId));
  const allowedMaterials = activeType?.allowedMaterials || [];
  const materialsById = new Map(allowedMaterials.map((material) => [String(material.id), material]));
  const setQuantity = (id, value) =>
    setForm((current) => ({ ...current, quantities: { ...current.quantities, [id]: value } }));

  const ready = Boolean(form.typeId) && Boolean(materialsById.size);
  const conflictSize = updateSize.isError && isConflict(updateSize.error);
  const conflictRecipe = replaceRecipe.isError && isConflict(replaceRecipe.error);
  const pending = updateSize.isPending || replaceRecipe.isPending;

  const saveQuantities = () => {
    const ingredients = allowedMaterials
      .map((material) => ({
        materialId: String(material.id),
        quantitySmall: String(form.quantities[String(material.id)] ?? "").trim(),
      }))
      .filter((item) => item.quantitySmall !== "");
    if (allowedMaterials.length > 0 && ingredients.length === 0) {
      setError("أدخل كمية مكون واحد على الأقل");
      return false;
    }
    if (ingredients.length === 0) {
      onReload?.();
      return true;
    }
    const parsed = recipeSchema.safeParse({ ingredients });
    if (!parsed.success) {
      setError(firstProductFormError(parsed));
      return false;
    }
    replaceRecipe.mutate(
      {
        productSizeId: String(size.id),
        ingredients: parsed.data.ingredients,
        ...(recipe ? { expectedVersion: Number(recipe.version ?? 0) } : {}),
      },
      { onSuccess: () => onReload?.() },
    );
    return true;
  };

  const save = (event) => {
    event.preventDefault();
    updateSize.resetAttempt();
    replaceRecipe.resetAttempt();
    setError("");
    const parsed = productSizeUpdateSchema.safeParse({
      ...(form.typeId !== originalType ? { typeId: String(form.typeId) } : {}),
      name: form.name.trim(),
      sellingPrice: String(form.sellingPrice).trim(),
      expectedVersion: Number(size.version ?? 0),
    });
    if (!parsed.success) {
      setError(firstProductFormError(parsed));
      return;
    }
    updateSize.mutate(
      { sizeId: String(size.id), ...parsed.data },
      {
        onSuccess: () => {
          if (!ready) {
            onReload?.();
          } else if (saveQuantities()) {
            return;
          } else {
            onReload?.();
          }
        },
      },
    );
  };

  return (
    <tr>
      <td colSpan={8}>
        <form className="sizes-edit" onSubmit={save}>
          <label>
            النوع
            <select
              aria-label="تعديل نوع الحجم"
              value={form.typeId}
              disabled={pending}
              onChange={(event) => setForm({ ...form, typeId: event.target.value, quantities: {} })}
            >
              {types.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            اسم الحجم
            <input aria-label="تعديل اسم الحجم" value={form.name} disabled={pending} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          </label>
          <label>
            سعر البيع
            <input aria-label="تعديل سعر البيع" inputMode="decimal" value={form.sellingPrice} disabled={pending} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })} />
          </label>
          {allowedMaterials.length > 0 && (
            <fieldset className="sizes-quantities">
              <legend>المكونات (الوحدة الصغيرة)</legend>
              {allowedMaterials.map((material) => (
                <label key={material.id} className="sizes-quantity">
                  <span>
                    <strong>{material.name}</strong>
                    {material.smallUnitName && <small>({material.smallUnitName})</small>}
                  </span>
                  <input
                    inputMode="decimal"
                    placeholder="0"
                    aria-label={`تعديل كمية ${material.name}`}
                    value={String(form.quantities[String(material.id)] ?? "")}
                    disabled={pending}
                    onChange={(event) => setQuantity(material.id, event.target.value)}
                  />
                </label>
              ))}
            </fieldset>
          )}
          <div className="sizes-edit__actions">
            <button type="submit" className="sizes-primary" disabled={pending}>
              {pending ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button type="button" className="sizes-secondary" disabled={pending} onClick={() => onReload?.()}>
              إلغاء
            </button>
          </div>
          {(error || (updateSize.isError && !conflictSize) || (replaceRecipe.isError && !conflictRecipe)) && (
            <p className="sizes-error" role="alert">
              {error || updateSize.error?.message || replaceRecipe.error?.message || "تعذر حفظ الحجم"}
            </p>
          )}
        </form>
      </td>
      <ConflictDialog
        open={conflictSize}
        onClose={updateSize.resetAttempt}
        onReload={async () => { updateSize.resetAttempt(); await onReload?.(); }}
        pending={false}
      />
      <ConflictDialog
        open={conflictRecipe}
        onClose={replaceRecipe.resetAttempt}
        onReload={async () => { replaceRecipe.resetAttempt(); await onReload?.(); }}
        pending={false}
      />
    </tr>
  );
}

export default function SizesTable({ productId, types, sizes, recipeBySize, costBySize, canManage, onReload }) {
  const [editingId, setEditingId] = useState(null);
  const deleteSize = useDeleteProductSize(productId);
  if (sizes.length === 0) return <p className="details-empty">لا توجد أحجام بعد.</p>;

  const commitDelete = (sizeId) =>
    new Promise((resolve, reject) => {
      deleteSize.resetAttempt();
      deleteSize.mutate(
        { sizeId: String(sizeId) },
        {
          onSuccess: () => { onReload?.(); resolve(); },
          onError: () => reject(),
        },
      );
    });
  const conflict = deleteSize.isError && isConflict(deleteSize.error);

  return (
    <div className="table-responsive">
      <table className="sizes-summary-table">
        <thead>
          <tr>
            <th>م</th>
            <th>النوع</th>
            <th>الحجم</th>
            <th>سعر البيع</th>
            <th>المكونات</th>
            <th>التكلفة</th>
            <th>الربح</th>
            {canManage && <th>إجراءات</th>}
          </tr>
        </thead>
        <tbody>
          {sizes.map((size, index) => {
            const recipe = recipeBySize[String(size.id)];
            const cost = costBySize[String(size.id)];
            return [
              <tr key={size.id} className={editingId === String(size.id) ? "sizes-editing-row" : ""}>
                <td data-label="م">{index + 1}</td>
                <td data-label="النوع">{typeName(types, size)}</td>
                <td data-label="الحجم"><strong>{size.name}</strong></td>
                <td data-label="سعر البيع"><Money value={size.sellingPrice} /></td>
                <td data-label="المكونات"><SizeIngredients recipe={recipe} /></td>
                <td data-label="التكلفة">{cost?.cost == null ? "—" : <Money value={cost.cost} />}</td>
                <td data-label="الربح">{cost?.profit == null ? "—" : <Money value={cost.profit} />}</td>
                {canManage && (
                  <td data-label="إجراءات">
                    <div className="details-row-actions">
                      <button type="button" className="details-secondary" onClick={() => setEditingId(editingId === String(size.id) ? null : String(size.id))}>
                        {editingId === String(size.id) ? "إلغاء" : "تعديل"}
                      </button>
                      <ConfirmAction
                        title="حذف الحجم"
                        message={`سيتم حذف حجم «${size.name}» ووصفته نهائيًا.`}
                        confirmLabel="حذف"
                        cancelLabel="إلغاء"
                        danger
                        pending={deleteSize.isPending}
                        onConfirm={() => commitDelete(size.id)}
                      >
                        حذف
                      </ConfirmAction>
                    </div>
                  </td>
                )}
              </tr>,
              editingId === String(size.id) && (
                <SizeRowEditor
                  key={`${size.id}:edit`}
                  productId={productId}
                  types={types}
                  size={size}
                  recipe={recipe}
                  onReload={onReload}
                />
              ),
            ];
          })}
        </tbody>
      </table>
      <ConflictDialog
        open={conflict}
        onClose={deleteSize.resetAttempt}
        onReload={async () => { deleteSize.resetAttempt(); await onReload?.(); }}
        pending={false}
      />
    </div>
  );
}