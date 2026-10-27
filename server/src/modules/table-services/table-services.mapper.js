const orderSnapshotDto = (snapshot) => {
  if (!snapshot) return null;
  const items = (snapshot.items ?? []).map((item) => ({
    productId: item.productId ? String(item.productId) : null,
    productName: item.productName,
    typeName: item.typeName ?? null,
    productSizeId: item.productSizeId ? String(item.productSizeId) : null,
    sizeName: item.sizeName ?? null,
    addonIds: (item.addonIds ?? []).map(String),
    quantity: item.quantity,
    lineSubtotal: item.lineSubtotal,
    notes: item.notes ?? ''
  }));
  return {
    proposalNumber: snapshot.proposalNumber,
    orderNumber: snapshot.orderNumber ?? null,
    lineCount: items.length,
    quantityCount: items.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0),
    subtotal: snapshot.subtotal,
    items
  };
};

export const serviceRequestDto = (request) => ({
  id: String(request._id),
  serviceRequestNumber: request.serviceRequestNumber,
  tableNumber: request.tableNumberSnapshot,
  type: request.type,
  purpose: request.purpose,
  priority: request.priority,
  status: request.status,
  details: request.details ?? null,
  requestedQuantity: request.requestedQuantity ?? null,
  proposalId: request.proposalId ? String(request.proposalId) : null,
  tableId: request.tableId ? String(request.tableId) : null,
  order: orderSnapshotDto(request.orderSnapshot),
  resolutionNote: request.resolutionNote ?? null,
  responseDurationSeconds: request.responseDurationSeconds ?? null,
  version: request.version ?? 0
});
