import { useState } from "react";
import { PlusCircle, Trash2 } from "lucide-react";
import { Money } from "@/shared/components";
import SearchSelect from "@/shared/components/SearchSelect/SearchSelect";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useMaterialsScreen } from "@/modules/admin/inventory/hooks/inventory.queries";
import { useCreatePurchaseGroup } from "../hooks/purchase.mutations";
import { createGroupSchema, firstPurchaseFormError } from "../schemas/purchase.schema";
import "./CreateGroupForm.css";

const todayISO = () => new Date().toISOString().slice(0, 10);
const newKey = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const createEmptyLine = () => ({
  key: newKey(),
  materialId: "",
  materialName: "",
  quantityLarge: "",
  largeUnitPrice: "",
  unitHint: "",
  priceHint: null,
});

const unitNameOf = (units, id) =>
  (units || []).find((unit) => String(unit.id) === String(id))?.nameAr || "";

function MaterialLineRow({ line, index, datalistId, disabled, onPatch, onRemove, canRemove }) {
  const debouncedSearch = useDebounce(line.materialName, 500);
  const materialsQuery = useMaterialsScreen({
    page: 1,
    limit: 10,
    search: debouncedSearch || undefined,
  });
  const materials = materialsQuery.data?.materials || [];
  const units = materialsQuery.data?.filters?.units || [];

  const pickMaterial = (option) => {
    const match = materials.find((material) => String(material.id) === option.value);
    if (match) {
      onPatch({
        materialId: String(match.id),
        materialName: match.name,
        unitHint: unitNameOf(units, match.largeUnitId),
        priceHint: match.lastPurchasePrice,
      });
    }
  };

  const quantity = Number(line.quantityLarge);
  const price = Number(line.largeUnitPrice);
  const showHint = Number.isFinite(quantity) && Number.isFinite(price) && quantity > 0 && price > 0;

  return (
    <div className="purchase-line-row">
      <div className="purchase-line-field purchase-line-material">
        <SearchSelect
          id={`${datalistId}-input`}
          label={`المادة ${index + 1}`}
          placeholder="ابحث باسم المادة"
          value={line.materialId}
          search={line.materialName}
          disabled={disabled}
          loading={materialsQuery.isFetching}
          error={materialsQuery.isError}
          onSearch={(name) => onPatch({ materialId: "", materialName: name, unitHint: "", priceHint: null })}
          onSelect={pickMaterial}
          options={materials.map((material) => ({ value: String(material.id), label: material.name,
            description: `${unitNameOf(units, material.largeUnitId)} — آخر سعر: ${material.lastPurchasePrice ?? "—"}` }))}
        />
        {(line.unitHint || line.priceHint != null) && (
          <small className="purchase-line-meta">
            {line.unitHint && <span>الوحدة: {line.unitHint}</span>}
            {line.priceHint != null && (
              <span>
                آخر سعر شراء: <Money value={line.priceHint} />
              </span>
            )}
          </small>
        )}
      </div>
      <div className="purchase-line-field">
        <label htmlFor={`${datalistId}-qty`}>الكمية (كبيرة)</label>
        <input
          id={`${datalistId}-qty`}
          className="purchase-input"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          placeholder="0"
          value={line.quantityLarge}
          disabled={disabled}
          onChange={(event) => onPatch({ quantityLarge: event.target.value })}
        />
      </div>
      <div className="purchase-line-field">
        <label htmlFor={`${datalistId}-price`}>سعر الوحدة الكبيرة</label>
        <input
          id={`${datalistId}-price`}
          className="purchase-input"
          type="number"
          min="0"
          step="any"
          inputMode="decimal"
          placeholder="0"
          value={line.largeUnitPrice}
          disabled={disabled}
          onChange={(event) => onPatch({ largeUnitPrice: event.target.value })}
        />
      </div>
      <div className="purchase-line-side">
        {showHint && (
          <small className="purchase-line-estimate">
            قيمة تقديرية من المدخلات: <Money value={String(quantity * price)} />
          </small>
        )}
        {canRemove && (
          <button
            type="button"
            className="purchase-line-remove"
            aria-label={`حذف البند ${index + 1}`}
            disabled={disabled}
            onClick={onRemove}
          >
            <Trash2 size={17} />
          </button>
        )}
      </div>
    </div>
  );
}

