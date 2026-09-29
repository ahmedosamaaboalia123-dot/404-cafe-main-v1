const mappings = [
  [/^Order/, [["orders"], ["dashboard"]]],
  [/^DeliveryAssignment/, [["orders"], ["delegates"], ["customers"]]],
  [/^Table(Session|OrderProposal)/, [["orders"], ["tables"]]],
  [/^TableServiceRequest/, [["table-services"], ["orders"]]],
  [/^Supplier/, [["suppliers"], ["drawer"]]],
  [/^(RawMaterial|Inventory|Batch)/, [["raw-materials"], ["warnings"], ["products"]]],
  [/^Purchase/, [["purchases"], ["purchase-returns"], ["raw-materials"]]],
  [/^CashDrawer/, [["drawer"], ["dashboard"], ["reports"]]],
  [/^(Employee|Role|Attendance)/, [["employees"], ["attendance"], ["admin", "bootstrap"]]],
  [/^(Customer|OrderReview)/, [["customers"], ["reviews"]]],
];

export function queryKeysForEvent(event) {
  const type = String(event?.aggregateType || event?.type || "");
  return mappings.flatMap(([pattern, keys]) => pattern.test(type) ? keys : []);
}

export async function invalidateForEvent(event, queryClient) {
  const keys = queryKeysForEvent(event);
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  return keys;
}

const pendingByClient = new WeakMap();
export function applyRealtimeEvent(event, queryClient, delay = 100) {
  let batch = pendingByClient.get(queryClient);
  if (!batch) {
    batch = { keys: new Map(), timer: null };
    pendingByClient.set(queryClient, batch);
  }
  for (const key of queryKeysForEvent(event)) batch.keys.set(JSON.stringify(key), key);
  if (!batch.timer) batch.timer = setTimeout(async () => {
    const keys = [...batch.keys.values()]; batch.keys.clear(); batch.timer = null;
    await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
  }, delay);
}
