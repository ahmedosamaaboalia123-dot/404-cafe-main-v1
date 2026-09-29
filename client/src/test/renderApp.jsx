import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export function renderApp(ui, { route = "/", auth = null, queryClient = createTestQueryClient() } = {}) {
  useAuthStore.setState({
    employee: auth?.employee ?? null,
    role: auth?.role ?? null,
    permissions: auth?.permissions ?? [],
    notifications: auth?.notifications ?? [],
    currentAttendance: auth?.currentAttendance ?? null,
    shift: auth?.shift ?? null,
    isAuthChecking: false,
  });
  window.history.pushState({}, "Test route", route);
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </QueryClientProvider>,
    ),
  };
}
