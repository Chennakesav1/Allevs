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
cr.post('/kyc/documents',           upload.fields([{name:'aadhaarPhoto',maxCount:1},{name:'panPhoto',maxCount:1},{name:'currentBill',maxCount:1}]), P.customer.saveKycDocuments);
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
cr.post('/complaints/:id/messages', P.customer.complaintMessage);
cr.post('/complaints/:id/feedback', P.customer.feedback);
cr.get( '/telemetry/:vehicleId',  P.customer.telemetry);
cr.get( '/notifications',         P.customer.notifications);
cr.put( '/notifications/:id/read', P.customer.readNotification);
cr.put( '/notifications/read-all', P.customer.readAllNotifications);
cr.get( '/maintenance-services',   P.customer.maintenanceServices);
cr.post('/maintenance-services/:id/feedback', P.customer.maintenanceFeedback);
// FIX: serve approved vehicles from MongoDB (replaces broken localStorage approach)
cr.get( '/available-vehicles',    Ap.availableVehicles);
// Public hub list for the customer charging-stations map (avoids 403 on /admin/hubs)
cr.get( '/hubs',                  Ad.hubs);
// Vehicle Purchase
cr.post('/purchases/create-order',           Rn.createOrder);
cr.post('/purchases/verify-payment',         Rn.verifyPayment);
cr.get( '/purchases',                        Rn.myRentals);
cr.post('/purchases/:id/extend-order',         Rn.createExtensionOrder);
cr.post('/purchases/:id/verify-extension',     Rn.verifyExtensionPayment);
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
sr.post('/jobs/:id/start',         St.start);
sr.post('/jobs/:id/pause',         St.pause);
sr.post('/jobs/:id/complete',      St.complete);
sr.get( '/jobs/:id/history',       St.history);
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
sr.get( '/vehicle-history',             St.vehicleHistory);
sr.post('/own-job-cards',              St.createOwnJobCard);
sr.post('/jobs/:id/proof',             SP.jobProof);

r.use('/staff', sr);

// ── Franchise ─────────────────────────────────────────────────────
const fr = express.Router();
fr.use(auth, allow('FRANCHISEE', 'CENTRAL_ADMIN', 'SUPER_ADMIN'));
fr.get( '/dashboard',          Fr.dashboard);
fr.get( '/financials',         Fr.financials);
fr.get( '/fleet/overview',      Fr.fleetOverview);
fr.get( '/fleet/vehicles',      Fr.fleetVehicles);
fr.get( '/fleet/vehicles/:id',  Fr.fleetVehicleDetail);
fr.put( '/fleet/vehicles/:id/status', Fr.updateFleetStatus);
fr.get( '/fleet/maintenance',   Fr.listMaintenance);
fr.post('/fleet/maintenance',   Fr.createMaintenance);
fr.put( '/fleet/maintenance/:id', Fr.updateMaintenance);
fr.post('/fleet/rentals/:id/inspection', Fr.handoverInspection);
fr.get( '/fleet/vehicles/:vehicleId/inspection-history', Fr.vehicleInspectionHistory);
fr.get( '/fleet/customers',     Fr.customers);
fr.get( '/fleet/payments',      Fr.payments);
fr.get( '/fleet/expenses',      Fr.expenses);
fr.post('/fleet/expenses',      Fr.createExpense);
fr.get( '/fleet/notifications', Fr.notifications);
fr.put( '/fleet/notifications/:id/read', Fr.readNotification);
fr.put( '/fleet/notifications/read-all', Fr.readAllNotifications);
fr.get( '/fleet/reports',       Fr.report);
fr.get( '/roi',                Fr.roi);
fr.get( '/capex',              Fr.capex);
fr.get( '/emi',                Fr.emi);
fr.get( '/inventory',          Fr.inventory);
fr.get( '/staff',              Fr.staff);
fr.get( '/jobs',               Fr.jobs);
fr.get( '/purchases',             Rn.franchisePurchases);
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
    const [jobs, rentals, maintenance] = await Promise.all([
      M.Job.find({ vehicleId }).sort('-createdAt').limit(20).lean(),
      M.VehicleRental.find({ vehicleId }).sort('-createdAt').limit(10).lean(),
      M.FleetMaintenance.find({ vehicleId, franchiseeId: req.user._id, type:'COMPLAINT_SERVICE' }).sort('-createdAt').limit(20).lean(),
    ]);
    for (const j of jobs) {
      if (j.maintenanceId) {
        const m = maintenance.find(x => String(x._id) === String(j.maintenanceId));
        if (m) j.solution = m.staffCompletionSummary || m.completionSummary || m.notes || '';
      }
      if (!j.solution) j.solution = j.remarks || '';
      const m = j.maintenanceId ? maintenance.find(x => String(x._id) === String(j.maintenanceId)) : null;
      j.pauseHistory = j.pauseHistory || m?.staffPauseHistory || [];
      j.staffStartedAt = m?.staffStartedAt || j.startedAt;
      j.staffCompletedAt = m?.staffCompletedAt || j.completedAt;
      j.staffCompletionSummary = m?.staffCompletionSummary || j.remarks || '';
      j.totalPauseSeconds = (j.pauseHistory||[]).reduce((sum,p)=>sum+Number(p.durationSeconds||0),0);
    }
    return res.json({ jobs, rentals, maintenance });
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
fr.get( '/fleet/documents',        Ad.vehicleDocuments);
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
pr.get('/vehicle-documents', Ad.vehicleDocuments);
pr.post('/vehicle-documents', Ad.createVehicleDocument);
pr.put('/vehicle-documents/:id', Ad.updateVehicleDocument);
pr.put('/vehicle-documents/:id/issue', Ad.issueVehicleDocument);

