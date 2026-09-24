const M=require('../models'); const {Job,Inventory,Vehicle,User}=M; const audit=require('../services/audit');
const notify=async(userId,type,title,message,data={})=>{if(!userId)return;try{await M.Notification.create({userId,type,title,message,data});}catch(_){}};
const arr=v=>Array.isArray(v)?v.map(x=>String(x).trim()).filter(Boolean):String(v||'').split(/[,\n]/).map(x=>x.trim()).filter(Boolean);
// Return only jobs assigned to the logged-in staff member (by technicianId)
exports.jobs=async(req,res)=>{
  try {
    const staffId = req.user._id;
    const jobs = await Job.find({ technicianId: staffId })
      .populate('vehicleId customerId technicianId hubId commandVehicleId rentalId complaintId')
      .sort('-createdAt');
    res.json(jobs);
  } catch(e) { res.status(500).json({ message: e.message }); }
};
exports.create=async(req,res)=>{const j=await Job.create(req.body);await audit(req.user._id,'CREATE','Job',j._id);res.status(201).json(j)};
exports.update=async(req,res)=>{const j=await Job.findByIdAndUpdate(req.params.id,req.body,{new:true});if(!j)return res.status(404).json({message:'Job not found'});await audit(req.user._id,'UPDATE','Job',j._id,req.body);res.json(j)};
exports.assign=async(req,res)=>{const j=await Job.findByIdAndUpdate(req.params.id,{technicianId:req.body.technicianId,status:'ASSIGNED',trackingStatus:'Technician Assigned'},{new:true});res.json(j)};



