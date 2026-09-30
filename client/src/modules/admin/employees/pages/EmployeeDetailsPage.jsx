import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, KeyRound, Laptop, Pencil, ShieldCheck, Trash2 } from "lucide-react";
import PageHeader from "@/shared/components/PageHeader/PageHeader";
import Button from "@/shared/components/Button/Button";
import Input from "@/shared/components/Input/Input";
import Select from "@/shared/components/Select/Select";
import { AsyncState, ConfirmAction, ConflictDialog, ServerPagination } from "@/shared/components";
import { isConflict } from "@/api/apiError";
import { useAuthStore } from "@/store/authStore";
import { can } from "@/modules/auth/permissions/permission";
import { adminNavigation } from "@/modules/auth/permissions/adminNavigation";
import { isAdminRole } from "@/modules/auth/permissions/role";
import { useEmployeeDetails, useEmployeeDevices, usePermissionsCatalog, useRoles } from "../hooks/employee.queries";
import { useApproveDevice, useBlockDevice, useRevokeDevice, useReplacePermissionMatrix, useUpdateEmployee, useDeleteEmployee } from "../hooks/employee.mutations";
import { toRoleOptions } from "../adapters/employee.adapter";
import {
  deviceDecisionSchema,
  firstEmployeeFormError,
  permissionMatrixSchema,
  updateEmployeeSchema,
} from "../schemas/employee.schema";
import "./EmployeeDetailsPage.css";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("ar-EG");
};

const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("ar-EG");
};

const formatTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
};

const asItems = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  return [];
};

function EmployeeDeviceRow({ device, canDecide }) {
  const [formError, setFormError] = useState("");
  const approve = useApproveDevice();
  const block = useBlockDevice();
  const revoke = useRevokeDevice();
  const pending = approve.isPending || block.isPending || revoke.isPending;
  const conflicted = (approve.isError && isConflict(approve.error)) || (block.isError && isConflict(block.error)) || (revoke.isError && isConflict(revoke.error));
  const reset = () => {
    approve.resetAttempt();
    block.resetAttempt();
    revoke.resetAttempt();
  };

  const basePayload = () => {
    const parsed = deviceDecisionSchema.safeParse({
      expectedVersion: Number(device.version ?? 0),
    });
    if (!parsed.success) {
      setFormError(firstEmployeeFormError(parsed));
      return null;
    }
    setFormError("");
    return parsed.data;
  };

  const runApprove = () => {
    const body = basePayload();
    if (!body) return;
    reset();
    approve.mutate({ deviceId: String(device.id), ...body });
  };
  const runBlock = () => {
    const body = basePayload();
    if (!body) return;
    reset();
    block.mutate({ deviceId: String(device.id), ...body, reason: "قرار إداري" });
  };
  const runRevoke = () => {
    const body = basePayload();
    if (!body) return;
    reset();
    revoke.mutate({ deviceId: String(device.id), ...body, reason: "قرار إداري" });
  };

  return (
    <tr>
      <td>{device.name || "جهاز غير مسمى"}</td>
      <td>{device.browser || "—"}</td>
      <td>{device.os || "—"}</td>
      <td>{device.attemptCount ?? "—"}</td>
      <td>
        <span className={`device-status device-status--${String(device.status || "PENDING").toLowerCase()}`}>{device.statusLabel || device.status}</span>
      </td>
      <td>{formatDateTime(device.lastSeenAt || device.lastLoginAt || device.firstSeenAt)}</td>
      <td>
        {canDecide ? (
          <div className="device-actions device-actions--compact">
            {String(device.status) !== "APPROVED" ? (
              <button type="button" className="device-decision" disabled={pending} onClick={runApprove}>
                اعتماد
              </button>
            ) : (
              <button type="button" className="device-decision" disabled={pending} onClick={runRevoke}>
                إلغاء الاعتماد
              </button>
            )}
            {String(device.status) !== "BLOCKED" && (
              <button type="button" className="device-decision device-decision--danger" disabled={pending} onClick={runBlock}>
                حظر
              </button>
            )}
          </div>
        ) : (
          <span>—</span>
        )}
        {(formError || approve.isError || block.isError || revoke.isError) && !conflicted && (
          <small className="row-error" role="alert">
            {formError || approve.error?.message || block.error?.message || revoke.error?.message}
          </small>
        )}
        <ConflictDialog open={conflicted} onClose={reset} onReload={reset} pending={false} />
      </td>
    </tr>
  );
}

