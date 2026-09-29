import { authApi } from "../api/auth.api";
import { buildLoginDevice } from "../services/deviceFingerprint";

export const loginService = {
  async login(credentials) {
    const deviceIdentity = await buildLoginDevice();
    const data = await authApi.login({ ...credentials, ...deviceIdentity });
    if (data?.status !== "DEVICE_APPROVAL_REQUIRED" && (!data?.employee || !data?.auth?.accessToken || !data?.auth?.refreshToken)) {
      throw new Error("استجابة تسجيل الدخول غير مكتملة");
    }
    return data;
  },
};
