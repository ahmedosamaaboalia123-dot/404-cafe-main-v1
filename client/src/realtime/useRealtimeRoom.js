import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { applyRealtimeEvent } from "./eventQueryMap";
import { connectAdmin, connectTable, connectTracking } from "./socketManager";

export function useRealtimeRoom({ context = "admin", scope, rooms = [], token, enabled = true, onEvent, onSnapshot }) {
  const queryClient = useQueryClient();
  const callbacks = useRef({ onEvent, onSnapshot });
  callbacks.current = { onEvent, onSnapshot };
  const roomKey = [...new Set(rooms)].sort().join("|");
  useEffect(() => {
    if (!enabled || !roomKey) return undefined;
    const options = {
      scope, rooms: roomKey.split("|"), token, tableToken: token,
      onSnapshot: (snapshot) => callbacks.current.onSnapshot?.(snapshot),
      onEvent: (event) => { applyRealtimeEvent(event, queryClient); callbacks.current.onEvent?.(event); },
    };
    const connection = context === "tracking" ? connectTracking(options) : context === "table" ? connectTable(options) : connectAdmin(options);
    return () => connection.dispose();
  }, [context, enabled, queryClient, roomKey, scope, token]);
}
