const { commandDashboard } = require('../services/analytics');
const { Hub, Charger, Job, Payment, User, Expansion } = require('../models');
const smInfrastructureHubs = require('../data/smInfrastructureHubs.json');

// The uploaded SM Infrastructure KMZ contains 727 real placemarks.
// Keep them in MongoDB so every portal reads the exact same coordinates.
let smInfrastructureSyncPromise = null;
async function ensureSmInfrastructureHubs() {
  if (smInfrastructureSyncPromise) return smInfrastructureSyncPromise;
  smInfrastructureSyncPromise = (async () => {
    const sourceCount = await Hub.countDocuments({ sourceMap: 'SM Infrastructure' });
    // Seed the bundled 727-location baseline only when the source collection is empty.
    // This prevents an intentional Google My Maps deletion from being re-added on the next /hubs request.
    if (sourceCount > 0) return sourceCount;

    const ops = smInfrastructureHubs.map(h => ({
      updateOne: {
        filter: { sourceKey: h.sourceKey },
        update: {
          $set: {
            name: h.name, code: h.code, city: h.city, address: h.address,
            lat: h.lat, lng: h.lng, sourceId: h.sourceId, sourceMap: 'SM Infrastructure',
            siteType: h.siteType, area: h.area, region: h.region,
            energizationDate: h.energizationDate, swaps: h.swaps, qisName: h.qisName,
          },
          $setOnInsert: { status: 'ONLINE', chargerCount: 0 },
        },
        upsert: true,
      },
    }));
    await Hub.bulkWrite(ops, { ordered: false });
    return await Hub.countDocuments({ sourceMap: 'SM Infrastructure' });
  })().catch(err => {
    smInfrastructureSyncPromise = null;
    throw err;
  });
  return smInfrastructureSyncPromise;
}

exports.dashboard = async (req, res) => res.json(await commandDashboard());

exports.hubs     = async (req, res) => {
  try {
    await ensureSmInfrastructureHubs();
    const hubs = await Hub.find().sort({ city: 1, name: 1 }).lean();
    res.json(hubs);
  } catch (e) {
    res.status(500).json({ message: `Hub sync failed: ${e.message}` });
  }
};
exports.syncSmInfrastructure = async (req, res) => {
  try {
    const { syncGoogleMapHubs } = require('../services/hubSync');
    const result = await syncGoogleMapHubs();
    if (!result.ok) {
      smInfrastructureSyncPromise = null;
      const count = await ensureSmInfrastructureHubs();
      return res.json({ ok: true, source: 'bundled-baseline', count, warning: result.error });
    }
    const count = await Hub.countDocuments({ sourceMap: 'SM Infrastructure' });
    res.json({ ok: true, source: 'Google My Maps', count, stats: result.stats });
  } catch (e) {
    res.status(500).json({ ok: false, message: e.message });
  }
};
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
          .select('name email phone address aadharNumber panNumber identityDocuments active otpVerified isPasswordSet createdAt')
          .sort('-createdAt')
          .skip((page - 1) * limit)
          .limit(limit),
    ]);

    res.json({ total, page, pages: Math.ceil(total / limit), customers: list });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};