// ── Staff-created job cards: create a service job directly from the Staff Portal ──
exports.vehicleHistory = async (req,res) => {
  try {
    const bikeId=String(req.query.bikeId||'').trim();
    const registrationNo=String(req.query.registrationNo||'').trim();
    const chassisNo=String(req.query.chassisNo||'').trim();
    const motorNo=String(req.query.motorNo||'').trim();
    if(!bikeId && !registrationNo && !chassisNo && !motorNo) return res.json({vehicle:null,jobs:[],history:[]});
    const ors=[];
    if(bikeId) ors.push({bikeId:new RegExp(`^${bikeId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')});
    if(registrationNo) ors.push({registrationNo:new RegExp(`^${registrationNo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')});
    if(chassisNo) ors.push({chassisNo:new RegExp(`^${chassisNo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')});
    if(motorNo) ors.push({motorNo:new RegExp(`^${motorNo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')});
    const vehicle=await M.CommandVehicle.findOne({$or:ors}).lean();
    const jobFilter=vehicle
      ? {$or:[{commandVehicleId:vehicle._id},{bikeId:vehicle.bikeId||'__none__'}]}
      : {bikeId:bikeId||'__none__'};
    const jobs=await M.Job.find(jobFilter)
      .populate('customerId','name email phone')
      .populate('technicianId','name role')
      .sort('-createdAt').limit(30).lean();
    const history=jobs.map(j=>({
      _id:j._id,status:j.status,createdAt:j.createdAt,completedAt:j.completedAt,problem:j.problem,
      diagnosis:j.diagnosis,rootCause:j.rootCause,workPerformed:j.workPerformed,solution:j.solution,
      recommendations:j.recommendations,remarks:j.remarks,serviceType:j.serviceType,priority:j.priority,
      technician:j.technicianId,customer:j.customerId,previousWorkSummary:j.previousWorkSummary,
    }));
    return res.json({vehicle,jobs,history,latest:history[0]||null});
  } catch(e){ return res.status(500).json({message:e.message}); }
};

exports.createOwnJobCard = async (req,res) => {
  try {
    const body=req.body||{};
    const customer=body.customer||{}; const bike=body.bike||{};
    const bikeId=String(bike.bikeId||'').trim();
    const registrationNo=String(bike.registrationNo||'').trim();
    const chassisNo=String(bike.chassisNo||'').trim();
    const motorNo=String(bike.motorNo||'').trim();
    let vehicle=null;
    const ors=[];
    if(bikeId) ors.push({bikeId:new RegExp(`^${bikeId.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')});
    if(registrationNo) ors.push({registrationNo:new RegExp(`^${registrationNo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')});
    if(chassisNo) ors.push({chassisNo:new RegExp(`^${chassisNo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')});
    if(motorNo) ors.push({motorNo:new RegExp(`^${motorNo.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`,'i')});
    if(ors.length) vehicle=await M.CommandVehicle.findOne({$or:ors}).lean();
    let customerId=body.customerId||null;
    if(!customerId && (customer.phone||customer.email)){
      const cq=[]; if(customer.phone)cq.push({phone:String(customer.phone).trim()}); if(customer.email)cq.push({email:String(customer.email).trim().toLowerCase()});
      if(cq.length){const found=await M.User.findOne({role:'CUSTOMER',$or:cq}).select('_id').lean(); if(found)customerId=found._id;}
    }
    const jobFilter=vehicle ? {$or:[{commandVehicleId:vehicle._id},{bikeId:vehicle.bikeId||'__none__'}]} : {bikeId:bikeId||'__none__'};
    const previous=await M.Job.find(jobFilter).sort('-createdAt').limit(10).lean();
    const previousWorkSummary=previous.length ? previous.slice(0,5).map(j=>`${j.createdAt?new Date(j.createdAt).toLocaleDateString('en-IN'):''}: ${j.problem||'Service'}${j.solution||j.workPerformed?` — ${j.solution||j.workPerformed}`:''}`).join('\n') : '';
    const now=new Date();
    const job=await M.Job.create({
      createdBy:req.user._id,createdSource:'STAFF_OWN',selfCreated:true,customerId,
      customerSnapshot:{name:customer.name||'',phone:customer.phone||'',email:customer.email||''},
      commandVehicleId:vehicle?._id,bikeId:bikeId||vehicle?.bikeId||'',bikeDetails:{...bike,matchedVehicleId:vehicle?._id},
      vehicleSnapshot:vehicle||undefined,previousWorkSummary,
      technicianId:req.user._id,franchiseeId:vehicle?.fleetOperatorId||req.user.franchiseeId||undefined,hubId:vehicle?.hubId||req.user.hubId||undefined,serviceType:body.serviceType||'STAFF_CREATED_SERVICE',problem:String(body.problem||'').trim(),priority:body.priority||'NORMAL',
      status:'PENDING',trackingStatus:'Job Card Created — Awaiting Start',elapsedSeconds:0,location:body.location||undefined,remarks:body.notes||''
    });
    await M.JobCard.create({jobId:job._id,complaint:String(body.problem||''),diagnosis:previousWorkSummary?'Previous work found and shown to staff.':''});
    const admins=await M.User.find({role:{$in:['CENTRAL_ADMIN','SUPER_ADMIN']},active:{$ne:false}}).select('_id').lean();
    if(M.Notification && admins.length){await M.Notification.insertMany(admins.map(a=>({userId:a._id,type:'STAFF_OWN_JOB_CARD',title:'Staff created a job card',message:`${req.user.name||'Staff'} created a new job card for ${bikeId||vehicle?.bikeId||'vehicle'}.`,data:{jobId:job._id,staffId:req.user._id,bikeId:bikeId||vehicle?.bikeId||''}})));}
    const populated=await M.Job.findById(job._id).populate('customerId','name email phone').populate('technicianId','name role').populate('commandVehicleId').lean();
    return res.status(201).json({job:populated,previousHistory:previous,started:false});
  } catch(e){ return res.status(400).json({message:e.message}); }
};

// ── Staff work timer ─────────────────────────────────────────────
// Timer state is persisted on the Job so refreshes/reloads do not reset it.
const staffJob = async (req) => Job.findOne({ _id:req.params.id, technicianId:req.user._id });

exports.start = async (req,res) => {
  try {
    const j = await staffJob(req);
    if (!j) return res.status(404).json({message:'Job not found'});
    const now = new Date();
    if (j.status === 'COMPLETED') return res.status(409).json({message:'Completed jobs cannot be started'});
    const isResume = j.status === 'PAUSED';

    // When resuming, close the current pause interval before starting the timer again.
    if (isResume) {
      const last = j.pauseHistory?.[j.pauseHistory.length - 1];
      if (last && !last.resumedAt) {
        last.resumedAt = now;
        last.durationSeconds = Math.max(0, Math.floor((now - new Date(last.pausedAt)) / 1000));
      }
    }

    j.status = 'IN_PROGRESS';
    j.startedAt = now;
    j.pausedAt = null;
    j.trackingStatus = 'Work in Progress';
    j.elapsedSeconds = Number(j.elapsedSeconds || 0);
    await j.save();
    if(j.maintenanceId){ const m=await M.FleetMaintenance.findById(j.maintenanceId); if(m){m.status='IN_PROGRESS';m.staffStatus='IN_PROGRESS';if(!m.staffStartedAt)m.staffStartedAt=now;if(isResume)m.staffResumedAt=now;await m.save();} }
    if(j.complaintId){ const c=await M.Complaint.findById(j.complaintId); if(c){c.status='IN_PROGRESS';c.staffStatus='IN_PROGRESS';if(!c.staffStartedAt)c.staffStartedAt=now;c.staffResumedAt=isResume?now:c.staffResumedAt;await c.save(); const data={complaintId:c._id,jobId:j._id,staffStatus:'IN_PROGRESS'}; await notify(c.customerId,'COMPLAINT_PROGRESS','Staff Working','Staff is working on your vehicle.',data); await notify(c.franchiseeId,'COMPLAINT_PROGRESS','Staff Working','Staff resumed/started work on the assigned vehicle.',data); } }
    await audit(req.user._id,'UPDATE','Job',j._id,{status:j.status,startedAt:j.startedAt,elapsedSeconds:j.elapsedSeconds});
    return res.json(j);
  } catch(e) { return res.status(500).json({message:e.message}); }
};

exports.pause = async (req,res) => {
  try {
    const j = await staffJob(req);
    if (!j) return res.status(404).json({message:'Job not found'});
    if (j.status !== 'IN_PROGRESS') return res.status(409).json({message:'Only an in-progress job can be paused'});
    const now = req.body?.pausedAt ? new Date(req.body.pausedAt) : new Date();
    const runningSeconds = j.startedAt ? Math.max(0, Math.floor((now - new Date(j.startedAt)) / 1000)) : 0;
    j.elapsedSeconds = Number(j.elapsedSeconds || 0) + runningSeconds;
    j.pauseHistory = Array.isArray(j.pauseHistory) ? j.pauseHistory : [];
    const pause = {
      pausedAt: now, resumedAt: null,
      reason: String(req.body?.pauseReason || 'No reason provided'),
      category: String(req.body?.pauseCategory || ''),
      details: String(req.body?.pauseDetails || ''),
      expectedResumeAt: req.body?.expectedResumeAt ? new Date(req.body.expectedResumeAt) : undefined,
      workCompletedBeforePause: String(req.body?.workCompletedBeforePause || ''),
      partsRequired: String(req.body?.partsRequired || ''),
      durationSeconds: 0
    };
    j.pauseHistory.push(pause);
    j.status='PAUSED'; j.pausedAt=now; j.pauseReason=pause.reason; j.trackingStatus='Work Paused';
    await j.save();

    if(j.maintenanceId){
      const m=await M.FleetMaintenance.findById(j.maintenanceId);
      if(m){
        m.status='IN_PROGRESS'; m.staffStatus='PAUSED'; m.staffPausedAt=now; m.staffPauseReason=pause.reason;
        m.staffPauseHistory=Array.isArray(m.staffPauseHistory)?m.staffPauseHistory:[];
        m.staffPauseHistory.push(pause); await m.save();
      }
    }
    if(j.complaintId){
      const c=await M.Complaint.findById(j.complaintId);
      if(c){ c.status='PAUSED'; c.staffStatus='PAUSED'; c.staffPausedAt=now; c.pauseReason=pause.reason; c.staffPauseHistory=Array.isArray(c.staffPauseHistory)?c.staffPauseHistory:[]; c.staffPauseHistory.push(pause); await c.save();
        const data={complaintId:c._id,jobId:j._id,staffStatus:'PAUSED',pause};
        await notify(c.customerId,'COMPLAINT_PROGRESS','Service Paused','Staff paused work on your vehicle. The reason and pause details are available in your service progress.',data);
        await notify(c.franchiseeId,'COMPLAINT_PROGRESS','Service Paused','Staff paused work on the assigned vehicle.',data);
        const admins=await User.find({role:{$in:['CENTRAL_ADMIN','SUPER_ADMIN']},active:{$ne:false}}).select('_id').lean(); for(const a of admins) await notify(a._id,'COMPLAINT_PROGRESS','Service Paused','Staff paused a complaint service job.',data);
      }
    }
    await audit(req.user._id,'UPDATE','Job',j._id,{status:j.status,pause});
    return res.json(j);
  } catch(e){return res.status(500).json({message:e.message});}
};

exports.complete = async (req,res) => {
  try {
    const j = await staffJob(req);
    if (!j) return res.status(404).json({message:'Job not found'});
    if (j.status === 'COMPLETED') return res.json(j);
    const now = req.body?.completedAt ? new Date(req.body.completedAt) : new Date();
    if (j.status === 'IN_PROGRESS' && j.startedAt) j.elapsedSeconds=Number(j.elapsedSeconds||0)+Math.max(0,Math.floor((now-new Date(j.startedAt))/1000));

    // Close an open pause interval if staff completes directly from PAUSED.
    if(j.status==='PAUSED'){
      const last=j.pauseHistory?.[j.pauseHistory.length-1];
      if(last && !last.resumedAt){ last.resumedAt=now; last.durationSeconds=Math.max(0,Math.floor((now-new Date(last.pausedAt))/1000)); }
    }

    const b=req.body||{};
    const report={
      diagnosis:String(b.diagnosis||''), rootCause:String(b.rootCause||''), workPerformed:String(b.workPerformed||b.remarks||''),
      solution:String(b.solution||''), partsReplaced:arr(b.partsReplaced), testResult:String(b.testResult||''),
      finalCondition:String(b.finalCondition||''), recommendations:String(b.recommendations||''),
      nextServiceAt:b.nextServiceAt?new Date(b.nextServiceAt):undefined, labourHours:b.labourHours!==''&&b.labourHours!=null?Number(b.labourHours):undefined,
      completionNotes:String(b.completionNotes||b.remarks||'')
    };
    Object.assign(j,{status:'COMPLETED',pausedAt:null,completedAt:now,trackingStatus:'Staff completed — awaiting Command Center',remarks:b.remarks??j.remarks,
      odometerReading:b.odometerReading!==undefined?Number(b.odometerReading):j.odometerReading,batteryPercent:b.batteryPercent!==undefined?Number(b.batteryPercent):j.batteryPercent,...report});
    await j.save();

    if(j.vehicleId && b.batteryPercent!==undefined) await Vehicle.findByIdAndUpdate(j.vehicleId,{batterySoc:Number(b.batteryPercent)}).catch(()=>{});
    if(j.commandVehicleId && (b.odometerReading!==undefined||b.batteryPercent!==undefined)){
      const upd={}; if(b.odometerReading!==undefined)upd.odometerKm=Number(b.odometerReading); if(b.batteryPercent!==undefined)upd.batterySoc=Number(b.batteryPercent); await M.CommandVehicle.findByIdAndUpdate(j.commandVehicleId,upd).catch(()=>{});
    }

    // One canonical proof record for the staff member, linked to the same Job/Bike.
    const proof=await M.JobProof.findOneAndUpdate({jobId:j._id,userId:req.user._id},{jobId:j._id,userId:req.user._id,bikeId:j.bikeId||j.vehicleSnapshot?.bikeId||'',odometerReading:j.odometerReading,batteryPercent:j.batteryPercent,signatureData:String(b.signatureData||''),report:{...report,issue:j.problem,notes:report.completionNotes,completionSummary:report.workPerformed||report.solution},pauseHistory:j.pauseHistory,submittedAt:now},{new:true,upsert:true});
    const finalCard=await M.JobCard.findOneAndUpdate({jobId:j._id},{jobId:j._id,complaint:j.problem,diagnosis:j.diagnosis,workPerformed:j.workPerformed,technicianNotes:j.completionNotes||j.remarks,customerSignature:String(b.signatureData||''),customerSignatureAt:b.signatureData?now:undefined,submittedAt:now,completedAt:now,jobCardData:b.jobCardData||{},vehicleReceiptCondition:b.vehicleReceiptCondition||{},serviceTypeData:b.serviceTypeData||{},estimateData:b.estimateData||{},authorizationText:b.authorizationText||''},{new:true,upsert:true});

    let maintenance=null;
    if(j.maintenanceId){
      maintenance=await M.FleetMaintenance.findById(j.maintenanceId);
      if(maintenance){
        maintenance.status='IN_PROGRESS'; maintenance.staffStatus='COMPLETED'; maintenance.staffCompletedAt=now; maintenance.staffCompletedBy=req.user._id; maintenance.staffCompletedByName=req.user.name||req.user.email||'Staff';
        Object.assign(maintenance,report,{staffCompletionSummary:report.solution||report.workPerformed||report.completionNotes,odometerKm:j.odometerReading,batterySoc:j.batteryPercent});
        maintenance.staffPauseHistory=j.pauseHistory; await maintenance.save();
      }
    }

    let complaint=null;
    if(j.complaintId){
      complaint=await M.Complaint.findById(j.complaintId);
      if(complaint){
        complaint.status='STAFF_COMPLETED'; complaint.staffStatus='COMPLETED'; complaint.staffCompletedAt=now; complaint.staffCompletedBy=req.user._id; complaint.staffCompletedByName=req.user.name||req.user.email||'Staff';
        complaint.staffCompletionSummary=report.solution||report.workPerformed||report.completionNotes; complaint.completionProofId=proof._id;
        complaint.staffPauseHistory=j.pauseHistory; await complaint.save();
      }
    }

    const baseData={jobId:j._id,maintenanceId:j.maintenanceId||null,complaintId:j.complaintId||null,vehicleId:j.vehicleId||null,commandVehicleId:j.commandVehicleId||null,bikeId:j.bikeId||j.vehicleSnapshot?.bikeId||'',staffId:req.user._id,staffName:req.user.name||req.user.email||'Staff',completedAt:now,proofId:proof._id,elapsedSeconds:j.elapsedSeconds,pauseHistory:j.pauseHistory,report};
    if(maintenance){
      await notify(maintenance.franchiseeId,'MAINTENANCE_STAFF_COMPLETED','Staff Service Completed',`Staff completed ${maintenance.title||maintenance.type||'service'} for ${maintenance.bikeId||'the vehicle'}.`,baseData);
      if(maintenance.customerId) await notify(maintenance.customerId,'MAINTENANCE_STAFF_COMPLETED','Service Work Completed','Staff completed the work on your vehicle. Command Center will perform the final resolution.',baseData);
      const admins=await User.find({role:{$in:['CENTRAL_ADMIN','SUPER_ADMIN']},active:{$ne:false}}).select('_id').lean(); for(const a of admins) await notify(a._id,'MAINTENANCE_STAFF_COMPLETED','Staff Service Completed',`Staff completed a service job for ${maintenance.bikeId||'a vehicle'}.`,baseData);
    }
    if(complaint){
      await notify(complaint.customerId,'COMPLAINT_PROGRESS','Staff Completed','Staff completed the repair and submitted the service report. Command Center can now resolve the complaint.',baseData);
      await notify(complaint.franchiseeId,'COMPLAINT_PROGRESS','Staff Completed','Staff completed the repair and submitted the full service report.',baseData);
      const admins=await User.find({role:{$in:['CENTRAL_ADMIN','SUPER_ADMIN']},active:{$ne:false}}).select('_id').lean(); for(const a of admins) await notify(a._id,'COMPLAINT_PROGRESS','Staff Completed','A complaint service job has been completed by staff and is awaiting resolution.',baseData);
    }
    await audit(req.user._id,'UPDATE','Job',j._id,{status:j.status,completedAt:now,proofId:proof._id,report});
    return res.json({...j.toObject(),proof,jobCard:finalCard,maintenance,complaint});
  } catch(e){return res.status(500).json({message:e.message});}
};

exports.history = async (req, res) => {
  try {
    const jobId = String(req.params.id || '').trim();

    // Prevent malformed IDs from reaching Mongoose and producing a 500.
    if (!jobId || !/^[a-fA-F0-9]{24}$/.test(jobId)) {
      return res.status(400).json({
        message: 'Invalid job ID',
        bikeId: '',
        currentJob: null,
        previousJobs: []
      });
    }

    // Load the current job first.
    const current = await Job.findById(jobId).lean();

    if (!current) {
      return res.status(404).json({
        message: 'Job not found',
        bikeId: '',
        currentJob: null,
        previousJobs: []
      });
    }

    // Security: staff can only view history from their own assigned job.
    const currentTechnicianId = current.technicianId
      ? String(current.technicianId)
      : '';

    const loggedInStaffId = req.user?._id
      ? String(req.user._id)
      : '';

    if (
      currentTechnicianId &&
      loggedInStaffId &&
      currentTechnicianId !== loggedInStaffId
    ) {
      return res.status(403).json({
        message: 'This job is not assigned to this staff member',
        bikeId: current.bikeId || '',
        currentJob: current,
        previousJobs: []
      });
    }

    const bikeId =
      current.bikeId ||
      current.vehicleSnapshot?.bikeId ||
      '';

    /*
     * Build history conditions carefully.
     * bikeId is a String in the Job schema.
     * vehicleId / commandVehicleId are ObjectIds.
     */
    const or = [];

    if (bikeId) {
      or.push({
        bikeId: String(bikeId)
      });
    }

    if (
      current.commandVehicleId &&
      /^[a-fA-F0-9]{24}$/.test(String(current.commandVehicleId))
    ) {
      or.push({
        commandVehicleId: current.commandVehicleId
      });
    }

    if (
      current.vehicleId &&
      /^[a-fA-F0-9]{24}$/.test(String(current.vehicleId))
    ) {
      or.push({
        vehicleId: current.vehicleId
      });
    }

    // No vehicle identity available = no previous history.
    if (!or.length) {
      return res.json({
        bikeId,
        currentJob: current,
        previousJobs: []
      });
    }

    let previousJobs = [];

    try {
      previousJobs = await Job.find({
        $or: or,
        _id: { $ne: current._id },
        status: { $ne: 'CANCELLED' }
      })
        .sort({
          completedAt: -1,
          createdAt: -1
        })
        .limit(25)
        .lean();
    } catch (historyError) {
      console.error(
        'Staff previous job query failed:',
        historyError
      );

      // History must never crash the Staff portal.
      return res.json({
        bikeId,
        currentJob: current,
        previousJobs: []
      });
    }

    /*
     * Attach completion proofs.
     */
    let proofs = [];

    try {
      const jobIds = previousJobs
        .map(job => job._id)
        .filter(Boolean);

      if (jobIds.length) {
        proofs = await M.JobProof.find({
          jobId: { $in: jobIds }
        })
          .sort({ createdAt: -1 })
          .lean();
      }
    } catch (proofError) {
      console.error(
        'Staff history proof lookup failed:',
        proofError
      );

      proofs = [];
    }

    /*
     * Attach maintenance records.
     */
    let maintenance = [];

    try {
      const maintenanceIds = previousJobs
        .map(job => job.maintenanceId)
        .filter(Boolean)
        .filter(id => /^[a-fA-F0-9]{24}$/.test(String(id)));

      if (maintenanceIds.length) {
        maintenance = await M.FleetMaintenance.find({
          _id: { $in: maintenanceIds }
        }).lean();
      }
    } catch (maintenanceError) {
      console.error(
        'Staff history maintenance lookup failed:',
        maintenanceError
      );

      maintenance = [];
    }

    const proofMap = new Map(
      proofs.map(proof => [
        String(proof.jobId),
        proof
      ])
    );

    const maintenanceMap = new Map(
      maintenance.map(record => [
        String(record._id),
        record
      ])
    );

    const history = previousJobs.map(job => ({
      ...job,

      proof:
        proofMap.get(String(job._id)) ||
        null,

      maintenance:
        job.maintenanceId
          ? maintenanceMap.get(
              String(job.maintenanceId)
            ) || null
          : null
    }));

    return res.json({
      bikeId,
      currentJob: current,
      previousJobs: history
    });

  } catch (error) {
    console.error(
      'STAFF HISTORY ENDPOINT ERROR:',
      error
    );

    /*
     * Return a controlled response instead of allowing
     * the Staff portal to receive an unexplained 500.
     */
    return res.status(500).json({
      message:
        error?.message ||
        'Unable to load vehicle work history',
      bikeId: '',
      currentJob: null,
      previousJobs: []
    });
  }
};
exports.inventory=async(req,res)=>res.json(await Inventory.find().sort('name'));
exports.inventoryRequest=async(req,res)=>{const i=await Inventory.findOne({sku:req.body.sku});if(!i)return res.status(404).json({message:'SKU not found'});i.quantity+=Number(req.body.quantity||0);await i.save();res.json(i)};
exports.diagnostics=async(req,res)=>res.json(await Vehicle.findById(req.params.vehicleId));
exports.technicians=async(req,res)=>res.json(await User.find({role:'TECHNICIAN',active:true}).select('name phone hubId'));