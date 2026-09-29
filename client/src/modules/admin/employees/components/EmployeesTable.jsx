import { useNavigate } from "react-router-dom";
import { Eye, Pencil, Trash2 } from "lucide-react";
import { ConfirmAction, ConflictDialog } from "@/shared/components";
import { isConflict } from "@/api/apiError";
import { useAuthStore } from "@/store/authStore";
import { can } from "@/modules/auth/permissions/permission";
import { useDeleteEmployee } from "../hooks/employee.mutations";

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ar-EG");
};

function EmployeeRowActions({ employee, onView }) {
  const navigate = useNavigate();
  const canUpdate = can(useAuthStore((s) => s.permissions), "employees.update");
  const currentEmployeeId = useAuthStore((s) => s.employee?.id);
  const isSelf = String(currentEmployeeId ?? "") === String(employee.id);
  const mutation = useDeleteEmployee();
  const conflicted = mutation.isError && isConflict(mutation.error);
  const open = () => {
    const sid = String(employee.id);
    if (typeof onView === "function") onView(sid);
    else navigate(`/admin/employees/${sid}`);
  };
  const handleDelete = () => {
    return mutation.mutateAsync({
      employeeId: String(employee.id),
      expectedVersion: Number(employee.version ?? 0),
    });
  };
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
      <button type="button" className="employee-view" onClick={open}>
        <Eye size={15} />
        فتح
      </button>
      {canUpdate && (
        <button type="button" className="employee-view" style={{ background: "#eef6ff", borderColor: "#cfe2ff", color: "#1a5fb4" }} onClick={open}>
          <Pencil size={15} />
          تعديل
        </button>
      )}
      {canUpdate && !isSelf && (
        <ConfirmAction danger triggerClassName="employee-delete" title="حذف نهائي للموظف" message={`سيتم حذف ${employee.name} نهائيا ولا يمكن التراجع عن ذلك.`} confirmLabel="حذف نهائي" pending={mutation.isPending} onConfirm={handleDelete}>
          <Trash2 size={15} />
          حذف نهائي
        </ConfirmAction>
      )}
      <ConflictDialog open={conflicted} onClose={() => mutation.resetAttempt()} onReload={() => mutation.resetAttempt()} pending={false} />
    </div>
  );
}

export default function EmployeesTable({ employees = [], roles = [], loading = false, isLoading = false, page = 1, onView }) {
  const busy = Boolean(loading || isLoading);
  const rows = Array.isArray(employees) ? employees : [];

  const roleNameOf = (employee) => {
    if (employee?.roleName) return employee.roleName;
    const found = (Array.isArray(roles) ? roles : []).find((role) => String(role.id) === String(employee?.roleId));
    return found?.name || "—";
  };

  return (
    <section className="employee-table-card" aria-label="قائمة الموظفين">
      <div className="employee-card-title">
        <h2>قائمة الموظفين</h2>
        <span>{rows.length}</span>
      </div>
      <div className="employee-table-scroll">
        <table>
          <thead>
            <tr>
              <th>الاسم</th>
              <th>المنصب</th>
              <th>الدور</th>
              <th>الحالة</th>
              <th>آخر دخول</th>
              <th>الإجراء</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((employee, index) => (
              <tr key={String(employee.id)}>
                <td>{employee.name || `موظف ${(page - 1) * 10 + index + 1}`}</td>
                <td>{employee.position || "—"}</td>
                <td>{roleNameOf(employee)}</td>
                <td>
                  <span className={`employee-status employee-status--${String(employee.status || "INACTIVE").toLowerCase()}`}>
                    {employee.statusLabel || (employee.status === "ACTIVE" ? "نشط" : "موقوف")}
                  </span>
                </td>
                <td>{formatDateTime(employee.lastLoginAt)}</td>
                <td>
                  <EmployeeRowActions employee={employee} onView={onView} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {busy && <p className="employee-empty">جاري تحميل الموظفين...</p>}
      {!busy && rows.length === 0 && <p className="employee-empty">لا يوجد موظفون</p>}
    </section>
  );
}
