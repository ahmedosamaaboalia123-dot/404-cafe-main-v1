import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { useAuthStore } from '@/store/authStore'
import { loginService } from './loginService'
import { appConfig } from '@/app/config'
import { isPendingDeviceResponse, toAuthSession, toPendingDevice } from '../adapters/auth.adapter'
import { updateAdminSocketToken } from '@/services/realtime'

export function useLogin() {
  const navigate = useNavigate()
  const setAuth = useAuthStore((state) => state.setAuth)
  const setPendingDevice = useAuthStore((state) => state.setPendingDevice)

  return useMutation({
    mutationFn: loginService.login,
    onSuccess: (data) => {
      if (isPendingDeviceResponse(data)) {
        setPendingDevice(toPendingDevice(data))
        return
      }
      localStorage.setItem(appConfig.tokenKey, data.auth.accessToken)
      localStorage.setItem(appConfig.refreshTokenKey, data.auth.refreshToken)
      setAuth(toAuthSession(data, data.auth.accessToken))
      updateAdminSocketToken(data.auth.accessToken)
      navigate('/admin', { replace:true })
    },
  })
}