pr.get('/complaints', async (req, res) => {
  try {
    const { Complaint, JobProof } = require('../models');
    const list = await Complaint.find()
      .populate('customerId','name email phone')
      .populate({path:'maintenanceId',populate:{path:'commandAssignedTo',select:'name email role phone'}})
      .sort('-createdAt').lean();
    for (const c of list) if (c.maintenanceId?.commandJobId) c.proof = await JobProof.findOne({jobId:c.maintenanceId.commandJobId}).lean();
    res.json(list);
  } catch (e) { res.status(500).json({ message: e.message }); }
});

pr.get('/complaints/:id/vehicle-history', async (req, res) => {
  try {
    const M = require('../models');
    const c = await M.Complaint.findById(req.params.id).lean();
    if (!c) return res.status(404).json({ message: 'Complaint not found' });
    const [jobs, rentals, maintenance] = await Promise.all([
      M.Job.find({ vehicleId:c.vehicleId }).sort('-createdAt').limit(30).lean(),
      M.VehicleRental.find({ vehicleId:c.vehicleId }).sort('-createdAt').limit(15).lean(),
      M.FleetMaintenance.find({ vehicleId:c.vehicleId }).sort('-createdAt').limit(30).lean(),
    ]);
    const mm=new Map(maintenance.map(m=>[String(m._id),m]));
    for(const j of jobs){ const m=j.maintenanceId?mm.get(String(j.maintenanceId)):null; j.solution=m?.staffCompletionSummary||m?.completionSummary||j.remarks||m?.notes||''; j.pauseHistory=j.pauseHistory||m?.staffPauseHistory||[]; j.staffStartedAt=m?.staffStartedAt||j.startedAt; j.staffCompletedAt=m?.staffCompletedAt||j.completedAt; j.staffCompletionSummary=m?.staffCompletionSummary||j.remarks||''; }
    res.json({ jobs, rentals, maintenance });
  } catch(e){ res.status(500).json({message:e.message}); }
});

pr.post('/complaints/:id/messages', async (req,res)=>{try{const {Complaint}=require('../models');const text=String(req.body.message||'').trim();if(!text)return res.status(400).json({message:'Message is required'});const c=await Complaint.findById(req.params.id);if(!c)return res.status(404).json({message:'Complaint not found'});if(c.chatClosed)return res.status(409).json({message:'Chat is closed after service-center handoff'});c.messages=c.messages||[];c.messages.push({senderId:req.user._id,senderRole:req.user.role,message:text});await c.save();const payload={complaintId:c._id,message:c.messages[c.messages.length-1],status:c.status};if(req.io){req.io.to(`user:${c.customerId}`).emit('support:progress',payload);req.io.emit('command:support:update',payload);}res.json(c);}catch(e){res.status(400).json({message:e.message});}});

