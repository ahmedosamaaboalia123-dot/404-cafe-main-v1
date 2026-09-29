import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { getAdminSocket } from "@/services/realtime";
import { getCustomer, customerKey, CUSTOMERS_KEY } from "../services/customersService";

export function useCustomer(id) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = getAdminSocket();
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: customerKey(id) });
      queryClient.invalidateQueries({ queryKey: CUSTOMERS_KEY });
    };
    socket.on("order:created", invalidate);
    socket.on("order:updated", invalidate);
    socket.on("order:item:updated", invalidate);
    socket.on("connect", invalidate);
    return () => {
      socket.off("order:created", invalidate);
      socket.off("order:updated", invalidate);
      socket.off("order:item:updated", invalidate);
      socket.off("connect", invalidate);
    };
  }, [queryClient, id]);

  return useQuery({
    queryKey: customerKey(id),
    queryFn: () => getCustomer(id),
    staleTime: 10_000,
    gcTime: 60_000,
    refetchOnWindowFocus: false,
  });
}