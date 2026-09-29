const pending = new Map();

export function replacePendingRequest(key) {
  if (!key) throw new TypeError("Request key is required");
  pending.get(key)?.abort();
  const controller = new AbortController();
  pending.set(key, controller);
  return controller.signal;
}

export function cancelPendingRequest(key) {
  const controller = pending.get(key);
  controller?.abort();
  pending.delete(key);
  return Boolean(controller);
}

export function releasePendingRequest(key, signal) {
  const controller = pending.get(key);
  if (controller?.signal === signal) pending.delete(key);
}

export function cancelAllPendingRequests() {
  for (const controller of pending.values()) controller.abort();
  pending.clear();
}
