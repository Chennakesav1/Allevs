/**
 * controllers/approvals.js
 *
 * Handles pending vehicle and staff submissions from franchisees.
 * Both portals talk to the same MongoDB — no localStorage cross-origin hacks needed.
 */

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const { PendingVehicle, PendingStaff, User, VehicleRental } = require('../models');
const audit = require('../services/audit');

// ── Email transport ─────────────────────────────────────────────
function createTransport() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

async function sendMail(to, subject, html) {
  try {
    const t = createTransport();
    await t.sendMail({ from: process.env.EMAIL_FROM, to, subject, html });
  } catch (e) {
    console.error('Email send error:', e.message);
  }
}

// ── OTP store (in-memory, ok for single-instance) ──────────────
const otpStore = new Map(); // key: email => { otp, expiry }
const verifiedStaffEmailStore = new Map(); // email => expiry, used by Command Center staff creation

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// ── Helpers ──────────────────────────────────────────────────────
function genPassword(len = 12) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ═══════════════════════════════════════════════════════════════
// EMAIL OTP VERIFICATION (for franchisee staff form)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/franchise/staff-otp/send
 * Send a 6-digit OTP to the provided staff email for verification.
 */
exports.sendStaffEmailOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const otp = generateOtp();
    const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
    otpStore.set(email.toLowerCase(), { otp, expiry });
    await sendMail(email, 'EV Core — Email Verification OTP', `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1d4ed8">Staff Email Verification</h2>
        <p>Use the OTP below to verify this email address for the staff account creation.</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1d4ed8;padding:16px 0">${otp}</div>
        <p style="color:#6b7280;font-size:13px">This OTP expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `);
    res.json({ message: 'OTP sent to ' + email });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * POST /api/franchise/staff-otp/verify
 * Verify the OTP for the given email.
 */
exports.verifyStaffEmailOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });
  const stored = otpStore.get(email.toLowerCase());
  if (!stored) return res.status(400).json({ message: 'OTP not found or expired — please request again' });
  if (Date.now() > stored.expiry) {
    otpStore.delete(email.toLowerCase());
    return res.status(400).json({ message: 'OTP expired — please request again' });
  }
  if (stored.otp !== String(otp)) return res.status(400).json({ message: 'Invalid OTP' });
  otpStore.delete(email.toLowerCase());
  verifiedStaffEmailStore.set(email.toLowerCase(), Date.now() + 15 * 60 * 1000);
  res.json({ verified: true, message: 'Email verified successfully' });
};

// ═══════════════════════════════════════════════════════════════
// STAFF FORGOT PASSWORD (for staff portal login)
// ═══════════════════════════════════════════════════════════════

/**
 * POST /api/auth/staff/forgot-password
 * Send OTP to staff email to reset password.
 */
exports.staffForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(404).json({ message: 'No account found with this email' });
    const ALLOWED = ['TECHNICIAN','STAFF','HUB_MANAGER','CENTRAL_ADMIN','SUPER_ADMIN'];
    if (!ALLOWED.includes(user.role)) return res.status(403).json({ message: 'This email is not a staff account' });
    const otp = generateOtp();
    const expiry = Date.now() + 10 * 60 * 1000;
    otpStore.set('reset:' + email.toLowerCase(), { otp, expiry, userId: user._id.toString() });
    await sendMail(email, 'EV Core — Password Reset OTP', `
      <div style="font-family:sans-serif;max-width:480px;margin:auto">
        <h2 style="color:#1d4ed8">Password Reset Request</h2>
        <p>Use this OTP to reset your Staff Portal password:</p>
        <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#1d4ed8;padding:16px 0">${otp}</div>
        <p style="color:#6b7280;font-size:13px">This OTP expires in 10 minutes. If you didn't request this, ignore this email.</p>
      </div>
    `);
    res.json({ message: 'OTP sent to ' + email });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/**
 * POST /api/auth/staff/verify-reset-otp
 * Verify OTP sent for password reset.
 */
exports.staffVerifyResetOtp = async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) return res.status(400).json({ message: 'Email and OTP required' });
  const stored = otpStore.get('reset:' + email.toLowerCase());
  if (!stored) return res.status(400).json({ message: 'OTP not found or expired' });
  if (Date.now() > stored.expiry) {
    otpStore.delete('reset:' + email.toLowerCase());
    return res.status(400).json({ message: 'OTP expired — please request again' });
  }
  if (stored.otp !== String(otp)) return res.status(400).json({ message: 'Invalid OTP' });
  // Don't delete yet — keep for reset step
  res.json({ verified: true, message: 'OTP verified' });
};

