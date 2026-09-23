const M = require('../models');

const ok = (res, data, code=200) => res.status(code).json(data);
const fail = (res,e) => res.status(500).json({message:e.message});
const sid = req => req.user._id;
const todayKey = () => new Date().toISOString().slice(0,10);
const isStaffRole = r => ['TECHNICIAN','STAFF','HUB_MANAGER'].includes(r);

exports.notifications = async (req,res) => { try { const rows=await M.Notification.find({userId:sid(req)}).sort('-createdAt').limit(200).lean(); return ok(res,rows); } catch(e){fail(res,e)} };
exports.readNotification = async (req,res) => { try { const n=await M.Notification.findOneAndUpdate({_id:req.params.id,userId:sid(req)},{read:true},{new:true}); return ok(res,n||{message:'Notification not found'},n?200:404); } catch(e){fail(res,e)} };
exports.readAllNotifications = async (req,res) => { try { await M.Notification.updateMany({userId:sid(req),read:false},{$set:{read:true}}); return ok(res,{ok:true}); } catch(e){fail(res,e)} };

exports.attendance = async (req,res) => { try { const rows=await M.Attendance.find({userId:sid(req)}).sort('-dateKey').limit(120).lean(); return ok(res,rows); } catch(e){fail(res,e)} };
exports.clockIn = async (req,res) => { try { const key=todayKey(); const now=new Date(); let a=await M.Attendance.findOne({userId:sid(req),dateKey:key}); if(!a) a=await M.Attendance.create({userId:sid(req),dateKey:key,clockIn:now,status:'PRESENT'}); else {a.clockIn=a.clockIn||now;a.clockOut=null;a.status='PRESENT';} if(req.body?.location) { const loc={...req.body.location,updatedAt:now}; const user=await M.User.findById(sid(req)).lean(); if(user?.hubId){const hub=await M.Hub.findById(user.hubId).lean(); if(hub?.lat!=null&&hub?.lng!=null){const R=6371, toRad=x=>x*Math.PI/180, lat1=toRad(Number(loc.lat)),lat2=toRad(Number(hub.lat)),dLat=lat2-lat1,dLng=toRad(Number(hub.lng)-Number(loc.lng));const q=Math.sin(dLat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dLng/2)**2;loc.distanceKm=R*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));loc.withinDutyArea=loc.distanceKm<=5;}} a.location=loc; } await a.save(); return ok(res,a); } catch(e){fail(res,e)} };
exports.clockOut = async (req,res) => { try { const a=await M.Attendance.findOne({userId:sid(req),clockIn:{$ne:null},clockOut:null}).sort('-clockIn'); if(!a) return ok(res,{message:'No active clock-in found'},400); a.clockOut=new Date(); a.status='OFF_DUTY'; if(req.body?.location)a.location={...req.body.location,updatedAt:new Date()}; await a.save(); return ok(res,a); } catch(e){fail(res,e)} };
exports.breakToggle = async (req,res) => { try { const a=await M.Attendance.findOne({userId:sid(req),clockIn:{$ne:null},clockOut:null}).sort('-clockIn'); if(!a) return ok(res,{message:'Clock in first'},400); const active=a.breaks?.length && !a.breaks[a.breaks.length-1].endedAt; if(active)a.breaks[a.breaks.length-1].endedAt=new Date(); else a.breaks.push({startedAt:new Date()}); await a.save(); return ok(res,a); } catch(e){fail(res,e)} };
exports.location = async (req,res) => { try { const a=await M.Attendance.findOneAndUpdate({userId:sid(req),dateKey:todayKey()},{$set:{location:{...req.body,updatedAt:new Date()}}},{new:true,upsert:true,setDefaultsOnInsert:true}); return ok(res,a); } catch(e){fail(res,e)} };

exports.leaves = async (req,res) => { try { const rows=await M.LeaveRequest.find({userId:sid(req)}).sort('-createdAt').lean(); return ok(res,rows); } catch(e){fail(res,e)} };
exports.createLeave = async (req,res) => { try { const start=new Date(req.body.startDate), end=new Date(req.body.endDate||req.body.startDate); const days=Math.max(1,Math.floor((new Date(end).setHours(12,0,0,0)-new Date(start).setHours(12,0,0,0))/86400000)+1); const row=await M.LeaveRequest.create({userId:sid(req),leaveType:req.body.leaveType||'CASUAL',startDate:start,endDate:end,days,reason:req.body.reason||'',status:'PENDING'}); return ok(res,row,201); } catch(e){fail(res,e)} };
exports.cancelLeave = async(req,res)=>{try{const row=await M.LeaveRequest.findOneAndUpdate({_id:req.params.id,userId:sid(req),status:'PENDING'},{status:'CANCELLED'},{new:true});return ok(res,row||{message:'Leave cannot be cancelled'},row?200:409)}catch(e){fail(res,e)}};

