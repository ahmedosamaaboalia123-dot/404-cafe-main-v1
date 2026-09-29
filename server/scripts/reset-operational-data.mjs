import 'dotenv/config';
import process from 'node:process';
import console from 'node:console';
import mongoose from 'mongoose';
import { createHash } from 'node:crypto';

// Explicit target and administrator are required, including for the read-only plan.
const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...value] = arg.replace(/^--/, '').split('=');
  return [key, value.length ? value.join('=') : true];
}));
const preserved = new Set([
  'permissions', 'roles', 'rolepermissions', 'measurementunits', 'tables', 'migrations',
]);
const adminRelated = new Set([
  'employeedevices', 'employeepermissions', 'employeepageaccesses', 'authsessions',
]);
const cleared = new Set(`tableorderproposals notifications rawmaterialbatches purchasereturns
  attendanceadjustments customers inventoryallocations tablesessions ordercancellationrequests
  financialreportcaches mediaassets productaddons loginattempts operationrequests reportexports
  supplieraccountentries supplierpurchaseinvoices cashdrawertransactions purchaseitems
  customerordercredentials dashboarddailies cashrefunds orderitemstatusevents orderpayments
  inventorymovements productcategories supplieraccounts delegates tableservicestatusevents
  outboxevents tableservicerequests purchasereturnitems orders drawershiftalerts orderitems
  productrecipes customeraccesssessions purchasegroups orderstatusevents productsizes
  orderreviewrevisions producttypes suppliers rawmaterials invoicesnapshots sequences products
  attendancerecords auditevents orderreviews cashdrawershifts deliveryassignments
  deliveryconfirmations tableguestsessions`.split(/\s+/));
const digest = (document) => createHash('sha256').update(JSON.stringify(document)).digest('hex');

async function main() {
  if (typeof args.database !== 'string' || !mongoose.isObjectIdOrHexString(args['admin-id'])) {
    throw new Error('EXPLICIT_DATABASE_AND_ADMIN_ID_REQUIRED');
  }
  if (['admin', 'local', 'config'].includes(args.database)) throw new Error('SYSTEM_DATABASE_FORBIDDEN');
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 8000, autoIndex: false, autoCreate: false,
  });
  const db = mongoose.connection.db;
  if (db.databaseName !== args.database) throw new Error('DATABASE_TARGET_MISMATCH');
  const adminId = new mongoose.Types.ObjectId(args['admin-id']);
  const admin = await db.collection('employees').findOne({ _id: adminId, status: 'ACTIVE' });
  if (!admin?.passwordPlainText) throw new Error('ACTIVE_ADMIN_CREDENTIALS_REQUIRED');
  const role = await db.collection('roles').findOne({ _id: admin.roleId, name: 'Admin' });
  if (!role) throw new Error('ADMIN_ROLE_REQUIRED');
  if (!await db.collection('rolepermissions').countDocuments({ roleId: role._id })) {
    throw new Error('ADMIN_PERMISSIONS_REQUIRED');
  }
  const collections = (await db.listCollections({}, { nameOnly: true }).toArray())
    .map(({ name }) => name).sort();
  const unknown = collections.filter((name) => !preserved.has(name) && !adminRelated.has(name)
    && !cleared.has(name) && name !== 'employees');
  if (unknown.length) throw new Error(`UNCLASSIFIED_COLLECTIONS:${unknown.join(',')}`);
  const filterFor = (name) => name === 'employees' ? { _id: { $ne: adminId } }
    : adminRelated.has(name) ? { employeeId: { $ne: adminId } } : {};
  const plan = [];
  for (const name of collections) {
    const total = await db.collection(name).countDocuments({});
    const remove = preserved.has(name) ? 0 : await db.collection(name).countDocuments(filterFor(name));
    plan.push({ collection: name, total, remove, keep: total - remove });
  }
  console.log(JSON.stringify({ database: db.databaseName, admin: admin.name, apply: args.apply === true, plan }));
  if (args.apply !== true) return;
  if (process.env.ALLOW_DESTRUCTIVE_MIGRATIONS !== 'true')
    throw new Error('ALLOW_DESTRUCTIVE_MIGRATIONS_REQUIRED');
  const session = await mongoose.startSession();
  let deleted = 0;
  try {
    await session.withTransaction(async () => {
      deleted = 0;
      const current = await db.collection('employees').findOne({ _id: adminId }, { session });
      if (digest(current) !== digest(admin)) throw new Error('ADMIN_CHANGED_SINCE_PREFLIGHT');
      for (const { collection, remove } of plan) {
        if (preserved.has(collection)) continue;
        const count = await db.collection(collection).countDocuments(filterFor(collection), { session });
        if (count !== remove) throw new Error('DATA_CHANGED_SINCE_PREFLIGHT');
        // Native operations intentionally clear immutable operational ledgers as part of a full reset.
        const result = await db.collection(collection).deleteMany(filterFor(collection), { session });
        deleted += result.deletedCount;
      }
      const retained = await db.collection('employees').findOne({ _id: adminId }, { session });
      if (digest(retained) !== digest(admin)) throw new Error('ADMIN_PRESERVATION_FAILED');
    }, { readConcern: { level: 'snapshot' }, writeConcern: { w: 'majority' }, maxCommitTimeMS: 15000 });
  } finally {
    await session.endSession();
  }
  const remaining = [];
  for (const name of collections) {
    if (preserved.has(name)) continue;
    const count = await db.collection(name).countDocuments(filterFor(name));
    if (count) remaining.push({ collection: name, count });
  }
  const retained = await db.collection('employees').findOne({ _id: adminId });
  console.log(JSON.stringify({ committed: true, deleted, adminUnchanged: digest(retained) === digest(admin), remaining }));
  if (remaining.length || digest(retained) !== digest(admin)) process.exitCode = 2;
}

try {
  await main();
} catch (error) {
  // Never echo connection strings or database documents containing credentials.
  console.error(JSON.stringify({ failed: true, name: error.name, code: error.code,
    reason: /^[A-Z_]+(?::[a-z,]+)?$/.test(error.message) ? error.message : 'DATABASE_OPERATION_FAILED' }));
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
