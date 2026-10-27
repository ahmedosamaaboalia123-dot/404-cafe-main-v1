import mongoose from 'mongoose';

/**
 * Multiple open proposals per guest session are now allowed (each cart gets
 * its own waiter notification), so the single-open-proposal partial unique
 * index has to go. It is replaced with a plain compound index for the
 * session/status lookups.
 */
export async function up(context = {}) {
  const db = context.connection?.db ?? mongoose.connection.db;
  if (!db) throw new Error('MongoDB connection is not available');
  const proposals = db.collection('tableorderproposals');
  const indexes = await proposals.indexes();
  for (const index of indexes) {
    const keys = Object.keys(index.key ?? {});
    if (index.unique && keys.length === 1 && keys[0] === 'guestSessionId') {
      await proposals.dropIndex(index.name);
    }
  }
  await proposals.createIndex(
    { guestSessionId: 1, status: 1, createdAt: -1 },
    { name: 'guestSessionId_1_status_1_createdAt_-1' }
  );
}
