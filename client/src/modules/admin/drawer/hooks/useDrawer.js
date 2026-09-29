import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { drawerService } from "../services/drawerService";

const DRAWER_KEY = ["cash-drawer"];
const normalizeList = (value) => Array.isArray(value) ? value : value?.items || value?.data || [];
const useDrawerMutation = (queryClient, mutationFn) => useMutation({
  mutationFn,
  onSuccess: () => queryClient.invalidateQueries({ queryKey: DRAWER_KEY }),
});

export function useDrawer() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: DRAWER_KEY,
    queryFn: async () => {
      const [current, history] = await Promise.all([drawerService.current(), drawerService.history()]);
      return { current: current || null, history: normalizeList(history) };
    },
    staleTime: 5_000,
    refetchOnWindowFocus: true,
  });
  const openShift = useDrawerMutation(queryClient, drawerService.open);
  const addCashIn = useDrawerMutation(queryClient, ({ shiftId, data }) => drawerService.cashIn(shiftId, data));
  const addCashOut = useDrawerMutation(queryClient, ({ shiftId, data }) => drawerService.cashOut(shiftId, data));
  const closeShift = useDrawerMutation(queryClient, ({ shiftId, data }) => drawerService.close(shiftId, data));
  return { ...query, shift: query.data?.current || null, history: query.data?.history || [], openShift, addCashIn, addCashOut, closeShift };
}