/**
 * POST /api/auth/staff/reset-password
 * Set new password after OTP verification.
 */
exports.staffResetPassword = async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword) return res.status(400).json({ message: 'Email, OTP, and new password are required' });
  if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
  const stored = otpStore.get('reset:' + email.toLowerCase());
  if (!stored) return res.status(400).json({ message: 'Session expired — please start over' });
  if (Date.now() > stored.expiry) {
    otpStore.delete('reset:' + email.toLowerCase());
    return res.status(400).json({ message: 'OTP expired — please start over' });
  }
  if (stored.otp !== String(otp)) return res.status(400).json({ message: 'Invalid OTP' });
  otpStore.delete('reset:' + email.toLowerCase());
  const hash = await bcrypt.hash(newPassword, 12);
  await User.findOneAndUpdate({ email: email.toLowerCase() }, { passwordHash: hash });
  res.json({ message: 'Password updated successfully. You can now log in.' });
};

// ═══════════════════════════════════════════════════════════════
// PENDING VEHICLES
// ═══════════════════════════════════════════════════════════════

/** POST /api/franchise/pending-vehicles */
exports.submitVehicle = async (req, res) => {
  try {
    const record = await PendingVehicle.create({
      franchiseeId:    req.user._id,
      franchiseeName:  req.user.name,
      franchiseeEmail: req.user.email,
      ...req.body,
      quantity: Math.max(0, Number(req.body.quantity ?? 1)),
      status: 'PENDING_APPROVAL',
    });
    await audit(req.user._id, 'SUBMIT', 'PendingVehicle', record._id);
    res.status(201).json(record);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

/** GET /api/franchise/pending-vehicles */
exports.myVehicles = async (req, res) => {
  const filter = req.user.role === 'FRANCHISEE' ? { franchiseeId: req.user._id } : {};
  const rows = await PendingVehicle.find(filter).sort('-createdAt').lean();
  res.json(rows.map(v => ({ ...v, quantity: v.quantity == null ? 1 : v.quantity })));
};

/** GET /api/admin/pending-vehicles */
exports.allVehicles = async (req, res) => {
  const rows = await PendingVehicle.find().sort('-createdAt').lean();
  res.json(rows.map(v => ({ ...v, quantity: v.quantity == null ? 1 : v.quantity })));
};

/** GET /api/customer/available-vehicles */
exports.availableVehicles = async (req, res) => {
  try {
    const { CommandVehicle } = require('../models');
    const pin = req.query.pincode || '';
    const customer = req.user ? await User.findById(req.user._id).select('address').lean() : null;
    const address = customer?.address || {};

    // 1. PendingVehicle — fleet-operator submitted & approved by admin
    const pendingDocs = await PendingVehicle.find({
      status: 'APPROVED',
    }).sort('-reviewedAt').lean();

    // 2. CommandVehicle — created by Command Center and assigned to a fleet operator
    const cmdDocs = await CommandVehicle.find({
      status: 'ACTIVE',
      fleetInventoryStatus: 'ACTIVE',
      fleetOperatorId: { $exists: true, $ne: null },
    }).sort('-assignedAt').lean();

    // A booking reserves inventory logically. Physical quantity is reduced only
    // at handover, so calculate reservation state separately from stock quantity.
    const reservationCutoff = new Date(Date.now() - 15 * 60 * 1000);
    const reservationRows = await VehicleRental.aggregate([
      { $match: {
          paymentStatus: { $in: ['PENDING','PAID'] },
          status: { $in: ['BOOKED','PAYMENT_DONE','HANDOVER_PENDING'] },
          $or: [
            { paymentStatus: 'PAID' },
            { paymentStatus: 'PENDING', createdAt: { $gte: reservationCutoff } }
          ]
      }},
      { $group: { _id: '$vehicleId', reservedQuantity: { $sum: 1 } } }
    ]);
    const reservationMap = new Map(reservationRows.map(r => [String(r._id), Number(r.reservedQuantity || 0)]));

    // Collect all fleet operator IDs for address lookup
    const allFranchiseeIds = [
      ...new Set([
        ...pendingDocs.map(v => String(v.franchiseeId)).filter(Boolean),
        ...cmdDocs.map(v => String(v.fleetOperatorId)).filter(Boolean),
      ]),
    ];
    const franchisees = allFranchiseeIds.length
      ? await User.find({ _id: { $in: allFranchiseeIds }, role: 'FRANCHISEE' }).select('name address').lean()
      : [];
    const fm = new Map(franchisees.map(f => [String(f._id), f]));

    // Scoring: lower = closer to customer
    const score = (franchiseeId) => {
      const a = fm.get(String(franchiseeId))?.address || {};
      if (pin && a.pincode === pin) return 0;
      if (a.pincode && a.pincode === address.pincode) return 0;
      if (a.district && address.district && a.district.toLowerCase() === address.district.toLowerCase()) return 1;
      if (a.state && address.state && a.state.toLowerCase() === address.state.toLowerCase()) return 2;
      return 3;
    };

    // Normalise PendingVehicle docs. A quantity represents individual physical units,
    // so expose every unit separately to the customer portal. If explicit bikeIds
    // exist, use them; otherwise keep the parent record's bikeId/registration identity.
    const normPending = pendingDocs.flatMap(v => {
      const qty = Math.max(0, Number(v.quantity == null ? 1 : v.quantity));
      const displayCount = qty > 0 ? qty : 1;
      const ids = Array.isArray(v.bikeIds) ? v.bikeIds.filter(Boolean) : [];
      return Array.from({ length: displayCount }, (_, i) => ({
        ...v,
        _id: v._id,
        displayId: ids[i] || v.bikeId || (qty > 1 ? `${v.registrationNo || 'BIKE'}-${i + 1}` : undefined),
        bikeId: ids[i] || v.bikeId || (qty > 1 ? `${v.registrationNo || 'BIKE'}-${i + 1}` : undefined),
        _parentVehicleId: v._id,
        _unitIndex: i + 1,
        _source: 'fleet_submission',
        quantity: qty > 0 ? 1 : 0,
        _stockQuantity: qty > 0 ? 1 : 0,
        _reservedQuantity: qty > 0 && i < Math.min(qty, reservationMap.get(String(v._id)) || 0) ? 1 : 0,
        _availableQuantity: qty > 0 && i < Math.min(qty, reservationMap.get(String(v._id)) || 0) ? 0 : (qty > 0 ? 1 : 0),
        _availabilityStatus: qty <= 0
          ? 'UNAVAILABLE'
          : (i < Math.min(qty, reservationMap.get(String(v._id)) || 0) ? 'RESERVED' : 'AVAILABLE'),
        franchiseeId: v.franchiseeId,
        franchiseeName: fm.get(String(v.franchiseeId))?.name || v.franchiseeName || 'EV CORE Fleet',
        franchiseeAddress: fm.get(String(v.franchiseeId))?.address || null,
        _score: score(v.franchiseeId),
      }));
    });

    // Normalise CommandVehicle docs — map fields to same shape
    const normCmd = cmdDocs.map(v => ({
      ...v,
      _source:          'command_center',
      quantity:         v.quantity == null ? 1 : v.quantity,
      _stockQuantity:   Math.max(0, Number(v.quantity == null ? 1 : v.quantity)),
      _reservedQuantity: Math.min(
        Math.max(0, Number(v.quantity == null ? 1 : v.quantity)),
        reservationMap.get(String(v._id)) || 0
      ),
      _availableQuantity: Math.max(
        0,
        Math.max(0, Number(v.quantity == null ? 1 : v.quantity)) - (reservationMap.get(String(v._id)) || 0)
      ),
      _availabilityStatus: Math.max(0, Number(v.quantity == null ? 1 : v.quantity)) <= 0
        ? 'UNAVAILABLE'
        : (reservationMap.get(String(v._id)) || 0) >= Math.max(0, Number(v.quantity == null ? 1 : v.quantity))
          ? 'RESERVED' : 'AVAILABLE',
      // reuse franchiseeId field so customer portal works unchanged
      franchiseeId:     v.fleetOperatorId,
      franchiseeName:   fm.get(String(v.fleetOperatorId))?.name || v.fleetOperatorName || 'EV CORE Fleet',
      franchiseeAddress:fm.get(String(v.fleetOperatorId))?.address || null,
      // status normalise — customer portal checks for APPROVED
      status:           'APPROVED',
      _score:           score(v.fleetOperatorId),
    }));

    const all = [...normPending, ...normCmd].sort((a, b) => a._score - b._score);
    res.json(all);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** PUT /api/admin/pending-vehicles/:id/approve */
exports.approveVehicle = async (req, res) => {
  const doc = await PendingVehicle.findByIdAndUpdate(
    req.params.id,
    { status: 'APPROVED', reviewedBy: req.user._id, reviewedAt: new Date() },
    { new: true }
  );
  if (!doc) return res.status(404).json({ message: 'Submission not found' });
  await audit(req.user._id, 'APPROVE', 'PendingVehicle', doc._id);
  res.json(doc);
};

/** PUT /api/admin/pending-vehicles/:id/reject */
exports.rejectVehicle = async (req, res) => {
  const doc = await PendingVehicle.findByIdAndUpdate(
    req.params.id,
    { status: 'REJECTED', reviewedBy: req.user._id, reviewedAt: new Date(), rejectionReason: req.body.reason || '' },
    { new: true }
  );
  if (!doc) return res.status(404).json({ message: 'Submission not found' });
  await audit(req.user._id, 'REJECT', 'PendingVehicle', doc._id);
  res.json(doc);
};

// ═══════════════════════════════════════════════════════════════
// COMMAND CENTER STAFF CREATION
// ═══════════════════════════════════════════════════════════════
exports.createCommandStaff = async (req, res) => {
  try {
    const { name, email, phone, aadharNumber, panNumber, profileImage, role, joiningDate } = req.body;
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!name || !normalizedEmail || !phone || !aadharNumber || !panNumber || !role)
      return res.status(400).json({ message: 'Name, email, phone, Aadhaar, PAN and role are required.' });

    const verifiedUntil = verifiedStaffEmailStore.get(normalizedEmail);
    if (!verifiedUntil || Date.now() > verifiedUntil) {
      verifiedStaffEmailStore.delete(normalizedEmail);
      return res.status(400).json({ message: 'Please verify the staff email with OTP before creating the account.' });
    }

    const allowedRoles = ['STAFF','TECHNICIAN','HUB_MANAGER'];
    if (!allowedRoles.includes(String(role))) return res.status(400).json({ message: 'Invalid staff role.' });

    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ message: `A user with email ${normalizedEmail} already exists.` });
    const phoneExisting = await User.findOne({ phone: String(phone).trim() });
    if (phoneExisting) return res.status(409).json({ message: 'A user with this phone number already exists.' });

    const plainPw = genPassword();
    const hash = await bcrypt.hash(plainPw, 12);
    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      phone: String(phone).trim(),
      aadharNumber: String(aadharNumber).trim(),
      panNumber: String(panNumber).trim().toUpperCase(),
      profileImage: profileImage || undefined,
      role: String(role),
      joiningDate: joiningDate ? new Date(joiningDate) : undefined,
      passwordHash: hash,
      isPasswordSet: true,
      active: true,
    });

    verifiedStaffEmailStore.delete(normalizedEmail);
    await audit(req.user._id, 'CREATE', 'User', user._id);
    res.status(201).json({
      message: 'Staff account created successfully.',
      staff: {
        _id: user._id, name: user.name, email: user.email, phone: user.phone,
        aadharNumber: user.aadharNumber, panNumber: user.panNumber,
        profileImage: user.profileImage, role: user.role, active: user.active,
        joiningDate: user.joiningDate, createdAt: user.createdAt,
      },
      password: plainPw,
    });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// PENDING STAFF
// ═══════════════════════════════════════════════════════════════

/** POST /api/franchise/pending-staff */
exports.submitStaff = async (req, res) => {
  try {
    const record = await PendingStaff.create({
      franchiseeId:    req.user._id,
      franchiseeName:  req.user.name,
      franchiseeEmail: req.user.email,
      ...req.body,
      quantity: Math.max(0, Number(req.body.quantity ?? 1)),
      status: 'PENDING_APPROVAL',
    });
    await audit(req.user._id, 'SUBMIT', 'PendingStaff', record._id);
    res.status(201).json(record);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

/** GET /api/franchise/pending-staff */
exports.myStaff = async (req, res) => {
  const filter = req.user.role === 'FRANCHISEE' ? { franchiseeId: req.user._id } : {};
  res.json(await PendingStaff.find(filter).sort('-createdAt'));
};

/** GET /api/admin/pending-staff */
exports.allStaff = async (req, res) => {
  res.json(await PendingStaff.find().sort('-createdAt'));
};

/** PUT /api/admin/pending-staff/:id/approve */
exports.approveStaff = async (req, res) => {
  const doc = await PendingStaff.findById(req.params.id);
  if (!doc) return res.status(404).json({ message: 'Submission not found' });
  if (doc.status !== 'PENDING_APPROVAL')
    return res.status(409).json({ message: `Already ${doc.status}` });

  const ROLE_MAP = {
    'Technician':       'TECHNICIAN',
    'Service Manager':  'HUB_MANAGER',
    'Hub Supervisor':   'HUB_MANAGER',
    'Driver':           'STAFF',
    'Customer Support': 'STAFF',
    'Security':         'STAFF',
  };
  const userRole = ROLE_MAP[doc.role] || 'STAFF';
  const plainPw  = genPassword();
  const hash     = await bcrypt.hash(plainPw, 12);

  const existing = await User.findOne({ email: doc.email });
  if (existing) return res.status(409).json({ message: `A user with email ${doc.email} already exists.` });

  const newUser = await User.create({
    name:         doc.name,
    email:        doc.email,
    phone:        doc.phone || undefined,
    passwordHash: hash,
    role:         userRole,
    franchiseeId: doc.franchiseeId,
    active:       true,
  });

  await PendingStaff.findByIdAndUpdate(doc._id, {
    status:           'APPROVED',
    reviewedBy:       req.user._id,
    reviewedAt:       new Date(),
    assignedPassword: '[generated — see response]',
    userId:           newUser._id,
  });

  await audit(req.user._id, 'APPROVE', 'PendingStaff', doc._id);

  res.json({
    message:  'Staff approved and account created.',
    staffId:  doc._id,
    userId:   newUser._id,
    name:     doc.name,
    email:    doc.email,
    role:     userRole,
    password: plainPw,
    franchiseeName: doc.franchiseeName,
  });
};

/** PUT /api/admin/pending-staff/:id/reject */
exports.rejectStaff = async (req, res) => {
  const doc = await PendingStaff.findByIdAndUpdate(
    req.params.id,
    { status: 'REJECTED', reviewedBy: req.user._id, reviewedAt: new Date(), rejectionReason: req.body.reason || '' },
    { new: true }
  );
  if (!doc) return res.status(404).json({ message: 'Submission not found' });
  await audit(req.user._id, 'REJECT', 'PendingStaff', doc._id);
  res.json(doc);
};

/**
 * PUT /api/franchise/pending-staff/:id/remove
 * Franchisee removes a staff member (marks as removed, disables login).
 */
exports.removeStaffFromFranchisee = async (req, res) => {
  try {
    const doc = await PendingStaff.findOne({ _id: req.params.id, franchiseeId: req.user._id });
    if (!doc) return res.status(404).json({ message: 'Staff record not found' });
    // Disable user login if a User was created
    if (doc.userId) {
      await User.findByIdAndUpdate(doc.userId, { active: false });
    }
    await PendingStaff.findByIdAndUpdate(doc._id, { removedFromFranchisee: true, removedAt: new Date() });
    await audit(req.user._id, 'REMOVE', 'PendingStaff', doc._id);
    res.json({ message: 'Staff member removed. Login has been disabled.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
// ═══════════════════════════════════════════════════════════════
// UPDATE VEHICLE (franchisee edits own vehicle)
// ═══════════════════════════════════════════════════════════════

/** PUT /api/franchise/pending-vehicles/:id */
exports.updateVehicle = async (req, res) => {
  try {
    const filter = req.user.role === 'FRANCHISEE'
      ? { _id: req.params.id, franchiseeId: req.user._id }
      : { _id: req.params.id };

    const doc = await PendingVehicle.findOne(filter);
    if (!doc) return res.status(404).json({ message: 'Vehicle not found or access denied.' });

    // Allow editing; if the vehicle was approved and key fields change, re-queue for approval
    const sensitiveFields = ['pricePerDay', 'quantity', 'make', 'model', 'registrationNo', 'category'];
    const needsReApproval = sensitiveFields.some(
      f => req.body[f] !== undefined && String(req.body[f]) !== String(doc[f])
    );

    const allowedFields = [
      'category','make','model','year','color','registrationNo',
      'batteryCapacityKwh','rangeKm','chargingType','pricePerDay',
      'description','quantity','images',
    ];

    const updates = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    if (needsReApproval && doc.status === 'APPROVED') {
      updates.status = 'PENDING_APPROVAL';
      updates.reviewedBy  = undefined;
      updates.reviewedAt  = undefined;
    }

    if (updates.quantity !== undefined) updates.quantity = Math.max(0, Number(updates.quantity));
    if (updates.pricePerDay !== undefined) updates.pricePerDay = Number(updates.pricePerDay);

    const updated = await PendingVehicle.findByIdAndUpdate(doc._id, updates, { new: true });
    await audit(req.user._id, 'UPDATE', 'PendingVehicle', doc._id, updates);
    res.json({ ...updated.toObject(), reQueued: needsReApproval && doc.status === 'APPROVED' });
  } catch (e) {
    console.error('updateVehicle error:', e);
    res.status(500).json({ message: e.message });
  }
};