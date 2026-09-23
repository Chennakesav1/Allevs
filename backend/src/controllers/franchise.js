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

// ══════════════════════════════════════════════════════════════════
// Fleet Operator v4 — complete operational flow
// ══════════════════════════════════════════════════════════════════

exports.fleetOverview = async (req, res) => {
  try {
    const M = require('../models');
    const fid = req.user._id;
    const [command, pending, rentals, maintenance, docs, customers, expenses] = await Promise.all([
      M.CommandVehicle.find({ fleetOperatorId: fid }).lean(),
      M.PendingVehicle.find({ franchiseeId: fid }).lean(),
      M.VehicleRental.find({ franchiseeId: fid }).lean(),
      M.FleetMaintenance.find({ franchiseeId: fid }).lean(),
      M.FleetDocument.find({ franchiseeId: fid }).lean(),
      M.User.find({ role:'CUSTOMER', _id:{ $in: await M.VehicleRental.distinct('customerId', { franchiseeId: fid }) } }).select('name email phone').lean(),
      M.FleetExpense.find({ franchiseeId: fid }).lean(),
    ]);
    const fleet = command.filter(v => ['ACTIVE','ASSIGNED'].includes(v.status));
    const paid = rentals.filter(r => r.paymentStatus === 'PAID');
    const activeRentals = rentals.filter(r => ['HANDED_OVER','ACTIVE'].includes(r.status) && r.rentalPlan !== 'SALE');
    const activeVehicleIds = new Set(activeRentals.map(r=>String(r.vehicleId)));
    const availableFleet = fleet.filter(v => v.status==='ACTIVE' && !activeVehicleIds.has(String(v._id)));
    const pendingHandover = rentals.filter(r => r.paymentStatus === 'PAID' && !r.handoverDate && r.status !== 'COMPLETED');
    const now = new Date();
    const expiringDocs = docs.filter(d => d.expiresAt && new Date(d.expiresAt) <= new Date(now.getTime()+30*86400000) && d.status !== 'EXPIRED');
    const overdueReturns = rentals.filter(r => r.endDate && new Date(r.endDate) < now && !['COMPLETED','CANCELLED'].includes(r.status));
    const revenue = paid.reduce((s,r)=>s+Number(r.totalAmount||0),0);
    const expense = expenses.reduce((s,r)=>s+Number(r.amount||0),0);
    res.json({
      metrics:{ totalFleet:fleet.length, availableFleet:availableFleet.length, activeRentals:activeRentals.length, pendingHandover:pendingHandover.length, customers:customers.length, revenue, expenses:expense, netRevenue:revenue-expense, maintenance:maintenance.filter(m=>m.status!=='COMPLETED').length, expiringDocuments:expiringDocs.length, overdueReturns:overdueReturns.length },
      recentBookings: rentals.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).slice(0,8),
      alerts:[
        ...overdueReturns.slice(0,5).map(r=>({type:'RETURN_OVERDUE',severity:'HIGH',rentalId:r._id,message:`Return overdue for ${r.vehicleSnapshot?.make||''} ${r.vehicleSnapshot?.model||''}` })),
        ...expiringDocs.slice(0,5).map(d=>({type:'DOCUMENT_EXPIRING',severity:'MEDIUM',vehicleId:d.vehicleId,documentId:d._id,message:`${d.title||d.type} expires soon` })),
      ]
    });
  } catch(e){ res.status(500).json({message:e.message}); }
};

exports.fleetVehicles = async (req,res) => {
  try {
    const M=require('../models'); const fid=req.user._id;
    const [assigned, own] = await Promise.all([
      M.CommandVehicle.find({fleetOperatorId:fid}).sort('-updatedAt').lean(),
      M.PendingVehicle.find({franchiseeId:fid}).sort('-updatedAt').lean(),
    ]);
    res.json({assigned, own});
  } catch(e){res.status(500).json({message:e.message});}
};

