import 'dotenv/config';
import process from 'node:process';
import console from 'node:console';
import mongoose from 'mongoose';

// Read-only pre-deploy check for the unique (materialId, salePriority) index.
// Fails (exit 1) when duplicates exist so the index creation is never attempted
// blindly. Usage: node scripts/check-batch-priority-duplicates.mjs --database=<name>
const expectedDb = process.argv.find((arg) => arg.startsWith('--database='))?.slice(11);
if (!expectedDb) throw new Error('Explicit --database is required');

try {
  const uriKey = Object.keys(process.env).find((key) => /MONGO.*URI|DATABASE_URL/.test(key));
  await mongoose.connect(process.env[uriKey], { autoIndex: false, autoCreate: false });
  const db = mongoose.connection.db;
  if (db.databaseName !== expectedDb) throw new Error('Database target mismatch');
  const duplicates = await db
    .collection('rawmaterialbatches')
    .aggregate([
      { $group: { _id: { materialId: '$materialId', salePriority: '$salePriority' }, count: { $sum: 1 }, batchIds: { $push: '$_id' } } },
      { $match: { count: { $gt: 1 } } },
      { $project: { _id: 0, materialId: '$_id.materialId', salePriority: '$_id.salePriority', count: 1, batchIds: 1 } }
    ])
    .toArray();
  const total = await db.collection('rawmaterialbatches').countDocuments({});
  console.log(JSON.stringify({ database: db.databaseName, totalBatches: total, duplicateGroups: duplicates.length, duplicates }));
  if (duplicates.length) {
    console.error('Duplicate (materialId, salePriority) pairs exist — clean them before creating the unique index.');
    process.exitCode = 1;
  }
} catch (error) {
  console.error(JSON.stringify({ failed: true, name: error.name, code: error.code, message: error.message?.replace(/mongodb[^ ]*/g, '[redacted]') }));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
