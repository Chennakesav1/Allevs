const express = require('express');
const { auth, allow } = require('../middleware/auth');
const A   = require('../controllers/auth');
const CA  = require('../controllers/customerAuth');
const P   = require('../controllers/platform');
const St  = require('../controllers/staff');
const Fr  = require('../controllers/franchise');
const Ad  = require('../controllers/admin');
const Ap  = require('../controllers/approvals');   // ← NEW
const Rn  = require('../controllers/rental');      // ← RENTAL
const upload = require('../middleware/upload');
const { localSave } = require('../services/storage');
const { Expansion } = require('../models');

const r = express.Router();

// ── Auth ──────────────────────────────────────────────────────────
r.post('/auth/register', A.register);
r.post('/auth/login',    A.login);
r.get( '/auth/me',       auth, A.me);
r.post('/auth/refresh',  A.refreshToken); // silent token renewal

// ── Customer self-registration / OTP auth ─────────────────────────
r.post('/auth/customer/register',          CA.register);
r.post('/auth/customer/verify-otp',        CA.verifyOtp);
r.post('/auth/customer/resend-otp',        CA.resendOtp);
r.post('/auth/customer/login-otp',         CA.sendLoginOtp);
r.post('/auth/customer/verify-login-otp',  CA.verifyLoginOtp);
r.post('/auth/customer/login-password',    CA.loginPassword);
r.post('/auth/customer/set-password',      auth, CA.setPassword);
r.post('/auth/customer/forgot-password',   CA.forgotPassword);
r.post('/auth/customer/reset-password',    CA.resetPassword);

// ── Staff Forgot Password ─────────────────────────────────────────
r.post('/auth/staff/forgot-password',      Ap.staffForgotPassword);
r.post('/auth/staff/verify-reset-otp',     Ap.staffVerifyResetOtp);
r.post('/auth/staff/reset-password',       Ap.staffResetPassword);

// ── Staff Email OTP Verification (Franchisee form) ────────────────
r.post('/franchise/staff-otp/send',   auth, Ap.sendStaffEmailOtp);
r.post('/franchise/staff-otp/verify', auth, Ap.verifyStaffEmailOtp);

// ── Customer ──────────────────────────────────────────────────────
const cr = express.Router();
cr.use(auth, allow('CUSTOMER'));
cr.get( '/profile',               P.customer.profile);
cr.get( '/vehicles',              P.customer.vehicles);
cr.post('/vehicles',              P.customer.addVehicle);
cr.get( '/services',              P.customer.services);
cr.post('/services',              P.customer.book);
cr.get( '/bookings',              P.customer.bookings);
cr.get( '/tracking/:id',          P.customer.tracking);
cr.get( '/wallet',                P.customer.wallet);
cr.get( '/wallet/transactions',   P.customer.walletTx);
cr.post('/wallet/add-money',      P.customer.addMoney);
cr.post('/payment',               P.customer.pay);
cr.get( '/invoices',              P.customer.invoices);
cr.post('/review',                P.customer.review);
cr.get( '/complaints',            P.customer.complaints);
cr.get( '/complaint-options',     P.customer.complaintOptions);
cr.post('/complaints',            P.customer.complaint);
cr.post('/complaints/:id/feedback', P.customer.feedback);
cr.get( '/telemetry/:vehicleId',  P.customer.telemetry);
cr.get( '/notifications',         P.customer.notifications);
// FIX: serve approved vehicles from MongoDB (replaces broken localStorage approach)
cr.get( '/available-vehicles',    Ap.availableVehicles);
// Public hub list for the customer charging-stations map (avoids 403 on /admin/hubs)
cr.get( '/hubs',                  Ad.hubs);
// Vehicle Rental
cr.post('/rentals/create-order',           Rn.createOrder);
cr.post('/rentals/verify-payment',         Rn.verifyPayment);
cr.get( '/rentals',                        Rn.myRentals);
cr.get( '/rentals/invoices',               Rn.myRentalInvoices);
cr.get( '/rentals/invoices/:id/download',  Rn.downloadInvoice);
cr.post('/rentals/:id/extend/create-order', Rn.createExtensionOrder);
cr.post('/rentals/:id/extend/verify-payment', Rn.verifyExtensionPayment);
r.use('/customer', cr);