exports.fleetVehicleDetail = async (req,res) => {
  try {
    const M=require('../models'); const fid=req.user._id;
    const vehicle=await M.CommandVehicle.findOne({_id:req.params.id,fleetOperatorId:fid}).lean();
    if(!vehicle) return res.status(404).json({message:'Fleet vehicle not found'});
    const [rentals,maintenance,documents,inspections]=await Promise.all([
      M.VehicleRental.find({franchiseeId:fid,vehicleId:vehicle._id}).populate('customerId','name email phone address').sort('-createdAt').lean(),
      M.FleetMaintenance.find({franchiseeId:fid,vehicleId:vehicle._id}).populate('commandAssignedTo','name email role phone').sort('-createdAt').lean(),
      M.FleetDocument.find({franchiseeId:fid,vehicleId:vehicle._id}).sort('-createdAt').lean(),
      M.HandoverInspection.find({franchiseeId:fid,vehicleId:vehicle._id}).sort('-createdAt').lean(),
    ]);
    for(const m of maintenance) m.proof=m.commandJobId?await M.JobProof.findOne({jobId:m.commandJobId}).lean():null;
    res.json({vehicle,rentals,maintenance,documents,inspections});
  }catch(e){res.status(500).json({message:e.message});}
};

exports.updateFleetStatus = async (req,res) => {
  try {
    const M=require('../models'); const allowed=['ACTIVE','INACTIVE'];
    const status=String(req.body.status||'').toUpperCase();
    if(!allowed.includes(status)) return res.status(400).json({message:'Invalid fleet status'});
    const v=await M.CommandVehicle.findOneAndUpdate({ _id:req.params.id, fleetOperatorId:req.user._id }, {status}, {new:true});
    if(!v) return res.status(404).json({message:'Fleet vehicle not found'});
    res.json(v);
  }catch(e){res.status(400).json({message:e.message});}
};

