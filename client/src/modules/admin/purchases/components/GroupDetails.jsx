import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { AsyncState, ConfirmAction, ConflictDialog, Money, PrintDocument } from "@/shared/components";
import { useAuthStore } from "@/store/authStore";
import { can } from "@/modules/auth/permissions/permission";
import { isConflict } from "@/api/apiError";
import { usePurchaseGroupDetails } from "../hooks/purchase.queries";
import {
  useDeletePurchaseGroup,
  useRegisterManyPurchaseItems,
  useRegisterPurchaseItem,
  useSplitPurchaseGroup,
  useUpdatePurchaseGroup,
} from "../hooks/purchase.mutations";
import { purchasesApi } from "../api/purchases.api";
import { toPurchasePrintData } from "../adapters/purchase.adapter";
import {
  deleteGroupSchema,
  firstPurchaseFormError,
  registerItemSchema,
  registerManySchema,
  splitGroupSchema,
  updateGroupSchema,
} from "../schemas/purchase.schema";
import { GroupLinesEditor } from "./CreateGroupForm";
import "./GroupDetails.css";

const todayISO = () => new Date().toISOString().slice(0, 10);
const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
  return date.toLocaleDateString("ar-EG");
};

const batchText = (item) => {
  if (item.batchId) return `دفعة ${String(item.batchId).slice(-6)}`;
  if (item.movementId) return `حركة ${String(item.movementId).slice(-6)}`;
  return "—";
};

