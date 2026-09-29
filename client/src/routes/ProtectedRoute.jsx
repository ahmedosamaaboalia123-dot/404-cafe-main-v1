import { Navigate } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'
import { canSeePage } from '@/modules/auth/permissions/permission'

function ProtectedRoute({ children, pageKey }) {
  const employee = useAuthStore((state) => state.employee)
  const permissions = useAuthStore((state) => state.permissions)
  const isAuthChecking = useAuthStore((state) => state.isAuthChecking)

  if (isAuthChecking) return <div className="route-loading" role="status">جاري التحقق من الجلسة...</div>

  if (!employee) {
    return <Navigate to="/login" replace />
  }

  if (pageKey && !canSeePage(permissions, pageKey)) {
    return <div className="route-loading" role="alert">ليس لديك صلاحية لعرض هذه الصفحة.</div>
  }

  return children
}

export default ProtectedRoute

