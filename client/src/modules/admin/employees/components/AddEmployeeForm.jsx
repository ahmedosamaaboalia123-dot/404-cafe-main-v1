import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import Input from "@/shared/components/Input/Input";
import Select from "@/shared/components/Select/Select";
import Button from "@/shared/components/Button/Button";
import { useAuthStore } from "@/store/authStore";
import { can } from "@/modules/auth/permissions/permission";
import { useCreateEmployee } from "../hooks/employee.mutations";
import { toRoleOptions } from "../adapters/employee.adapter";
import { createEmployeeSchema, firstEmployeeFormError } from "../schemas/employee.schema";

const emptyForm = {
  name: "",
  passwordPlainText: "",
  position: "",
  roleId: "",
  workStart: "08:00",
  workEnd: "16:00",
  graceMinutes: "0",
};

export default function AddEmployeeForm({ roles = [] }) {
  const permissions = useAuthStore((state) => state.permissions);
  const [form, setForm] = useState(emptyForm);
  const [validationError, setValidationError] = useState("");
  const mutation = useCreateEmployee({
    onSuccess: () => {
      setForm(emptyForm);
      setValidationError("");
    },
  });
  const roleOptions = useMemo(
    () => toRoleOptions(Array.isArray(roles) ? roles : []).filter((role) => /^[0-9a-f]{24}$/i.test(role.value)),
    [roles]
  );

  useEffect(() => {
    if (!form.roleId && roleOptions.length) {
      setForm((current) => ({ ...current, roleId: roleOptions[0].value }));
    }
  }, [form.roleId, roleOptions]);

  if (!can(permissions, "employees.create")) return null;

  const set = (name, value) => {
    mutation.resetAttempt();
    setValidationError("");
    setForm((current) => ({ ...current, [name]: value }));
  };

  const submit = (event) => {
    event.preventDefault();
    const parsed = createEmployeeSchema.safeParse({
      name: form.name,
      passwordPlainText: form.passwordPlainText,
      position: form.position,
      roleId: form.roleId,
      workStart: form.workStart,
      workEnd: form.workEnd,
      timezone: "Africa/Cairo",
      graceMinutes: Number(form.graceMinutes),
    });
    if (!parsed.success) {
      setValidationError(firstEmployeeFormError(parsed));
      return;
    }
    mutation.mutate(parsed.data);
  };

  return (
    <section className="employee-form-card" aria-label="إضافة موظف">
      <div className="employee-card-title">
        <h2>إضافة موظف</h2>
      </div>
      <form onSubmit={submit}>
        <div className="employee-form-grid">
          <Input label="اسم الموظف" name="name" required value={form.name} onChange={(event) => set("name", event.target.value)} />
          <Input
            label="كلمة المرور"
            name="passwordPlainText"
            type="password"
            autoComplete="new-password"
            required
            value={form.passwordPlainText}
            onChange={(event) => set("passwordPlainText", event.target.value)}
          />
          <Input label="المسمى الوظيفي" name="position" required value={form.position} onChange={(event) => set("position", event.target.value)} />
          <Select
            label="الدور"
            name="roleId"
            required
            value={form.roleId}
            onChange={(event) => set("roleId", event.target.value)}
            options={roleOptions}
            placeholder={roleOptions.length ? "اختر الدور" : "لا توجد أدوار متاحة"}
          />
          <Input label="بداية العمل (HH:MM)" name="workStart" type="time" required value={form.workStart} onChange={(event) => set("workStart", event.target.value)} />
          <Input label="نهاية العمل (HH:MM)" name="workEnd" type="time" required value={form.workEnd} onChange={(event) => set("workEnd", event.target.value)} />
          <Input
            label="مهلة التأخير (دقيقة)"
            name="graceMinutes"
            type="number"
            min="0"
            max="180"
            value={form.graceMinutes}
            onChange={(event) => set("graceMinutes", event.target.value)}
          />
        </div>
        <p className="employee-hint">المنطقة الزمنية ثابتة: Africa/Cairo</p>
        {(validationError || mutation.isError) && (
          <p className="employee-alert error" role="alert">
            {validationError || mutation.error?.message || "تعذر حفظ الموظف"}
          </p>
        )}
        {mutation.isSuccess && <p className="employee-alert success">تم حفظ الموظف بنجاح</p>}
        {!roleOptions.length && <p className="employee-alert error" role="alert">يجب إنشاء دور واحد على الأقل قبل إضافة موظف.</p>}
        <Button type="submit" loading={mutation.isPending} disabled={!roleOptions.length} icon={Save}>
          حفظ الموظف
        </Button>
      </form>
    </section>
  );
}