exports.createMaintenance = async (req,res) => {
  try {
    const M=require('../models'); const fid=req.user._id;
    const vehicle=await M.CommandVehicle.findOne({_id:req.body.vehicleId,fleetOperatorId:fid});
    if(!vehicle) return res.status(404).json({message:'Vehicle not found'});

    const activeRental = await M.VehicleRental.findOne({
      franchiseeId:fid, vehicleId:vehicle._id, paymentStatus:'PAID',
      status:{$in:['HANDED_OVER','ACTIVE']}
    }).populate('customerId','name email phone address').sort('-createdAt');
    const customer = activeRental?.customerId || null;
    const customerLocation = [
      customer?.address?.fullAddress, customer?.address?.address, customer?.address?.area,
      customer?.address?.district, customer?.address?.state, customer?.address?.pincode,
      activeRental?.customerLocation?.fullAddress, activeRental?.fullAddress, activeRental?.area,
      activeRental?.district, activeRental?.state, activeRental?.pincode
    ].filter(Boolean).join(', ');
    const vendorLocation = String(req.body.vendorLocation || 'allevs [somajiguda], Somajiguda, Hyderabad');
    const mapsUrl = q => q ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}` : '';
    const payload={
      ...req.body, franchiseeId:fid, createdBy:fid, cost:Number(req.body.cost||0),
      bikeId: vehicle.bikeId,
      vendor: req.body.vendor || 'allevs [somajiguda]',
      vendorLocation, vendorMapsUrl: req.body.vendorMapsUrl || mapsUrl(vendorLocation),
      customerId: customer?._id || req.body.customerId || undefined,
      customerSnapshot: customer ? {name:customer.name,email:customer.email,phone:customer.phone,address:customer.address} : (req.body.customerSnapshot || undefined),
      customerLocation: customerLocation || req.body.customerLocation || '',
      customerMapsUrl: req.body.customerMapsUrl || mapsUrl(customerLocation),
    };
    if(!payload.scheduledAt)delete payload.scheduledAt; if(!payload.completedAt)delete payload.completedAt; if(!payload.nextServiceAt)delete payload.nextServiceAt;
    const m=await M.FleetMaintenance.create(payload);
    if(m.cost>0) await M.FleetExpense.create({franchiseeId:fid,vehicleId:vehicle._id,category:'MAINTENANCE',amount:m.cost,date:m.completedAt||m.scheduledAt||new Date(),description:m.title||'Vehicle maintenance',createdBy:fid});
    await M.Notification.create({userId:fid,type:'MAINTENANCE_REGISTERED',title:'Maintenance registered',message:`${vehicle.bikeId||vehicle.registrationNo||vehicle.make+' '+vehicle.model}: ${m.title||m.type}`,data:{maintenanceId:m._id,vehicleId:vehicle._id,bikeId:vehicle.bikeId,customerId:customer?._id}});
    if(customer?._id) await M.Notification.create({userId:customer._id,type:'MAINTENANCE_REGISTERED',title:'Vehicle maintenance registered',message:`${vehicle.bikeId||vehicle.registrationNo||vehicle.make+' '+vehicle.model} has been registered for ${m.title||m.type}.`,data:{maintenanceId:m._id,vehicleId:vehicle._id,bikeId:vehicle.bikeId,status:m.status,scheduledAt:m.scheduledAt,serviceType:m.type,vendor:m.vendor}});
    const commandUsers=await M.User.find({role:{$in:['CENTRAL_ADMIN','SUPER_ADMIN']},active:{$ne:false}}).select('_id').lean();
    if(commandUsers.length) await M.Notification.insertMany(commandUsers.map(u=>({userId:u._id,type:'MAINTENANCE_CUSTOMER_SERVICE',title:'New maintenance customer service',message:`${vehicle.bikeId||vehicle.registrationNo||vehicle.make+' '+vehicle.model}${customer?.name?` · ${customer.name}`:''} requires maintenance service.`,data:{maintenanceId:m._id,vehicleId:vehicle._id,bikeId:vehicle.bikeId,customerId:customer?._id,status:m.status}})));
    res.status(201).json(m);
  }catch(e){res.status(400).json({message:e.message});}
};

exports.listMaintenance = async (req,res) => {
  try { const M=require('../models'); const q={franchiseeId:req.user._id}; if(req.query.vehicleId)q.vehicleId=req.query.vehicleId; res.json(await M.FleetMaintenance.find(q).sort('-createdAt').lean()); }
  catch(e){res.status(500).json({message:e.message});}
};

exports.updateMaintenance = async (req,res) => {
  try { const M=require('../models'); const allowed=['title','description','status','priority','scheduledAt','startedAt','completedAt','nextServiceAt','odometerKm','batterySoc','cost','vendor','invoiceUrl','parts','notes','type']; const u={}; allowed.forEach(k=>{if(req.body[k]!==undefined)u[k]=req.body[k]}); if(u.cost!==undefined)u.cost=Number(u.cost); const before=await M.FleetMaintenance.findOne({_id:req.params.id,franchiseeId:req.user._id}); if(!before)return res.status(404).json({message:'Maintenance record not found'}); const m=await M.FleetMaintenance.findOneAndUpdate({_id:req.params.id,franchiseeId:req.user._id},u,{new:true}); if(u.status==='COMPLETED'&&before.status!=='COMPLETED'&&m.customerId) await M.Notification.create({userId:m.customerId,type:'MAINTENANCE_COMPLETED',title:'Vehicle service completed',message:`${m.title||m.type} service for your vehicle has been completed. Please share your feedback.`,data:{maintenanceId:m._id,vehicleId:m.vehicleId,status:m.status,completedAt:m.completedAt||m.updatedAt}}); res.json(m); }
  catch(e){res.status(400).json({message:e.message});}
};

exports.commandMaintenance = async (req,res) => {
  try { const M=require('../models'); const q={}; if(req.query.status)q.status=req.query.status; const rows=await M.FleetMaintenance.find(q).populate('vehicleId','make model registrationNo odometerKm batteryCapacityKwh bikeId nextGeneralServiceAt').populate('customerId','name email phone address').populate('franchiseeId','name email phone').populate('commandAssignedTo','name email role phone').populate('commandJobId').sort('-createdAt').lean(); const jobIds=rows.map(x=>x.commandJobId?._id||x.commandJobId).filter(Boolean); const proofs=jobIds.length?await M.JobProof.find({jobId:{$in:jobIds}}).sort('-createdAt').lean():[]; const pm=new Map(proofs.map(x=>[String(x.jobId),x])); rows.forEach(x=>{const id=x.commandJobId?._id||x.commandJobId; x.proof=pm.get(String(id))||null;}); res.json(rows); }
  catch(e){res.status(500).json({message:e.message});}
};

exports.commandMaintenanceUpdate = async (req,res) => {
  try {
    const M=require('../models');
    const m=await M.FleetMaintenance.findById(req.params.id);
    if(!m)return res.status(404).json({message:'Maintenance service not found'});

    const next=String(req.body.status||'').toUpperCase();
    // Command Center is the only role allowed to close the customer service.
    if(next!=='COMPLETED')return res.status(400).json({message:'Command Center can only mark a staff-completed service as COMPLETED'});
    if(!m.commandAssignedTo)return res.status(409).json({message:'Assign a staff member before completing the service'});
    if(!m.staffCompletedAt)return res.status(409).json({message:'Staff must mark the service completed before Command Center can close it'});
    if(m.status==='COMPLETED')return res.json(m);

    m.status='COMPLETED';
    m.completedAt=req.body.completedAt?new Date(req.body.completedAt):new Date();
    m.completedBy=req.user._id;
    m.completedByName=req.user.name||req.user.email||'Command Center';
    m.completionSummary=req.body.completionSummary||req.body.notes||m.staffCompletionSummary||m.completionSummary||'';
    if(m.staffCompletionSummary) m.completionSummary=m.staffCompletionSummary;
    if(req.body.notes!==undefined)m.notes=req.body.notes;
    if(req.body.cost!==undefined)m.cost=Number(req.body.cost);
    if(req.body.invoiceUrl!==undefined)m.invoiceUrl=req.body.invoiceUrl;

    if(m.vehicleId){
      const v=await M.CommandVehicle.findById(m.vehicleId);
      if(v){
        v.lastGeneralServiceAt=m.completedAt;
        v.lastGeneralServiceAlertAt=null;
        v.generalServiceIntervalDays=45;
        v.nextGeneralServiceAt=new Date(m.completedAt.getTime()+45*24*60*60*1000);
        await v.save();
      }
    }
    await m.save();

    if(m.commandJobId){
      await M.Job.findByIdAndUpdate(m.commandJobId,{
        status:'COMPLETED',
        trackingStatus:'Completed',
        completedAt:m.completedAt,
        remarks:m.completionSummary||'',
      });
    }

    // Only now is the service shown as COMPLETED to the customer and fleet operator.
    if(m.customerId){
      await M.Notification.create({
        userId:m.customerId,
        type:'MAINTENANCE_COMPLETED',
        title:'Vehicle service completed',
        message:`${m.bikeId||'Your vehicle'} ${m.title||m.type} service has been completed by Command Center. Please review the service and share your feedback.`,
        data:{maintenanceId:m._id,vehicleId:m.vehicleId,bikeId:m.bikeId,completedAt:m.completedAt,completionSummary:m.completionSummary||'',feedbackRequested:true}
      });
    }
    if(m.franchiseeId){
      await M.Notification.create({
        userId:m.franchiseeId,
        type:'MAINTENANCE_COMPLETED',
        title:'Maintenance service completed',
        message:`${m.bikeId||'Vehicle'} ${m.title||m.type} service has been completed by Command Center.`,
        data:{maintenanceId:m._id,vehicleId:m.vehicleId,bikeId:m.bikeId,customerId:m.customerId,completedAt:m.completedAt,completionSummary:m.completionSummary||''}
      });
    }

    return res.json(m);
  } catch(e){res.status(400).json({message:e.message});}
};

exports.commandMaintenanceAssign = async (req,res) => {
  try {
    const M=require('../models');
    const m=await M.FleetMaintenance.findById(req.params.id);
    if(!m)return res.status(404).json({message:'Maintenance service not found'});
    const staffId=req.body.staffId;
    if(!staffId)return res.status(400).json({message:'staffId is required'});
    const staff=await M.User.findOne({_id:staffId,role:{$in:['STAFF','TECHNICIAN','HUB_MANAGER']},active:true}).select('_id name email role phone').lean();
    if(!staff)return res.status(404).json({message:'Active staff member not found'});
    let job=m.commandJobId?await M.Job.findById(m.commandJobId):null;
    if(!job){
      job=await M.Job.create({customerId:m.customerId||undefined,commandVehicleId:m.vehicleId,maintenanceId:m._id,bikeId:m.bikeId,franchiseeId:m.franchiseeId,technicianId:staff._id,serviceType:m.type||'SERVICE',problem:m.description||m.title||'Fleet maintenance service',priority:m.priority||'NORMAL',status:'ASSIGNED',trackingStatus:'Maintenance job assigned',location:m.customerLocation?{address:m.customerLocation,mapsUrl:m.customerMapsUrl}:undefined});
      await M.JobCard.create({jobId:job._id,complaint:m.description||m.title||'Fleet maintenance service'});
    }else{
      job.technicianId=staff._id; job.status=job.status==='COMPLETED'?'COMPLETED':'ASSIGNED'; job.trackingStatus='Maintenance job assigned'; await job.save();
    }
    m.commandAssignedTo=staff._id; m.commandJobId=job._id; await m.save();
    await M.Notification.create({userId:staff._id,type:'MAINTENANCE_JOB_ASSIGNED',title:'New maintenance job card',message:`${m.title||m.type||'Maintenance service'} assigned for ${m.bikeId||'vehicle'}.`,data:{maintenanceId:m._id,jobId:job._id,vehicleId:m.vehicleId,bikeId:m.bikeId,priority:m.priority||'NORMAL'}});
    const out=await M.FleetMaintenance.findById(m._id).populate('commandAssignedTo','name email role').populate('commandJobId');
    res.json(out);
  }catch(e){res.status(400).json({message:e.message});}
};

exports.commandMaintenanceFeedback = async (req,res) => { try { const M=require('../models'); const m=await M.FleetMaintenance.findById(req.params.id); if(!m)return res.status(404).json({message:'Maintenance service not found'}); res.json(m.customerFeedback||null); } catch(e){res.status(500).json({message:e.message});} }; 

exports.listDocuments = async (req,res) => {
  try { const M=require('../models'); const q={franchiseeId:req.user._id}; if(req.query.vehicleId)q.vehicleId=req.query.vehicleId; const docs=await M.FleetDocument.find(q).sort('expiresAt -createdAt').lean(); const now=new Date(); res.json(docs.map(d=>({...d,status:d.expiresAt&&new Date(d.expiresAt)<now?'EXPIRED':d.status}))); }
  catch(e){res.status(500).json({message:e.message});}
};

exports.createDocument = async (req,res) => {
  try { const M=require('../models'); const vehicle=await M.CommandVehicle.findOne({_id:req.body.vehicleId,fleetOperatorId:req.user._id}); if(!vehicle)return res.status(404).json({message:'Vehicle not found'}); const payload={...req.body,franchiseeId:req.user._id,uploadedBy:req.user._id}; ['issuedAt','expiresAt'].forEach(k=>{if(!payload[k])delete payload[k]}); const d=await M.FleetDocument.create(payload); res.status(201).json(d); }
  catch(e){res.status(400).json({message:e.message});}
};

exports.updateDocument = async (req,res) => {
  try { const M=require('../models'); const allowed=['type','title','fileName','url','number','issuedAt','expiresAt','status','notes']; const u={}; allowed.forEach(k=>{if(req.body[k]!==undefined)u[k]=req.body[k]}); const d=await M.FleetDocument.findOneAndUpdate({_id:req.params.id,franchiseeId:req.user._id},u,{new:true}); if(!d)return res.status(404).json({message:'Document not found'}); res.json(d); }
  catch(e){res.status(400).json({message:e.message});}
};

exports.vehicleInspectionHistory = async (req,res) => {
  try {
    const M=require('../models'); const fid=req.user._id; const vehicleId=String(req.params.vehicleId||'').trim();
    if(!vehicleId) return res.status(400).json({message:'Vehicle ID is required'});
    const rows=await M.HandoverInspection.find({franchiseeId:fid,vehicleId}).sort('-createdAt').limit(20).lean();
    const latest=rows[0]||null; const lastReturn=rows.find(x=>x.stage==='RETURN')||null; const lastHandover=rows.find(x=>x.stage==='HANDOVER')||null;
    return res.json({latest,lastReturn,lastHandover,history:rows});
  } catch(e){ return res.status(500).json({message:e.message}); }
};

exports.handoverInspection = async (req,res) => {
  try {
    const M=require('../models'); const fid=req.user._id;
    const rental=await M.VehicleRental.findOne({_id:req.params.id,franchiseeId:fid,paymentStatus:'PAID'});
    if(!rental)return res.status(404).json({message:'Paid booking not found'});
    const stage=String(req.body.stage||'HANDOVER').toUpperCase();
    if(!['HANDOVER','RETURN'].includes(stage))return res.status(400).json({message:'Invalid inspection stage'});

    // Handover is a two-step franchise workflow: select a physical Fleet Inventory
    // vehicle, complete the inspection, then this request marks the handover.
    if(stage==='HANDOVER') {
      const requestedVehicleId=req.body.vehicleId || rental.vehicleId;
      if(!requestedVehicleId)return res.status(400).json({message:'Select a Fleet Inventory vehicle before handover inspection'});

      const selected=await M.CommandVehicle.findOne({
        _id:requestedVehicleId,
        fleetOperatorId:fid,
        status:'ACTIVE',
        fleetInventoryStatus:'ACTIVE',
        fleetLocationStatus:{$ne:'AT_CUSTOMER'},
        $or:[{quantity:{$gt:0}},{quantity:{$exists:false}}]
      });
      if(!selected)return res.status(409).json({message:'Selected vehicle is not available in Fleet Inventory'});

      // If the customer booking was originally attached to another physical bike,
      // release that reservation before attaching the selected Fleet Inventory bike.
      if(rental.vehicleSource==='COMMAND_VEHICLE' && rental.vehicleId && String(rental.vehicleId)!==String(selected._id)) {
        await M.CommandVehicle.findOneAndUpdate({_id:rental.vehicleId,fleetOperatorId:fid},{ $inc:{quantity:1} });
      }

      const snapshot={
        ...(rental.vehicleSnapshot||{}), _id:selected._id, bikeId:selected.bikeId,
        make:selected.make, model:selected.model, year:selected.year, color:selected.color,
        category:selected.category, registrationNo:selected.registrationNo, chassisNo:selected.chassisNo,
        motorNo:selected.motorNo, insuranceExpiry:selected.insuranceExpiry, odometerKm:selected.odometerKm,
        seatingCapacity:selected.seatingCapacity, topSpeedKph:selected.topSpeedKph,
        batteryCapacityKwh:selected.batteryCapacityKwh, rangeKm:selected.rangeKm,
        chargingType:selected.chargingType, images:selected.images, description:selected.description,
        rentalPlans:selected.rentalPlans, securityDeposit:rental.securityDeposit,
        discountPercent:rental.discountPercent, discountAmount:rental.discountAmount,
        franchiseeId:fid, franchiseeName:rental.franchiseeName
      };

      rental.vehicleId=selected._id;
      rental.vehicleSource='COMMAND_VEHICLE';
      rental.bikeId=selected.bikeId;
      rental.vehicleSnapshot=snapshot;

      // Consume the physical inventory unit and immediately mark its location as customer-held.
      await M.CommandVehicle.updateOne(
        {_id:selected._id,fleetOperatorId:fid},
        {$inc:{quantity:-1},$set:{fleetLocationStatus:'AT_CUSTOMER',currentCustomerId:rental.customerId,currentRentalId:rental._id}}
      );

      if(M.CustomerPayment) {
        await M.CustomerPayment.updateMany({rentalId:rental._id},{$set:{vehicleId:selected._id,bikeId:selected.bikeId,vehicleSnapshot:snapshot}});
      }

      // Sales need the customer's owned-vehicle record at the same handover boundary.
      if(rental.rentalPlan==='SALE') {
        const vin=snapshot.vin || snapshot.registrationNo || `EVCORE-${String(rental._id).slice(-10).toUpperCase()}`;
        let owned=await M.Vehicle.findOne({customerId:rental.customerId,sourcePurchaseId:rental._id});
        if(!owned) owned=await M.Vehicle.create({customerId:rental.customerId,vin,registrationNo:snapshot.registrationNo,model:[snapshot.make,snapshot.model].filter(Boolean).join(' '),batterySoc:0,batterySoh:100,status:'ACTIVE',sourcePurchaseId:rental._id});
      }

      rental.handoverDate=new Date();
      rental.status='SALE'===rental.rentalPlan?'HANDED_OVER':'ACTIVE';
    }

    if(stage==='RETURN') {
      rental.returnDate=new Date(); rental.status='COMPLETED';
      if(Number(req.body.extraCharges||0)>0) rental.totalAmount=Number(rental.totalAmount||0)+Number(req.body.extraCharges);
      if(rental.vehicleSource==='COMMAND_VEHICLE' && rental.vehicleId) {
        await M.CommandVehicle.updateOne(
          { _id:rental.vehicleId, fleetOperatorId:fid },
          { $set:{ fleetLocationStatus:'AT_FLEET', currentCustomerId:null, currentRentalId:null }, $inc:{ quantity:1 } }
        );
      }
    }

    const inspectionData={...req.body,franchiseeId:fid,rentalId:rental._id,vehicleId:rental.vehicleId,customerId:rental.customerId,stage,createdBy:fid};
    const insp=await M.HandoverInspection.create(inspectionData);
    if(rental.vehicleId && (req.body.odometerKm!==undefined || req.body.batterySoc!==undefined)){
      const upd={};
      if(req.body.odometerKm!==undefined && req.body.odometerKm!=='') upd.odometerKm=Number(req.body.odometerKm);
      if(req.body.batterySoc!==undefined && req.body.batterySoc!=='') upd.batterySoc=Number(req.body.batterySoc);
      if(Object.keys(upd).length) await M.CommandVehicle.findByIdAndUpdate(rental.vehicleId,{$set:upd});
    }

    rental.bookingHistory=rental.bookingHistory||[];
    rental.bookingHistory.push({event:stage==='HANDOVER'?'HANDOVER_COMPLETED':'RETURN_COMPLETED',at:new Date(),inspectionId:insp._id,odometerKm:req.body.odometerKm,batterySoc:req.body.batterySoc,damageNotes:req.body.damageNotes,extraCharges:Number(req.body.extraCharges||0),status:rental.status});
    await rental.save();

    await M.Notification.create({userId:rental.customerId,type:stage==='HANDOVER'?'VEHICLE_HANDOVER':'VEHICLE_RETURN',title:stage==='HANDOVER'?'Vehicle handed over':'Vehicle return completed',message:stage==='HANDOVER'?'Your vehicle handover inspection is complete and the vehicle has been handed over.':'Your vehicle return inspection is complete.',data:{rentalId:rental._id,inspectionId:insp._id,vehicleId:rental.vehicleId,bikeId:rental.bikeId}});
    res.json({inspection:insp,rental});
  }catch(e){res.status(400).json({message:e.message});}
};

exports.customers = async (req,res) => {
  try { const M=require('../models'); const ids=await M.VehicleRental.distinct('customerId',{franchiseeId:req.user._id}); const q={_id:{$in:ids},role:'CUSTOMER'}; if(req.query.search){q.$or=[{name:{$regex:req.query.search,$options:'i'}},{email:{$regex:req.query.search,$options:'i'}},{phone:{$regex:req.query.search,$options:'i'}}]}; const users=await M.User.find(q).select('name email phone address aadharNumber panNumber identityDocuments active createdAt').lean(); const rows=await Promise.all(users.map(async u=>{const [rentals,payments,vehicles]=await Promise.all([M.VehicleRental.find({franchiseeId:req.user._id,customerId:u._id}).sort('-createdAt').lean(),M.Payment.find({customerId:u._id}).sort('-createdAt').lean(),M.Vehicle.find({customerId:u._id}).lean()]); return {...u,rentals,payments,vehicles,totalPaid:rentals.filter(r=>r.paymentStatus==='PAID').reduce((s,r)=>s+Number(r.totalAmount||0),0)};})); res.json(rows); }
  catch(e){res.status(500).json({message:e.message});}
};

exports.payments = async (req,res) => {
  try {
    const M=require('../models');
    let rows=await M.CustomerPayment.find({franchiseeId:req.user._id}).populate('customerId','name email phone address').sort('-paidAt').lean();
    if(!rows.length){
      const rentals=await M.VehicleRental.find({franchiseeId:req.user._id,paymentStatus:'PAID'}).populate('customerId','name email phone address').sort('-createdAt').lean();
      rows=rentals.map(r=>({rentalId:r._id,customerId:r.customerId,vehicleSnapshot:r.vehicleSnapshot,rentalPlan:r.rentalPlan,planUnits:r.planUnits,rentalRate:r.rentalRate,securityDeposit:r.securityDeposit,discountPercent:r.discountPercent,discountAmount:r.discountAmount,amount:r.totalAmount,razorpayOrderId:r.razorpayOrderId,razorpayPaymentId:r.razorpayPaymentId,status:'PAID',paidAt:r.updatedAt||r.createdAt}));
    }
    const summary={count:rows.length,total:rows.reduce((s,r)=>s+Number(r.amount||0),0),sales:rows.filter(r=>r.rentalPlan==='SALE').reduce((s,r)=>s+Number(r.amount||0),0),rentals:rows.filter(r=>r.rentalPlan!=='SALE').reduce((s,r)=>s+Number(r.amount||0),0)};
    res.json({summary,rows});
  } catch(e){res.status(500).json({message:e.message});}
};

exports.expenses = async (req,res) => {
  try { const M=require('../models'); res.json(await M.FleetExpense.find({franchiseeId:req.user._id}).sort('-date').lean()); }
  catch(e){res.status(500).json({message:e.message});}
};
exports.createExpense = async (req,res) => {
  try { const M=require('../models'); const amount=Number(req.body.amount); if(!(amount>=0))return res.status(400).json({message:'Valid amount is required'}); const payload={...req.body,franchiseeId:req.user._id,createdBy:req.user._id,amount}; if(!payload.date)delete payload.date; const x=await M.FleetExpense.create(payload); await M.Financial.create({franchiseeId:req.user._id,kind:'EXPENSE',category:req.body.category||'OTHER',amount,referenceId:x._id,description:req.body.description||'Fleet expense'}); res.status(201).json(x); }
  catch(e){res.status(400).json({message:e.message});}
};

exports.notifications = async (req,res) => {
  try { const M=require('../models'); res.json(await M.Notification.find({userId:req.user._id}).sort('-createdAt').limit(100).lean()); }
  catch(e){res.status(500).json({message:e.message});}
};
exports.readNotification = async (req,res) => {
  try { const M=require('../models'); const n=await M.Notification.findOneAndUpdate({_id:req.params.id,userId:req.user._id},{read:true},{new:true}); if(!n)return res.status(404).json({message:'Notification not found'}); res.json(n); }
  catch(e){res.status(400).json({message:e.message});}
};
exports.readAllNotifications = async (req,res) => {
  try { const M=require('../models'); await M.Notification.updateMany({userId:req.user._id,read:false},{$set:{read:true}}); res.json({ok:true}); }
  catch(e){res.status(400).json({message:e.message});}
};

exports.report = async (req,res) => {
  try { const M=require('../models'); const fid=req.user._id; const [rentals,expenses,maintenance]=await Promise.all([M.VehicleRental.find({franchiseeId:fid}).lean(),M.FleetExpense.find({franchiseeId:fid}).lean(),M.FleetMaintenance.find({franchiseeId:fid}).lean()]); const byMonth={}; rentals.filter(r=>r.paymentStatus==='PAID').forEach(r=>{const k=new Date(r.createdAt).toISOString().slice(0,7);byMonth[k]=(byMonth[k]||0)+Number(r.totalAmount||0)}); res.json({generatedAt:new Date(),summary:{revenue:rentals.filter(r=>r.paymentStatus==='PAID').reduce((s,r)=>s+Number(r.totalAmount||0),0),expenses:expenses.reduce((s,r)=>s+Number(r.amount||0),0),maintenanceCost:maintenance.reduce((s,r)=>s+Number(r.cost||0),0)},monthlyRevenue:Object.entries(byMonth).sort((a,b)=>a[0].localeCompare(b[0])).map(([month,revenue])=>({month,revenue})),bookings:rentals}); }
  catch(e){res.status(500).json({message:e.message});}
};