export function GroupLinesEditor({ lines, onLinesChange, idPrefix = "purchase-line", disabled = false }) {
  const patchLine = (key, patch) =>
    onLinesChange(lines.map((item) => (item.key === key ? { ...item, ...patch } : item)));
  const addLine = () => onLinesChange([...lines, createEmptyLine()]);
  const removeLine = (key) => onLinesChange(lines.filter((item) => item.key !== key));

  return (
    <div className="purchase-lines-editor">
      {lines.map((line, index) => (
        <MaterialLineRow
          key={line.key}
          line={line}
          index={index}
          datalistId={`${idPrefix}-${line.key}`}
          disabled={disabled}
          onPatch={(patch) => patchLine(line.key, patch)}
          onRemove={() => removeLine(line.key)}
          canRemove={lines.length > 1}
        />
      ))}
      <button type="button" className="purchase-line-add" disabled={disabled} onClick={addLine}>
        <PlusCircle size={17} />
        <span>إضافة بند</span>
      </button>
    </div>
  );
}

export default function CreateGroupForm({ onCreated }) {
  const [lines, setLines] = useState(() => [createEmptyLine()]);
  const [invoiceDate, setInvoiceDate] = useState(todayISO());
  const [formError, setFormError] = useState("");
  const [created, setCreated] = useState(null);

  const createGroup = useCreatePurchaseGroup({
    onSuccess: (data) => {
      const group = data?.group || data || {};
      setCreated({ id: group.id ? String(group.id) : "", groupNo: group.groupNo || "" });
      setLines([createEmptyLine()]);
      setInvoiceDate(todayISO());
      setFormError("");
    },
  });

  const submit = (event) => {
    event.preventDefault();
    createGroup.resetAttempt();
    setFormError("");
    setCreated(null);
    if (lines.some((item) => !item.materialId)) {
      setFormError("اختر المادة لكل بند من نتائج البحث");
      return;
    }
    const ids = lines.map((item) => item.materialId);
    if (new Set(ids).size !== ids.length) {
      setFormError("المادة مكررة في الفاتورة");
      return;
    }
    const parsed = createGroupSchema.safeParse({
      items: lines.map((item) => ({
        materialId: item.materialId,
        quantityLarge: item.quantityLarge,
        largeUnitPrice: item.largeUnitPrice,
      })),
      ...(invoiceDate ? { invoiceDate } : {}),
    });
    if (!parsed.success) {
      setFormError(firstPurchaseFormError(parsed));
      return;
    }
    createGroup.mutate(parsed.data);
  };

  return (
    <section className="create-group-card" aria-label="إنشاء مجموعة شراء">
      <header className="create-group-header">
        <h2>إنشاء مجموعة شراء</h2>
        <p>أضف بندًا واحدًا على الأقل — كل بند: مادة + كمية + سعر الوحدة الكبيرة</p>
      </header>
      <form onSubmit={submit}>
        <div className="create-group-date">
          <label htmlFor="purchase-invoice-date">تاريخ الفاتورة</label>
          <input
            id="purchase-invoice-date"
            className="purchase-input"
            type="date"
            value={invoiceDate}
            disabled={createGroup.isPending}
            onChange={(event) => setInvoiceDate(event.target.value)}
          />
        </div>
        <GroupLinesEditor lines={lines} onLinesChange={setLines} disabled={createGroup.isPending} />
        {(formError || createGroup.isError) && (
          <p className="purchase-form-error" role="alert">
            {formError || createGroup.error?.message || "تعذر إنشاء مجموعة الشراء"}
          </p>
        )}
        {created && (
          <div className="purchase-form-success" role="status">
            <span>تم إنشاء المجموعة{created.groupNo ? ` رقم ${created.groupNo}` : ""} بنجاح</span>
            <div className="purchase-form-success__actions">
              {created.id && (
                <button type="button" onClick={() => onCreated?.(created.id)}>
                  فتح التفاصيل
                </button>
              )}
              <button type="button" onClick={() => setCreated(null)}>
                إنشاء مجموعة جديدة
              </button>
            </div>
          </div>
        )}
        <div className="create-group-actions">
          <button type="submit" className="purchase-primary-btn" disabled={createGroup.isPending}>
            {createGroup.isPending ? "جاري الحفظ..." : "حفظ مجموعة الشراء"}
          </button>
        </div>
      </form>
    </section>
  );
}
