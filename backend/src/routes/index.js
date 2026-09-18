const express = require('express');
const { auth, allow } = require('../middleware/auth');
const A   = require('../controllers/auth');
const CA  = require('../controllers/customerAuth');
const P   = require('../controllers/platform');
const St  = require('../controllers/staff');
const SP  = require('../controllers/staffPortal');
const Fr  = require('../controllers/franchise');
const Ad  = require('../controllers/admin');
const Ap  = require('../controllers/approvals');   // ← NEW
const Rn  = require('../controllers/rental');      // Vehicle sales / purchase payments
const upload = require('../middleware/upload');
const { localSave } = require('../services/storage');
const { Expansion } = require('../models');

const r = express.Router();

// ── Auth ──────────────────────────────────────────────────────────
r.post('/auth/register', A.register);
r.post('/auth/login',    A.login);
r.get( '/auth/me',       auth, A.me);
r.post('/auth/refresh',  A.refreshToken); // silent token renewal
r.post('/auth/change-password', auth, A.changePassword);

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

// ── Shared hub list — any authenticated role (customer, franchisee, staff, admin) ──
r.get( '/hubs', auth, Ad.hubs);

// ── Customer ──────────────────────────────────────────────────────
const cr = express.Router();
cr.use(auth, allow('CUSTOMER'));
cr.get( '/profile',               P.customer.profile);
cr.patch('/profile',               P.customer.updateProfile);
cr.post('/profile/image',          upload.single('profileImage'), P.customer.uploadProfileImage);
cr.get( '/vehicles',              P.customer.vehicles);
cr.post('/vehicles',              P.customer.addVehicle);
cr.get( '/services',              P.customer.services);
cr.post('/services',              P.customer.book);
cr.get( '/bookings',              P.customer.bookings);
cr.get( '/tracking/:id',          P.customer.tracking);
cr.get( '/wallet',                    P.customer.wallet);
cr.get( '/wallet/transactions',       P.customer.walletTx);
cr.post('/wallet/add-money',          P.customer.addMoney);
cr.post('/wallet/recharge-order',     P.customer.walletRechargeOrder);
cr.post('/wallet/verify-recharge',    P.customer.walletVerifyRecharge);
cr.get( '/wallet/recharge/:orderId/status', P.customer.walletRechargeStatus);
cr.post('/wallet/recharge/:orderId/cancel', P.customer.walletCancelRecharge);
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
// Vehicle Purchase
cr.post('/purchases/create-order',           Rn.createOrder);
cr.post('/purchases/verify-payment',         Rn.verifyPayment);
cr.get( '/purchases',                        Rn.myRentals);
cr.get( '/purchases/invoices',               Rn.myRentalInvoices);
cr.get( '/purchases/invoices/:id/download',  Rn.downloadInvoice);
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
// ── Staff Portal services ────────────────────────────────────────
sr.get( '/notifications',              SP.notifications);
sr.put( '/notifications/:id/read',     SP.readNotification);
sr.put( '/notifications/read-all',     SP.readAllNotifications);
sr.get( '/attendance',                 SP.attendance);
sr.post('/attendance/clock-in',       SP.clockIn);
sr.post('/attendance/clock-out',      SP.clockOut);
sr.post('/attendance/break',          SP.breakToggle);
sr.post('/attendance/location',       SP.location);
sr.get( '/leave-requests',             SP.leaves);
sr.post('/leave-requests',             SP.createLeave);
sr.put( '/leave-requests/:id/cancel',  SP.cancelLeave);
sr.get( '/checklists',                 SP.checklists);
sr.put( '/checklists/:id',              SP.saveChecklist);
sr.get( '/documents',                  SP.documents);
sr.get( '/payslips',                   SP.payslips);
sr.get( '/shifts',                     SP.shifts);
sr.get( '/recognition',                SP.recognition);
sr.get( '/performance',                SP.performance);
sr.get( '/support',                    SP.support);
sr.post('/support',                    SP.createSupport);
sr.post('/support/:id/messages',      SP.supportMessage);
sr.get( '/jobs/:id/timeline',          SP.jobTimeline);
sr.post('/jobs/:id/proof',             SP.jobProof);

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
fr.get( '/staff',              Fr.staff);
fr.get( '/jobs',               Fr.jobs);
fr.get( '/purchases',             Rn.franchisePurchases);
fr.get( '/customer-payments',     Rn.franchiseCustomerPayments);
fr.put( '/purchases/:id/handover', Rn.handover);
fr.get( '/complaints',          P.franchise.complaints);
fr.get( '/fault-vehicles',       P.franchise.faultVehicles);
fr.put( '/complaints/:id/solve',      P.franchise.solveComplaint);
fr.put( '/complaints/:id/assign',     P.franchise.assignComplaint);
fr.post('/complaints/:id/work-order', P.franchise.createWorkOrder);
fr.get( '/complaints/:id/vehicle-history', async (req, res) => {
  try {
    const M = require('../models');
    const c = await M.Complaint.findOne({ _id: req.params.id, franchiseeId: req.user._id }).lean();
    if (!c) return res.status(404).json({ message: 'Complaint not found' });
    const vehicleId = c.vehicleId;
    const [jobs, rentals] = await Promise.all([
      M.Job.find({ vehicleId }).sort('-createdAt').limit(20).lean(),
      M.VehicleRental.find({ vehicleId }).sort('-createdAt').limit(10).lean(),
    ]);
    return res.json({ jobs, rentals });
  } catch (e) { return res.status(500).json({ message: e.message }); }
});
fr.get( '/staff-list', async (req, res) => {
  try {
    const M = require('../models');
    const staff = await M.User.find({
      franchiseeId: req.user._id,
      role: { $in: ['STAFF', 'TECHNICIAN', 'HUB_MANAGER'] },
      active: true,
    }).select('_id name role email').lean();
    return res.json(staff || []);
  } catch (e) { return res.status(500).json({ message: e.message }); }
});
// ── Staff approval submissions ────────────────────────────────────
// Note: vehicle submission removed from franchisee portal
fr.post('/pending-staff',           Ap.submitStaff);
fr.get( '/pending-staff',           Ap.myStaff);
fr.put( '/pending-staff/:id/remove', Ap.removeStaffFromFranchisee);
// ── Command Center assigned vehicles (fleet operator view) ────────
fr.get( '/assigned-vehicles',       Ad.assignedVehicles);
fr.put( '/assigned-vehicles/:id/activate', Fr.configureFleetVehicle);
fr.put( '/fleet-inventory/:id',        Fr.updateFleetVehicle);
// ── Hub list for Charge Hubs map (reuses same Ad.hubs controller) ─
fr.get( '/hubs',                    Ad.hubs);
// ── Pending vehicles (fleet operator submissions) ─────────────────
fr.get( '/pending-vehicles',        Ap.myVehicles);
fr.post('/pending-vehicles',        Ap.submitVehicle);
fr.put( '/pending-vehicles/:id',    Ap.updateVehicle);

