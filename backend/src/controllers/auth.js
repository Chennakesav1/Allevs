const bcrypt=require('bcryptjs'); const {User}=require('../models'); const {access,refresh}=require('../utils/tokens');
exports.register=async(req,res)=>{const {name,email,phone,password,role='CUSTOMER'}=req.body;if(!name||!password) return res.status(400).json({message:'name and password required'});if(await User.findOne({$or:[...(email?[{email}]:[]),...(phone?[{phone}]:[])]})) return res.status(409).json({message:'User already exists'});const u=await User.create({name,email,phone,passwordHash:await bcrypt.hash(password,12),role});const rt=refresh(u);u.refreshTokenHash=await bcrypt.hash(rt,10);await u.save();res.status(201).json({accessToken:access(u),refreshToken:rt,user:{id:u._id,name:u.name,role:u.role}})};
exports.login=async(req,res)=>{const {email,password}=req.body;const u=await User.findOne({email});if(!u||!await bcrypt.compare(password,u.passwordHash))return res.status(401).json({message:'Invalid credentials'});const rt=refresh(u);u.refreshTokenHash=await bcrypt.hash(rt,10);await u.save();res.json({accessToken:access(u),refreshToken:rt,user:{id:u._id,name:u.name,role:u.role}})};
exports.me=async(req,res)=>res.json(req.user);

exports.refreshToken = async (req, res) => {
  const { refreshToken: rt } = req.body;
  if (!rt) return res.status(400).json({ message: 'Refresh token required' });
  try {
    const payload = require('jsonwebtoken').verify(rt, process.env.JWT_REFRESH_SECRET);
    const { User } = require('../models');
    const u = await User.findById(payload.id);
    if (!u) return res.status(401).json({ message: 'User not found' });
    // Validate the stored refresh token hash
    const bcrypt = require('bcryptjs');
    const valid = await bcrypt.compare(rt, u.refreshTokenHash || '');
    if (!valid) return res.status(401).json({ message: 'Refresh token invalid or revoked' });
    // Issue a fresh pair
    const { access, refresh } = require('../utils/tokens');
    const newRt = refresh(u);
    u.refreshTokenHash = await bcrypt.hash(newRt, 10);
    await u.save();
    res.json({ accessToken: access(u), refreshToken: newRt });
  } catch (e) {
    res.status(401).json({ message: 'Refresh token expired or invalid' });
  }
};