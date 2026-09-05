/**
 * rental.js
 * Handles: create Razorpay order, verify payment, get rentals,
 *          command-center handover, customer my-vehicles (rentals),
 *          invoice generation + email, invoice download (PDF).
 */
const crypto     = require('crypto');
const nodemailer = require('nodemailer');
const { VehicleRental, PendingVehicle, Invoice, User } = require('../models');
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

  const subtotal = rental.totalAmount || 0;
  const gst      = +(subtotal * 0.18).toFixed(2);
  const total    = +(subtotal + gst).toFixed(2);

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
        <div class="label">Delivery Address</div>
        <div class="val">${rental.fullAddress || [rental.area, rental.district, rental.state, rental.pincode].filter(Boolean).join(', ')}</div>
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
      <tr><td>Subtotal</td><td>${fmt(subtotal)}</td></tr>
      <tr><td>GST (18%)</td><td>${fmt(gst)}</td></tr>
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
      vehicleId, pincode, state, district, area, fullAddress,
      startDate, endDate, durationDays,
    } = req.body;
    if (!vehicleId) return res.status(400).json({ message: 'vehicleId is required' });

    const vehicle = await PendingVehicle.findById(vehicleId);
    if (!vehicle || vehicle.status !== 'APPROVED')
      return res.status(404).json({ message: 'Vehicle not found or not available' });

    const days   = durationDays || 1;
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
      pincode, state, district, area, fullAddress,
      startDate,  endDate,
      durationDays: days,
      pricePerDay:  vehicle.pricePerDay,
      totalAmount:  vehicle.pricePerDay * days,
      razorpayOrderId: rzOrder.id,
      paymentStatus:   'PENDING',
      status:          'BOOKED',
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
      await rental.save();
      return res.status(400).json({ message: 'Payment signature verification failed' });
    }

    rental.razorpayPaymentId = razorpay_payment_id;
    rental.razorpaySignature = razorpay_signature;
    rental.paymentStatus     = 'PAID';
    rental.status            = 'PAYMENT_DONE';
    await rental.save();

    await audit(req.user._id, 'PAYMENT', 'VehicleRental', rental._id);

    // ── Generate Invoice ──────────────────────────────────────────
    const vs       = rental.vehicleSnapshot || {};
    const subtotal = rental.totalAmount || 0;
    const gst      = +(subtotal * 0.18).toFixed(2);
    const total    = +(subtotal + gst).toFixed(2);

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
      tax:   gst,
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