const aggregateKey = (event) => `${event?.aggregateType || "unknown"}:${event?.aggregateId || "unknown"}`;

export function createSequenceStore({ maxEventIds = 1000 } = {}) {
  const sequences = new Map();
  const eventIds = new Set();
  const eventOrder = [];
  const rememberId = (id) => {
    if (!id) return;
    eventIds.add(id); eventOrder.push(id);
    while (eventOrder.length > maxEventIds) eventIds.delete(eventOrder.shift());
  };
  return {
    accept(event) {
      if (!event || typeof event !== "object") return { accepted: false, reason: "INVALID" };
      if (event.eventId && eventIds.has(event.eventId)) return { accepted: false, reason: "DUPLICATE" };
      const key = aggregateKey(event);
      const previous = sequences.get(key) ?? 0;
      const sequence = Number(event.sequence ?? 0);
      if (sequence > 0 && sequence <= previous) return { accepted: false, reason: "STALE", previous };
      const gap = sequence > 0 && previous > 0 && sequence > previous + 1;
      if (sequence > 0) sequences.set(key, sequence);
      rememberId(event.eventId);
      return { accepted: true, gap, previous, sequence, aggregateKey: key };
    },
    getSequence(eventOrKey) { return sequences.get(typeof eventOrKey === "string" ? eventOrKey : aggregateKey(eventOrKey)) ?? 0; },
    reset() { sequences.clear(); eventIds.clear(); eventOrder.length = 0; },
  };
}

export const realtimeSequenceStore = createSequenceStore();
export const acceptEvent = (room, event) => ({ room, ...realtimeSequenceStore.accept(event) });
