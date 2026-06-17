// FIFO (First In, First Out) narx hisoblash
export function calculateFIFOCost(batches, quantity) {
  const sorted = [...batches].sort((a, b) => new Date(a.date) - new Date(b.date));
  let remaining = quantity;
  let totalCost = 0;
  const usedBatches = [];

  for (const batch of sorted) {
    if (remaining <= 0) break;
    const available = batch.remainingQty ?? batch.quantity;
    const used = Math.min(available, remaining);
    totalCost += used * batch.price;
    remaining -= used;
    usedBatches.push({ batchId: batch.id, used, price: batch.price });
  }

  return {
    totalCost,
    usedBatches,
    unitCost: quantity > 0 ? totalCost / quantity : 0,
  };
}

export function updateBatchesAfterOutgoing(batches, usedBatches) {
  return batches.map((batch) => {
    const used = usedBatches.find((u) => u.batchId === batch.id);
    if (!used) return batch;
    return {
      ...batch,
      remainingQty: (batch.remainingQty ?? batch.quantity) - used.used,
    };
  });
}
