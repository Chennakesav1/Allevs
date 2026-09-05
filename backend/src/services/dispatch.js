const {Job,User}=require('../models');
async function autoAssign(job){const techs=await User.find({role:'TECHNICIAN',active:true,hubId:job.hubId}); if(!techs.length)return null; const chosen=techs[Math.floor(Math.random()*techs.length)]; job.technicianId=chosen._id; job.status='ASSIGNED'; job.trackingStatus='Technician Assigned'; await job.save(); return job;}
module.exports={autoAssign};
