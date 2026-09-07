/**
 * customerAuth.js
 * Handles: register → send OTP, verify OTP, resend OTP,
 *          login with OTP, login with password, forgot password.
 * OTPs are 6-digit codes stored hashed; we use in-process console logs
 * to simulate email (no SMTP dependency).
 */

const bcrypt   = require('bcryptjs');
const nodemailer = require('nodemailer');
const { User } = require('../models');
const { access, refresh } = require('../utils/tokens');

// ── SMTP transporter (created once, reused) ────────────────────────
let _transporter = null;
function getTransporter() {
  if (_transporter) return _transporter;
  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',   // true for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return _transporter;
}

// ── helpers ────────────────────────────────────────────────────────
function genOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function otpExpiry() {
  return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
}

async function hashOTP(otp) {
  return bcrypt.hash(otp, 10);
}

async function sendEmail(to, subject, otp, purpose = 'OTP') {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;border:1px solid #e2e8f0;border-radius:12px;">
      <div style="text-align:center;margin-bottom:24px;">
        <span style="font-size:28px;">⚡</span>
        <h2 style="margin:8px 0;color:#1e293b;">EV Core</h2>
      </div>
      <p style="color:#374151;font-size:15px;">Your ${purpose} is:</p>
      <div style="text-align:center;margin:24px 0;">
        <span style="font-size:40px;font-weight:900;letter-spacing:12px;color:#2563eb;">${otp}</span>
      </div>
      <p style="color:#64748b;font-size:13px;">This code is valid for <strong>10 minutes</strong>. Do not share it with anyone.</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="color:#94a3b8;font-size:12px;text-align:center;">EV Core Platform &mdash; automated message, do not reply.</p>
    </div>`;

  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // Fallback to console when SMTP not configured
    console.log(`\n📧 [EMAIL FALLBACK] TO: ${to} | ${subject} | OTP: ${otp}\n`);
    return;
  }

  await getTransporter().sendMail({ from, to, subject, html, text: `Your ${purpose}: ${otp} (valid 10 minutes)` });
}

function issueTokens(user) {
  const rt = refresh(user);
  return { accessToken: access(user), refreshToken: rt, rt };
}

// ──────────────────────────────────────────────────────────────────
// POST /auth/customer/register
// Body: { name, email, phone? }
// Creates unverified account, sends OTP email.
// ──────────────────────────────────────────────────────────────────
exports.register = async (req, res) => {
  try {
    const { name, email, phone, pincode, state, district } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'name and email are required' });

    // Sanitize phone — treat blank string as absent
    const cleanPhone = phone && phone.trim() ? phone.trim() : undefined;

    // Check duplicate email
    const existingByEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingByEmail) {
      if (!existingByEmail.otpVerified) {
        // Re-send OTP for unverified accounts
        const otp = genOTP();
        existingByEmail.otpHash   = await hashOTP(otp);
        existingByEmail.otpExpiry = otpExpiry();
        // Only update phone if provided and not already taken by someone else
        if (cleanPhone && !existingByEmail.phone) existingByEmail.phone = cleanPhone;
        if (pincode || state || district) existingByEmail.address = { ...(existingByEmail.address || {}), pincode: pincode || existingByEmail.address?.pincode || '', state: state || existingByEmail.address?.state || '', district: district || existingByEmail.address?.district || '' };
        await existingByEmail.save();
        await sendEmail(email, 'EV Core – Your OTP', otp, 'verification OTP');
        return res.status(200).json({ message: 'OTP resent to your email', email });
      }
      return res.status(409).json({ message: 'Email already registered. Please login.' });
    }

    // Check duplicate phone (only if phone provided)
    if (cleanPhone) {
      const existingByPhone = await User.findOne({ phone: cleanPhone });
      if (existingByPhone) {
        return res.status(409).json({ message: 'This phone number is already registered.' });
      }
    }

    const otp = genOTP();
    const u   = await User.create({
      name,
      email:        email.toLowerCase(),
      phone:        cleanPhone,          // undefined if blank — sparse index allows multiple nulls
      address:      (pincode || state || district) ? { pincode: pincode || '', state: state || '', district: district || '' } : undefined,
      role:         'CUSTOMER',
      otpHash:      await hashOTP(otp),
      otpExpiry:    otpExpiry(),
      otpVerified:  false,
      isPasswordSet: false,
    });

    await sendEmail(email, 'EV Core – Verify your email', otp, 'verification OTP');
    res.status(201).json({ message: 'Account created. Check your email for the OTP.', email });
  } catch (e) {
    console.error(e);
    // Catch any remaining Mongo duplicate key errors gracefully
    if (e.code === 11000) {
      const field = Object.keys(e.keyPattern || {})[0] || 'field';
      return res.status(409).json({ message: `This ${field} is already registered.` });
    }
    res.status(500).json({ message: e.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// POST /auth/customer/verify-otp
// Body: { email, otp }
// Verifies OTP, marks account verified, returns tokens.
// ──────────────────────────────────────────────────────────────────
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'email and otp are required' });

    const u = await User.findOne({ email: email.toLowerCase() });
    if (!u) return res.status(404).json({ message: 'Account not found. Please register first.' });
    if (!u.otpHash) return res.status(400).json({ message: 'No OTP requested. Please request a new one.' });
    if (u.otpExpiry < new Date()) return res.status(400).json({ message: 'OTP expired. Please request a new one.' });

    const match = await bcrypt.compare(String(otp), u.otpHash);
    if (!match) return res.status(400).json({ message: 'Invalid OTP.' });

    // Mark verified
    u.otpVerified = true;
    u.otpHash     = undefined;
    u.otpExpiry   = undefined;
    const { accessToken, refreshToken, rt } = issueTokens(u);
    u.refreshTokenHash = await bcrypt.hash(rt, 10);
    await u.save();

    res.json({
      accessToken, refreshToken,
      user: { id: u._id, name: u.name, email: u.email, role: u.role, isPasswordSet: u.isPasswordSet },
      needsPassword: !u.isPasswordSet,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// POST /auth/customer/resend-otp
// Body: { email }
// ──────────────────────────────────────────────────────────────────
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const u = await User.findOne({ email: email.toLowerCase() });
    if (!u) return res.status(404).json({ message: 'Account not found.' });

    const otp = genOTP();
    u.otpHash   = await hashOTP(otp);
    u.otpExpiry = otpExpiry();
    await u.save();

    await sendEmail(email, 'EV Core – New OTP', otp, 'new OTP');
    res.json({ message: 'OTP resent to your email.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// POST /auth/customer/login-otp
// Body: { email }
// Sends a fresh OTP for passwordless login.
// ──────────────────────────────────────────────────────────────────
exports.sendLoginOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const u = await User.findOne({ email: email.toLowerCase() });
    if (!u || !u.otpVerified) {
      return res.status(404).json({ message: 'Account not found or not verified.' });
    }
    if (u.role !== 'CUSTOMER') {
      return res.status(403).json({ message: 'Use the correct portal for your role.' });
    }

    const otp = genOTP();
    u.otpHash   = await hashOTP(otp);
    u.otpExpiry = otpExpiry();
    await u.save();

    await sendEmail(email, 'EV Core – Login OTP', otp, 'login OTP');
    res.json({ message: 'OTP sent to your email. Use it to log in.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// POST /auth/customer/verify-login-otp
// Body: { email, otp }
// Validates OTP and returns tokens (passwordless login).
// ──────────────────────────────────────────────────────────────────
exports.verifyLoginOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ message: 'email and otp are required' });

    const u = await User.findOne({ email: email.toLowerCase() });
    if (!u || !u.otpVerified) return res.status(404).json({ message: 'Account not found.' });
    if (!u.otpHash) return res.status(400).json({ message: 'No OTP requested. Please request a new one.' });
    if (u.otpExpiry < new Date()) return res.status(400).json({ message: 'OTP expired.' });

    const match = await bcrypt.compare(String(otp), u.otpHash);
    if (!match) return res.status(400).json({ message: 'Invalid OTP.' });

    u.otpHash   = undefined;
    u.otpExpiry = undefined;
    const { accessToken, refreshToken, rt } = issueTokens(u);
    u.refreshTokenHash = await bcrypt.hash(rt, 10);
    await u.save();

    res.json({
      accessToken, refreshToken,
      user: { id: u._id, name: u.name, email: u.email, role: u.role },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// POST /auth/customer/login-password
// Body: { email, password }
// ──────────────────────────────────────────────────────────────────
exports.loginPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'email and password are required' });

    const u = await User.findOne({ email: email.toLowerCase() });
    if (!u) return res.status(401).json({ message: 'Invalid email or password.' });
    if (!u.otpVerified) return res.status(401).json({ message: 'Account not verified. Check your email for OTP.' });
    if (!u.isPasswordSet || !u.passwordHash) {
      return res.status(400).json({ message: 'No password set. Please login with OTP or use forgot password.' });
    }
    if (u.role !== 'CUSTOMER') return res.status(403).json({ message: 'Use the correct portal for your role.' });

    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Invalid email or password.' });

    const { accessToken, refreshToken, rt } = issueTokens(u);
    u.refreshTokenHash = await bcrypt.hash(rt, 10);
    await u.save();

    res.json({
      accessToken, refreshToken,
      user: { id: u._id, name: u.name, email: u.email, role: u.role },
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// POST /auth/customer/set-password
// Body: { password }   (requires auth token)
// Called after first OTP verification to set a password.
// ──────────────────────────────────────────────────────────────────
exports.setPassword = async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }
    const u = await User.findById(req.user._id);
    u.passwordHash  = await bcrypt.hash(password, 12);
    u.isPasswordSet = true;
    await u.save();
    res.json({ message: 'Password set successfully.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// POST /auth/customer/forgot-password
// Body: { email }
// Sends a reset-OTP to email.
// ──────────────────────────────────────────────────────────────────
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'email is required' });

    const u = await User.findOne({ email: email.toLowerCase() });
    // Return 200 even if not found (security best practice)
    if (!u || !u.otpVerified) {
      return res.json({ message: 'If that email is registered, a reset OTP has been sent.' });
    }

    const otp = genOTP();
    u.otpHash   = await hashOTP(otp);
    u.otpExpiry = otpExpiry();
    await u.save();

    await sendEmail(email, 'EV Core – Password Reset', otp, 'password reset OTP');
    res.json({ message: 'If that email is registered, a reset OTP has been sent.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ──────────────────────────────────────────────────────────────────
// POST /auth/customer/reset-password
// Body: { email, otp, newPassword }
// ──────────────────────────────────────────────────────────────────
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'email, otp, and newPassword are required' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters.' });
    }

    const u = await User.findOne({ email: email.toLowerCase() });
    if (!u || !u.otpHash) return res.status(400).json({ message: 'Invalid or expired reset request.' });
    if (u.otpExpiry < new Date()) return res.status(400).json({ message: 'OTP expired. Request a new one.' });

    const match = await bcrypt.compare(String(otp), u.otpHash);
    if (!match) return res.status(400).json({ message: 'Invalid OTP.' });

    u.passwordHash  = await bcrypt.hash(newPassword, 12);
    u.isPasswordSet = true;
    u.otpHash       = undefined;
    u.otpExpiry     = undefined;
    await u.save();

    res.json({ message: 'Password reset successfully. You can now login.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};