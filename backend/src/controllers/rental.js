/**
 * rental.js
 * Handles: create Razorpay order, verify payment, get rentals,
 *          command-center handover, customer my-vehicles (rentals),
 *          invoice generation + email, invoice download (PDF).
 */
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const { VehicleRental, PendingVehicle, Invoice, User, Financial, Job } = require('../models');
const audit = require('../services/audit');

// ── Razorpay helper ──────────────────────────────────────────────────
function getRazorpay() {
  const Razorpay = require('razorpay');
  return new Razorpay({
    key_id:     process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
}

// ── Email transporter ────────────────────────────────────────────────
function getMailer() {
  return nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// ── Invoice number generator ─────────────────────────────────────────
function invoiceNo() {
  return `INV-RNT-${Date.now()}`;
}

// ── HTML invoice builder ─────────────────────────────────────────────
function buildInvoiceHTML(rental, customer, inv) {
  const vs   = rental.vehicleSnapshot || {};
  const fmt  = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  const date = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  const subtotal = inv?.subtotal ?? rental.totalAmount ?? 0;
  const total    = inv?.total ?? subtotal;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;background:#f4f6fa;color:#1a1f2e;font-size:14px}
  .wrap{max-width:700px;margin:30px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.10)}
  .header{background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;padding:32px 36px;display:flex;justify-content:space-between;align-items:flex-start}
  .header h1{font-size:26px;font-weight:800;letter-spacing:-0.5px}
  .header .sub{opacity:.8;font-size:13px;margin-top:2px}
  .badge{background:rgba(255,255,255,.18);padding:6px 14px;border-radius:99px;font-size:12px;font-weight:700;margin-top:8px;display:inline-block}
  .body{padding:32px 36px}
  .meta{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:28px}
  .meta-box{background:#f8faff;border:1px solid #e4e9f7;border-radius:10px;padding:16px}
  .meta-box .label{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px;font-weight:600}
  .meta-box .val{font-size:14px;color:#1a1f2e;font-weight:600;line-height:1.5}
  table{width:100%;border-collapse:collapse;margin-bottom:20px}
  thead tr{background:#f1f5fd}
  th{padding:10px 14px;text-align:left;font-size:12px;font-weight:700;color:#4b5563;text-transform:uppercase;letter-spacing:.4px}
  td{padding:11px 14px;border-bottom:1px solid #f0f2f8;font-size:13px}
  .totals{margin-left:auto;width:280px}
  .totals tr td{font-size:13px;padding:7px 0}
  .totals tr td:last-child{text-align:right;font-weight:600}
  .totals .grand td{font-size:16px;font-weight:800;color:#2563eb;padding-top:10px;border-top:2px solid #e4e9f7}
  .footer{background:#f8faff;border-top:1px solid #e4e9f7;padding:20px 36px;text-align:center;font-size:12px;color:#94a3b8}
  .status{display:inline-block;padding:3px 12px;border-radius:99px;font-size:11px;font-weight:700;background:#d1fae5;color:#059669}
</style>
</head>
<body>
<div class="wrap">
  <div class="header">
    <div>
      <h1>⚡ EV CORE</h1>
      <div class="sub">Electric Vehicle Rental Platform</div>
      <div class="badge">INVOICE</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:18px;font-weight:800">${inv.invoiceNo}</div>
      <div style="opacity:.8;font-size:12px;margin-top:4px">Date: ${date(inv.createdAt || new Date())}</div>
      <div style="margin-top:8px"><span class="status">PAID</span></div>
    </div>
  </div>

  <div class="body">
    <div class="meta">
      <div class="meta-box">
        <div class="label">Billed To</div>
        <div class="val">
          ${customer.name || 'Customer'}<br/>
          ${customer.email || ''}<br/>
          ${customer.phone ? '+91 ' + customer.phone : ''}
        </div>
      </div>
      <div class="meta-box">
        <div class="label">Rental Details</div>
        <div class="val">
          ${vs.make || ''} ${vs.model || ''} (${vs.year || ''})<br/>
          Reg: ${vs.registrationNo || '—'}<br/>
          ${vs.category || ''}
        </div>
      </div>
      <div class="meta-box">
        <div class="label">Payment Reference</div>
        <div class="val">
          Razorpay: ${rental.razorpayPaymentId || '—'}<br/>
          Order: ${rental.razorpayOrderId || '—'}
        </div>
      </div>
      <div class="meta-box">
        <div class="label">Franchisee Pickup Location</div>
        <div class="val">${[rental.pickupLocation?.name || rental.franchiseeName, rental.pickupLocation?.address].filter(Boolean).join('<br/>') || '—'}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th>From</th>
          <th>To</th>
          <th>Days</th>
          <th>Rate/Day</th>
          <th>Amount</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>${vs.make || ''} ${vs.model || ''} Rental</td>
          <td>${date(rental.startDate)}</td>
          <td>${date(rental.endDate)}</td>
          <td>${rental.durationDays || 1}</td>
          <td>${fmt(rental.pricePerDay)}</td>
          <td>${fmt(subtotal)}</td>
        </tr>
      </tbody>
    </table>

    <table class="totals">
      <tr class="grand"><td>Total Paid</td><td>${fmt(total)}</td></tr>
    </table>

    <div style="margin-top:24px;padding:14px 18px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;font-size:13px;color:#166534">
      ✅ Payment received via Razorpay. Thank you for choosing EV CORE!
    </div>
  </div>

  <div class="footer">
    EV CORE · Electric Vehicle Rental Platform · support@evcore.in<br/>
    This is a computer-generated invoice and does not require a signature.
  </div>
</div>
</body>
</html>`;
}

// ── Send invoice email ────────────────────────────────────────────────
async function sendInvoiceEmail(customer, rental, inv) {
  try {
    const mailer  = getMailer();
    const html    = buildInvoiceHTML(rental, customer, inv);
    const vs      = rental.vehicleSnapshot || {};
    await mailer.sendMail({
      from:    process.env.EMAIL_FROM || '"EV Core" <noreply@evcore.in>',
      to:      customer.email,
      subject: `Invoice ${inv.invoiceNo} — ${vs.make} ${vs.model} Rental`,
      html,
    });
    console.log(`Invoice email sent to ${customer.email}`);
  } catch (e) {
    console.error('Invoice email error:', e.message);
    // Non-fatal — don't throw, payment is already confirmed
  }
}

// ── POST /customer/rentals/create-order ──────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const {
      vehicleId, franchiseeId, pincode, state, district, area, fullAddress,
      startDate, endDate, durationDays,
    } = req.body;
    if (!vehicleId) return res.status(400).json({ message: 'vehicleId is required' });

    const vehicle = await PendingVehicle.findById(vehicleId);
    if (!vehicle || vehicle.status !== 'APPROVED')
      return res.status(404).json({ message: 'Vehicle not found or not available' });

    // The vehicle's franchisee is authoritative. A customer may choose which
    // nearest franchisee to browse, but the booking can only belong to the
    // franchisee that owns the selected vehicle. This guarantees that only
    // that franchisee can perform the handover.
    if (!vehicle.franchiseeId) {
      return res.status(400).json({ message: 'This vehicle is not assigned to a franchisee and cannot be booked.' });
    }
    if (franchiseeId && String(franchiseeId) !== String(vehicle.franchiseeId)) {
      return res.status(409).json({ message: 'Selected franchisee does not own this vehicle.' });
    }
    const franchisee = await User.findOne({ _id: vehicle.franchiseeId, role: 'FRANCHISEE', active: true })
      .select('name address').lean();
    if (!franchisee) return res.status(404).json({ message: "The vehicle's franchisee is not available." });
    const fa = franchisee.address || {};

    const days   = durationDays || 1;
    if (vehicle.quantity == null) { vehicle.quantity = 1; await vehicle.save(); }
    if (Number(vehicle.quantity) <= 0) return res.status(409).json({ message: 'Vehicle is currently out of stock' });
    const amount = Math.round((vehicle.pricePerDay || 0) * days * 100); // paise

    const rz      = getRazorpay();
    const rzOrder = await rz.orders.create({
      amount,
      currency: 'INR',
      receipt:  `rental_${Date.now()}`,
      notes: { vehicleId: String(vehicleId), customerId: String(req.user._id) },
    });

    const rental = await VehicleRental.create({
      customerId:      req.user._id,
      vehicleId,
      franchiseeId:     vehicle.franchiseeId || undefined,
      franchiseeName:   franchisee?.name || vehicle.franchiseeName || 'EV CORE franchise',
      pickupLocation: {
        name: franchisee?.name || vehicle.franchiseeName || 'EV CORE franchise',
        address: [fa.line1, fa.line2, fa.city, fa.district, fa.state, fa.pincode].filter(Boolean).join(', '),
        city: fa.city || '',
        district: fa.district || '',
        state: fa.state || '',
        pincode: fa.pincode || '',
        lat: Number(fa.latitude ?? fa.lat) || undefined,
        lng: Number(fa.longitude ?? fa.lng) || undefined,
      },
      pincode, state, district, area, fullAddress,
      customerLocation: { pincode, state, district, area, fullAddress },
      startDate,  endDate,
      durationDays: days,
      pricePerDay:  vehicle.pricePerDay,
      totalAmount:  vehicle.pricePerDay * days,
      razorpayOrderId: rzOrder.id,
      paymentStatus:   'PENDING',
      status:          'BOOKED',
      bookingHistory: [{
        event: 'BOOKING_CREATED',
        at: new Date(),
        paymentStatus: 'PENDING',
        status: 'BOOKED',
        customerLocation: { pincode, state, district, area, fullAddress },
        franchisee: { id: vehicle.franchiseeId, name: franchisee?.name || vehicle.franchiseeName || 'EV CORE franchise' },
        pickupLocation: {
          name: franchisee?.name || vehicle.franchiseeName || 'EV CORE franchise',
          address: [fa.line1, fa.line2, fa.city, fa.district, fa.state, fa.pincode].filter(Boolean).join(', '),
          city: fa.city || '', district: fa.district || '', state: fa.state || '', pincode: fa.pincode || '',
          lat: Number(fa.latitude ?? fa.lat) || undefined,
          lng: Number(fa.longitude ?? fa.lng) || undefined,
        },
        vehicle: { make: vehicle.make, model: vehicle.model, year: vehicle.year, registrationNo: vehicle.registrationNo },
        startDate, endDate, durationDays: days, pricePerDay: vehicle.pricePerDay, totalAmount: vehicle.pricePerDay * days,
      }],
      vehicleSnapshot: {
        make:               vehicle.make,
        model:              vehicle.model,
        year:               vehicle.year,
        color:              vehicle.color,
        category:           vehicle.category,
        registrationNo:     vehicle.registrationNo,
        batteryCapacityKwh: vehicle.batteryCapacityKwh,
        rangeKm:            vehicle.rangeKm,
        chargingType:       vehicle.chargingType,
        pricePerDay:        vehicle.pricePerDay,
        images:             vehicle.images,
        description:        vehicle.description,
        franchiseeId:       vehicle.franchiseeId || undefined,
        franchiseeName:     franchisee?.name || vehicle.franchiseeName || 'EV CORE franchise',
      },
    });

    res.status(201).json({
      rentalId: rental._id,
      orderId:  rzOrder.id,
      amount:   rzOrder.amount,
      currency: rzOrder.currency,
      keyId:    process.env.RAZORPAY_KEY_ID,
      vehicle:  { make: vehicle.make, model: vehicle.model, pricePerDay: vehicle.pricePerDay },
    });
  } catch (e) {
    console.error('createOrder error:', e);
    res.status(500).json({ message: e.message });
  }
};

// ── POST /customer/rentals/verify-payment ────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { rentalId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const rental = await VehicleRental.findOne({ _id: rentalId, customerId: req.user._id });
    if (!rental) return res.status(404).json({ message: 'Rental not found' });

    // Verify Razorpay signature
    const expectedSig = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSig !== razorpay_signature) {
      rental.paymentStatus = 'FAILED';
      rental.bookingHistory = rental.bookingHistory || [];
      rental.bookingHistory.push({ event: 'PAYMENT_FAILED', at: new Date(), paymentStatus: 'FAILED', status: rental.status, razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id || null, reason: 'Payment signature verification failed' });
      await rental.save();
      return res.status(400).json({ message: 'Payment signature verification failed' });
    }

    // IMPORTANT: stock changes only after Razorpay signature verification succeeds.
    // The atomic update prevents two successful customers from consuming the same last unit.
    if (rental.paymentStatus === 'PAID') {
      return res.json({ success: true, rental, alreadyProcessed: true });
    }
    const stock = await PendingVehicle.findOneAndUpdate(
      { _id: rental.vehicleId, status: 'APPROVED', $or: [{ quantity: { $gt: 0 } }, { quantity: { $exists: false } }] },
      [{ $set: { quantity: { $subtract: [{ $ifNull: ['$quantity', 1] }, 1] } } }],
      { new: true }
    );
    if (!stock) {
      rental.paymentStatus = 'FAILED';
      rental.bookingHistory = rental.bookingHistory || [];
      rental.bookingHistory.push({ event: 'PAYMENT_FAILED', at: new Date(), paymentStatus: 'FAILED', status: rental.status, razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id || null, reason: 'Vehicle unavailable after payment verification' });
      await rental.save();
      return res.status(409).json({ message: 'Payment was received, but this vehicle is no longer available. Please contact EV CORE support for a refund.' });
    }
    rental.razorpayPaymentId = razorpay_payment_id;
    rental.razorpaySignature = razorpay_signature;
    rental.paymentStatus     = 'PAID';
    rental.status            = 'PAYMENT_DONE';
    rental.bookingHistory = rental.bookingHistory || [];
    rental.bookingHistory.push({
      event: 'PAYMENT_SUCCESS', at: new Date(), paymentStatus: 'PAID', status: 'PAYMENT_DONE',
      razorpayOrderId: razorpay_order_id, razorpayPaymentId: razorpay_payment_id,
      amount: rental.totalAmount || 0, customerLocation: rental.customerLocation || { pincode:rental.pincode, state:rental.state, district:rental.district, area:rental.area, fullAddress:rental.fullAddress },
      pickupLocation: rental.pickupLocation, franchiseeId: rental.franchiseeId, franchiseeName: rental.franchiseeName,
      vehicle: rental.vehicleSnapshot, startDate:rental.startDate, endDate:rental.endDate, durationDays:rental.durationDays,
    });
    await rental.save();

    await audit(req.user._id, 'PAYMENT', 'VehicleRental', rental._id);
    if (stock.franchiseeId) {
      await Financial.create({
        franchiseeId: stock.franchiseeId, kind: 'REVENUE', category: 'VEHICLE_RENTAL',
        amount: rental.totalAmount || 0, referenceId: rental._id,
        description: `${stock.make || ''} ${stock.model || ''} rental payment`,
      });
    }

    // ── Generate Invoice ──────────────────────────────────────────
    const vs       = rental.vehicleSnapshot || {};
    const subtotal = rental.totalAmount || 0;
    const total    = subtotal;

    const inv = await Invoice.create({
      invoiceNo:  invoiceNo(),
      customerId: rental.customerId,
      rentalId:   rental._id,
      items: [{
        description: `${vs.make || ''} ${vs.model || ''} Rental (${rental.durationDays} day${rental.durationDays !== 1 ? 's' : ''})`,
        qty:  rental.durationDays || 1,
        rate: rental.pricePerDay  || 0,
        amount: subtotal,
      }],
      subtotal,
      tax:   0,
      total,
      status: 'PAID',
    });

    // ── Send invoice email (non-blocking) ─────────────────────────
    const customer = await User.findById(req.user._id).lean();
    sendInvoiceEmail(customer, rental, inv); // fire-and-forget

    res.json({ success: true, rental, invoiceId: inv._id, invoiceNo: inv.invoiceNo });
  } catch (e) {
    console.error('verifyPayment error:', e);
    res.status(500).json({ message: e.message });
  }
};


// ── POST /customer/rentals/:id/extend/create-order ────────────────────
exports.createExtensionOrder = async (req, res) => {
  try {
    const rental = await VehicleRental.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    if (rental.status !== 'ACTIVE') return res.status(400).json({ message: 'Only active rentals can be extended.' });
    // A newly created order supersedes any abandoned extension checkout. The
    // verification endpoint accepts only the latest pending order, so an older
    // checkout cannot extend the rental twice.

    const days = Number(req.body.days);
    if (!Number.isInteger(days) || days < 1 || days > 30) return res.status(400).json({ message: 'Extension must be between 1 and 30 days.' });
    const amountRupees = Number(rental.pricePerDay || 0) * days;
    if (amountRupees <= 0) return res.status(400).json({ message: 'Rental daily rate is invalid.' });

    const rzOrder = await getRazorpay().orders.create({
      amount: Math.round(amountRupees * 100), currency: 'INR',
      receipt: `rental_ext_${Date.now()}`,
      notes: { rentalId: String(rental._id), customerId: String(req.user._id), extensionDays: String(days) },
    });
    rental.pendingExtension = { days, amount: amountRupees, orderId: rzOrder.id, createdAt: new Date() };
    await rental.save();
    res.json({ rentalId: rental._id, orderId: rzOrder.id, amount: rzOrder.amount, currency: rzOrder.currency, keyId: process.env.RAZORPAY_KEY_ID, days });
  } catch (e) {
    console.error('createExtensionOrder error:', e);
    res.status(500).json({ message: e.message });
  }
};

// ── POST /customer/rentals/:id/extend/verify-payment ──────────────────
exports.verifyExtensionPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const rental = await VehicleRental.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    const pending = rental.pendingExtension || {};
    if (!pending.orderId || pending.orderId !== razorpay_order_id) return res.status(400).json({ message: 'Extension payment order is invalid or expired.' });

    const expectedSig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
    if (expectedSig !== razorpay_signature) return res.status(400).json({ message: 'Payment signature verification failed' });

    const days = Number(pending.days);
    const amount = Number(pending.amount || 0);
    if (rental.status !== 'ACTIVE') return res.status(400).json({ message: 'Rental is no longer active.' });

    const oldEndDate = rental.endDate ? new Date(rental.endDate) : new Date();
    const newEndDate = new Date(oldEndDate.getTime() + days * 86400000);
    rental.endDate = newEndDate;
    rental.durationDays = Number(rental.durationDays || 0) + days;
    rental.totalAmount = Number(rental.totalAmount || 0) + amount;
    rental.razorpayPaymentId = razorpay_payment_id;
    rental.razorpaySignature = razorpay_signature;
    rental.extensionHistory = rental.extensionHistory || [];
    rental.extensionHistory.push({ event:'RENTAL_EXTENDED', at:new Date(), days, amount, oldEndDate, newEndDate, razorpayOrderId:razorpay_order_id, razorpayPaymentId:razorpay_payment_id });
    rental.bookingHistory = rental.bookingHistory || [];
    rental.bookingHistory.push({ event:'RENTAL_EXTENDED', at:new Date(), paymentStatus:'PAID', status:rental.status, days, amount, oldEndDate, newEndDate, razorpayOrderId:razorpay_order_id, razorpayPaymentId:razorpay_payment_id, pickupLocation:rental.pickupLocation, franchiseeId:rental.franchiseeId, franchiseeName:rental.franchiseeName, vehicle:rental.vehicleSnapshot });
    rental.pendingExtension = undefined;
    await rental.save();

    await audit(req.user._id, 'RENTAL_EXTENSION_PAYMENT', 'VehicleRental', rental._id);
    if (rental.franchiseeId) await Financial.create({
      franchiseeId:rental.franchiseeId, kind:'REVENUE', category:'VEHICLE_RENTAL_EXTENSION', amount, referenceId:rental._id, description:`Rental extension (${days} day${days!==1?'s':''})`,
    });

    const vs = rental.vehicleSnapshot || {};
    const subtotal = amount;
    const total = subtotal;
    const inv = await Invoice.create({
      invoiceNo: invoiceNo(), customerId:rental.customerId, rentalId:rental._id,
      items:[{ description:`${vs.make || ''} ${vs.model || ''} Rental Extension (${days} day${days!==1?'s':''})`, qty:days, rate:rental.pricePerDay || 0, amount:subtotal }],
      subtotal, tax:0, total, status:'PAID', paidAt:new Date(),
    });
    const customer = await User.findById(req.user._id).lean();
    sendInvoiceEmail(customer, rental, inv);
    res.json({ success:true, rental, invoiceId:inv._id, invoiceNo:inv.invoiceNo });
  } catch (e) {
    console.error('verifyExtensionPayment error:', e);
    res.status(500).json({ message:e.message });
  }
};

// ── GET /franchise/rentals — bookings belonging to the logged-in franchise ──
exports.franchiseRentals = async (req, res) => {
  try {
    // IMPORTANT: older bookings may have been created before franchiseeId was
    // saved on the rental. Resolve the franchise's vehicles first, then return
    // rentals linked either directly to this franchisee OR through its vehicle.
    const franchiseVehicles = await PendingVehicle.find({
      franchiseeId: req.user._id,
    }).select('_id make model registrationNo').lean();

    const vehicleIds = franchiseVehicles.map(v => v._id);
    const rentals = await VehicleRental.find({
      $or: [
        { franchiseeId: req.user._id },
        ...(vehicleIds.length ? [{ vehicleId: { $in: vehicleIds } }] : []),
      ],
    })
      .populate('customerId', 'name email phone address')
      .populate('vehicleId', 'make model registrationNo year category pricePerDay')
      .sort('-createdAt');

    // Repair/enrich legacy rentals so the franchise portal can immediately
    // display the correct booking, pickup franchise and location.
    const franchiseAddress = req.user.address || {};
    const franchiseName = req.user.name || 'Franchisee';
    const pickup = {
      name: franchiseName,
      address: [franchiseAddress.line1, franchiseAddress.line2, franchiseAddress.city,
        franchiseAddress.district, franchiseAddress.state, franchiseAddress.pincode]
        .filter(Boolean).join(', '),
      city: franchiseAddress.city || '',
      district: franchiseAddress.district || '',
      state: franchiseAddress.state || '',
      pincode: franchiseAddress.pincode || '',
      lat: Number(franchiseAddress.latitude ?? franchiseAddress.lat) || undefined,
      lng: Number(franchiseAddress.longitude ?? franchiseAddress.lng ?? franchiseAddress.lon) || undefined,
    };

    for (const rental of rentals) {
      let changed = false;
      if (!rental.franchiseeId || String(rental.franchiseeId) !== String(req.user._id)) {
        rental.franchiseeId = req.user._id;
        changed = true;
      }
      if (!rental.franchiseeName) {
        rental.franchiseeName = franchiseName;
        changed = true;
      }
      const current = rental.pickupLocation || {};
      if (!current.name || !current.address || current.lat == null || current.lng == null) {
        rental.pickupLocation = {
          ...pickup,
          name: current.name || pickup.name,
          address: current.address || pickup.address,
          city: current.city || pickup.city,
          district: current.district || pickup.district,
          state: current.state || pickup.state,
          pincode: current.pincode || pickup.pincode,
          lat: current.lat ?? pickup.lat,
          lng: current.lng ?? pickup.lng,
        };
        changed = true;
      }
      if (changed) {
        try { await rental.save(); } catch (saveErr) { console.warn('Legacy rental enrichment skipped:', saveErr.message); }
      }
    }

    res.json(rentals);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── PUT /franchise/rentals/:id/handover — franchise marks vehicle handed over ──
exports.franchiseHandover = async (req, res) => {
  try {
    const rental = await VehicleRental.findOne({
      _id: req.params.id,
      franchiseeId: req.user._id,
    });
    if (!rental) return res.status(404).json({ message: 'Booking not found for this franchisee' });
    if (rental.paymentStatus !== 'PAID')
      return res.status(400).json({ message: 'Cannot handover — customer payment is not completed' });
    if (rental.handoverDate)
      return res.json(rental);

    rental.status = 'ACTIVE';
    rental.handoverDate = new Date();
    rental.bookingHistory = rental.bookingHistory || [];
    rental.bookingHistory.push({
      event: 'HANDOVER_COMPLETED', at: rental.handoverDate, paymentStatus: rental.paymentStatus, status: 'ACTIVE',
      handoverDate: rental.handoverDate, customerLocation: rental.customerLocation || { pincode:rental.pincode, state:rental.state, district:rental.district, area:rental.area, fullAddress:rental.fullAddress },
      pickupLocation: rental.pickupLocation, franchiseeId: rental.franchiseeId, franchiseeName: rental.franchiseeName,
      vehicle: rental.vehicleSnapshot, startDate:rental.startDate, endDate:rental.endDate, durationDays:rental.durationDays, totalAmount:rental.totalAmount,
    });
    await rental.save();

    await audit(req.user._id, 'HANDOVER', 'VehicleRental', rental._id);

    // Notify customer; email failure must not block the handover.
    try {
      const customer = await User.findById(rental.customerId).lean();
      if (customer?.email) {
        const vs = rental.vehicleSnapshot || {};
        await getMailer().sendMail({
          from: process.env.EMAIL_FROM || '"EV Core" <noreply@evcore.in>',
          to: customer.email,
          subject: `Your ${vs.make || ''} ${vs.model || ''} has been handed over`,
          html: `<div style="font-family:Arial,sans-serif;padding:24px">
            <h2>Vehicle Handed Over ✅</h2>
            <p>Hi ${customer.name || 'Customer'},</p>
            <p>Your vehicle has been handed over by ${rental.franchiseeName || 'the franchisee'}.</p>
            <p><strong>Handover Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
          </div>`,
        });
      }
    } catch (mailErr) {
      console.error('Franchise handover email error:', mailErr.message);
    }

    res.json(rental);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── PUT /franchise/rentals/:id/return — franchise receives vehicle back ──
exports.franchiseReturn = async (req, res) => {
  try {
    const rental = await VehicleRental.findOne({ _id:req.params.id, franchiseeId:req.user._id });
    if (!rental) return res.status(404).json({ message:'Booking not found for this franchisee' });
    if (rental.status === 'COMPLETED') return res.json(rental);
    if (rental.status !== 'ACTIVE' || !rental.handoverDate) return res.status(400).json({ message:'Only an active handed-over rental can be returned.' });

    const returnedAt = new Date();
    const stock = await PendingVehicle.findOneAndUpdate(
      { _id:rental.vehicleId, franchiseeId:req.user._id, status:'APPROVED' },
      { $inc:{ quantity:1 } },
      { new:true }
    );
    if (!stock) return res.status(409).json({ message:'Vehicle inventory record was not found for this franchisee.' });

    rental.status = 'COMPLETED';
    rental.returnDate = returnedAt;
    rental.bookingHistory = rental.bookingHistory || [];
    rental.bookingHistory.push({
      event:'VEHICLE_RETURNED', at:returnedAt, paymentStatus:rental.paymentStatus, status:'COMPLETED',
      handoverDate:rental.handoverDate, returnDate:returnedAt, customerLocation:rental.customerLocation || { pincode:rental.pincode, state:rental.state, district:rental.district, area:rental.area, fullAddress:rental.fullAddress },
      pickupLocation:rental.pickupLocation, franchiseeId:rental.franchiseeId, franchiseeName:rental.franchiseeName,
      vehicle:rental.vehicleSnapshot, startDate:rental.startDate, endDate:rental.endDate, durationDays:rental.durationDays, totalAmount:rental.totalAmount,
    });
    await rental.save();

    const task = await Job.create({
      customerId:rental.customerId, rentalId:rental._id, vehicleId:rental.vehicleId, franchiseeId:req.user._id,
      serviceType:'RENTAL_RETURN', problem:`Rental vehicle returned by customer and received at ${rental.pickupLocation?.name || rental.franchiseeName || 'franchisee stock'}.`,
      priority:'NORMAL', status:'COMPLETED', trackingStatus:'Vehicle Returned to Stock', totalAmount:0,
      location:rental.pickupLocation || undefined,
    });
    await audit(req.user._id, 'RENTAL_RETURN', 'VehicleRental', rental._id);
    res.json({ ...rental.toObject(), completedTaskId:task._id, stockQuantity:stock.quantity });
  } catch (e) {
    console.error('franchiseReturn error:',e);
    res.status(500).json({ message:e.message });
  }
};

// ── GET /customer/rentals ─────────────────────────────────────────────
exports.myRentals = async (req, res) => {
  try {
    const rentals = await VehicleRental.find({ customerId: req.user._id }).sort('-createdAt');
    res.json(rentals);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── GET /customer/rentals/invoices — rental invoices for customer ─────
exports.myRentalInvoices = async (req, res) => {
  try {
    const invoices = await Invoice.find({ customerId: req.user._id, rentalId: { $exists: true } })
      .sort('-createdAt');
    res.json(invoices);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── GET /customer/rentals/invoices/:id/download — HTML invoice ────────
exports.downloadInvoice = async (req, res) => {
  try {
    const inv = await Invoice.findOne({ _id: req.params.id, customerId: req.user._id });
    if (!inv) return res.status(404).json({ message: 'Invoice not found' });

    const rental   = await VehicleRental.findById(inv.rentalId);
    const customer = await User.findById(req.user._id).lean();
    if (!rental) return res.status(404).json({ message: 'Rental not found' });

    const html = buildInvoiceHTML(rental, customer, inv);
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${inv.invoiceNo}.html"`);
    res.send(html);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── GET /admin/rentals ────────────────────────────────────────────────
exports.allRentals = async (req, res) => {
  try {
    const rentals = await VehicleRental
      .find()
      .populate('customerId', 'name email phone')
      .populate('vehicleId', 'make model registrationNo')
      .sort('-createdAt');
    res.json(rentals);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ── PUT /admin/rentals/:id/handover ──────────────────────────────────
exports.handover = async (req, res) => {
  try {
    const rental = await VehicleRental.findById(req.params.id);
    if (!rental) return res.status(404).json({ message: 'Rental not found' });
    if (rental.paymentStatus !== 'PAID')
      return res.status(400).json({ message: 'Cannot handover — payment not completed' });

    rental.status      = 'ACTIVE';   // → triggers "My Vehicles" view on frontend
    rental.handoverDate = new Date();
    await rental.save();

    await audit(req.user._id, 'HANDOVER', 'VehicleRental', rental._id);

    // Notify customer (fire-and-forget)
    try {
      const customer = await User.findById(rental.customerId).lean();
      if (customer?.email) {
        const vs = rental.vehicleSnapshot || {};
        const mailer = getMailer();
        await mailer.sendMail({
          from:    process.env.EMAIL_FROM || '"EV Core" <noreply@evcore.in>',
          to:      customer.email,
          subject: `Your ${vs.make} ${vs.model} has been handed over! 🚗`,
          html: `<div style="font-family:Arial,sans-serif;padding:24px;max-width:500px">
            <h2 style="color:#2563eb">Vehicle Handed Over ✅</h2>
            <p>Hi ${customer.name},</p>
            <p>Your <strong>${vs.make} ${vs.model} (${vs.year})</strong> has been handed over and is now active.</p>
            <p><strong>Handover Date:</strong> ${new Date().toLocaleDateString('en-IN')}</p>
            <p>You can track it in your <strong>My Vehicles</strong> section on the customer portal.</p>
            <br/><p>Thank you for choosing EV CORE!</p>
          </div>`,
        });
      }
    } catch (mailErr) {
      console.error('Handover email error:', mailErr.message);
    }

    res.json(rental);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};