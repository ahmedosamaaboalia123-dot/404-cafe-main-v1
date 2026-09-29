import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/api/queryClient'

export function Providers({ children }) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
