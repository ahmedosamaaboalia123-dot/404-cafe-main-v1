import { useRef, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { can } from "@/modules/auth/permissions/permission";
import { isConflict } from "@/api/apiError";
import { AsyncState, ConflictDialog, ConfirmAction, Money } from "@/shared/components";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useMaterialsScreen } from "@/modules/admin/inventory/hooks/inventory.queries";
import { useProductsScreen, useProductDetails } from "../hooks/product.queries";
import {
  useCreateProductAddon,
  useCreateProductType,
  useDeleteProduct,
  useDeleteProductType,
  useUpdateProduct,
  useUpdateProductAddon,
  useUpdateProductType,
} from "../hooks/product.mutations";
import { useDeleteMedia } from "../hooks/media.hooks";
import {
  addonFormSchema,
  addonUpdateSchema,
  firstProductFormError,
  productTypeSchema,
  productTypeUpdateSchema,
  productUpdateSchema,
} from "../schemas/product.schema";
import MediaPicker, { ProductThumb } from "./MediaPicker";
import SizesSection from "./SizesSection";
import "./ProductDetails.css";

function BasicEditor({ product, categories, canManage, onReload }) {
  const [form, setForm] = useState({
    name: product.name || "",
    categoryId: product.categoryId ? String(product.categoryId) : "",
    description: product.description || "",
    isVisibleInMenu: Boolean(product.isVisibleInMenu),
    status: product.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    imageId: product.imageId ? String(product.imageId) : null,
    imageUrl: product.imageUrl || null,
  });
  const [formError, setFormError] = useState("");
  // A newly uploaded image is dropped (and removed remotely) if the save fails.
  const freshImage = useRef(null);
  const mutation = useUpdateProduct(product.id);
  const deleteMedia = useDeleteMedia();

  const submit = (event) => {
    event.preventDefault();
    mutation.resetAttempt();
    setFormError("");
    const parsed = productUpdateSchema.safeParse({
      name: form.name.trim(),
      description: form.description.trim() ? form.description.trim() : undefined,
      imageId: form.imageId ? String(form.imageId) : null,
      categoryId: form.categoryId ? String(form.categoryId) : undefined,
      isVisibleInMenu: Boolean(form.isVisibleInMenu),
      status: form.status,
      expectedVersion: Number(product.version ?? 0),
    });
    if (!parsed.success) {
      setFormError(firstProductFormError(parsed));
      return;
    }
    mutation.mutate(parsed.data, {
      onSuccess: () => {
        freshImage.current = null;
        onReload?.();
      },
      onError: () => {
        const fresh = freshImage.current;
        freshImage.current = null;
        if (!fresh?.id) return;
        setForm((current) => ({ ...current, imageId: product.imageId ? String(product.imageId) : null, imageUrl: product.imageUrl || null }));
        deleteMedia.mutate(
          { mediaId: fresh.id, expectedVersion: Number(fresh.version ?? 0) },
          { onError: () => {} },
        );
      },
    });
  };

  const quickPatch = (patch) => {
    mutation.resetAttempt();
    setFormError("");
    mutation.mutate({ ...patch, expectedVersion: Number(product.version ?? 0) }, { onSuccess: () => onReload?.() });
  };

  if (!canManage) {
    return (
      <dl className="details-readonly">
        <div><dt>الاسم</dt><dd>{product.name}</dd></div>
        <div><dt>القسم</dt><dd>{categories.find((item) => String(item.id) === String(product.categoryId))?.name || "—"}</dd></div>
        <div><dt>الوصف</dt><dd>{product.description || "—"}</dd></div>
        <div><dt>الحالة</dt><dd>{product.statusLabel}</dd></div>
        <div><dt>الظهور</dt><dd>{product.isVisibleInMenu ? "في المنيو" : "مخفي"}</dd></div>
      </dl>
    );
  }

  const conflict = mutation.isError && isConflict(mutation.error);

  return (
    <>
      <form className="details-form" onSubmit={submit}>
        <label>
          اسم المنتج
          <input value={form.name} disabled={mutation.isPending} onChange={(event) => setForm({ ...form, name: event.target.value })} />
        </label>
        <label>
          القسم
          <select value={form.categoryId} disabled={mutation.isPending} onChange={(event) => setForm({ ...form, categoryId: event.target.value })}>
            <option value="">اختر القسم</option>
            {categories.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
        <label className="details-form__wide">
          الوصف
          <textarea value={form.description} disabled={mutation.isPending} onChange={(event) => setForm({ ...form, description: event.target.value })} />
        </label>
        <label className="details-check">
          <input
            type="checkbox"
            checked={form.isVisibleInMenu}
            disabled={mutation.isPending}
            onChange={(event) => setForm({ ...form, isVisibleInMenu: event.target.checked })}
          />
          ظاهر في المنيو
        </label>
        <label>
          الحالة
          <select value={form.status} disabled={mutation.isPending} onChange={(event) => setForm({ ...form, status: event.target.value })}>
            <option value="ACTIVE">نشط</option>
            <option value="INACTIVE">موقوف</option>
          </select>
        </label>
        <div className="details-form__wide">
          <span className="details-label">الصورة</span>
          <MediaPicker
        value={form.imageId}
        imageUrl={form.imageUrl}
        onChange={(id, meta = {}) => {
          freshImage.current = meta.fresh && id ? { id: String(id), version: meta.version } : null;
          setForm((current) => ({ ...current, imageId: id, imageUrl: meta.url ?? null }));
        }}
      />
        </div>
        <div className="details-form__actions">
          <button type="submit" className="details-primary" disabled={mutation.isPending}>
            {mutation.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
          </button>
          <button
            type="button"
            className="details-secondary"
            disabled={mutation.isPending}
            onClick={() => quickPatch({ status: product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" })}
          >
            {product.status === "ACTIVE" ? "إيقاف" : "تفعيل"}
          </button>
          <button
            type="button"
            className="details-secondary"
            disabled={mutation.isPending}
            onClick={() => quickPatch({ isVisibleInMenu: !product.isVisibleInMenu })}
          >
            {product.isVisibleInMenu ? "إخفاء من المنيو" : "إظهار في المنيو"}
          </button>
        </div>
        {(formError || (mutation.isError && !conflict)) && (
          <p className="details-error" role="alert">{formError || mutation.error?.message || "تعذر حفظ المنتج"}</p>
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

function TypeMaterialPicker({ selected, onChange, disabled }) {
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search, 400);
  const query = useMaterialsScreen({ page: 1, limit: 10, search: debounced || undefined });
  const materials = query.data?.materials || [];
  const toggle = (id) => {
    const next = String(id);
    onChange(selected.includes(next) ? selected.filter((item) => item !== next) : [...selected, next].slice(0, 100));
  };
  return (
    <div style={{ display: "grid", gap: 6, gridColumn: "auto", color: "#3e2d23" }}>
      <input
        placeholder="ابحث عن مادة خام للنوع وعلّم عليها"
        aria-label="بحث عن مادة خام للنوع"
        value={search}
        disabled={disabled}
        onChange={(event) => setSearch(event.target.value)}
      />
      <div style={{ display: "grid", gap: 4, maxHeight: 150, overflow: "auto", paddingInlineEnd: 4 }}>
        {materials.map((material) => (
          <label key={material.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <input type="checkbox" checked={selected.includes(String(material.id))} disabled={disabled} onChange={() => toggle(material.id)} />
            <span>{material.name}</span>
          </label>
        ))}
        {!query.isLoading && materials.length === 0 && <small>لا توجد مواد مطابقة.</small>}
        {query.isError && <small>تعذر تحميل المواد.</small>}
      </div>
      {selected.length > 0 && <small>المختار: {selected.length} مادة</small>}
    </div>
  );
}

function TypeAdder({ productId, canManage, onReload }) {
  const [name, setName] = useState("");
  const [allowedMaterialIds, setAllowedMaterialIds] = useState([]);
  const [error, setError] = useState("");
  const mutation = useCreateProductType(productId);
  if (!canManage) return null;
  const submit = (event) => {
    event.preventDefault();
    mutation.resetAttempt();
    setError("");
    const parsed = productTypeSchema.safeParse({ name: name.trim(), allowedMaterialIds: allowedMaterialIds.map(String), sortOrder: 0 });
    if (!parsed.success) {
      setError(firstProductFormError(parsed));
      return;
    }
    mutation.mutate(parsed.data, { onSuccess: async () => { setName(""); setAllowedMaterialIds([]); await onReload?.(); } });
  };
  return (
    <form className="details-inline details-inline--type" onSubmit={submit}>
      <input placeholder="اسم نوع جديد" aria-label="اسم نوع جديد" value={name} disabled={mutation.isPending} onChange={(event) => setName(event.target.value)} />
      <TypeMaterialPicker selected={allowedMaterialIds} onChange={setAllowedMaterialIds} disabled={mutation.isPending} />
      <button type="submit" className="details-primary" disabled={mutation.isPending}>
        {mutation.isPending ? "جاري الحفظ..." : "إضافة نوع"}
      </button>
      {(error || mutation.isError) && (
        <p className="details-error" role="alert">{error || mutation.error?.message || "تعذر إضافة النوع"}</p>
      )}
    </form>
  );
}

function AddonEditor({ productId, addon, canManage, onReload }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: addon.name || "", sellingPrice: String(addon.sellingPrice ?? ""), notes: addon.notes || "" });
  const [error, setError] = useState("");
  const mutation = useUpdateProductAddon(productId);
  if (!canManage) {
    return (
      <li className="details-addon">
        <strong>{addon.name}</strong>
        <span><Money value={addon.sellingPrice} /></span>
        <span className={`status-badge ${addon.isActive ? "active" : "withdrawn"}`}>{addon.isActive ? "نشط" : "موقوف"}</span>
      </li>
    );
  }
  const submit = (event) => {
    event.preventDefault();
    mutation.resetAttempt();
    setError("");
    const parsed = addonUpdateSchema.safeParse({
      name: form.name.trim(),
      sellingPrice: String(form.sellingPrice).trim(),
      notes: form.notes.trim() ? form.notes.trim() : undefined,
      expectedVersion: Number(addon.version ?? 0),
    });
    if (!parsed.success) {
      setError(firstProductFormError(parsed));
      return;
    }
    mutation.mutate({ addonId: String(addon.id), ...parsed.data }, { onSuccess: async () => { setEditing(false); await onReload?.(); } });
  };
  const toggleActive = () => {
    mutation.resetAttempt();
    mutation.mutate(
      { addonId: String(addon.id), isActive: !addon.isActive, expectedVersion: Number(addon.version ?? 0) },
      { onSuccess: () => onReload?.() },
    );
  };
  const conflict = mutation.isError && isConflict(mutation.error);
  return (
    <li className="details-addon">
      <div className="details-addon__head">
        <strong>{addon.name}</strong>
        <span><Money value={addon.sellingPrice} /></span>
        <span className={`status-badge ${addon.isActive ? "active" : "withdrawn"}`}>{addon.isActive ? "نشط" : "موقوف"}</span>
        <button type="button" className="details-secondary" onClick={() => setEditing((current) => !current)}>
          {editing ? "إلغاء" : "تعديل"}
        </button>
        <button type="button" className="details-secondary" disabled={mutation.isPending} onClick={toggleActive}>
          {addon.isActive ? "إيقاف" : "تفعيل"}
        </button>
      </div>
      {editing && (
        <form className="details-inline" onSubmit={submit}>
          <input aria-label="اسم الإضافة" value={form.name} disabled={mutation.isPending} onChange={(event) => setForm({ ...form, name: event.target.value })} />
          <input aria-label="سعر الإضافة" inputMode="decimal" value={form.sellingPrice} disabled={mutation.isPending} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })} />
          <input aria-label="ملاحظات الإضافة" value={form.notes} disabled={mutation.isPending} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
          <button type="submit" className="details-primary" disabled={mutation.isPending}>
            {mutation.isPending ? "جاري الحفظ..." : "حفظ"}
          </button>
          {(error || (mutation.isError && !conflict)) && (
            <p className="details-error" role="alert">{error || mutation.error?.message || "تعذر حفظ الإضافة"}</p>
          )}
        </form>
      )}
      <ConflictDialog
        open={conflict}
        onClose={mutation.resetAttempt}
        onReload={async () => { mutation.resetAttempt(); await onReload?.(); }}
        pending={false}
      />
    </li>
  );
}

function AddonAdder({ productId, canManage, onReload }) {
  const [form, setForm] = useState({ name: "", sellingPrice: "", notes: "" });
  const [error, setError] = useState("");
  const mutation = useCreateProductAddon(productId);
  if (!canManage) return null;
  const submit = (event) => {
    event.preventDefault();
    mutation.resetAttempt();
    setError("");
    const parsed = addonFormSchema.safeParse({
      name: form.name.trim(),
      sellingPrice: String(form.sellingPrice).trim(),
      notes: form.notes.trim() ? form.notes.trim() : undefined,
      isActive: true,
      sortOrder: 0,
    });
    if (!parsed.success) {
      setError(firstProductFormError(parsed));
      return;
    }
    mutation.mutate(parsed.data, { onSuccess: async () => { setForm({ name: "", sellingPrice: "", notes: "" }); await onReload?.(); } });
  };
  return (
    <form className="details-inline" onSubmit={submit}>
      <input placeholder="اسم الإضافة" aria-label="اسم الإضافة" value={form.name} disabled={mutation.isPending} onChange={(event) => setForm({ ...form, name: event.target.value })} />
      <input placeholder="سعر البيع" aria-label="سعر البيع" inputMode="decimal" value={form.sellingPrice} disabled={mutation.isPending} onChange={(event) => setForm({ ...form, sellingPrice: event.target.value })} />
      <input placeholder="ملاحظات (اختياري)" aria-label="ملاحظات" value={form.notes} disabled={mutation.isPending} onChange={(event) => setForm({ ...form, notes: event.target.value })} />
      <button type="submit" className="details-primary" disabled={mutation.isPending}>
        {mutation.isPending ? "جاري الحفظ..." : "إضافة"}
      </button>
      {(error || mutation.isError) && (
        <p className="details-error" role="alert">{error || mutation.error?.message || "تعذر إضافة الإضافة"}</p>
      )}
    </form>
  );
}

function TypeRowEditor({ productId, type, onReload }) {
  const [form, setForm] = useState({ name: type.name || "" });
  const [error, setError] = useState("");
  const mutation = useUpdateProductType(productId);
  const submit = (event) => {
    event.preventDefault();
    mutation.resetAttempt();
    setError("");
    const parsed = productTypeUpdateSchema.safeParse({
      name: form.name.trim(),
      expectedVersion: Number(type.version ?? 0),
    });
    if (!parsed.success) {
      setError(firstProductFormError(parsed));
      return;
    }
    mutation.mutate({ typeId: String(type.id), ...parsed.data }, { onSuccess: async () => { await onReload?.(); } });
  };
  const toggleActive = () => {
    mutation.resetAttempt();
    mutation.mutate(
      { typeId: String(type.id), isActive: !type.isActive, expectedVersion: Number(type.version ?? 0) },
      { onSuccess: () => onReload?.() },
    );
  };
  const conflict = mutation.isError && isConflict(mutation.error);
  return (
    <>
      <tr>
        <td colSpan={6}>
          <form className="details-inline details-inline--type-edit" onSubmit={submit}>
            <input aria-label="تعديل اسم النوع" value={form.name} disabled={mutation.isPending} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <button type="submit" className="details-primary" disabled={mutation.isPending}>
              {mutation.isPending ? "جاري الحفظ..." : "حفظ"}
            </button>
            <button type="button" className="details-secondary" disabled={mutation.isPending} onClick={toggleActive}>
              {type.isActive ? "إيقاف النوع" : "تفعيل النوع"}
            </button>
            <button type="button" className="details-secondary" disabled={mutation.isPending} onClick={() => onReload?.()}>
              إلغاء
            </button>
            {(error || (mutation.isError && !conflict)) && (
              <p className="details-error" role="alert">{error || mutation.error?.message || "تعذر حفظ النوع"}</p>
            )}
          </form>
        </td>
      </tr>
      <ConflictDialog
        open={conflict}
        onClose={mutation.resetAttempt}
        onReload={async () => { mutation.resetAttempt(); await onReload?.(); }}
        pending={false}
      />
    </>
  );
}

function TypeDeleteButton({ productId, type, onReload }) {
  const deleteType = useDeleteProductType(productId);
  const commitDelete = () =>
    new Promise((resolve, reject) => {
      deleteType.resetAttempt();
      deleteType.mutate(
        { typeId: String(type.id) },
        {
          onSuccess: () => { onReload?.(); resolve(); },
          onError: () => reject(),
        },
      );
    });
  const conflict = deleteType.isError && isConflict(deleteType.error);
  return (
    <>
      <ConfirmAction
        title="حذف النوع"
        message={`سيتم حذف «${type.name}» مع كل الأحجام التابعة له ووصفاتها.`}
        confirmLabel="حذف"
        cancelLabel="إلغاء"
        danger
        pending={deleteType.isPending}
        onConfirm={commitDelete}
      >
        حذف
      </ConfirmAction>
      <ConflictDialog
        open={conflict}
        onClose={deleteType.resetAttempt}
        onReload={async () => { deleteType.resetAttempt(); await onReload?.(); }}
        pending={false}
      />
    </>
  );
}

export default function ProductDetails({ productId, onBack }) {
  const permissions = useAuthStore((state) => state.permissions);
  const canManage = can(permissions, "products.manage");
  const query = useProductDetails(productId);
  const categoriesQuery = useProductsScreen({ page: 1, limit: 10 });
  const [editingTypeId, setEditingTypeId] = useState(null);
  const deleteProduct = useDeleteProduct(productId);

  const data = query.data;
  const product = data?.product;
  const types = data?.types || [];
  const sizes = data?.sizes || [];
  const recipeBySize = data?.recipeBySize || {};
  const costBySize = data?.costBySize || {};
  const addons = data?.addons || [];
  const categories = categoriesQuery.data?.filters?.categories || [];

  const commitDeleteProduct = () =>
    new Promise((resolve, reject) => {
      deleteProduct.resetAttempt();
      deleteProduct.mutate(
        {},
        {
          onSuccess: () => { onBack?.(); resolve(); },
          onError: () => reject(),
        },
      );
    });
  const productDeleteConflict = deleteProduct.isError && isConflict(deleteProduct.error);

  return (
    <div className="product-details">
      <button type="button" className="details-back" onClick={onBack}>
        <ArrowRight size={16} />
        رجوع للقائمة
      </button>
      <AsyncState loading={query.isLoading} error={query.error} onRetry={query.refetch} empty={!query.isLoading && !product} emptyText="تعذر تحميل المنتج">
        {product && (
          <>
            <section className="details-card">
              <header className="details-head">
                <ProductThumb imageId={product.imageId} url={product.imageUrl} />
                <div>
                  <h2>{product.name}</h2>
                  <small>الإصدار: {product.version} — {product.statusLabel} — {product.isVisibleInMenu ? "في المنيو" : "مخفي"}</small>
                </div>
                {canManage && (
                  <ConfirmAction
                    title="حذف المنتج"
                    message="سيتم حذف المنتج وكل أنواعه وأحجامه ووصفاته وإضافاته نهائيًا."
                    confirmLabel="حذف"
                    cancelLabel="إلغاء"
                    danger
                    pending={deleteProduct.isPending}
                    onConfirm={commitDeleteProduct}
                  >
                    حذف المنتج
                  </ConfirmAction>
                )}
              </header>
              <BasicEditor key={String(product.id) + String(product.version)} product={product} categories={categories} canManage={canManage} onReload={query.refetch} />
            </section>

            <section className="details-card">
              <h2>الأنواع ({types.length})</h2>
              <TypeAdder productId={String(product.id)} canManage={canManage} onReload={query.refetch} />
              <div className="table-responsive">
                <table className="details-types-table">
                  <thead>
                    <tr>
                      <th>م</th>
                      <th>النوع</th>
                      <th>المكونات (المواد)</th>
                      <th>الأحجام</th>
                      <th>الحالة</th>
                      {canManage && <th>إجراءات</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((type, index) => {
                      const typeSizes = sizes.filter((size) => String(size.typeId) === String(type.id));
                      return [
                        <tr key={type.id} className={editingTypeId === String(type.id) ? "details-editing-row" : ""}>
                          <td data-label="م">{index + 1}</td>
                          <td data-label="النوع"><strong>{type.name}</strong></td>
                          <td data-label="المكونات">
                            {type.allowedMaterials?.length ? (
                              <div className="details-type-materials">
                                {type.allowedMaterials.map((material) => (
                                  <span key={material.id}>{material.name}</span>
                                ))}
                              </div>
                            ) : (
                              <span className="details-empty">—</span>
                            )}
                          </td>
                          <td data-label="الأحجام">{typeSizes.length}</td>
                          <td data-label="الحالة"><span className={`status-badge ${type.isActive ? "active" : "withdrawn"}`}>{type.isActive ? "نشط" : "موقوف"}</span></td>
                          {canManage && (
                            <td data-label="إجراءات">
                              <div className="details-row-actions">
                                <button type="button" className="details-secondary" onClick={() => setEditingTypeId(editingTypeId === String(type.id) ? null : String(type.id))}>
                                  {editingTypeId === String(type.id) ? "إلغاء" : "تعديل"}
                                </button>
                                <TypeDeleteButton productId={String(product.id)} type={type} onReload={query.refetch} />
                              </div>
                            </td>
                          )}
                        </tr>,
                        editingTypeId === String(type.id) && (
                          <TypeRowEditor
                            key={`${type.id}:edit`}
                            productId={String(product.id)}
                            type={type}
                            onReload={query.refetch}
                          />
                        ),
                      ];
                    })}
                    {types.length === 0 && <tr><td colSpan={canManage ? 6 : 5}><span className="details-empty">لا توجد أنواع بعد.</span></td></tr>}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="details-card">
              <h2>الأحجام والوصفات</h2>
              <SizesSection
                productId={String(product.id)}
                types={types}
                sizes={sizes}
                recipeBySize={recipeBySize}
                costBySize={costBySize}
                canManage={canManage}
                onReload={query.refetch}
              />
            </section>

            <section className="details-card">
              <h2>الإضافات ({addons.length})</h2>
              <AddonAdder productId={String(product.id)} canManage={canManage} onReload={query.refetch} />
              <ul className="details-addons">
                {addons.map((addon) => (
                  <AddonEditor key={addon.id} productId={String(product.id)} addon={addon} canManage={canManage} onReload={query.refetch} />
                ))}
                {addons.length === 0 && <li className="details-empty">لا توجد إضافات بعد.</li>}
              </ul>
            </section>
          </>
        )}
      </AsyncState>
      <ConflictDialog
        open={productDeleteConflict}
        onClose={deleteProduct.resetAttempt}
        onReload={async () => { deleteProduct.resetAttempt(); await query.refetch(); }}
        pending={false}
      />
    </div>
  );
}