function BasicInfoSection({ employee, roles, canUpdate, onSaved }) {
  const [form, setForm] = useState({ name: "", position: "", roleId: "", passwordPlainText: "", workStart: "08:00", workEnd: "16:00", graceMinutes: "0" });
  const [formError, setFormError] = useState("");
  const mutation = useUpdateEmployee(String(employee.id), { onSuccess: () => { setForm((current) => ({ ...current, passwordPlainText: "" })); setFormError(""); onSaved?.(); } });
  const conflicted = mutation.isError && isConflict(mutation.error);

  useEffect(() => {
    setForm({
      name: employee.name || "",
      position: employee.position || "",
      roleId: employee.roleId ? String(employee.roleId) : "",
      passwordPlainText: "",
      workStart: employee.schedule?.workStart || "08:00",
      workEnd: employee.schedule?.workEnd || "16:00",
      graceMinutes: String(employee.schedule?.graceMinutes ?? 0),
    });
  }, [employee]);

  if (!canUpdate) {
    return (
      <section className="employee-detail-card" aria-label="البيانات الأساسية">
        <h2>البيانات الأساسية</h2>
        <dl className="employee-readonly">
          <div><dt>الاسم</dt><dd>{employee.name || "—"}</dd></div>
          <div><dt>المنصب</dt><dd>{employee.position || "—"}</dd></div>
          <div><dt>الحالة</dt><dd>{employee.statusLabel || employee.status}</dd></div>
          <div><dt>الوردية</dt><dd>{employee.schedule ? `${employee.schedule.workStart || "—"} – ${employee.schedule.workEnd || "—"}` : "—"}</dd></div>
        </dl>
      </section>
    );
  }

  const set = (name, value) => {
    mutation.resetAttempt();
    setFormError("");
    setForm((current) => ({ ...current, [name]: value }));
  };

  const save = () => {
    const parsed = updateEmployeeSchema.safeParse({
      name: form.name,
      position: form.position,
      roleId: form.roleId || undefined,
      ...(form.passwordPlainText ? { passwordPlainText: form.passwordPlainText } : {}),
      schedule: {
        workStart: form.workStart,
        workEnd: form.workEnd,
        crossesMidnight: false,
        timezone: "Africa/Cairo",
        graceMinutes: Number(form.graceMinutes),
      },
      expectedVersion: Number(employee.version ?? 0),
    });
    if (!parsed.success) {
      setFormError(firstEmployeeFormError(parsed));
      return Promise.reject(new Error(firstEmployeeFormError(parsed)));
    }
    setFormError("");
    return mutation.mutateAsync(parsed.data);
  };

  return (
    <section className="employee-detail-card" aria-label="البيانات الأساسية">
      <h2>البيانات الأساسية</h2>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save().catch(() => {});
        }}
      >
        <div className="employee-detail-grid">
          <Input label="الاسم" name="name" required value={form.name} onChange={(event) => set("name", event.target.value)} />
          <Input label="المنصب" name="position" required value={form.position} onChange={(event) => set("position", event.target.value)} />
          <Input label="كلمة مرور جديدة" name="passwordPlainText" type="password" autoComplete="new-password" placeholder="اتركها فارغة بدون تغيير" value={form.passwordPlainText} onChange={(event) => set("passwordPlainText", event.target.value)} />
          <Select label="الدور" name="roleId" value={form.roleId} onChange={(event) => set("roleId", event.target.value)} options={toRoleOptions(roles)} placeholder="بدون تغيير" />
          <Input label="بداية العمل (HH:MM)" name="workStart" type="time" required value={form.workStart} onChange={(event) => set("workStart", event.target.value)} />
          <Input label="نهاية العمل (HH:MM)" name="workEnd" type="time" required value={form.workEnd} onChange={(event) => set("workEnd", event.target.value)} />
          <Input label="مهلة التأخير (دقيقة)" name="graceMinutes" type="number" min="0" max="180" value={form.graceMinutes} onChange={(event) => set("graceMinutes", event.target.value)} />
        </div>
        {(formError || mutation.isError) && !conflicted && (
          <p className="employee-alert error" role="alert">
            {formError || mutation.error?.message}
          </p>
        )}
        {mutation.isSuccess && <p className="employee-alert success">تم حفظ بيانات الموظف</p>}
        <Button type="submit" loading={mutation.isPending}>
          حفظ البيانات
        </Button>
      </form>
      <ConflictDialog open={conflicted} onClose={() => mutation.resetAttempt()} onReload={() => { mutation.resetAttempt(); onSaved?.(); }} pending={false} />
    </section>
  );
}

