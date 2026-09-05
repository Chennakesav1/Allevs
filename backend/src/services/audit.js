const {AuditLog}=require('../models'); module.exports=async(actorId,action,entity,entityId,metadata={})=>AuditLog.create({actorId,action,entity,entityId,metadata});
