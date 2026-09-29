import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PlusCircle, Trash2 } from "lucide-react";
import Input from "@/shared/components/Input/Input";
import Select from "@/shared/components/Select/Select";
import Button from "@/shared/components/Button/Button";
import { ConfirmAction, ConflictDialog } from "@/shared/components";
import { isConflict } from "@/api/apiError";
import { queryKeys } from "@/api/queryKeys";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useMaterialDetailsQuery, useMaterialsScreen } from "@/modules/admin/inventory/hooks/inventory.queries";
import { useCreatePurchaseReturn } from "../hooks/return.mutations";
import { createReturnSchema, firstReturnFormError } from "../schemas/return.schema";
import "./CreateReturnForm.css";

const today = () => new Date().toISOString().slice(0, 10);

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("ar-EG");
};

const hasStock = (batch) => Number(batch?.remainingQuantitySmall ?? 0) > 0;

const newLine = (key) => ({
  key,
  materialId: "",
  materialName: "",
  batchId: "",
  expectedBatchVersion: 0,
  quantityLarge: "",
  reason: "",
});

function ReturnLineRow({ line, index, canRemove, onChange, onRemove }) {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const materialsQuery = useMaterialsScreen({ page: 1, limit: 10, search: debouncedSearch || undefined });
  const materials = materialsQuery.data?.materials || [];
  const materialOptions = materials.map((item) => ({ value: String(item.id), label: item.name }));
  if (line.materialId && !materialOptions.some((option) => option.value === line.materialId)) {
    materialOptions.unshift({ value: line.materialId, label: line.materialName || line.materialId });
  }
  const detailsQuery = useMaterialDetailsQuery(line.materialId || undefined);
  const allBatches = detailsQuery.data?.batches?.items || [];
  const batches = allBatches.filter(hasStock);
  const selectedBatch = allBatches.find((batch) => String(batch.id) === String(line.batchId));
  const batchOptions = batches.map((batch) => ({
    value: String(batch.id),
    label: `#${batch.batchNumber || String(batch.id).slice(-6)} — متاح ${batch.remainingQuantitySmall} (صغيرة)`,
  }));

  let hint;
  if (!line.materialId) hint = "اختر المادة لعرض دفعاتها المتاحة.";
  else if (detailsQuery.isLoading) hint = "جاري تحميل الدفعات...";
  else if (detailsQuery.isError) hint = "تعذر تحميل الدفعات.";
  else if (batches.length === 0) hint = "لا توجد دفعات متاحة لهذه المادة.";
  else if (selectedBatch) hint = `الدفعة #${selectedBatch.batchNumber || "—"} — المتاح (صغيرة): ${selectedBatch.remainingQuantitySmall} — الصلاحية: ${formatDate(selectedBatch.expiryOn)}`;
  else hint = "اختر الدفعة — تظهر فقط الدفعات التي بها مخزون.";

  return (
    <fieldset className="return-line">
      <legend className="return-line__head">
        <span>البند {index + 1}</span>
        {canRemove && (
          <button type="button" className="return-line__remove" onClick={onRemove} aria-label={`حذف البند ${index + 1}`}>
            <Trash2 size={16} /> حذف
          </button>
        )}
      </legend>
      <div className="return-line__grid">
        <Input
          label="بحث عن مادة"
          name={`material-search-${line.key}`}
          placeholder="اكتب اسم المادة"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Select
          label="المادة"
          name={`material-${line.key}`}
          value={line.materialId}
          onChange={(event) => {
            const selected = materials.find((item) => String(item.id) === event.target.value);
            onChange({
              materialId: event.target.value,
              materialName: selected ? selected.name : "",
              batchId: "",
              expectedBatchVersion: 0,
            });
          }}
          options={materialOptions}
          placeholder={materialsQuery.isLoading ? "جاري تحميل المواد..." : "اختر المادة"}
          required
        />
        <Select
          label="الدفعة (المتاح فقط)"
          name={`batch-${line.key}`}
          value={line.batchId}
          onChange={(event) => {
            const selected = allBatches.find((batch) => String(batch.id) === event.target.value);
            onChange({ batchId: event.target.value, expectedBatchVersion: Number(selected?.version ?? 0) });
          }}
          options={batchOptions}
          placeholder={detailsQuery.isLoading ? "جاري تحميل الدفعات..." : "اختر الدفعة"}
          required
          disabled={!line.materialId || detailsQuery.isLoading}
        />
        <Input
          label="الكمية (كبيرة)"
          name={`quantity-${line.key}`}
          type="number"
          min="0.000001"
          step="any"
          placeholder="مثال: 2.5"
          required
          value={line.quantityLarge}
          onChange={(event) => onChange({ quantityLarge: event.target.value })}
        />
        <Input
          label="سبب الإرجاع"
          name={`reason-${line.key}`}
          placeholder="3 أحرف على الأقل"
          required
          value={line.reason}
          onChange={(event) => onChange({ reason: event.target.value })}
        />
      </div>
      <p className="return-line__hint">{hint}</p>
      {materialsQuery.isError && <p className="return-form__error" role="alert">تعذر تحميل المواد.</p>}
    </fieldset>
  );
}

