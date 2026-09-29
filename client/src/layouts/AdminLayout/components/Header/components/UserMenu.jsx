import {useAuthStore} from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { appConfig } from "@/app/config";
import { authService } from "@/modules/auth/services/authService";
import { disconnectAdminSocket } from "@/services/realtime";
import { useCheckOut } from "@/modules/auth/hooks/useCheckOut";
import { isAdminRole } from "@/modules/auth/permissions/role";


import {
Clock3,
LogOut
} from "lucide-react";


function UserMenu(){

const navigate = useNavigate();
const queryClient = useQueryClient();
const clearAuth = useAuthStore(state => state.clearAuth);
const setAuth = useAuthStore(state => state.setAuth);
const currentAttendance = useAuthStore(state => state.currentAttendance);
const checkOut = useCheckOut({
  onSuccess: (data) => {
    // حدّث الحضور الحالي في المتجر وأبطل الكاش
    const updated = data?.checkOutAt ? null : currentAttendance;
    // authStore يحمل currentAttendance من bootstrap/login — نصفره
    const state = useAuthStore.getState();
    if (state.currentAttendance) setAuth({ ...state, currentAttendance: null });
    queryClient.invalidateQueries({ queryKey: ["attendance"] });
    queryClient.invalidateQueries({ queryKey: ["employees"] });
  }
});
const checkOutTime = checkOut.data?.checkOutAt
    ? new Date(checkOut.data.checkOutAt).toLocaleTimeString("ar-EG", {
        hour: "2-digit",
        minute: "2-digit",
    })
    : null;
const hasOpenAttendance = Boolean(currentAttendance) && String(currentAttendance.status || "OPEN").toUpperCase() !== "CLOSED";

// The administrator does not punch a time card, so the checkout action is for
// employees only. The role is checked here rather than in the layout because
// UserMenu is the single owner of the button.
const role = useAuthStore(state => state.role);
const canCheckOut = !isAdminRole(role) && hasOpenAttendance;

const registerCheckOut = () => {
    if (checkOut.isPending) return;
    const attendanceId = currentAttendance?.id;
    const expectedVersion = Number(currentAttendance?.version ?? 0);
    if (!attendanceId) { window.alert("لا يوجد حضور مفتوح لتسجيل الانصراف"); return; }
    if (!window.confirm("هل تريد تسجيل الانصراف الآن؟")) return;
    checkOut.mutate({ attendanceId: String(attendanceId), expectedVersion });
};

const logout = async () => {
    const refreshToken = localStorage.getItem(appConfig.refreshTokenKey);
    try { if (refreshToken) await authService.logout(refreshToken); } catch { /* Local logout must always finish. */ }
    localStorage.removeItem(appConfig.tokenKey);
    localStorage.removeItem(appConfig.refreshTokenKey);
    clearAuth();
    disconnectAdminSocket();
    navigate("/login", { replace: true });
};


const employee = useAuthStore(
    state => state.employee
);


return (

<div className="user-menu">


<div>


<h4>
{employee?.name}
</h4>


<span>
{role?.name}
</span>


</div>



<div className="user-menu__actions">
    {canCheckOut && (
    <button type="button" className="user-menu__checkout" onClick={registerCheckOut} disabled={checkOut.isPending} aria-label="تسجيل الانصراف" title="تسجيل الانصراف">
        <Clock3 size={15}/>
        <span>{checkOut.isPending ? "جاري التسجيل..." : "تسجيل الانصراف"}</span>
    </button>
    )}
    <button type="button" className="user-menu__logout" onClick={logout} aria-label="تسجيل الخروج" title="تسجيل الخروج">
        <LogOut size={15}/>
        <span>تسجيل الخروج</span>
    </button>
</div>
{checkOut.isSuccess && <span className="user-menu__attendance-message" role="status">تم تسجيل الانصراف{checkOutTime ? ` الساعة ${checkOutTime}` : ""}</span>}
{checkOut.isError && <span className="user-menu__attendance-message is-error" role="alert">{checkOut.error?.response?.data?.message || "تعذر تسجيل الانصراف"}</span>}


</div>

)


}


export default UserMenu;