pr.put('/complaints/:id/service-center', async (req,res)=>{
  try {
    const { Complaint, FleetMaintenance, Notification } = require('../models');
    const c=await Complaint.findById(req.params.id); if(!c)return res.status(404).json({message:'Complaint not found'});
    if(c.chatClosed)return res.status(409).json({message:'Customer chat is already closed'});
    const serviceCenterName='allEV Service Center', serviceCenterAddress='Somajiguda, Hyderabad', serviceCenterMapsUrl='https://maps.app.goo.gl/zcJfnm24McDJhYHd6';
    const m=await FleetMaintenance.create({complaintId:c._id,franchiseeId:c.franchiseeId,vehicleId:c.vehicleId,bikeId:c.vehicleSnapshot?.bikeId||c.vehicleSnapshot?.registrationNo,type:'COMPLAINT_SERVICE',title:c.subject||c.category||'Customer Complaint',description:c.message,priority:c.priority||'NORMAL',customerId:c.customerId,vendor:serviceCenterName,vendorLocation:serviceCenterAddress,vendorMapsUrl:serviceCenterMapsUrl,status:'SCHEDULED',staffStatus:'PENDING'});
    c.maintenanceId=m._id;c.serviceCenterName=serviceCenterName;c.serviceCenterAddress=serviceCenterAddress;c.serviceCenterMapsUrl=serviceCenterMapsUrl;c.chatClosed=true;c.chatClosedAt=new Date();c.serviceCenter={name:serviceCenterName,address:serviceCenterAddress,mapUrl:serviceCenterMapsUrl};c.serviceCenterSentAt=c.chatClosedAt;c.status='IN_PROGRESS';await c.save();
    const data={complaintId:c._id,maintenanceId:m._id,serviceCenterName,serviceCenterAddress,serviceCenterMapsUrl,chatClosed:true,status:c.status};
    if(c.customerId)await Notification.create({userId:c.customerId,type:'COMPLAINT_SERVICE_CENTER',title:'Service center visit required',message:'Please visit the service center. Customer chat is now closed.',data});
    if(c.franchiseeId)await Notification.create({userId:c.franchiseeId,type:'COMPLAINT_SERVICE_CENTER',title:'Complaint moved to service center',message:'Command Center sent the customer to the service center. Progress is view-only.',data});
    if(req.io){req.io.to(`user:${c.customerId}`).emit('support:progress',data);req.io.to(`user:${c.franchiseeId}`).emit('support:progress',data);req.io.emit('command:support:update',data);}
    res.json({complaint:c,maintenance:m});
  } catch(e){res.status(400).json({message:e.message});}
});

pr.put('/complaints/:id/assign', async (req,res)=>{
  try {
    const { Complaint, FleetMaintenance, Job, JobCard, User, Notification } = require('../models');
    const c=await Complaint.findById(req.params.id); if(!c)return res.status(404).json({message:'Complaint not found'});
    if(!c.maintenanceId)return res.status(409).json({message:'Send the customer to the service center before assigning staff'});
    const staff=await User.findOne({_id:req.body.staffId,role:{$in:['STAFF','TECHNICIAN','HUB_MANAGER']},active:true}).select('_id name email role phone').lean();
    if(!staff)return res.status(404).json({message:'Active staff member not found'});
    const m=await FleetMaintenance.findById(c.maintenanceId);if(!m)return res.status(404).json({message:'Service record not found'});
    let job=m.commandJobId?await Job.findById(m.commandJobId):null;
    if(!job){job=await Job.create({customerId:c.customerId,vehicleId:c.vehicleId,commandVehicleId:m.vehicleId,maintenanceId:m._id,complaintId:c._id,bikeId:m.bikeId,franchiseeId:c.franchiseeId,technicianId:staff._id,serviceType:'COMPLAINT_SERVICE',problem:c.message,priority:c.priority||'NORMAL',status:'ASSIGNED',trackingStatus:'Staff Assigned'});await JobCard.create({jobId:job._id,complaint:c.message});}
    else {job.technicianId=staff._id;job.status=job.status==='COMPLETED'?'COMPLETED':'ASSIGNED';job.trackingStatus='Staff Assigned';await job.save();}
    m.commandAssignedTo=staff._id;m.commandJobId=job._id;await m.save();c.assignedStaffId=staff._id;c.assignedStaffName=staff.name;c.status='IN_PROGRESS';await c.save();
    const data={complaintId:c._id,maintenanceId:m._id,jobId:job._id,staff:{_id:staff._id,name:staff.name,email:staff.email,role:staff.role,phone:staff.phone},status:c.status};
    if(c.customerId)await Notification.create({userId:c.customerId,type:'COMPLAINT_STAFF_ASSIGNED',title:'Staff assigned to your service request',message:`${staff.name} has been assigned to handle your vehicle service.`,data});
    if(c.franchiseeId)await Notification.create({userId:c.franchiseeId,type:'COMPLAINT_STAFF_ASSIGNED',title:'Staff assigned',message:`${staff.name} has been assigned to the customer service request.`,data});
    await Notification.create({userId:staff._id,type:'MAINTENANCE_JOB_ASSIGNED',title:'New service job assigned',message:`${c.subject||'Customer service request'} has been assigned to you.`,data});
    if(req.io){[c.customerId,c.franchiseeId,staff._id].forEach(id=>id&&req.io.to(`user:${id}`).emit('support:progress',data));req.io.emit('command:support:update',data);}
    res.json({...c.toObject(),maintenanceId:m._id,commandAssignedTo:staff});
  }catch(e){res.status(400).json({message:e.message});}
});

