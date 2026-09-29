import { authApi } from "../api/auth.api";

export const authService = {
  bootstrap: authApi.bootstrap,
  logout: authApi.logout,
};