exports.checklists = async (req,res) => { try { const key=req.query.dateKey||todayKey(); const rows=await M.StaffChecklist.find({userId:sid(req),dateKey:key}).sort('-createdAt').lean(); return ok(res,rows); } catch(e){fail(res,e)} };
exports.saveChecklist = async(req,res)=>{try{const row=await M.StaffChecklist.findOneAndUpdate({_id:req.params.id,userId:sid(req)},{items:req.body.items,title:req.body.title},{new:true});return ok(res,row||{message:'Checklist not found'},row?200:404)}catch(e){fail(res,e)}};

exports.documents = async(req,res)=>{try{return ok(res,await M.StaffDocument.find({userId:sid(req)}).sort('-createdAt').lean())}catch(e){fail(res,e)}};
exports.payslips = async(req,res)=>{try{return ok(res,await M.Payslip.find({userId:sid(req)}).sort('-createdAt').limit(12).lean())}catch(e){fail(res,e)}};
exports.shifts = async(req,res)=>{try{return ok(res,await M.Shift.find({userId:sid(req)}).sort('dateKey').limit(30).lean())}catch(e){fail(res,e)}};
exports.recognition = async(req,res)=>{try{return ok(res,await M.Recognition.find({userId:sid(req)}).sort('-awardedAt').limit(30).lean())}catch(e){fail(res,e)}};
exports.performance = async(req,res)=>{try{const uid=sid(req);const [total,done,att]=await Promise.all([M.Job.countDocuments({technicianId:uid}),M.Job.countDocuments({technicianId:uid,status:'COMPLETED'}),M.Attendance.find({userId:uid}).sort('-dateKey').limit(30).lean()]);const present=att.filter(a=>a.clockIn).length;return ok(res,{totalJobs:total,completedJobs:done,completionRate:total?Math.round(done/total*100):0,presentDays:present,attendanceRate:att.length?Math.round(present/att.length*100):0,monthlyActivity:done});}catch(e){fail(res,e)}};

exports.support = async(req,res)=>{try{return ok(res,await M.SupportTicket.find({userId:sid(req)}).sort('-createdAt').lean())}catch(e){fail(res,e)}};
exports.createSupport = async(req,res)=>{try{const row=await M.SupportTicket.create({userId:sid(req),ticketNo:`ST-${Date.now().toString().slice(-8)}`,category:req.body.category||'GENERAL',subject:req.body.subject,description:req.body.description,priority:req.body.priority||'NORMAL',messages:[{senderId:sid(req),senderRole:req.user.role,message:req.body.description}]});return ok(res,row,201)}catch(e){fail(res,e)}};
exports.supportMessage = async(req,res)=>{try{const row=await M.SupportTicket.findOne({userId:sid(req),_id:req.params.id});if(!row)return ok(res,{message:'Ticket not found'},404);row.messages.push({senderId:sid(req),senderRole:req.user.role,message:req.body.message});await row.save();return ok(res,row)}catch(e){fail(res,e)}};

exports.jobProof = async(req,res)=>{try{const job=await M.Job.findOne({_id:req.params.id,technicianId:sid(req)});if(!job)return ok(res,{message:'Job not found'},404);const proof=await M.JobProof.findOneAndUpdate({jobId:job._id,userId:sid(req)},{...req.body,jobId:job._id,userId:sid(req),submittedAt:new Date()},{new:true,upsert:true});return ok(res,proof)}catch(e){fail(res,e)}};
exports.jobTimeline = async(req,res)=>{try{const job=await M.Job.findOne({_id:req.params.id,technicianId:sid(req)}).lean();if(!job)return ok(res,{message:'Job not found'},404);const proof=await M.JobProof.findOne({jobId:job._id}).lean();return ok(res,{job,proof,timeline:[{status:'ASSIGNED',at:job.createdAt},{status:'IN_PROGRESS',at:job.updatedAt&&job.status==='IN_PROGRESS'?job.updatedAt:null},{status:'COMPLETED',at:job.status==='COMPLETED'?job.updatedAt:null}]})}catch(e){fail(res,e)}};