// ── Staff ─────────────────────────────────────────────────────────
const sr = express.Router();
sr.use(auth, allow('TECHNICIAN', 'STAFF', 'HUB_MANAGER', 'CENTRAL_ADMIN', 'SUPER_ADMIN'));
sr.get( '/jobs',                   P.staff.jobs);
sr.post('/jobs',                   P.staff.create);
sr.put( '/jobs/:id',               P.staff.update);
sr.post('/jobs/:id/assign',        P.staff.assign);
sr.post('/jobs/:id/start',         P.staff.start);
sr.post('/jobs/:id/complete',      P.staff.complete);
sr.get( '/jobs/:id/job-card',      P.staff.jobCard);
sr.put( '/jobs/:id/job-card',      P.staff.saveJobCard);
sr.get( '/inventory',              P.staff.inventory);
sr.post('/inventory/issue',        P.staff.inventoryIssue);
sr.post('/inventory/request',      P.staff.inventoryRequest);
sr.get( '/diagnostics/:vehicleId', P.staff.diagnostics);
sr.get( '/technicians',            P.staff.technicians);
sr.get( '/suppliers',              P.staff.suppliers);
sr.get( '/purchase-orders',        P.staff.purchaseOrders);
r.use('/staff', sr);

// ── Franchise ─────────────────────────────────────────────────────
const fr = express.Router();
fr.use(auth, allow('FRANCHISEE', 'CENTRAL_ADMIN', 'SUPER_ADMIN'));
fr.get( '/dashboard',          Fr.dashboard);
fr.get( '/financials',         Fr.financials);
fr.get( '/roi',                Fr.roi);
fr.get( '/capex',              Fr.capex);
fr.get( '/emi',                Fr.emi);
fr.get( '/inventory',          Fr.inventory);
fr.post('/inventory',          Fr.addInventoryPart);
fr.get( '/staff',              Fr.staff);
fr.get( '/jobs',               Fr.jobs);
fr.get( '/rentals',             Rn.franchiseRentals);
fr.put( '/rentals/:id/handover', Rn.franchiseHandover);
fr.put( '/rentals/:id/return',   Rn.franchiseReturn);
fr.get( '/complaints',          P.franchise.complaints);
fr.get( '/fault-vehicles',       P.franchise.faultVehicles);
fr.put( '/complaints/:id/solve', P.franchise.solveComplaint);
// ── NEW: vehicle & staff approval submissions ─────────────────────
fr.post('/pending-vehicles',   Ap.submitVehicle);
fr.get( '/pending-vehicles',   Ap.myVehicles);
fr.post('/pending-staff',      Ap.submitStaff);
fr.get( '/pending-staff',      Ap.myStaff);
fr.put( '/pending-staff/:id/remove', Ap.removeStaffFromFranchisee);
r.use('/franchise', fr);

// ── Admin / Central Command ───────────────────────────────────────
const dr = express.Router();
dr.use(auth, allow('CENTRAL_ADMIN', 'SUPER_ADMIN'));
dr.get( '/dashboard',        Ad.dashboard);
dr.get(   '/hubs',           Ad.hubs);
dr.post(  '/hubs',           Ad.createHub);
dr.put(   '/hubs/:id',       Ad.updateHub);
dr.delete('/hubs/:id',       Ad.deleteHub);
dr.get(   '/chargers',       Ad.chargers);
dr.post(  '/chargers',       Ad.createCharger);
dr.put(   '/chargers/:id',   Ad.updateCharger);
dr.delete('/chargers/:id',   Ad.deleteCharger);
dr.get( '/live-operations',  Ad.live);
dr.get( '/revenue',          Ad.revenue);
dr.get( '/anomalies',        Ad.anomalies);
dr.get( '/franchisees',      Ad.franchisees);

