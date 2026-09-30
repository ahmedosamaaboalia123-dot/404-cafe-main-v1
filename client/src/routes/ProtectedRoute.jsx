import { Navigate } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'
import { canSeePage } from '@/modules/auth/permissions/permission'
import { isAdminRole } from '@/modules/auth/permissions/role'

function ProtectedRoute({ children, pageKey, adminOnly = false }) {
  const employee = useAuthStore((state) => state.employee)
  const permissions = useAuthStore((state) => state.permissions)
  const role = useAuthStore((state) => state.role)
  const isAuthChecking = useAuthStore((state) => state.isAuthChecking)

  if (isAuthChecking) return <div className="route-loading" role="status">جاري التحقق من الجلسة...</div>

  if (!employee) {
    return <Navigate to="/login" replace />
  }

  if (adminOnly && !isAdminRole(role)) {
    return <Navigate to="/admin/dashboard" replace />
  }

  if (pageKey && !(adminOnly && isAdminRole(role)) && !canSeePage(permissions, pageKey)) {
    return <div className="route-loading" role="alert">ليس لديك صلاحية لعرض هذه الصفحة.</div>
  }

  return children
}

export default ProtectedRoute
