import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { can } from "@/modules/auth/permissions/permission";
import { isConflict } from "@/api/apiError";
import { AsyncState, ConfirmAction, ConflictDialog } from "@/shared/components";
import { useProductsScreen } from "../hooks/product.queries";
import { useCreateCategory, useUpdateCategory } from "../hooks/product.mutations";
import { categoryFormSchema, categoryStatusSchema, firstProductFormError } from "../schemas/product.schema";
import "./CategoryManager.css";

function CategoryRow({ category, index, canManage, onChanged }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(category.name || "");
  const [description, setDescription] = useState(category.description || "");
  const [sortOrder, setSortOrder] = useState(String(category.sortOrder ?? 0));
  const [formError, setFormError] = useState("");
  const update = useUpdateCategory(category.id);

  const resetDraft = () => {
    setName(category.name || "");
    setDescription(category.description || "");
    setSortOrder(String(category.sortOrder ?? 0));
    setFormError("");
    update.resetAttempt();
  };

  const submitRename = (event) => {
    event.preventDefault();
    update.resetAttempt();
    setFormError("");
    const parsed = categoryStatusSchema.safeParse({
      name: name.trim(),
      description: description.trim() ? description.trim() : undefined,
      sortOrder: sortOrder === "" ? undefined : Number(sortOrder),
      expectedVersion: Number(category.version ?? 0),
    });
    if (!parsed.success) {
      setFormError(firstProductFormError(parsed));
      return;
    }
    update.mutate(parsed.data, {
      onSuccess: () => {
        setEditing(false);
        onChanged?.();
      },
    });
  };

  const toggleActive = (nextActive) =>
    update.mutateAsync({
      isActive: nextActive,
      expectedVersion: Number(category.version ?? 0),
    }).then(() => onChanged?.());

  const conflict = update.isError && isConflict(update.error);

  return (
    <>
      <tr className="category-tr">
        <td data-label="م">{Number(index) + 1}</td>
        <td data-label="الاسم"><strong>{category.name}</strong></td>
        <td data-label="الوصف">{category.description || "—"}</td>
        <td data-label="الترتيب">{category.sortOrder ?? 0}</td>
        <td data-label="الحالة"><span className={`status-badge ${category.isActive ? "active" : "withdrawn"}`}>{category.isActive ? "نشط" : "موقوف"}</span></td>
        <td data-label="الإصدار">{category.version ?? 0}</td>
        <td data-label="الإجراءات" className="category-actions-cell">
          {canManage && (
            <div className="category-row__actions">
              <button type="button" className="category-btn" onClick={() => (editing ? (setEditing(false), resetDraft()) : setEditing(true))}>
                {editing ? "إلغاء" : "تعديل"}
              </button>
              {category.isActive ? (
                <ConfirmAction
                  danger
                  pending={update.isPending}
                  title="إيقاف القسم"
                  message={`سيتم إيقاف القسم «${category.name}».`}
                  confirmLabel="إيقاف"
                  onConfirm={() => toggleActive(false)}
                >
                  إيقاف
                </ConfirmAction>
              ) : (
                <button type="button" className="category-btn category-btn--primary" disabled={update.isPending} onClick={() => toggleActive(true)}>
                  تفعيل
                </button>
              )}
            </div>
          )}
        </td>
      </tr>
      {editing && canManage && (
        <tr className="category-edit-row">
          <td colSpan="7">
            <form className="category-edit" onSubmit={submitRename}>
              <label>
                اسم القسم
                <input value={name} disabled={update.isPending} onChange={(event) => setName(event.target.value)} />
              </label>
              <label>
                الوصف (اختياري)
                <input value={description} disabled={update.isPending} onChange={(event) => setDescription(event.target.value)} />
              </label>
              <label>
                الترتيب
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={sortOrder}
                  disabled={update.isPending}
                  onChange={(event) => setSortOrder(event.target.value)}
                />
              </label>
              <button type="submit" className="category-btn category-btn--primary" disabled={update.isPending}>
                {update.isPending ? "جاري الحفظ..." : "حفظ"}
              </button>
              {(formError || (update.isError && !conflict)) && (
                <p className="category-error" role="alert">
                  {formError || update.error?.message || "تعذر حفظ القسم"}
                </p>
              )}
            </form>
          </td>
        </tr>
      )}
      {update.isError && !conflict && !editing && (
        <tr className="category-error-row">
          <td colSpan="7"><p className="category-error" role="alert">{update.error?.message || "تعذر تحديث القسم"}</p></td>
        </tr>
      )}
      <ConflictDialog
        open={conflict}
        onClose={update.resetAttempt}
        onReload={async () => {
          update.resetAttempt();
          resetDraft();
          await onChanged?.();
        }}
        pending={false}
      />
    </>
  );
}

export default function CategoryManager() {
  const permissions = useAuthStore((state) => state.permissions);
  const canManage = can(permissions, "products.manage");
  const screen = useProductsScreen({ page: 1, limit: 10 });
  const create = useCreateCategory();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [formError, setFormError] = useState("");

  const categories = screen.data?.filters?.categories || [];

  const submitCreate = (event) => {
    event.preventDefault();
    create.resetAttempt();
    setFormError("");
    const parsed = categoryFormSchema.safeParse({
      name: name.trim(),
      description: description.trim() ? description.trim() : undefined,
      sortOrder: sortOrder === "" ? 0 : Number(sortOrder),
    });
    if (!parsed.success) {
      setFormError(firstProductFormError(parsed));
      return;
    }
    create.mutate(parsed.data, {
      onSuccess: async () => {
        setName("");
        setDescription("");
        setSortOrder("0");
        await screen.refetch();
      },
    });
  };

  return (
    <div className="category-manager">
      {canManage && (
        <section className="category-card">
          <h2>إضافة قسم جديد</h2>
          <form className="category-create" onSubmit={submitCreate}>
            <label>
              اسم القسم
              <input
                placeholder="مثال: مشروبات ساخنة"
                value={name}
                disabled={create.isPending}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label>
              الوصف (اختياري)
              <input
                placeholder="وصف مختصر"
                value={description}
                disabled={create.isPending}
                onChange={(event) => setDescription(event.target.value)}
              />
            </label>
            <label>
              الترتيب
              <input
                type="number"
                min="0"
                step="1"
                value={sortOrder}
                disabled={create.isPending}
                onChange={(event) => setSortOrder(event.target.value)}
              />
            </label>
            <button type="submit" className="category-btn category-btn--primary" disabled={create.isPending}>
              {create.isPending ? "جاري الحفظ..." : "حفظ القسم"}
            </button>
          </form>
          {(formError || create.isError) && (
            <p className="category-error" role="alert">
              {formError || create.error?.message || "تعذر إنشاء القسم"}
            </p>
          )}
        </section>
      )}

      <section className="category-card">
        <h2>الأقسام ({categories.length})</h2>
        <AsyncState
          loading={screen.isLoading}
          error={screen.error}
          onRetry={screen.refetch}
          empty={!screen.isLoading && categories.length === 0}
          emptyText="لا توجد أقسام بعد"
        >
          <div className="table-responsive">
            <table className="category-table">
              <thead>
                <tr>
                  <th>م</th>
                  <th>الاسم</th>
                  <th>الوصف</th>
                  <th>الترتيب</th>
                  <th>الحالة</th>
                  <th>الإصدار</th>
                  <th>الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category, index) => (
                  <CategoryRow key={category.id} index={index} category={category} canManage={canManage} onChanged={screen.refetch} />
                ))}
              </tbody>
            </table>
          </div>
        </AsyncState>
      </section>
    </div>
  );
}