// Demand / Expansion (unchanged)
dr.get( '/demand',    Ad.demand);
dr.post('/demand', async (req, res) => {
  try {
    const record = await Expansion.create(req.body);
    res.status(201).json(record);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});
dr.get( '/expansion', Ad.expansion);
dr.post('/expansion', async (req, res) => {
  try {
    const { expansion } = require('../services/finance');
    const inputs   = req.body;
    const computed = expansion(inputs);
    const record   = await Expansion.create({ ...inputs, ...computed });
    res.status(201).json(record);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

dr.get('/franchise-health', Ad.health);
dr.get('/franchise-ratings', Ad.franchiseRatings);

// Per-franchisee vehicle + part inventory summary for Command Center
dr.get('/franchisee-stats', async (req, res) => {
  try {
    const { User, Inventory } = require('../models');
    const { PendingVehicle } = require('../models');
    const franchisees = await User.find({ role: 'FRANCHISEE' }).select('_id name email').lean();
    const ids = franchisees.map(f => f._id);

    // Vehicles per franchisee
    const vehicleAgg = await PendingVehicle.aggregate([
      { $match: { franchiseeId: { $in: ids } } },
      { $group: {
          _id: '$franchiseeId',
          totalVehicles: { $sum: 1 },
          approvedVehicles: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
          pendingVehicles:  { $sum: { $cond: [{ $eq: ['$status', 'PENDING_APPROVAL'] }, 1, 0] } },
      }},
    ]);
    const vehicleMap = new Map(vehicleAgg.map(v => [String(v._id), v]));

    // Parts inventory (shared Inventory collection — group by category for totals)
    const partTotals = await Inventory.aggregate([
      { $group: { _id: null, totalSkus: { $sum: 1 }, totalQty: { $sum: '$quantity' }, totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } } } }
    ]);

    // Build per-franchisee response
    const stats = franchisees.map(f => {
      const vs = vehicleMap.get(String(f._id)) || { totalVehicles: 0, approvedVehicles: 0, pendingVehicles: 0 };
      return {
        franchiseeId:     String(f._id),
        name:             f.name,
        email:            f.email,
        totalVehicles:    vs.totalVehicles,
        approvedVehicles: vs.approvedVehicles,
        pendingVehicles:  vs.pendingVehicles,
      };
    });

    // Attach global inventory summary
    const inv = partTotals[0] || { totalSkus: 0, totalQty: 0, totalValue: 0 };
    res.json({ franchisees: stats, inventory: inv });
  } catch (e) {
    console.error('franchisee-stats error:', e);
    res.status(500).json({ message: e.message });
  }
});

// ── NEW: Vehicle & Staff approvals for Command Center ─────────────
dr.get('/pending-vehicles',            Ap.allVehicles);
dr.put('/pending-vehicles/:id/approve',Ap.approveVehicle);
dr.put('/pending-vehicles/:id/reject', Ap.rejectVehicle);
dr.get('/pending-staff',               Ap.allStaff);
dr.put('/pending-staff/:id/approve',   Ap.approveStaff);
dr.put('/pending-staff/:id/reject',    Ap.rejectStaff);

// All parts inventory for Command Center
dr.get('/all-parts', async (req, res) => {
  try {
    const { Inventory } = require('../models');
    const parts = await Inventory.find().sort('name').lean();
    res.json(parts);
  } catch (e) {
    console.error('all-parts error:', e);
    res.status(500).json({ message: e.message });
  }
});

// Franchisee creation
dr.post('/franchisees', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs');
    const { User } = require('../models');
    const {
      name, email, phone, password,
      managerName, managerPhone, managerEmail,
      addressLine1, addressLine2, city, district, state, pincode,
      latitude, longitude,
      businessName, gstNumber, panNumber,
      notes,
    } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ message: 'name, email and password are required' });
    if (await User.findOne({ email }))
      return res.status(409).json({ message: 'Email already registered' });

    // Build address / metadata object stored in a flexible field
    const meta = {
      businessName:  businessName  || undefined,
      gstNumber:     gstNumber     || undefined,
      panNumber:     panNumber     || undefined,
      managerName:   managerName   || undefined,
      managerPhone:  managerPhone  || undefined,
      managerEmail:  managerEmail  || undefined,
      address: (addressLine1 || addressLine2 || city || state || pincode) ? {
        line1:    addressLine1 || undefined,
        line2:    addressLine2 || undefined,
        city:     city        || undefined,
        district: district    || undefined,
        state:    state       || undefined,
        pincode:  pincode     || undefined,
      } : undefined,
      notes: notes || undefined,
    };

    const u = await User.create({
      name,
      email,
      phone:        phone || undefined,
      passwordHash: await bcrypt.hash(password, 12),
      role:         'FRANCHISEE',
      address: {
        line1: addressLine1 || '', line2: addressLine2 || '', city: city || '',
        district: district || '', state: state || '', pincode: pincode || '',
        latitude: latitude !== undefined && latitude !== '' ? Number(latitude) : undefined,
        longitude: longitude !== undefined && longitude !== '' ? Number(longitude) : undefined,
        businessName: businessName || '', managerName: managerName || '',
        managerPhone: managerPhone || '', managerEmail: managerEmail || ''
      },
      // Store extra details in refreshTokenHash field temporarily — or just drop it.
      // We persist it as a plain object on a virtual key via a workaround:
    });

    res.status(201).json({
      _id:         u._id,
      name:        u.name,
      email:       u.email,
      phone:       u.phone,
      role:        u.role,
      businessName,
      managerName,
      city,
      state,
      pincode,
      latitude: u.address?.latitude,
      longitude: u.address?.longitude,
      address: u.address,
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// Customer management
dr.get('/customers',         Ad.customers);
dr.get('/customers/:id',     Ad.customerDetail);

// Vehicle Rentals (Command Center)
dr.get('/rentals',              Rn.allRentals);

r.use('/admin', dr);

// ── IoT ingestion ─────────────────────────────────────────────────
r.post('/iot/telemetry', Ad.ingestTelemetry);

// ── File uploads ──────────────────────────────────────────────────
r.post('/uploads', auth, upload.array('files', 10), (req, res) =>
  res.json({ files: req.files.map(f => ({ name: f.originalname, url: localSave(f) })) })
);
r.get('/uploads/:name', (req, res) =>
  res.sendFile(require('path').resolve(process.env.UPLOAD_DIR || 'uploads', req.params.name))
);

module.exports = r;