export default function CreateReturnForm({ onCreated }) {
  const queryClient = useQueryClient();
  const keySeq = useRef(2);
  const [returnDate, setReturnDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState(() => [newLine("1")]);
  const [validationError, setValidationError] = useState("");
  const mutation = useCreatePurchaseReturn({
    onSuccess: () => {
      resetForm();
      onCreated?.();
    },
  });

  const updateLine = (key, patch) => {
    mutation.resetAttempt();
    setValidationError("");
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));
  };

  const addLine = () => {
    if (lines.length >= 50) return;
    mutation.resetAttempt();
    setValidationError("");
    setLines((current) => [...current, newLine(String(keySeq.current++))]);
  };

  const removeLine = (key) => {
    if (lines.length <= 1) return;
    mutation.resetAttempt();
    setValidationError("");
    setLines((current) => current.filter((line) => line.key !== key));
  };

  const resetForm = () => {
    mutation.resetAttempt();
    setValidationError("");
    setReturnDate(today());
    setNotes("");
    setLines([newLine(String(keySeq.current++))]);
  };

  const buildPayload = () => ({
    returnDate,
    notes: notes.trim() ? notes.trim() : undefined,
    items: lines.map((line) => ({
      batchId: String(line.batchId),
      quantityLarge: String(line.quantityLarge).trim(),
      reason: String(line.reason).trim(),
      expectedBatchVersion: Number(line.expectedBatchVersion ?? 0),
    })),
  });

  const handleConfirm = async () => {
    const incomplete = lines.findIndex(
      (line) => !line.materialId || !line.batchId || !String(line.quantityLarge).trim() || !String(line.reason).trim(),
    );
    if (incomplete >= 0) {
      const message = `أكمل بيانات البند رقم ${incomplete + 1} (المادة والدفعة والكمية والسبب)`;
      setValidationError(message);
      throw new Error(message);
    }
    const parsed = createReturnSchema.safeParse(buildPayload());
    if (!parsed.success) {
      const message = firstReturnFormError(parsed);
      setValidationError(message);
      throw new Error(message);
    }
    setValidationError("");
    await mutation.mutateAsync(parsed.data);
  };

  const conflict = mutation.isError && isConflict(mutation.error);

  return (
    <div className="return-form">
      <div className="return-form__head">
        <h2 className="return-form__title">إنشاء مرتجع مشتريات</h2>
        <p className="return-form__hint">المرتجع نهائي ولا يمكن تعديله. تُحسب القيمة من الدفعات الحالية — لا تُدخل أي أسعار يدويًا.</p>
      </div>
      <div className="return-form__grid">
        <Input
          label="تاريخ المرتجع"
          name="returnDate"
          type="date"
          required
          value={returnDate}
          onChange={(event) => { mutation.resetAttempt(); setValidationError(""); setReturnDate(event.target.value); }}
        />
        <Input
          label="ملاحظات (اختياري)"
          name="notes"
          placeholder="ملاحظات بحد أقصى 1000 حرف"
          value={notes}
          onChange={(event) => { mutation.resetAttempt(); setValidationError(""); setNotes(event.target.value); }}
        />
      </div>
      {lines.map((line, index) => (
        <ReturnLineRow
          key={line.key}
          line={line}
          index={index}
          canRemove={lines.length > 1}
          onChange={(patch) => updateLine(line.key, patch)}
          onRemove={() => removeLine(line.key)}
        />
      ))}
      <div className="return-form__actions">
        <Button type="button" variant="secondary" icon={PlusCircle} onClick={addLine} disabled={lines.length >= 50 || mutation.isPending}>
          إضافة بند
        </Button>
        <ConfirmAction
          title="تأكيد المرتجع"
          message="المرتجع نهائي ولا يمكن تعديله. سيتم خصم الكميات من المخزون بالقيمة المخزنية الحالية للدفعات."
          confirmLabel="تأكيد المرتجع النهائي"
          pending={mutation.isPending}
          onConfirm={handleConfirm}
        >
          تأكيد المرتجع
        </ConfirmAction>
        <Button type="button" variant="secondary" onClick={resetForm} disabled={mutation.isPending}>
          تصفير
        </Button>
      </div>
      {(validationError || (mutation.isError && !conflict)) && (
        <p className="return-form__error" role="alert">{validationError || mutation.error?.message || "تعذر إنشاء المرتجع"}</p>
      )}
      {mutation.isSuccess && <p className="return-form__success">تم إنشاء المرتجع بنجاح.</p>}
      <ConflictDialog
        open={conflict}
        onClose={mutation.resetAttempt}
        onReload={async () => {
          mutation.resetAttempt();
          await queryClient.invalidateQueries({ queryKey: queryKeys.materials.all });
        }}
        pending={false}
      />
    </div>
  );
}
