const { commandDashboard } = require('../services/analytics');
const { Hub, Charger, Job, Payment, User, Expansion } = require('../models');

exports.dashboard = async (req, res) => res.json(await commandDashboard());

exports.hubs     = async (req, res) => res.json(await Hub.find().sort('name'));
exports.chargers = async (req, res) => res.json(await Charger.find().populate('hubId').sort('code'));
exports.live     = async (req, res) =>
  res.json(await Job.find({ status: { $nin: ['COMPLETED', 'CANCELLED'] } }).populate('vehicleId technicianId hubId').sort('-createdAt'));

exports.revenue = async (req, res) =>
  res.json(await Payment.aggregate([
    { $match: { status: 'PAID' } },
    { $group: { _id: null, total: { $sum: '$amount' }, transactions: { $sum: 1 } } },
  ]));

exports.anomalies = async (req, res) => {
  // Rule: customers with 5+ payments (potential unusual activity)
  const payments = await Payment.aggregate([
    { $group: { _id: '$customerId', n: { $sum: 1 }, amount: { $sum: '$amount' } } },
    { $match: { n: { $gte: 5 } } },
  ]);
  res.json(payments.map(x => ({
    type: 'RULE',
    severity: x.amount > 100000 ? 'HIGH' : 'MEDIUM',
    customerId: x._id,
    reason: 'Repeated payment activity',
  })));
};

exports.franchisees = async (req, res) => {
  const { Complaint } = require('../models');
  const list = await User.find({ role: 'FRANCHISEE' }).select('name email phone role franchiseeId active createdAt address').lean();
  const ids = list.map(x => x._id);
  const stats = await Complaint.aggregate([
    { $match: { franchiseeId: { $in: ids }, feedbackSubmitted: true, franchiseeRating: { $gte: 1 } } },
    { $group: { _id: '$franchiseeId', rating: { $avg: '$franchiseeRating' }, reviews: { $sum: 1 } } },
  ]);
  const sm = new Map(stats.map(x => [String(x._id), x]));
  res.json(list.map(x => ({ ...x, franchiseeRating: sm.get(String(x._id))?.rating || 0, ratingCount: sm.get(String(x._id))?.reviews || 0 })));
};

exports.franchiseRatings = async (req, res) => {
  const { Complaint } = require('../models');
  const rows = await Complaint.aggregate([
    { $match: { feedbackSubmitted: true, franchiseeId: { $ne: null }, franchiseeRating: { $gte: 1 } } },
    { $group: { _id: '$franchiseeId', averageRating: { $avg: '$franchiseeRating' }, ratingCount: { $sum: 1 }, lastRating: { $max: '$feedbackAt' } } },
    { $sort: { averageRating: -1 } },
  ]);
  const users = await User.find({ _id: { $in: rows.map(x => x._id) } }).select('name email phone address').lean();
  const um = new Map(users.map(u => [String(u._id), u]));
  res.json(rows.map(x => ({ ...x, franchisee: um.get(String(x._id)) || null })));
};

// Demand — reads from the Expansion collection (entries added via the app)
exports.demand = async (req, res) => {
  const records = await Expansion.find().sort('-demandScore').limit(100);
  res.json(records);
};

// Expansion — compute from a saved Expansion record, or return empty
exports.expansion = async (req, res) => {
  const { finance } = require('../services/finance');
  const record = await Expansion.findOne().sort('-createdAt');
  if (!record) return res.json({ message: 'No expansion analysis records yet. Add one via the app.' });
  res.json(record);
};

exports.createHub     = async (req, res) => res.status(201).json(await Hub.create(req.body));
exports.updateHub     = async (req, res) => {
  try {
    const hub = await Hub.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!hub) return res.status(404).json({ message: 'Hub not found' });
    res.json(hub);
  } catch (e) { res.status(400).json({ message: e.message }); }
};
exports.deleteHub     = async (req, res) => {
  try {
    await Hub.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ message: e.message }); }
};
exports.createCharger = async (req, res) => res.status(201).json(await Charger.create(req.body));
exports.updateCharger = async (req, res) =>
  res.json(await Charger.findByIdAndUpdate(req.params.id, req.body, { new: true }));
exports.deleteCharger = async (req, res) => {
  try {
    await Charger.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

exports.ingestTelemetry = async (req, res) => {
  const { detectCharging } = require('../services/anomaly');
  const M2 = require('../models');
  try {
    const t = await M2.Telemetry.create(req.body);
    if (req.io) req.io.emit('telemetry:update', t);
    if (t.chargerId && t.powerKw != null) {
      const c = await M2.Charger.findByIdAndUpdate(
        t.chargerId,
        { lastTelemetry: t, lastHeartbeat: new Date() },
        { new: true }
      );
      if (c) await detectCharging({ hubId: c.hubId, chargerId: c._id, expected: Number(req.body.expectedEnergy || t.powerKw), actual: Number(req.body.actualEnergy || t.powerKw) });
    }
    if (t.vehicleId) await M2.Vehicle.findByIdAndUpdate(t.vehicleId, { batterySoc: t.soc, batterySoh: t.soh });
    return res.status(201).json(t);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

exports.health = async (req, res) => {
  const { Financial } = require('../models');
  const fs = await Financial.aggregate([
    { $group: { _id: '$franchiseeId', revenue: { $sum: { $cond: [{ $eq: ['$kind', 'REVENUE'] }, '$amount', 0] } }, expense: { $sum: { $cond: [{ $eq: ['$kind', 'EXPENSE'] }, '$amount', 0] } } } },
  ]);
  res.json(fs.map(x => ({
    ...x,
    score: Math.max(0, Math.min(100, Math.round((x.revenue / (x.revenue + x.expense || 1)) * 70 + 30))),
  })));
};

// ── Customer management (Command Center) ──────────────────────────
exports.customers = async (req, res) => {
  try {
    const page  = parseInt(req.query.page  || 1);
    const limit = parseInt(req.query.limit || 50);
    const search = req.query.search || '';

    const query = { role: 'CUSTOMER' };
    if (search) {
      query.$or = [
        { name:  { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const [total, list] = await Promise.all([
      User.countDocuments(query),
      User.find(query)
          .select('name email phone active otpVerified isPasswordSet createdAt')
          .sort('-createdAt')
          .skip((page - 1) * limit)
          .limit(limit),
    ]);

    res.json({ total, page, pages: Math.ceil(total / limit), customers: list });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.customerDetail = async (req, res) => {
  try {
    const { Job, Payment, Vehicle } = require('../models');
    const [u, jobs, payments, vehicles] = await Promise.all([
      User.findById(req.params.id).select('-passwordHash -refreshTokenHash -otpHash'),
      Job.find({ customerId: req.params.id }).sort('-createdAt').limit(20),
      Payment.find({ customerId: req.params.id }).sort('-createdAt').limit(20),
      Vehicle.find({ customerId: req.params.id }).sort('-createdAt'),
    ]);
    if (!u || u.role !== 'CUSTOMER') return res.status(404).json({ message: 'Customer not found' });
    res.json({ customer: u, jobs, payments, vehicles });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};