pr.put('/complaints/:id/resolve', async (req,res)=>{
  try {
    const { Complaint, FleetMaintenance, JobProof, Notification } = require('../models');
    const c=await Complaint.findById(req.params.id);if(!c)return res.status(404).json({message:'Complaint not found'});
    if(!c.maintenanceId)return res.status(409).json({message:'Service center handoff is required before resolving'});
    const m=await FleetMaintenance.findById(c.maintenanceId);if(!m)return res.status(404).json({message:'Service record not found'});
    if(!m.staffCompletedAt||m.staffStatus!=='COMPLETED')return res.status(409).json({message:'Staff must mark the service completed before Command Center can resolve it'});
    const proof=m.commandJobId?await JobProof.findOne({jobId:m.commandJobId}).lean():null;if(!proof)return res.status(409).json({message:'Staff completion proof is required before resolving the complaint'});
    c.status='SOLVED';c.resolution=req.body.resolution||m.staffCompletionSummary||'Service completed';c.solvedAt=new Date();c.feedbackRequested=true;await c.save();
    const data={complaintId:c._id,maintenanceId:m._id,jobId:m.commandJobId,status:'SOLVED',resolution:c.resolution,proof};
    if(c.customerId)await Notification.create({userId:c.customerId,type:'COMPLAINT_SOLVED',title:'Issue resolved — your review is requested',message:'Command Center has resolved your complaint. Please review the service.',data});
    if(c.franchiseeId)await Notification.create({userId:c.franchiseeId,type:'COMPLAINT_SOLVED',title:'Customer complaint resolved',message:'Command Center resolved the complaint after staff completion.',data});
    if(req.io){req.io.to(`user:${c.customerId}`).emit('support:progress',data);req.io.to(`user:${c.franchiseeId}`).emit('support:progress',data);req.io.emit('command:support:update',data);}
    res.json({...c.toObject(),proof});
  }catch(e){res.status(400).json({message:e.message});}
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
pr.get('/staff-attendance', SP.commandAttendance);
pr.get('/staff-own-job-cards', SP.commandOwnJobCards);

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
pr.get('/notifications', async (req,res)=>{try{const {Notification}=require('../models');res.json(await Notification.find({userId:req.user._id}).sort('-createdAt').limit(200).lean());}catch(e){res.status(500).json({message:e.message});}});
pr.put('/notifications/read-all', async (req,res)=>{try{const {Notification}=require('../models');const q={userId:req.user._id,read:false};if(req.query.prefix)q.type=new RegExp('^'+String(req.query.prefix).replace(/[.*+?^${}()|[\\]\\]/g,'\\$&'));await Notification.updateMany(q,{$set:{read:true}});res.json({ok:true});}catch(e){res.status(400).json({message:e.message});}});
pr.get( '/support-tickets',                        SP.commandSupport);
pr.put( '/support-tickets/:id',                    SP.commandSupportUpdate);
pr.post('/staff-documents',                        SP.commandCreateDocument);
pr.get( '/staff-payslips',                         SP.commandPayslips);
pr.post('/staff-payslips',                         SP.commandCreatePayslip);
pr.post('/staff-shifts',                           SP.commandCreateShift);
pr.post('/staff-recognition',                      SP.commandCreateRecognition);
pr.post('/staff-checklists',                       SP.commandCreateChecklist);
pr.get( '/maintenance-customer-service',           Fr.commandMaintenance);
pr.put( '/maintenance-customer-service/:id/assign', Fr.commandMaintenanceAssign);
pr.put( '/maintenance-customer-service/:id/status', Fr.commandMaintenanceUpdate);
pr.get( '/maintenance-customer-service/:id/feedback', Fr.commandMaintenanceFeedback);

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