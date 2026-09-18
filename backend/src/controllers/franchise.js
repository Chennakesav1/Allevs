const { franchiseDashboard } = require('../services/analytics');
const { emi, roi } = require('../services/finance');
const { Financial, Inventory, Job, User, EMI } = require('../models');

exports.dashboard = async (req, res) => res.json(await franchiseDashboard());

exports.inventory = async (req, res) => res.json(await Inventory.find().sort('name'));

exports.staff = async (req, res) =>
  res.json(await User.find({ role: { $in: ['STAFF', 'TECHNICIAN', 'HUB_MANAGER'] } }).select('name role active hubId'));

exports.jobs = async (req, res) =>
  res.json(await Job.find().populate('technicianId hubId vehicleId').sort('-createdAt'));

// Financials — real data from Financial collection, no hardcoded values
exports.financials = async (req, res) => {
  const filter = req.user.franchiseeId ? { franchiseeId: req.user.franchiseeId } : {};

  const [revenues, expenses, capexList, emiRecords] = await Promise.all([
    Financial.aggregate([{ $match: { ...filter, kind: 'REVENUE' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Financial.aggregate([{ $match: { ...filter, kind: 'EXPENSE' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    Financial.find({ ...filter, kind: 'CAPEX' }),
    EMI.find(filter),
  ]);

  const revenue   = revenues[0]?.total  || 0;
  const expense   = expenses[0]?.total  || 0;
  const capex     = capexList.reduce((s, r) => s + r.amount, 0);
  const monthlyEmi = emiRecords.reduce((s, r) => s + (r.monthlyEmi || 0), 0);
  const cashflow  = revenue - expense;
  const payback   = monthlyEmi > 0 ? Math.round((capex / monthlyEmi) * 10) / 10 : null;

  res.json({ revenue, expenses: expense, cashflow, capex, emi: monthlyEmi, paybackMonths: payback });
};

exports.roi = async (req, res) => {
  const r = roi(
    Number(req.query.investment    || 0),
    Number(req.query.monthlyRevenue || 0),
    Number(req.query.monthlyExpense || 0)
  );
  res.json(r);
};

exports.capex = async (req, res) => {
  const filter = req.user.franchiseeId ? { franchiseeId: req.user.franchiseeId } : {};
  res.json(await Financial.find({ ...filter, kind: 'CAPEX' }));
};

exports.emi = async (req, res) => {
  const principal = Number(req.query.principal || 0);
  const rate      = Number(req.query.rate      || 12);
  const months    = Number(req.query.months    || 36);
  res.json({ principal, annualRate: rate, tenureMonths: months, monthlyEmi: emi(principal, rate, months) });
};

exports.addInventoryPart = async (req, res) => {
  try {
    const {
      sku, name, category, quantity, reorderLevel, unitPrice,
      description, manufacturer, compatibleVehicles, location, partType
    } = req.body;

    if (!sku || !name) {
      return res.status(400).json({ message: 'Part code (SKU) and name are required.' });
    }

    const existing = await Inventory.findOne({ sku: sku.trim().toUpperCase() });
    if (existing) {
      return res.status(409).json({ message: `Part code "${sku}" already exists.` });
    }

    const part = await Inventory.create({
      sku:       sku.trim().toUpperCase(),
      name:      name.trim(),
      category:  category || 'General',
      quantity:  Number(quantity) || 0,
      reorderLevel: Number(reorderLevel) || 5,
      unitPrice: Number(unitPrice) || 0,
      // Extra meta stored in a flexible field
      description,
      manufacturer,
      compatibleVehicles,
      location,
      partType,
    });

    res.status(201).json(part);
  } catch (err) {
    console.error('addInventoryPart error:', err);
    res.status(500).json({ message: err.message || 'Failed to add part.' });
  }
};
exports.updateInventoryPart = async (req, res) => {
  try {
    const { id } = req.params;
    const allowed = ['name','category','quantity','reorderLevel','unitPrice','description','manufacturer','compatibleVehicles','location','partType'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (updates.quantity !== undefined)    updates.quantity    = Number(updates.quantity);
    if (updates.reorderLevel !== undefined) updates.reorderLevel = Number(updates.reorderLevel);
    if (updates.unitPrice !== undefined)   updates.unitPrice   = Number(updates.unitPrice);

    const part = await Inventory.findByIdAndUpdate(id, updates, { new: true });
    if (!part) return res.status(404).json({ message: 'Part not found.' });
    res.json(part);
  } catch (err) {
    console.error('updateInventoryPart error:', err);
    res.status(500).json({ message: err.message || 'Failed to update part.' });
  }
};

// ── Configure Command Center vehicle into Fleet Inventory ────────────
exports.configureFleetVehicle = async (req, res) => {
  try {
    const { CommandVehicle } = require('../models');
    const vehicle = await CommandVehicle.findOne({
      _id: req.params.id,
      fleetOperatorId: req.user._id,
      status: 'ASSIGNED',
    });
    if (!vehicle) return res.status(404).json({ message: 'Assigned vehicle not found.' });

    const body = req.body || {};
    const enabledPlans = Array.isArray(body.enabledPlans) ? body.enabledPlans.map(String) : [];
    const allowed = new Set(['DAILY','WEEKLY','MONTHLY']);
    const plans = enabledPlans.filter(p => allowed.has(p));
    if (!plans.length) return res.status(400).json({ message: 'Select at least one rental plan.' });

    const rentalPlans = {
      daily:   { enabled: plans.includes('DAILY'),   amount: Number(body.dailyAmount || 0) },
      weekly:  { enabled: plans.includes('WEEKLY'),  amount: Number(body.weeklyAmount || 0) },
      monthly: { enabled: plans.includes('MONTHLY'), amount: Number(body.monthlyAmount || 0) },
    };
    for (const key of ['daily','weekly','monthly']) {
      if (rentalPlans[key].enabled && rentalPlans[key].amount <= 0)
        return res.status(400).json({ message: `${key[0].toUpperCase()+key.slice(1)} rental amount must be greater than zero.` });
    }

    vehicle.rentalPlans = rentalPlans;
    vehicle.securityDeposit = Math.max(0, Number(body.securityDeposit || 0));
    vehicle.discountPercent = Math.min(100, Math.max(0, Number(body.discountPercent || 0)));
    vehicle.fleetInventoryStatus = 'ACTIVE';
    vehicle.status = 'ACTIVE';
    vehicle.activatedAt = new Date();
    vehicle.activatedBy = req.user._id;
    if (body.description !== undefined) vehicle.description = String(body.description);
    await vehicle.save();

    return res.json(vehicle.toObject());
  } catch (e) {
    return res.status(400).json({ message: e.message });
  }
};

exports.updateFleetVehicle = async (req, res) => {
  try {
    const { CommandVehicle } = require('../models');
    const vehicle = await CommandVehicle.findOne({ _id:req.params.id, fleetOperatorId:req.user._id, status:'ACTIVE' });
    if (!vehicle) return res.status(404).json({ message:'Fleet vehicle not found.' });
    const body=req.body||{};
    const enabledPlans=Array.isArray(body.enabledPlans)?body.enabledPlans.map(String):[];
    const plans=enabledPlans.filter(p=>['DAILY','WEEKLY','MONTHLY'].includes(p));
    if (!plans.length) return res.status(400).json({message:'Select at least one rental plan.'});
    vehicle.rentalPlans={
      daily:{enabled:plans.includes('DAILY'),amount:Number(body.dailyAmount||0)},
      weekly:{enabled:plans.includes('WEEKLY'),amount:Number(body.weeklyAmount||0)},
      monthly:{enabled:plans.includes('MONTHLY'),amount:Number(body.monthlyAmount||0)},
    };
    vehicle.securityDeposit=Math.max(0,Number(body.securityDeposit||0));
    vehicle.discountPercent=Math.min(100,Math.max(0,Number(body.discountPercent||0)));
    if(body.description!==undefined) vehicle.description=String(body.description);
    await vehicle.save();
    res.json(vehicle.toObject());
  } catch(e){res.status(400).json({message:e.message});}
};