// Wallet recharge / debit ledger for Command Center.
exports.walletTransactions = async (req, res) => {
  try {
    const { WalletTransaction } = require('../models');
    const limit = Math.min(Math.max(parseInt(req.query.limit || 500), 1), 2000);
    const rows = await WalletTransaction.find()
      .populate('customerId', 'name email phone')
      .sort('-createdAt')
      .limit(limit)
      .lean();
    res.json(rows.map(tx => ({
      ...tx,
      customerId: tx.customerId || { name: tx.customerName, email: tx.customerEmail, phone: tx.customerPhone },
      paymentId: tx.razorpayPaymentId || tx.providerRef || null,
      referenceId: tx.razorpayOrderId || tx.referenceId || null,
    })));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

exports.customerDetail = async (req, res) => {
  try {
    const { Job, Payment, Vehicle, VehicleRental, CommandVehicle } = require('../models');
    const [u, jobs, payments, vehicles, rentals, commandVehicles] = await Promise.all([
      User.findById(req.params.id).select('-passwordHash -refreshTokenHash -otpHash'),
      Job.find({ customerId: req.params.id }).sort('-createdAt').limit(20),
      Payment.find({ customerId: req.params.id }).sort('-createdAt').limit(20),
      Vehicle.find({ customerId: req.params.id }).sort('-createdAt'),
      VehicleRental.find({ customerId: req.params.id }).sort('-createdAt').limit(50).lean(),
      CommandVehicle.find({ currentCustomerId: req.params.id }).sort('-updatedAt').lean(),
    ]);
    if (!u || u.role !== 'CUSTOMER') return res.status(404).json({ message: 'Customer not found' });
    const rentalVehicleIds=[...new Set((rentals||[]).map(r=>String(r.vehicleId||'')).filter(Boolean))];
    const rentalCommandVehicles=rentalVehicleIds.length ? await CommandVehicle.find({_id:{$in:rentalVehicleIds}}).lean() : [];
    const rentalVehicleMap=new Map(rentalCommandVehicles.map(v=>[String(v._id),v]));
    const enrichedRentals=(rentals||[]).map(r=>({...r,vehicleId:rentalVehicleMap.get(String(r.vehicleId))||r.vehicleId||null}));
    res.json({ customer: u, jobs, payments, vehicles, rentals:enrichedRentals, commandVehicles });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};
// ═══════════════════════════════════════════════════════════════
// COMMAND CENTER VEHICLE INVENTORY
// ═══════════════════════════════════════════════════════════════

/** GET /api/admin/vehicles — list all command center vehicles */
exports.listVehicles = async (req, res) => {
  try {
    const { CommandVehicle, User } = require('../models');
    const vehicles = await CommandVehicle.find().sort('-createdAt').lean();
    const vehicleIds = vehicles.map(v => v._id);
    const activeRentals = vehicleIds.length ? await require('../models').VehicleRental.find({vehicleId:{$in:vehicleIds},paymentStatus:'PAID',status:{$nin:['COMPLETED','CANCELLED']}}).populate('customerId','name email phone address').sort('-createdAt').lean() : [];
    const rentalByVehicle = new Map();
    activeRentals.forEach(r => { const k=String(r.vehicleId); if(!rentalByVehicle.has(k) || r.handoverDate) rentalByVehicle.set(k,r); });
    // Enrich with fleet operator info
    const opIds = [...new Set(vehicles.filter(v => v.fleetOperatorId).map(v => String(v.fleetOperatorId)))];
    const operators = opIds.length
      ? await User.find({ _id: { $in: opIds } }).select('name email address').lean()
      : [];
    const opMap = new Map(operators.map(op => [String(op._id), op]));
    res.json(vehicles.map(v => {
      const r=rentalByVehicle.get(String(v._id));
      const lifecycleStatus = r ? (r.handoverDate && !r.returnDate ? 'AT_CUSTOMER' : 'HANDOVER_READY') : (v.fleetOperatorId ? (v.fleetInventoryStatus==='ACTIVE' ? 'AT_FLEET' : 'SETUP_REQUIRED') : 'UNASSIGNED');
      return {...v,franchiseeId:v.fleetOperatorId,franchiseeName:v.fleetOperatorName || opMap.get(String(v.fleetOperatorId))?.name || null,franchiseeEmail:v.fleetOperatorEmail || opMap.get(String(v.fleetOperatorId))?.email || null,lifecycleStatus,currentRental:r||null,currentCustomer:r?.customerId||null,currentCustomerId:r?.customerId?._id||r?.customerId||null,pendingHandover:!!(r&&!r.handoverDate)};
    }));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** POST /api/admin/vehicles — create a vehicle in Command Center inventory */
exports.createVehicle = async (req, res) => {
  try {
    const { CommandVehicle } = require('../models');
    const { make, model } = req.body;
    if (!make || !model) return res.status(400).json({ message: 'Make and Model are required' });

    const quantity = Math.max(1, Number(req.body.quantity) || 1);
    const rawBikeIds = Array.isArray(req.body.bikeIds)
      ? req.body.bikeIds.map(x => String(x || '').trim()).filter(Boolean)
      : (req.body.bikeId ? [String(req.body.bikeId).trim()] : []);
    if (rawBikeIds.length !== quantity) {
      return res.status(400).json({ message: `Enter a unique Bike ID for each bike. Expected ${quantity}, received ${rawBikeIds.length}.` });
    }
    const bikeIds = [...new Set(rawBikeIds)];
    if (bikeIds.length !== quantity) return res.status(400).json({ message: 'Each Bike ID must be unique.' });
    const existing = await CommandVehicle.find({ bikeId: { $in: bikeIds } }).select('bikeId').lean();
    if (existing.length) return res.status(409).json({ message: `Bike ID already exists: ${existing.map(x => x.bikeId).join(', ')}` });

    const base = {
      ...req.body,
      quantity: 1,
      pricePerDay: Number(req.body.pricePerDay) || 0,
      batteryCapacityKwh: req.body.batteryCapacityKwh ? Number(req.body.batteryCapacityKwh) : undefined,
      rangeKm: req.body.rangeKm ? Number(req.body.rangeKm) : undefined,
      chassisNo: req.body.chassisNo || undefined,
      motorNo: req.body.motorNo || undefined,
      insuranceExpiry: req.body.insuranceExpiry ? new Date(req.body.insuranceExpiry) : undefined,
      odometerKm: req.body.odometerKm !== undefined && req.body.odometerKm !== '' ? Number(req.body.odometerKm) : undefined,
      seatingCapacity: req.body.seatingCapacity !== undefined && req.body.seatingCapacity !== '' ? Number(req.body.seatingCapacity) : undefined,
      topSpeedKph: req.body.topSpeedKph !== undefined && req.body.topSpeedKph !== '' ? Number(req.body.topSpeedKph) : undefined,
      status: 'UNASSIGNED',
      createdBy: req.user._id,
    };
    delete base.bikeIds;
    const vehicles = await CommandVehicle.insertMany(bikeIds.map(bikeId => ({ ...base, bikeId })));
    res.status(201).json(vehicles.map(vehicle => ({
      ...vehicle.toObject(),
      franchiseeId: null, franchiseeName: null, franchiseeEmail: null,
    })));
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

/** PUT /api/admin/vehicles/:id — update a command center vehicle */
exports.updateVehicle = async (req, res) => {
  try {
    const { CommandVehicle } = require('../models');
    const allowed = ['category','make','model','year','color','registrationNo','chassisNo','motorNo','insuranceExpiry','odometerKm','seatingCapacity','topSpeedKph','batteryCapacityKwh','rangeKm','chargingType','pricePerDay','quantity','description','images'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });
    if (updates.quantity !== undefined)   updates.quantity = Math.max(0, Number(updates.quantity));
    if (updates.pricePerDay !== undefined) updates.pricePerDay = Number(updates.pricePerDay);
    if (updates.batteryCapacityKwh !== undefined) updates.batteryCapacityKwh = Number(updates.batteryCapacityKwh);
    if (updates.rangeKm !== undefined) updates.rangeKm = Number(updates.rangeKm);
    if (updates.odometerKm !== undefined) updates.odometerKm = Number(updates.odometerKm);
    if (updates.seatingCapacity !== undefined) updates.seatingCapacity = Number(updates.seatingCapacity);
    if (updates.topSpeedKph !== undefined) updates.topSpeedKph = Number(updates.topSpeedKph);
    if (updates.insuranceExpiry) updates.insuranceExpiry = new Date(updates.insuranceExpiry);
    const vehicle = await CommandVehicle.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json({
      ...vehicle.toObject(),
      franchiseeId:    vehicle.fleetOperatorId,
      franchiseeName:  vehicle.fleetOperatorName,
      franchiseeEmail: vehicle.fleetOperatorEmail,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** DELETE /api/admin/vehicles/:id — remove a command center vehicle */
exports.deleteVehicle = async (req, res) => {
  try {
    const { CommandVehicle } = require('../models');
    await CommandVehicle.findByIdAndDelete(req.params.id);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};

/** PUT /api/admin/vehicles/:id/assign — assign or reassign a vehicle to a fleet operator */
exports.assignVehicle = async (req, res) => {
  try {
    const { CommandVehicle, FleetDocument, User, Notification } = require('../models');
    const { fleetOperatorId } = req.body;
    const vehicleIds = Array.isArray(req.body.vehicleIds) && req.body.vehicleIds.length
      ? req.body.vehicleIds.map(String)
      : [req.params.id];
    if (!fleetOperatorId) return res.status(400).json({ message: 'fleetOperatorId is required' });

    const operator = await User.findOne({ _id: fleetOperatorId, role: 'FRANCHISEE' }).select('name email').lean();
    if (!operator) return res.status(404).json({ message: 'Fleet operator not found' });
    const vehicles = await CommandVehicle.find({ _id: { $in: vehicleIds } });
    if (vehicles.length !== vehicleIds.length) return res.status(404).json({ message: 'One or more vehicles were not found.' });

    const assignedAt = new Date();
    const nextGeneralServiceAt = new Date(assignedAt.getTime() + 45 * 24 * 60 * 60 * 1000);
    for (const vehicle of vehicles) {
      vehicle.fleetOperatorId = operator._id;
      vehicle.fleetOperatorName = operator.name;
      vehicle.fleetOperatorEmail = operator.email;
      vehicle.assignedAt = assignedAt;
      vehicle.assignedBy = req.user._id;
      vehicle.status = 'ASSIGNED';
      vehicle.fleetInventoryStatus = 'SETUP_REQUIRED';
      vehicle.fleetLocationStatus = 'AT_FLEET';
      vehicle.currentCustomerId = null;
      vehicle.currentRentalId = null;
      vehicle.generalServiceIntervalDays = 45;
      vehicle.nextGeneralServiceAt = nextGeneralServiceAt;
      vehicle.lastGeneralServiceAt = null;
      vehicle.lastGeneralServiceAlertAt = null;
      await vehicle.save();

      // Any vehicle documents already uploaded by Command Center follow the bike
      // to the new fleet operator. Keep the complete vehicle identity on each
      // document so the fleet operator always knows exactly which bike it belongs to.
      const vehicleSnapshot = {
        _id: vehicle._id, bikeId: vehicle.bikeId, make: vehicle.make, model: vehicle.model,
        category: vehicle.category, year: vehicle.year, color: vehicle.color,
        registrationNo: vehicle.registrationNo, chassisNo: vehicle.chassisNo, motorNo: vehicle.motorNo,
        batteryCapacityKwh: vehicle.batteryCapacityKwh, rangeKm: vehicle.rangeKm,
        chargingType: vehicle.chargingType, odometerKm: vehicle.odometerKm,
      };
      const relatedDocs = await FleetDocument.find({ vehicleId: vehicle._id }).lean();
      if (relatedDocs.length) {
        await FleetDocument.updateMany(
          { vehicleId: vehicle._id },
          { $set: { franchiseeId: operator._id, shareStatus: 'SHARED', bikeId: vehicle.bikeId, vehicleSnapshot, sentAt: assignedAt, sentBy: req.user._id, issuedToSnapshot: { _id: operator._id, name: operator.name, email: operator.email } } }
        );
      }
      await Notification.create({
        userId: operator._id,
        type: 'FLEET_VEHICLE_ASSIGNED',
        title: 'Bike assigned to your fleet',
        message: `${vehicle.bikeId || vehicle.registrationNo || `${vehicle.make} ${vehicle.model}`} has been assigned to your fleet. First general service is due in 45 days${relatedDocs.length ? ` and ${relatedDocs.length} vehicle document${relatedDocs.length === 1 ? '' : 's'} have been shared with you.` : '.'}`,
        data: { vehicleId: vehicle._id, bikeId: vehicle.bikeId, nextGeneralServiceAt, registrationNo: vehicle.registrationNo, make: vehicle.make, model: vehicle.model, vehicle: vehicleSnapshot, documents: relatedDocs.map(d => ({ ...d, franchiseeId: operator._id, bikeId: vehicle.bikeId, vehicleSnapshot })) },
      });
      if (relatedDocs.length) {
        await Notification.create({
          userId: operator._id,
          type: 'VEHICLE_DOCUMENTS_SHARED',
          title: 'Vehicle documents received',
          message: `${vehicle.bikeId || vehicle.registrationNo || `${vehicle.make} ${vehicle.model}`} documents are now available in your Fleet Inventory.`,
          data: { vehicleId: vehicle._id, bikeId: vehicle.bikeId, vehicle: vehicleSnapshot, documents: relatedDocs.map(d => ({ ...d, franchiseeId: operator._id, bikeId: vehicle.bikeId, vehicleSnapshot })) },
        });
      }
    }

    res.json(vehicles.map(vehicle => ({
      ...vehicle.toObject(),
      franchiseeId: vehicle.fleetOperatorId,
      franchiseeName: vehicle.fleetOperatorName,
      franchiseeEmail: vehicle.fleetOperatorEmail,
    })));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

/** GET /api/admin/vehicle-documents — Command Center vehicle document register */
exports.vehicleDocuments = async (req, res) => {
  try {
    const { FleetDocument, CommandVehicle } = require('../models');
    const q = {};
    if (req.query.vehicleId) q.vehicleId = req.query.vehicleId;
    if (req.query.franchiseeId) q.franchiseeId = req.query.franchiseeId;
    const docs = await FleetDocument.find(q).sort('-createdAt').lean();
    const vehicleIds = [...new Set(docs.map(d => String(d.vehicleId)).filter(Boolean))];
    const vehicles = vehicleIds.length ? await CommandVehicle.find({ _id: { $in: vehicleIds } }).lean() : [];
    const byId = new Map(vehicles.map(v => [String(v._id), v]));
    const now = new Date();
    res.json(docs.map(d => ({ ...d, status: d.expiresAt && new Date(d.expiresAt) < now ? 'EXPIRED' : d.status, vehicle: byId.get(String(d.vehicleId)) || null })));
  } catch (e) { res.status(500).json({ message: e.message }); }
};

/** POST /api/admin/vehicle-documents — Command Center owns the upload */
exports.createVehicleDocument = async (req, res) => {
  try {
    const { FleetDocument, CommandVehicle, Notification } = require('../models');
    const vehicle = await CommandVehicle.findById(req.body.vehicleId).lean();
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    if (!req.body.title || !req.body.url) return res.status(400).json({ message: 'Document title and uploaded file are required' });
    const vehicleSnapshot = {
      _id: vehicle._id, bikeId: vehicle.bikeId, make: vehicle.make, model: vehicle.model,
      category: vehicle.category, year: vehicle.year, color: vehicle.color,
      registrationNo: vehicle.registrationNo, chassisNo: vehicle.chassisNo, motorNo: vehicle.motorNo,
      batteryCapacityKwh: vehicle.batteryCapacityKwh, rangeKm: vehicle.rangeKm,
      chargingType: vehicle.chargingType, odometerKm: vehicle.odometerKm,
    };
    const payload = {
      ...req.body,
      franchiseeId: undefined,
      shareStatus: 'DRAFT',
      vehicleId: vehicle._id,
      bikeId: vehicle.bikeId,
      vehicleSnapshot,
      uploadedBy: req.user._id,
      sentAt: undefined,
      sentBy: undefined,
    };
    ['issuedAt','expiresAt'].forEach(k => { if (!payload[k]) delete payload[k]; });
    const doc = await FleetDocument.create(payload);
    res.status(201).json({ ...doc.toObject(), vehicle: vehicleSnapshot, fleetOperator: vehicle.fleetOperatorId ? { _id: vehicle.fleetOperatorId, name: vehicle.fleetOperatorName, email: vehicle.fleetOperatorEmail } : null });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

/** PUT /api/admin/vehicle-documents/:id/issue — Command Center explicitly issues a registered document to the assigned fleet operator */
exports.issueVehicleDocument = async (req, res) => {
  try {
    const { FleetDocument, CommandVehicle, User, Notification } = require('../models');
    const doc = await FleetDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });
    const vehicle = await CommandVehicle.findById(doc.vehicleId).lean();
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    const operatorId = vehicle.fleetOperatorId;
    if (!operatorId) return res.status(409).json({ message: 'Assign this bike to a fleet operator before issuing the document.' });
    const operator = await User.findOne({ _id: operatorId, role: 'FRANCHISEE', active: { $ne: false } }).select('_id name email phone address').lean();
    if (!operator) return res.status(404).json({ message: 'Assigned fleet operator not found' });
    const issuedAt = new Date();
    doc.franchiseeId = operator._id;
    doc.shareStatus = 'SHARED';
    doc.sentAt = issuedAt;
    doc.sentBy = req.user._id;
    doc.issuedToSnapshot = { _id: operator._id, name: operator.name, email: operator.email, phone: operator.phone, address: operator.address || null };
    doc.bikeId = vehicle.bikeId || doc.bikeId;
    doc.vehicleSnapshot = { ...doc.vehicleSnapshot, _id: vehicle._id, bikeId: vehicle.bikeId, make: vehicle.make, model: vehicle.model, category: vehicle.category, year: vehicle.year, color: vehicle.color, registrationNo: vehicle.registrationNo, chassisNo: vehicle.chassisNo, motorNo: vehicle.motorNo, batteryCapacityKwh: vehicle.batteryCapacityKwh, rangeKm: vehicle.rangeKm, chargingType: vehicle.chargingType, odometerKm: vehicle.odometerKm };
    await doc.save();
    await Notification.create({
      userId: operator._id, type: 'VEHICLE_DOCUMENTS_SHARED', title: 'Vehicle document received',
      message: `${vehicle.bikeId || vehicle.registrationNo || `${vehicle.make} ${vehicle.model}`} — ${doc.title || 'vehicle document'} was issued to your fleet by Command Center.`,
      data: { vehicleId: vehicle._id, bikeId: vehicle.bikeId, vehicle: doc.vehicleSnapshot, document: doc.toObject(), issuedTo: doc.issuedToSnapshot },
    });
    res.json({ ...doc.toObject(), vehicle: doc.vehicleSnapshot, fleetOperator: doc.issuedToSnapshot });
  } catch (e) { res.status(400).json({ message: e.message }); }
};

/** PUT /api/admin/vehicle-documents/:id — Command Center updates a document */
exports.updateVehicleDocument = async (req, res) => {
  try {
    const { FleetDocument, Notification } = require('../models');
    const allowed = ['type','title','fileName','url','number','issuedAt','expiresAt','status','notes'];
    const u = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) u[k] = req.body[k]; });
    const d = await FleetDocument.findByIdAndUpdate(req.params.id, u, { new: true }).lean();
    if (!d) return res.status(404).json({ message: 'Document not found' });
    if (d.franchiseeId) {
      await Notification.create({
        userId: d.franchiseeId,
        type: 'VEHICLE_DOCUMENTS_SHARED',
        title: 'Vehicle document updated',
        message: `${d.bikeId || 'Vehicle'} — ${d.title || 'document'} was updated by Command Center.`,
        data: { vehicleId: d.vehicleId, bikeId: d.bikeId, document: d },
      });
    }
    res.json(d);
  } catch (e) { res.status(400).json({ message: e.message }); }
};

/** GET /api/franchise/assigned-vehicles — fleet operator gets their assigned vehicles */
exports.assignedVehicles = async (req, res) => {
  try {
    const { CommandVehicle, FleetDocument, VehicleRental, User } = require('../models');
    const vehicles = await CommandVehicle.find({
      fleetOperatorId: req.user._id,
      status: { $in: ['ASSIGNED', 'ACTIVE'] },
    }).sort('-assignedAt').lean();
    const vehicleIds = vehicles.map(v => v._id);
    const docs = await FleetDocument.find({ franchiseeId: req.user._id, vehicleId: { $in: vehicleIds } }).sort('-createdAt').lean();
    const rentals = await VehicleRental.find({
      franchiseeId: req.user._id, vehicleId: { $in: vehicleIds },
      paymentStatus: 'PAID', status: { $nin: ['COMPLETED','CANCELLED'] }
    }).sort('-createdAt').lean();
    const customerIds = [...new Set(rentals.map(r => String(r.customerId)).filter(Boolean))];
    const customers = customerIds.length ? await User.find({ _id: { $in: customerIds } }).select('name email phone').lean() : [];
    const cm = new Map(customers.map(c => [String(c._id), c]));
    const rentalByVehicle = new Map();
    rentals.forEach(r => {
      const k=String(r.vehicleId);
      const existing=rentalByVehicle.get(k);
      if(!existing || (r.handoverDate && !r.returnDate) || (!existing.handoverDate && !r.handoverDate)) rentalByVehicle.set(k,r);
    });
    const docsByVehicle = new Map();
    for (const d of docs) { const k=String(d.vehicleId); if(!docsByVehicle.has(k)) docsByVehicle.set(k,[]); docsByVehicle.get(k).push(d); }
    res.json(vehicles.map(v => {
      const rental = rentalByVehicle.get(String(v._id));
      const customer = rental ? cm.get(String(rental.customerId)) : null;
      return {
        ...v,
        fleetLocationStatus: rental?.handoverDate && !rental.returnDate ? 'AT_CUSTOMER' : (v.fleetLocationStatus || 'AT_FLEET'),
        currentCustomerId: rental?.customerId || null,
        currentRentalId: rental?._id || null,
        currentCustomer: customer || null,
        currentRental: rental ? {...rental, customerId: customer || rental.customerId} : null,
        pendingHandoverRental: rental && rental.paymentStatus==='PAID' && !rental.handoverDate ? {...rental, customerId: customer || rental.customerId} : null,
        lifecycleStatus: rental ? (rental.handoverDate && !rental.returnDate ? 'AT_CUSTOMER' : 'HANDOVER_READY') : 'AT_FLEET',
        documents: docsByVehicle.get(String(v._id)) || []
      };
    }));
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

// ═══════════════════════════════════════════════════════════════
// COMMAND CENTER PARTS (spare parts)
// ═══════════════════════════════════════════════════════════════

/** POST /api/admin/parts — create a spare part in Command Center inventory */
exports.createPart = async (req, res) => {
  try {
    const { Inventory } = require('../models');
    const { sku, name } = req.body;
    if (!sku || !name) return res.status(400).json({ message: 'SKU and Part Name are required' });
    const existing = await Inventory.findOne({ sku: sku.trim().toUpperCase() });
    if (existing) return res.status(409).json({ message: `Part code "${sku}" already exists.` });
    const part = await Inventory.create({
      sku:         sku.trim().toUpperCase(),
      name:        name.trim(),
      category:    req.body.category    || 'General',
      quantity:    Number(req.body.quantity)    || 0,
      reorderLevel:Number(req.body.reorderLevel)|| 5,
      unitPrice:   Number(req.body.unitPrice)   || 0,
      description: req.body.description,
      manufacturer:req.body.manufacturer,
    });
    res.status(201).json(part);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
};