function PermissionMatrixSection({ employeeId, employee, roles, canManage, onSaved }) {
  const permissions = useAuthStore((state) => state.permissions);
  const catalog = usePermissionsCatalog();
  const [roleId, setRoleId] = useState("");
  const [allowed, setAllowed] = useState([]);
  const [pagesVisible, setPagesVisible] = useState({});
  const [formError, setFormError] = useState("");
  const mutation = useReplacePermissionMatrix(String(employeeId), { onSuccess: () => { setFormError(""); onSaved?.(); } });
  const conflicted = mutation.isError && isConflict(mutation.error);
  void permissions;

  const stored = employee?.matrix ?? employee?.permissionsMatrix ?? null;
  const fallbackRoleId = employee?.roleId ? String(employee.roleId) : "";

  useEffect(() => {
    const matrix = stored || {};
    const initialRole = matrix.roleId ? String(matrix.roleId) : fallbackRoleId;
    const rawRows = Array.isArray(matrix.permissions) ? matrix.permissions : Array.isArray(matrix.rows) ? matrix.rows : [];
    const initialAllowed = rawRows
      .filter((entry) => (typeof entry === "string" ? true : entry?.effect === "ALLOW"))
      .map((entry) => (typeof entry === "string" ? entry : String(entry.permissionKey ?? entry.key)));
    const rawPages = Array.isArray(matrix.pages) ? matrix.pages : [];
    const initialPages = {};
    for (const page of rawPages) {
      if (page?.pageKey) initialPages[String(page.pageKey)] = page.visible !== false;
    }
    setRoleId(initialRole);
    setAllowed(initialAllowed.filter((key) => !key.startsWith("employees.")));
    setPagesVisible(initialPages);
  }, [stored, fallbackRoleId]);

  const sidebarPages = useMemo(() => {
    const seen = new Map();
    for (const entry of adminNavigation) {
      if (entry?.adminOnly) continue;
      if (entry?.pageKey && !seen.has(entry.pageKey)) seen.set(entry.pageKey, entry.pageName || entry.pageKey);
    }
    return [...seen.entries()].map(([pageKey, pageName]) => ({ pageKey, pageName }));
  }, []);
  const pageRows = useMemo(() => {
    const rows = [];
    for (let index = 0; index < sidebarPages.length; index += 2) {
      rows.push(sidebarPages.slice(index, index + 2));
    }
    return rows;
  }, [sidebarPages]);
  const keyToPage = useMemo(() => {
    const map = new Map();
    for (const permission of catalog.data?.permissions || []) {
      if (permission?.key) map.set(String(permission.key), String(permission.pageKey || ""));
    }
    return map;
  }, [catalog.data]);
  const keysByPage = useMemo(() => {
    const map = new Map();
    for (const [key, pageKey] of keyToPage) {
      if (!map.has(pageKey)) map.set(pageKey, []);
      map.get(pageKey).push(key);
    }
    return map;
  }, [keyToPage]);

  if (!canManage) return null;

  const togglePage = (pageKey) => {
    mutation.resetAttempt();
    setFormError("");
    setPagesVisible((current) => ({ ...current, [pageKey]: (current[pageKey] ?? true) === false }));
  };

  const submit = (event) => {
    event.preventDefault();
    if (catalog.isLoading) {
      setFormError("انتظر تحميل كتالوج الصلاحيات ثم احفظ مجددًا");
      return;
    }
    const sidebarKeySet = new Set(sidebarPages.map(({ pageKey }) => pageKey));
    let permissionKeys;
    if (catalog.isError || keysByPage.size === 0) {
      permissionKeys = [...new Set(allowed)];
    } else {
      const next = new Set();
      for (const { pageKey } of sidebarPages) {
        if (pagesVisible[pageKey] ?? true) {
          for (const key of keysByPage.get(pageKey) ?? []) next.add(key);
        }
      }
      for (const key of allowed) {
        if (!sidebarKeySet.has(keyToPage.get(key))) next.add(key);
      }
      permissionKeys = [...next];
    }
    const parsed = permissionMatrixSchema.safeParse({
      roleId,
      permissions: permissionKeys.map((permissionKey) => ({ permissionKey, effect: "ALLOW" })),
      pages: sidebarPages.map(({ pageKey }) => ({ pageKey, visible: pagesVisible[pageKey] ?? true })),
      expectedPermissionsVersion: Math.max(1, Number(employee?.permissionsVersion ?? 0)),
    });
    if (!parsed.success) {
      setFormError(firstEmployeeFormError(parsed));
      return;
    }
    setFormError("");
    mutation.mutate(parsed.data);
  };

  return (
    <section className="employee-detail-card" aria-label="مصفوفة الصلاحيات">
      <h2>
        <ShieldCheck size={17} />
        مصفوفة الصلاحيات
      </h2>
      <form onSubmit={submit}>
        <Select label="الدور" name="matrixRoleId" required value={roleId} onChange={(event) => setRoleId(event.target.value)} options={toRoleOptions(roles)} placeholder="اختر الدور" />
        {catalog.isLoading && <p className="employee-empty">جاري تحميل كتالوج الصلاحيات...</p>}
        {catalog.isError && <p className="employee-alert error" role="alert">تعذر تحميل كتالوج الصلاحيات — سيتم الاحتفاظ بالصلاحيات الحالية عند الحفظ</p>}
        <div className="employee-table-scroll">
          <table aria-label="جدول الصلاحيات">
            <thead>
              <tr>
                <th>الصفحة</th>
                <th>الظهور</th>
                <th>الصفحة</th>
                <th>الظهور</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((pair, rowIndex) => (
                <tr key={`matrix-row-${rowIndex}`}>
                  {pair.map(({ pageKey, pageName }) => {
                    const visible = pagesVisible[pageKey] ?? true;
                    return (
                      <Fragment key={pageKey}>
                        <td>{pageName}</td>
                        <td>
                          <label className="matrix-page-toggle">
                            <input type="checkbox" checked={visible} onChange={() => togglePage(pageKey)} aria-label={`إظهار صفحة ${pageName}`} />
                            <span>{visible ? "ظاهر" : "مخفي"}</span>
                          </label>
                        </td>
                      </Fragment>
                    );
                  })}
                  {pair.length === 1 && (
                    <Fragment key={`matrix-row-${rowIndex}-empty`}>
                      <td>—</td>
                      <td>—</td>
                    </Fragment>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(formError || mutation.isError) && !conflicted && (
          <p className="employee-alert error" role="alert">
            {formError || mutation.error?.message}
          </p>
        )}
        {mutation.isSuccess && <p className="employee-alert success">تم حفظ مصفوفة الصلاحيات</p>}
        <Button type="submit" loading={mutation.isPending} disabled={catalog.isLoading}>
          حفظ المصفوفة
        </Button>
      </form>
      <ConflictDialog open={conflicted} onClose={() => mutation.resetAttempt()} onReload={() => { mutation.resetAttempt(); onSaved?.(); }} pending={false} />
    </section>
  );
}

export default function EmployeeDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const permissions = useAuthStore((state) => state.permissions);
  const canViewPassword = can(permissions, "employees.password.view");
  const canUpdate = can(permissions, "employees.update");
  const canDecide = can(permissions, "employees.devices.decide");
  const canManageMatrix = can(permissions, "employees.permissions.manage");

  const [activityPage, setActivityPage] = useState(1);
  const [devicePage, setDevicePage] = useState(1);
  const [attendancePage, setAttendancePage] = useState(1);
  const include = useMemo(
    () => (canViewPassword ? ["password", "attendance", "permissions", "activity"] : ["attendance", "permissions", "activity"]),
    [canViewPassword],
  );
  const details = useEmployeeDetails(id, include, { activityPage, activityLimit: 10, attendancePage, attendanceLimit: 10 });
  const devicesQuery = useEmployeeDevices({ employeeId: id, page: devicePage, limit: 10 });
  const rolesQuery = useRoles();
  const roles = rolesQuery.data?.roles || [];
  const deleteMutation = useDeleteEmployee();
  const currentEmployeeId = useAuthStore((state) => state.employee?.id);

  const refetchAll = async () => {
    await Promise.all([details.refetch(), devicesQuery.refetch()]);
  };

  if (details.isLoading) return <p className="employee-details-state">جاري تحميل الموظف...</p>;
  const employee = details.data?.employee;
  if (details.isError || !employee) {
    return (
      <div className="employee-details-page" dir="rtl">
        <PageHeader title="الموظف" breadcrumbs={["الموظفون", "التفاصيل"]} />
        <div className="employee-details-shell">
          <button type="button" className="employee-back" onClick={() => navigate("/admin/employees")}>
            <ArrowRight size={16} />
            رجوع
          </button>
          <AsyncState loading={false} error={details.error} onRetry={details.refetch} empty={!details.error} emptyText="الموظف غير موجود">
            <span />
          </AsyncState>
        </div>
      </div>
    );
  }

  const devices = Array.isArray(devicesQuery.data?.items) ? devicesQuery.data.items : [];
  const devicesPageMeta = devicesQuery.data?.pageMeta;
  const attendance = asItems(details.data?.attendance);
  const attendancePageMeta = details.data?.attendance?.pageMeta;
  const passwordPlainText = details.data?.passwordPlainText ?? null;
  const employeeRole = roles.find((role) => String(role.id) === String(employee?.roleId));
  const isAdminEmployee = isAdminRole(employeeRole);

  return (
    <div className="employee-details-page" dir="rtl">
      <PageHeader title={`الموظف: ${employee.name || "—"}`} breadcrumbs={["الموظفون", employee.name || "التفاصيل"]} />
      <div className="employee-details-shell">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button type="button" className="employee-back" onClick={() => navigate("/admin/employees")}>
            <ArrowRight size={16} />
            رجوع
          </button>
          {canUpdate && (
            <Button
              variant="secondary"
              onClick={() => document.querySelector('[aria-label="البيانات الأساسية"]')?.scrollIntoView({ behavior: "smooth", block: "start" })}
            >
              <Pencil size={16} />
              تعديل بيانات الموظف
            </Button>
          )}
          {canUpdate && String(currentEmployeeId ?? "") !== String(employee.id) && (
            <ConfirmAction
              danger
              triggerClassName="employee-delete"
              title="حذف نهائي للموظف"
              message={`سيتم حذف ${employee.name} نهائيا ولا يمكن التراجع عن ذلك.`}
              confirmLabel="حذف نهائي"
              pending={deleteMutation.isPending}
              onConfirm={() => deleteMutation.mutateAsync({ employeeId: String(employee.id), expectedVersion: Number(employee.version ?? 0) }).then(() => navigate("/admin/employees"))}
            >
              <Trash2 size={16} />
              حذف نهائي
            </ConfirmAction>
          )}
        </div>

        <BasicInfoSection employee={employee} roles={roles} canUpdate={canUpdate} onSaved={refetchAll} />

        {passwordPlainText && (
          <section className="employee-detail-card" aria-label="كلمة المرور">
            <h2>
              <KeyRound size={17} />
              كلمة المرور
            </h2>
            <p className="password-reveal" dir="ltr">{passwordPlainText}</p>
          </section>
        )}

        <section className="employee-detail-card" aria-label="أجهزة الموظف">
          <h2>
            <Laptop size={17} />
            أجهزة الموظف
          </h2>
          <div className="employee-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>الجهاز</th>
                  <th>المتصفح</th>
                  <th>النظام</th>
                  <th>المحاولات</th>
                  <th>الحالة</th>
                  <th>آخر ظهور</th>
                  <th>القرار</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((device) => (
                  <EmployeeDeviceRow key={String(device.id)} device={device} canDecide={canDecide} />
                ))}
              </tbody>
            </table>
          </div>
          {devicesQuery.isLoading && <p className="employee-empty">جاري تحميل الأجهزة...</p>}
          {devicesQuery.isError && <p className="employee-alert error" role="alert">{devicesQuery.error?.message || "تعذر تحميل الأجهزة"}</p>}
          {!devicesQuery.isLoading && !devicesQuery.isError && devices.length === 0 && <p className="employee-empty">لم يسجل أي جهاز بعد</p>}
          <ServerPagination
            meta={devicesPageMeta}
            onPageChange={(next) => setDevicePage(next)}
            label="جهاز"
          />
        </section>

        {!isAdminEmployee && (
          <PermissionMatrixSection employeeId={String(employee.id)} employee={{ ...employee, matrix: details.data?.permissions }} roles={roles} canManage={canManageMatrix} onSaved={refetchAll} />
        )}

        {!isAdminEmployee && (
        <section className="employee-detail-card" aria-label="سجل الحضور">
          <h2>سجل الحضور</h2>
          <div className="employee-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>التاريخ</th>
                  <th>ساعة الحضور</th>
                  <th>ساعة الانصراف</th>
                  <th>الحالة</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((record) => (
                  <tr key={String(record.id || record.attendanceDate)}>
                    <td>{formatDate(record.attendanceDate)}</td>
                    <td>{formatTime(record.checkInAt)}</td>
                    <td>{formatTime(record.checkOutAt)}</td>
                    <td>{record.statusLabel || record.status || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {attendance.length === 0 && <p className="employee-empty">لا يوجد حضور مسجل</p>}
          <ServerPagination
            meta={attendancePageMeta}
            onPageChange={(next) => setAttendancePage(next)}
            label="حضور"
          />
        </section>
        )}

        <section className="employee-detail-card" aria-label="سجل الأنشطة">
          <h2>سجل الأنشطة</h2>
          <div className="employee-table-scroll">
            <table>
              <thead>
                <tr>
                  <th>الحدث</th>
                  <th>الإجراء</th>
                  <th>الوقت</th>
                  <th>النتيجة</th>
                </tr>
              </thead>
              <tbody>
                {(asItems(details.data?.activity).slice(0, 10) || []).map((ev) => (
                  <tr key={String(ev.eventNo || ev.id || ev.occurredAt)}>
                    <td>{ev.eventType || ev.action || "—"}</td>
                    <td>{ev.action || "—"}</td>
                    <td>{formatDateTime(ev.occurredAt)}</td>
                    <td>{ev.result || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {asItems(details.data?.activity).length === 0 && <p className="employee-empty">لا يوجد نشاط مسجل</p>}
          <ServerPagination
            meta={details.data?.activity?.pageMeta}
            onPageChange={(next) => setActivityPage(next)}
            label="نشاط"
          />
        </section>
      </div>
    </div>
  );
}