exports.commandOwnJobCards = async(req,res)=>{
  try{
    const month=String(req.query.month||'').trim(); const staffId=String(req.query.staffId||'').trim(); const status=String(req.query.status||'').trim();
    const filter={createdSource:'STAFF_OWN',selfCreated:true};
    if(staffId) filter.technicianId=staffId;
    if(status) filter.status=status;
    if(/^\d{4}-\d{2}$/.test(month)){const [yy,mm]=month.split('-').map(Number);filter.createdAt={$gte:new Date(yy,mm-1,1),$lt:new Date(yy,mm,1)};}
    const jobs=await M.Job.find(filter).populate('technicianId','name email role phone').populate('customerId','name email phone').populate('commandVehicleId').sort('-createdAt').limit(2000).lean();
    const ids=jobs.map(j=>j._id);
    const cards=ids.length?await M.JobCard.find({jobId:{$in:ids}}).lean():[];
    const cm=new Map(cards.map(c=>[String(c.jobId),c]));
    return ok(res,jobs.map(j=>({...j,jobCard:cm.get(String(j._id))||null})));
  }catch(e){fail(res,e)}
};

// Command Center: broadcast a notification/banner to selected staff.
exports.commandSendNotification = async(req,res)=>{try{const {title,message,banner=false,staffIds=[],role='ALL',hubId}=req.body;const filter={active:true,role:{$in:['STAFF','TECHNICIAN','HUB_MANAGER']}};if(Array.isArray(staffIds)&&staffIds.length)filter._id={$in:staffIds};if(role&&role!=='ALL')filter.role=role;if(hubId&&hubId!=='ALL')filter.hubId=hubId;const staff=await M.User.find(filter).select('_id');if(!staff.length)return ok(res,{message:'No staff matched',sent:0});const docs=staff.map(u=>({userId:u._id,type:banner?'STAFF_BANNER':'STAFF_ANNOUNCEMENT',title,message,read:false,data:{banner:Boolean(banner),senderId:req.user._id,sentAt:new Date().toISOString()}}));const result=await M.Notification.insertMany(docs);if(req.io)staff.forEach(u=>req.io.to(`user:${u._id}`).emit('notification:new',docs.find(d=>String(d.userId)===String(u._id))));return ok(res,{sent:result.length})}catch(e){fail(res,e)}};
exports.commandNotifications = async(req,res)=>{try{return ok(res,await M.Notification.find({type:{$in:['STAFF_BANNER','STAFF_ANNOUNCEMENT']}}).populate('userId','name email role').sort('-createdAt').limit(300).lean())}catch(e){fail(res,e)}};
exports.commandSupport = async(req,res)=>{try{return ok(res,await M.SupportTicket.find().populate('userId','name email role').sort('-createdAt').limit(300).lean())}catch(e){fail(res,e)}};
exports.commandSupportUpdate = async(req,res)=>{try{const row=await M.SupportTicket.findById(req.params.id);if(!row)return ok(res,{message:'Ticket not found'},404);if(req.body.status)row.status=req.body.status;if(req.body.message)row.messages.push({senderId:req.user._id,senderRole:req.user.role,message:req.body.message});if(row.status==='RESOLVED')row.resolvedAt=new Date();await row.save();if(req.io)req.io.to(`user:${row.userId}`).emit('support:update',row);return ok(res,row)}catch(e){fail(res,e)}};