r.use('/franchise', fr);

// ── Platform (Command Center portal) ─────────────────────────────
const pr = express.Router();
pr.use(auth, allow('CENTRAL_ADMIN', 'SUPER_ADMIN'));

// Complaints (all franchisees)
pr.get('/complaints', async (req, res) => {
  try {
    const { Complaint } = require('../models');
    const list = await Complaint.find()
      .populate('customerId', 'name email phone')
      .sort('-createdAt').lean();
    res.json(list);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
pr.put('/complaints/:id/assign', async (req, res) => {
  try {
    const { Complaint } = require('../models');
    const { staffId, staffName } = req.body;
    const c = await Complaint.findByIdAndUpdate(req.params.id,
      { assignedStaffId: staffId, assignedStaffName: staffName, status: 'IN_PROGRESS' },
      { new: true });
    if (!c) return res.status(404).json({ message: 'Complaint not found' });
    res.json(c);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
pr.put('/complaints/:id/start-work', async (req, res) => {
  try {
    const { Complaint } = require('../models');
    const c = await Complaint.findByIdAndUpdate(req.params.id,
      { status: 'IN_PROGRESS', workStartedAt: new Date() }, { new: true });
    if (!c) return res.status(404).json({ message: 'Complaint not found' });
    res.json(c);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
pr.put('/complaints/:id/pause-work', async (req, res) => {
  try {
    const { Complaint } = require('../models');
    const c = await Complaint.findByIdAndUpdate(req.params.id,
      { pauseReason: req.body.pauseReason }, { new: true });
    if (!c) return res.status(404).json({ message: 'Complaint not found' });
    res.json(c);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
pr.put('/complaints/:id/resume-work', async (req, res) => {
  try {
    const { Complaint } = require('../models');
    const c = await Complaint.findByIdAndUpdate(req.params.id,
      { status: 'IN_PROGRESS', pauseReason: null }, { new: true });
    if (!c) return res.status(404).json({ message: 'Complaint not found' });
    res.json(c);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
pr.put('/complaints/:id/resolve', async (req, res) => {
  try {
    const { Complaint } = require('../models');
    const c = await Complaint.findByIdAndUpdate(req.params.id,
      { status: 'SOLVED', resolution: req.body.resolution, solvedAt: new Date() },
      { new: true });
    if (!c) return res.status(404).json({ message: 'Complaint not found' });
    res.json(c);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Staff list (for assign dropdowns)
pr.get('/staff-list', async (req, res) => {
  try {
    const { User } = require('../models');
    const staff = await User.find({
      role: { $in: ['STAFF', 'TECHNICIAN', 'HUB_MANAGER'] },
      active: true,
    }).select('_id name role email').lean();
    res.json(staff || []);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// All staff (staff management page)
pr.get('/all-staff', async (req, res) => {
  try {
    const { User } = require('../models');
    const staff = await User.find({
      role: { $in: ['STAFF', 'TECHNICIAN', 'HUB_MANAGER'] },
    }).select('_id name role email phone active franchiseeId createdAt').lean();
    res.json(staff || []);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Pending staff approvals
pr.get('/pending-staff',               Ap.allStaff);
pr.put('/pending-staff/:id/approve',   Ap.approveStaff);
pr.put('/pending-staff/:id/reject',    Ap.rejectStaff);

// All jobs (cross-franchisee)
pr.get('/all-jobs', async (req, res) => {
  try {
    const { Job } = require('../models');
    const jobs = await Job.find()
      .populate('customerId',   'name email phone')
      .populate('technicianId', 'name role')
      .populate('franchiseeId', 'name email')
      .sort('-createdAt').lean();
    res.json(jobs || []);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Staff attendance (stub — return empty if no Attendance model)
pr.get('/staff-attendance', async (req, res) => {
  try {
    const M = require('../models');
    if (M.Attendance) {
      const records = await M.Attendance.find().sort('-date').limit(500).lean();
      return res.json(records);
    }
    res.json([]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

// Leave requests (stub — return empty if no LeaveRequest model)
pr.get('/leave-requests', async (req, res) => {
  try {
    const M = require('../models');
    if (M.LeaveRequest) {
      const records = await M.LeaveRequest.find().sort('-createdAt').lean();
      return res.json(records);
    }
    res.json([]);
  } catch (e) { res.status(500).json({ message: e.message }); }
});
pr.put('/leave-requests/:id/:action', SP.commandLeaveAction);

// ── Staff communications / HR services for Command Center ───────
pr.get( '/staff-notifications',                    SP.commandNotifications);
pr.post('/staff-notifications',                    SP.commandSendNotification);
pr.get( '/support-tickets',                        SP.commandSupport);
pr.put( '/support-tickets/:id',                    SP.commandSupportUpdate);
pr.post('/staff-documents',                        SP.commandCreateDocument);
pr.post('/staff-payslips',                         SP.commandCreatePayslip);
pr.post('/staff-shifts',                           SP.commandCreateShift);
pr.post('/staff-recognition',                      SP.commandCreateRecognition);
pr.post('/staff-checklists',                       SP.commandCreateChecklist);

r.use('/platform', pr);

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
    const { User, Inventory, PendingVehicle, CommandVehicle } = require('../models');
    const franchisees = await User.find({ role: 'FRANCHISEE' }).select('_id name email').lean();
    const ids = franchisees.map(f => f._id);

    // Fleet-operator submitted vehicles (pending approval flow)
    const vehicleAgg = await PendingVehicle.aggregate([
      { $match: { franchiseeId: { $in: ids } } },
      { $group: {
          _id: '$franchiseeId',
          totalVehicles:    { $sum: 1 },
          approvedVehicles: { $sum: { $cond: [{ $eq: ['$status', 'APPROVED'] }, 1, 0] } },
          pendingVehicles:  { $sum: { $cond: [{ $eq: ['$status', 'PENDING_APPROVAL'] }, 1, 0] } },
      }},
    ]);
    const vehicleMap = new Map(vehicleAgg.map(v => [String(v._id), v]));

    // Command Center assigned vehicles per fleet operator
    const cmdAgg = await CommandVehicle.aggregate([
      { $match: { fleetOperatorId: { $in: ids }, status: { $in: ['ASSIGNED', 'ACTIVE'] } } },
      { $group: { _id: '$fleetOperatorId', assignedVehicles: { $sum: 1 } } },
    ]);
    const cmdMap = new Map(cmdAgg.map(v => [String(v._id), v.assignedVehicles]));

    // Parts inventory totals
    const partTotals = await Inventory.aggregate([
      { $group: { _id: null, totalSkus: { $sum: 1 }, totalQty: { $sum: '$quantity' }, totalValue: { $sum: { $multiply: ['$quantity', '$unitPrice'] } } } }
    ]);

    const stats = franchisees.map(f => {
      const vs  = vehicleMap.get(String(f._id)) || { totalVehicles: 0, approvedVehicles: 0, pendingVehicles: 0 };
      const cmd = cmdMap.get(String(f._id)) || 0;
      return {
        franchiseeId:     String(f._id),
        name:             f.name,
        email:            f.email,
        totalVehicles:    vs.totalVehicles + cmd,
        approvedVehicles: vs.approvedVehicles + cmd,
        pendingVehicles:  vs.pendingVehicles,
        assignedVehicles: cmd,
      };
    });

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

// ── Command Center Vehicle Inventory (new flow) ───────────────────
dr.get(   '/vehicles',             Ad.listVehicles);
dr.post(  '/vehicles',             Ad.createVehicle);
dr.put(   '/vehicles/:id',         Ad.updateVehicle);
dr.delete('/vehicles/:id',         Ad.deleteVehicle);
dr.put(   '/vehicles/:id/assign',  Ad.assignVehicle);

// ── Command Center Spare Parts ────────────────────────────────────
dr.post('/parts', Ad.createPart);

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
dr.get('/wallet-transactions', Ad.walletTransactions);
dr.get('/customers',         Ad.customers);
dr.get('/customers/:id',     Ad.customerDetail);

// Vehicle Purchases (Command Center)
dr.get('/purchases',              Rn.allRentals);

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