const jwt=require('jsonwebtoken'); const {User}=require('../models');
async function auth(req,res,next){try{const h=req.headers.authorization||''; if(!h.startsWith('Bearer ')) return res.status(401).json({message:'Authentication required'}); const p=jwt.verify(h.slice(7),process.env.JWT_ACCESS_SECRET); req.user=await User.findById(p.id).select('-passwordHash -refreshTokenHash'); if(!req.user) return res.status(401).json({message:'User not found'}); next();}catch(e){res.status(401).json({message:'Invalid or expired token'});}}
const allow=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({message:'Forbidden'});
module.exports={auth,allow};