exports.commandCreateDocument = async(req,res)=>{try{const row=await M.StaffDocument.create(req.body); if(row.userId) await M.Notification.create({userId:row.userId,type:'STAFF_DOCUMENT',title:'New document available',message:`${row.title||'A new staff document'} is now available.`,data:{documentId:row._id}}); return ok(res,row,201)}catch(e){fail(res,e)}};
exports.commandCreatePayslip = async(req,res)=>{try{const payload={...req.body,createdBy:req.user?._id,confirmedAt:new Date()};const row=await M.Payslip.create(payload); if(row.userId) await M.Notification.create({userId:row.userId,type:'PAYSLIP_PUBLISHED',title:'New payslip published',message:`Your ${row.month||'latest'} payslip is available.`,data:{payslipId:row._id}}); return ok(res,row,201)}catch(e){fail(res,e)}};
exports.commandPayslips = async(req,res)=>{try{const q={};if(req.query.staffId)q.userId=req.query.staffId;if(req.query.month)q.month=String(req.query.month);const rows=await M.Payslip.find(q).populate('userId','name email role').sort('-createdAt').limit(500).lean();return ok(res,rows)}catch(e){fail(res,e)}};
exports.commandCreateShift = async(req,res)=>{try{const row=await M.Shift.create(req.body); if(row.userId) await M.Notification.create({userId:row.userId,type:'SHIFT_ASSIGNED',title:'New shift assigned',message:`A shift has been scheduled for ${row.dateKey||'an upcoming date'}.`,data:{shiftId:row._id}}); return ok(res,row,201)}catch(e){fail(res,e)}};
exports.commandCreateRecognition = async(req,res)=>{try{const row=await M.Recognition.create({...req.body,awardedBy:req.user._id}); if(row.userId) await M.Notification.create({userId:row.userId,type:'RECOGNITION',title:'You received recognition',message:row.title||'A new achievement was added to your profile.',data:{recognitionId:row._id}}); return ok(res,row,201)}catch(e){fail(res,e)}};

exports.commandAttendance = async(req,res)=>{
  try{
    const month=String(req.query.month||'').trim();
    const staffId=String(req.query.staffId||'').trim();
    const filter={};
    if(staffId) filter.userId=staffId;
    if(/^\\d{4}-\\d{2}$/.test(month)){
      filter.dateKey=new RegExp('^'+month+'-');
    }
    const [records, staff]=await Promise.all([
      M.Attendance.find(filter).populate('userId','name email role phone hubId franchiseeId monthlySalary joiningDate').sort('-dateKey').limit(5000).lean(),
      M.User.find({role:{$in:['STAFF','TECHNICIAN','HUB_MANAGER']}}).select('_id name email role phone hubId franchiseeId active monthlySalary joiningDate').sort('name').lean()
    ]);
    const enriched=records.map(r=>{
      const breaks=(r.breaks||[]).reduce((sum,b)=>{
        if(!b.startedAt)return sum;
        const end=b.endedAt||r.clockOut||new Date();
        return sum+Math.max(0,new Date(end)-new Date(b.startedAt));
      },0);
      const gross=r.clockIn&&r.clockOut?Math.max(0,new Date(r.clockOut)-new Date(r.clockIn)):null;
      const workedMs=gross==null?null:Math.max(0,gross-breaks);
      return {...r,workedHours:workedMs==null?null:Number((workedMs/3600000).toFixed(2)),breakHours:Number((breaks/3600000).toFixed(2)),live:!!(r.clockIn&&!r.clockOut)};
    });
    return ok(res,{records:enriched,staff,month:month||null});
  }catch(e){fail(res,e)}
};
exports.commandLeave = async(req,res)=>{try{return ok(res,await M.LeaveRequest.find().populate('userId','name email role').sort('-createdAt').limit(500).lean())}catch(e){fail(res,e)}};
exports.commandLeaveAction = async(req,res)=>{try{const row=await M.LeaveRequest.findByIdAndUpdate(req.params.id,{status:req.params.action==='approve'?'APPROVED':'REJECTED',reviewedBy:req.user._id,reviewedAt:new Date(),reviewerNote:req.body.note||''},{new:true});if(row){await M.Notification.create({userId:row.userId,type:'LEAVE_STATUS',title:`Leave ${row.status==='APPROVED'?'Approved':'Rejected'}`,message:`Your ${row.leaveType} leave request was ${row.status.toLowerCase()}.`,data:{leaveId:row._id,status:row.status}})}return ok(res,row||{message:'Not found'},row?200:404)}catch(e){fail(res,e)}};

exports.commandCreateChecklist=async(req,res)=>{try{const row=await M.StaffChecklist.create(req.body); if(row.userId) await M.Notification.create({userId:row.userId,type:'CHECKLIST_ASSIGNED',title:'New daily checklist',message:row.title||'A new checklist was assigned to you.',data:{checklistId:row._id}}); return ok(res,row,201)}catch(e){fail(res,e)}};
