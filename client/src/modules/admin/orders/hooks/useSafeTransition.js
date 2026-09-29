import { useCallback, useRef, useState } from "react";

/**
 * Race-condition guard for async transitions (button clicks).
 *
 * Usage:
 *   const { guard, inFlight, guardKeyed, isKeyed } = useSafeTransition("key");
 *   const handleClick = () => guard(async () => { await doSomething(); });
 *   // per-button loading:
 *   const handleItem = (id) => guardKeyed(String(id), async () => { await doSomething(); });
 *   <button disabled={isKeyed(id)}>{isKeyed(id) ? "جاري..." : "حفظ"}</button>
 *
 * - Only one call runs at a time for the same full key (baseKey or baseKey::suffix).
 * - A call whose full key is already in flight is silently ignored (no double-tap).
 * - inFlight === true while any transition runs; isKeyed(suffix) for per-button loading.
 */
const inFlightKeys = new Set();

export default function useSafeTransition(baseKey) {
  const [inFlight, setInFlight] = useState(false);
  const [activeSuffix, setActiveSuffix] = useState(null);
  const mounted = useRef(true);

  const run = useCallback(async (fullKey, fn) => {
    if (inFlightKeys.has(fullKey)) return;
    inFlightKeys.add(fullKey);
    const suffix = fullKey === baseKey ? null : fullKey.slice(baseKey.length + 2);
    setInFlight(true);
    setActiveSuffix(suffix);
    try {
      await fn();
    } finally {
      if (mounted.current) { setInFlight(false); setActiveSuffix(null); }
      inFlightKeys.delete(fullKey);
    }
  }, [baseKey]);

  const guard = useCallback((fn) => run(baseKey, fn), [run, baseKey]);
  const guardKeyed = useCallback((suffix, fn) => run(`${baseKey}::${suffix}`, fn), [run, baseKey]);
  const isKeyed = useCallback((suffix) => activeSuffix === suffix, [activeSuffix]);

  return { guard, inFlight, guardKeyed, isKeyed };
}