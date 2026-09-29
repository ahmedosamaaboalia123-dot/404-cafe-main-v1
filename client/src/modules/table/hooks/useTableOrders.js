import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createTableOrder, getActiveTableOrder, requestTableService } from "../services/tableGateway";

export function useActiveTableOrder(tableNumber, tableToken) {
  return useQuery({
    queryKey: ["table", tableNumber, "active-order"],
    queryFn: () => getActiveTableOrder(tableNumber, tableToken),
    enabled: Boolean(tableNumber),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  });
}

export function useCreateTableOrder(tableNumber, tableToken, options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (items) => createTableOrder({ tableNumber, tableToken, items }),
    onSuccess: (...args) => {
      queryClient.invalidateQueries({ queryKey: ["table", tableNumber, "active-order"] });
      options.onSuccess?.(...args);
    },
  });
}

export function useRequestTableService(tableNumber, tableToken, options = {}) {
  return useMutation({
    mutationFn: ({ type, reason }) => requestTableService({ tableNumber, tableToken, type, reason }),
    ...options,
  });
}
