const attempts = new Map();

const randomKey = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export function beginOperation(scope, suppliedKey) {
  if (!scope) throw new TypeError("Operation scope is required");
  if (!attempts.has(scope)) attempts.set(scope, suppliedKey || randomKey());
  return attempts.get(scope);
}

export function getOperationKey(scope) {
  return attempts.get(scope) || null;
}

export function finishOperation(scope) {
  attempts.delete(scope);
}

export function releaseFailedOperationKey(key) {
  if (!key) return;
  for (const [scope, currentKey] of attempts) {
    if (currentKey === key) attempts.delete(scope);
  }
}

export function clearAllOperations() {
  attempts.clear();
}

export function operationHeaders({ idempotencyKey, requestId } = {}) {
  return {
    ...(idempotencyKey ? { "Idempotency-Key": idempotencyKey } : {}),
    ...(requestId ? { "X-Request-Id": requestId } : {}),
  };
}

export function withExpectedVersion(body = {}, expectedVersion) {
  return expectedVersion === undefined || expectedVersion === null ? body : { ...body, expectedVersion };
}
