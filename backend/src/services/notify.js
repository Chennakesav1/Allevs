const {Notification}=require('../models');
async function notify(io,userId,type,title,message,data={}){const n=await Notification.create({userId,type,title,message,data}); if(io) io.to(`user:${userId}`).emit('notification:new',n); return n;}
module.exports={notify};
