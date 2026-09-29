import { describe, expect, it, vi } from "vitest";
import { createSequenceStore } from "@/realtime/sequenceStore";
import { applyRealtimeEvent, invalidateForEvent, queryKeysForEvent } from "@/realtime/eventQueryMap";
import { createRoomConnection } from "@/realtime/socketManager";
import { publicSyncHeaders } from "@/realtime/syncClient";

function fakeSocket() {
  const handlers = new Map();
  return {
    connected: false, emitted: [],
    on: vi.fn((name, fn) => handlers.set(name, fn)),
    off: vi.fn((name, fn) => { if (handlers.get(name) === fn) handlers.delete(name); }),
    emit: vi.fn(function(name, payload) { this.emitted.push([name, payload]); }),
    trigger(name, payload) { handlers.get(name)?.(payload); },
  };
}

describe("realtime sequence handling", () => {
  it("rejects duplicate ids and stale aggregate sequences", () => {
    const store = createSequenceStore();
    expect(store.accept({ eventId: "1", aggregateType: "Order", aggregateId: "o1", sequence: 1 }).accepted).toBe(true);
    expect(store.accept({ eventId: "1", aggregateType: "Order", aggregateId: "o1", sequence: 1 }).reason).toBe("DUPLICATE");
    expect(store.accept({ eventId: "2", aggregateType: "Order", aggregateId: "o1", sequence: 1 }).reason).toBe("STALE");
  });
  it("detects a sequence gap without mixing aggregates", () => {
    const store = createSequenceStore();
    store.accept({ aggregateType: "Order", aggregateId: "a", sequence: 1 });
    expect(store.accept({ aggregateType: "Order", aggregateId: "a", sequence: 3 }).gap).toBe(true);
    expect(store.accept({ aggregateType: "Order", aggregateId: "b", sequence: 1 }).gap).toBe(false);
  });
});

describe("realtime room lifecycle", () => {
  it("subscribes, catches up, accepts an event once, and removes listeners", async () => {
    const socket = fakeSocket(); const onEvent = vi.fn();
    const sync = vi.fn().mockResolvedValue({ snapshots: [], events: [], hasMore: false });
    const connection = createRoomConnection({ socket, rooms: ["admin:orders", "admin:orders"], onEvent, sync });
    socket.trigger("connect");
    await connection.catchUp();
    expect(socket.emit).toHaveBeenCalledWith("subscribe", ["admin:orders"]);
    const event = { eventId: "unique-room-event", aggregateType: "Order", aggregateId: "o9", sequence: 1 };
    socket.trigger("event", event); socket.trigger("event", event);
    expect(onEvent).toHaveBeenCalledOnce();
    connection.dispose();
    expect(socket.off).toHaveBeenCalledTimes(2);
  });
});

describe("targeted invalidation and public headers", () => {
  it("maps order events to focused query families", async () => {
    expect(queryKeysForEvent({ aggregateType: "Order" })).toEqual([["orders"], ["dashboard"]]);
    const queryClient = { invalidateQueries: vi.fn().mockResolvedValue() };
    await invalidateForEvent({ aggregateType: "TableServiceRequest" }, queryClient);
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({ queryKey: ["table-services"] });
  });
  it("creates only supplied public credential headers", () => {
    expect(publicSyncHeaders({ tableToken: "t", trackingReadToken: "r" })).toEqual({ "X-Table-Token": "t", "X-Tracking-Read-Token": "r" });
  });
  it("batches repeated invalidations in a short window", async () => {
    vi.useFakeTimers();
    const queryClient = { invalidateQueries: vi.fn().mockResolvedValue() };
    applyRealtimeEvent({ aggregateType: "Order" }, queryClient, 50);
    applyRealtimeEvent({ aggregateType: "Order" }, queryClient, 50);
    await vi.advanceTimersByTimeAsync(50);
    expect(queryClient.invalidateQueries).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });
});