function renderPurchaseSheet(data = {}) {
  const rows = data.items || [];
  return (
    <div className="purchase-print-sheet" dir="rtl">
      <h3>{data.number ? `مستند ${data.number}` : "مستند مشتريات"}</h3>
      <div className="purchase-print-meta">
        {data.supplier?.name && <span>المورد: {data.supplier.name}</span>}
        {data.statusLabel && <span>الحالة: {data.statusLabel}</span>}
      </div>
      <table>
        <thead>
          <tr>
            <th>المادة</th>
            <th>الكمية (كبيرة)</th>
            <th>سعر الوحدة</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan="4">لا توجد بنود</td>
            </tr>
          )}
          {rows.map((item) => (
            <tr key={item.id}>
              <td>{item.material?.name || "—"}</td>
              <td>{item.quantityLarge}</td>
              <td>
                <Money value={item.largeUnitPrice} />
              </td>
              <td>
                <Money value={item.lineTotal} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {data.totals && (
        <p className="purchase-print-total">
          الإجمالي: <Money value={data.totals.subtotal} />
        </p>
      )}
    </div>
  );
}

function RegisterCells({ item, draft, disabled, onDraftChange }) {
  return (
    <>
      <td>
        <input
          className="purchase-input purchase-input--sm"
          type="date"
          aria-label={`تاريخ الاستلام للبند ${item.material?.name || ""}`}
          value={draft.receivedOn}
          disabled={disabled}
          onChange={(event) => onDraftChange({ receivedOn: event.target.value })}
        />
      </td>
      <td>
        <input
          className="purchase-input purchase-input--sm"
          type="date"
          aria-label={`تاريخ الصلاحية للبند ${item.material?.name || ""}`}
          required
          placeholder="مطلوب"
          value={draft.expiryOn}
          disabled={disabled}
          onChange={(event) => onDraftChange({ expiryOn: event.target.value })}
        />
      </td>
    </>
  );
}

export default function GroupDetails({ groupId, onBack }) {
  const permissions = useAuthStore((state) => state.permissions);
  const canRegister = can(permissions, "purchases.register");
  const canManage = can(permissions, "purchases.manage");

  const details = usePurchaseGroupDetails(groupId);
  const group = details.data?.group || null;
  const items = details.data?.items || [];
  const invoices = details.data?.supplierInvoices || [];

  const [drafts, setDrafts] = useState({});
  const [registerError, setRegisterError] = useState("");
  const [editing, setEditing] = useState(false);
  const [editLines, setEditLines] = useState([]);
  const [editDate, setEditDate] = useState("");
  const [editError, setEditError] = useState("");

  const refetchDetails = () => details.refetch();
  const draftOf = (item) => drafts[item.id] || { receivedOn: item.receivedOn || todayISO(), expiryOn: item.expiryOn || "" };
  const setDraft = (itemId, patch) =>
    setDrafts((current) => ({ ...current, [itemId]: { ...(current[itemId] || draftOf(items.find((item) => item.id === itemId) || { id: itemId })), ...patch } }));

  const registerOne = useRegisterPurchaseItem(groupId, { onSuccess: refetchDetails });
  const registerMany = useRegisterManyPurchaseItems(groupId, { onSuccess: refetchDetails });
  const split = useSplitPurchaseGroup(groupId, { onSuccess: refetchDetails });
  const update = useUpdatePurchaseGroup(groupId, {
    onSuccess: () => {
      setEditing(false);
      refetchDetails();
    },
  });
  const remove = useDeletePurchaseGroup(groupId, {
    onSuccess: () => {
      onBack?.();
    },
  });

  const pendingItems = items.filter((item) => item.status === "PENDING");
  const hasRegisteredItems = items.some((item) => item.status === "REGISTERED");
  const canSplit = group && (group.status === "DRAFT" || group.status === "SPLIT");
  const canEdit = group && (group.status === "DRAFT" || group.status === "SPLIT") && !hasRegisteredItems;
  const canDelete = group && group.status === "DRAFT";

  const handleRegisterOne = async (item) => {
    const draft = draftOf(item);
    setRegisterError("");
    const parsed = registerItemSchema.safeParse({
      receivedOn: draft.receivedOn,
      expiryOn: draft.expiryOn,
      expectedVersion: item.version,
    });
    if (!parsed.success) {
      setRegisterError(firstPurchaseFormError(parsed));
      return;
    }
    await registerOne.mutateAsync({
      purchaseItemId: String(item.id),
      receivedOn: parsed.data.receivedOn,
      expiryOn: parsed.data.expiryOn ?? null,
      expectedVersion: item.version,
    });
  };

  const handleRegisterAll = async () => {
    setRegisterError("");
    if (!group || pendingItems.length === 0) return;
    const parsed = registerManySchema.safeParse({
      expectedVersion: group.version,
      items: pendingItems.map((item) => {
        const draft = draftOf(item);
        return {
          purchaseItemId: String(item.id),
          receivedOn: draft.receivedOn,
          expiryOn: draft.expiryOn,
          expectedItemVersion: item.version,
        };
      }),
    });
    if (!parsed.success) {
      setRegisterError(firstPurchaseFormError(parsed));
      return;
    }
    await registerMany.mutateAsync(parsed.data);
  };

  const handleSplit = () => {
    if (!group) return Promise.resolve();
    const parsed = splitGroupSchema.safeParse({ expectedVersion: group.version });
    if (!parsed.success) return Promise.resolve();
    return split.mutateAsync(parsed.data);
  };

  const startEditing = () => {
    setEditError("");
    update.resetAttempt();
    setEditDate(group?.invoiceDate ? String(group.invoiceDate).slice(0, 10) : "");
    setEditLines(
      items.map((item) => ({
        key: String(item.id),
        materialId: item.material?.id || item.materialId || "",
        materialName: item.material?.name || "",
        quantityLarge: item.quantityLarge ?? "",
        largeUnitPrice: item.largeUnitPrice ?? "",
        unitHint: item.unit?.name || "",
        priceHint: null,
      })),
    );
    setEditing(true);
  };

  const handleUpdate = (event) => {
    event.preventDefault();
    if (!group) return;
    update.resetAttempt();
    setEditError("");
    const ids = editLines.map((item) => item.materialId);
    if (editLines.some((item) => !item.materialId)) {
      setEditError("اختر المادة لكل بند من نتائج البحث");
      return;
    }
    if (new Set(ids).size !== ids.length) {
      setEditError("المادة مكررة في الفاتورة");
      return;
    }
    const parsed = updateGroupSchema.safeParse({
      items: editLines.map((item) => ({
        materialId: item.materialId,
        quantityLarge: item.quantityLarge,
        largeUnitPrice: item.largeUnitPrice,
      })),
      ...(editDate ? { invoiceDate: editDate } : {}),
      expectedVersion: group.version,
    });
    if (!parsed.success) {
      setEditError(firstPurchaseFormError(parsed));
      return;
    }
    update.mutate(parsed.data);
  };

  const handleDelete = () => {
    if (!group) return Promise.resolve();
    const parsed = deleteGroupSchema.safeParse({ expectedVersion: group.version });
    if (!parsed.success) return Promise.resolve();
    return remove.mutateAsync(parsed.data);
  };

  return (
    <div className="purchase-details">
      <button type="button" className="purchase-back-btn" onClick={() => onBack?.()}>
        <ArrowRight size={17} />
        <span>رجوع للمجموعات</span>
      </button>
      <AsyncState
        loading={details.isLoading}
        error={details.error}
        onRetry={refetchDetails}
        empty={!details.isLoading && !group}
        emptyText="تعذر تحميل تفاصيل المجموعة"
      >
        {group && (
          <>
            <section className="purchase-details__card" aria-label="بيانات المجموعة">
              <header>
                <h2>مجموعة {group.groupNo || "—"}</h2>
                <span className={`purchase-status purchase-status--${group.status}`}>{group.statusLabel}</span>
              </header>
              <dl className="purchase-details__meta">
                <div>
                  <dt>تاريخ الفاتورة</dt>
                  <dd>{formatDate(group.invoiceDate)}</dd>
                </div>
                <div>
                  <dt>البنود (مسجل / كلي)</dt>
                  <dd>
                    {group.registeredCount} / {group.itemCount}
                  </dd>
                </div>
                <div>
                  <dt>الإجمالي</dt>
                  <dd>
                    <Money value={details.data?.totals?.subtotal ?? group.subtotal} />
                  </dd>
                </div>
              </dl>
              <div className="purchase-details__print">
                <PrintDocument
                  title={`طباعة مجموعة ${group.groupNo || ""}`}
                  buttonLabel="طباعة المجموعة"
                  loadPrintData={async () => toPurchasePrintData(await purchasesApi.groupPrintData(group.id))}
                  render={renderPurchaseSheet}
                />
              </div>
            </section>

            <section className="purchase-details__card" aria-label="بنود المجموعة">
              <header>
                <h2>البنود</h2>
                {canRegister && pendingItems.length > 0 && (
                  <button
                    type="button"
                    className="purchase-primary-btn purchase-primary-btn--sm"
                    disabled={registerMany.isPending || registerOne.isPending}
                    onClick={handleRegisterAll}
                  >
                    {registerMany.isPending ? "جاري التسجيل..." : "تسجيل كل البنود المعلقة"}
                  </button>
                )}
              </header>
              {(registerError || (registerOne.isError && !isConflict(registerOne.error)) || (registerMany.isError && !isConflict(registerMany.error))) && (
                <p className="purchase-form-error" role="alert">
                  {registerError || registerOne.error?.message || registerMany.error?.message}
                </p>
              )}
              <div className="table-responsive">
                <table className="purchase-details__table">
                  <thead>
                    <tr>
                      <th>المادة</th>
                      <th>الكمية (كبيرة)</th>
                      <th>سعر الوحدة</th>
                      <th>الإجمالي</th>
                      <th>الحالة</th>
                      <th>تاريخ الاستلام</th>
                      <th>تاريخ الصلاحية</th>
                      <th>الدفعة / التسجيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) =>
                      item.status === "PENDING" ? (
                        <tr key={item.id}>
                          <td>{item.material?.name || "—"}</td>
                          <td>{item.quantityLarge}</td>
                          <td>
                            <Money value={item.largeUnitPrice} />
                          </td>
                          <td>
                            <Money value={item.lineTotal} />
                          </td>
                          <td>
                            <span className="purchase-item-status purchase-item-status--pending">
                              {item.statusLabel}
                            </span>
                          </td>
                          <RegisterCells
                            item={item}
                            draft={draftOf(item)}
                            disabled={registerOne.isPending || registerMany.isPending}
                            onDraftChange={(patch) => setDraft(item.id, patch)}
                          />
                          <td>
                            {canRegister ? (
                              <button
                                type="button"
                                className="purchase-register-btn"
                                disabled={registerOne.isPending || registerMany.isPending}
                                onClick={() => handleRegisterOne(item)}
                              >
                                تسجيل
                              </button>
                            ) : (
                              <span>—</span>
                            )}
                          </td>
                        </tr>
                      ) : (
                        <tr key={item.id}>
                          <td>{item.material?.name || "—"}</td>
                          <td>{item.quantityLarge}</td>
                          <td>
                            <Money value={item.largeUnitPrice} />
                          </td>
                          <td>
                            <Money value={item.lineTotal} />
                          </td>
                          <td>
                            <span className="purchase-item-status purchase-item-status--registered">
                              {item.statusLabel}
                            </span>
                          </td>
                          <td>{formatDate(item.receivedOn)}</td>
                          <td>{formatDate(item.expiryOn)}</td>
                          <td>{batchText(item)}</td>
                        </tr>
                      ),
                    )}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan="8">لا توجد بنود في هذه المجموعة</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="purchase-details__card" aria-label="فواتير الموردين">
              <header>
                <h2>فواتير الموردين</h2>
              </header>
              {invoices.length === 0 && <p className="purchase-details__empty">لا توجد فواتير موردين بعد التقسيم.</p>}
              {invoices.map((invoice) => (
                <article key={invoice.id} className="purchase-invoice-row">
                  <div className="purchase-invoice-row__info">
                    <strong>{invoice.invoiceNo || "—"}</strong>
                    <span>المورد: {invoice.supplier?.name || "—"}</span>
                    <span>
                      البنود: {invoice.registeredCount} / {invoice.itemCount}
                    </span>
                    <span>
                      الإجمالي: <Money value={invoice.subtotal} />
                    </span>
                  </div>
                  <PrintDocument
                    title={`طباعة فاتورة ${invoice.invoiceNo || ""}`}
                    buttonLabel="طباعة الفاتورة"
                    loadPrintData={async () =>
                      toPurchasePrintData(await purchasesApi.invoicePrintData(invoice.id))
                    }
                    render={renderPurchaseSheet}
                  />
                </article>
              ))}
            </section>

            {canManage && (
              <section className="purchase-details__card" aria-label="إجراءات المجموعة">
                <header>
                  <h2>إجراءات المجموعة</h2>
                </header>
                <div className="purchase-details__actions">
                  {canSplit && (
                    <ConfirmAction
                      title="تقسيم المجموعة حسب المورد"
                      message="سيتم تقسيم بنود المجموعة إلى فواتير موردين مستقلة."
                      confirmLabel="تقسيم"
                      pending={split.isPending}
                      onConfirm={handleSplit}
                    >
                      تقسيم حسب المورد
                    </ConfirmAction>
                  )}
                  {canEdit && !editing && (
                    <button type="button" className="purchase-secondary-btn" onClick={startEditing}>
                      تعديل البنود
                    </button>
                  )}
                  {canDelete && (
                    <ConfirmAction
                      danger
                      title="حذف المجموعة"
                      message={`سيتم حذف المجموعة ${group.groupNo || ""} نهائيًا. لا يمكن حذف إلا مجموعة بحالة مسودة.`}
                      confirmLabel="حذف"
                      pending={remove.isPending}
                      onConfirm={handleDelete}
                    >
                      حذف المجموعة
                    </ConfirmAction>
                  )}
                </div>
                {((split.isError && !isConflict(split.error)) || (remove.isError && !isConflict(remove.error))) && (
                  <p className="purchase-form-error" role="alert">
                    {split.error?.message || remove.error?.message}
                  </p>
                )}
                {editing && canEdit && (
                  <form className="purchase-details__edit" onSubmit={handleUpdate}>
                    <div className="create-group-date">
                      <label htmlFor="purchase-edit-invoice-date">تاريخ الفاتورة</label>
                      <input
                        id="purchase-edit-invoice-date"
                        className="purchase-input"
                        type="date"
                        value={editDate}
                        disabled={update.isPending}
                        onChange={(event) => setEditDate(event.target.value)}
                      />
                    </div>
                    <GroupLinesEditor
                      lines={editLines}
                      onLinesChange={setEditLines}
                      idPrefix={`purchase-edit-${group.id}`}
                      disabled={update.isPending}
                    />
                    {(editError || (update.isError && !isConflict(update.error))) && (
                      <p className="purchase-form-error" role="alert">
                        {editError || update.error?.message}
                      </p>
                    )}
                    <div className="purchase-details__edit-actions">
                      <button
                        type="button"
                        className="purchase-secondary-btn"
                        disabled={update.isPending}
                        onClick={() => {
                          update.resetAttempt();
                          setEditing(false);
                          setEditError("");
                        }}
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="purchase-primary-btn purchase-primary-btn--sm"
                        disabled={update.isPending}
                      >
                        {update.isPending ? "جاري الحفظ..." : "حفظ التعديلات"}
                      </button>
                    </div>
                  </form>
                )}
              </section>
            )}
          </>
        )}
      </AsyncState>

      <ConflictDialog
        open={registerOne.isError && isConflict(registerOne.error)}
        onClose={registerOne.resetAttempt}
        onReload={async () => {
          registerOne.resetAttempt();
          await refetchDetails();
        }}
        pending={details.isFetching}
      />
      <ConflictDialog
        open={registerMany.isError && isConflict(registerMany.error)}
        onClose={registerMany.resetAttempt}
        onReload={async () => {
          registerMany.resetAttempt();
          await refetchDetails();
        }}
        pending={details.isFetching}
      />
      <ConflictDialog
        open={split.isError && isConflict(split.error)}
        onClose={split.resetAttempt}
        onReload={async () => {
          split.resetAttempt();
          await refetchDetails();
        }}
        pending={details.isFetching}
      />
      <ConflictDialog
        open={update.isError && isConflict(update.error)}
        onClose={update.resetAttempt}
        onReload={async () => {
          update.resetAttempt();
          await refetchDetails();
        }}
        pending={details.isFetching}
      />
      <ConflictDialog
        open={remove.isError && isConflict(remove.error)}
        onClose={remove.resetAttempt}
        onReload={async () => {
          remove.resetAttempt();
          await refetchDetails();
        }}
        pending={details.isFetching}
      />
    </div>
  );
}
