const orderSnapshotDto = (snapshot) => {
  if (!snapshot) return null;
  const items = (snapshot.items ?? []).map((item) => ({
    productName: item.productName,
    sizeName: item.sizeName ?? null,
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
  order: orderSnapshotDto(request.orderSnapshot),
  resolutionNote: request.resolutionNote ?? null,
  responseDurationSeconds: request.responseDurationSeconds ?? null,
  version: request.version ?? 0
});
