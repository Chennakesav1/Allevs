require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const M = require('./models');

(async () => {
  await connectDB();

  // Drop every collection
  for (const model of Object.values(M)) {
    await model.deleteMany({});
  }
  console.log('All collections cleared.');

  const hash = await bcrypt.hash('Password123!', 12);

  // Hub
  const hub = await M.Hub.create({
    name: 'Main Hub',
    code: 'HUB-001',
    city: 'Your City',
    status: 'ONLINE',
    chargerCount: 4,
  });

  // Users
  const franchisee = await M.User.create({ name: 'Franchisee',     email: 'franchise@ev.local', passwordHash: hash, role: 'FRANCHISEE',     active: true });
  const admin      = await M.User.create({ name: 'Admin',          email: 'admin@ev.local',     passwordHash: hash, role: 'CENTRAL_ADMIN',  active: true });
  const staff      = await M.User.create({ name: 'Staff',          email: 'staff@ev.local',     passwordHash: hash, role: 'STAFF',          active: true, hubId: hub._id });
  const tech       = await M.User.create({ name: 'Technician',     email: 'tech@ev.local',      passwordHash: hash, role: 'TECHNICIAN',     active: true, hubId: hub._id });
  const customer   = await M.User.create({ name: 'Customer',       email: 'customer@ev.local',  passwordHash: hash, role: 'CUSTOMER',       active: true });

  hub.franchiseeId = franchisee._id;
  await hub.save();

  // Wallet for customer
  await M.Wallet.create({ customerId: customer._id, balance: 0 });

  console.log('\n✅ Seed complete!');
  console.log('─────────────────────────────────────────');
  console.log('All users — Password: Password123!');
  console.log('─────────────────────────────────────────');
  console.log('customer@ev.local   → Customer Portal  (http://localhost:5000/customer)');
  console.log('staff@ev.local      → Staff Portal     (http://localhost:5000/staff)');
  console.log('franchise@ev.local  → Franchise Portal (http://localhost:5000/franchisee)');
  console.log('admin@ev.local      → Central Command  (http://localhost:5000/command)');
  console.log('─────────────────────────────────────────\n');

  process.exit(0);
})().catch(e => {
  console.error('Seed failed:', e.message);
  process.exit(1);
});