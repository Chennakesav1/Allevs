const {Job,Inventory,Vehicle,User}=require('../models'); const audit=require('../services/audit');
exports.jobs=async(req,res)=>res.json(await Job.find().populate('vehicleId customerId technicianId hubId').sort('-createdAt'));
exports.create=async(req,res)=>{const j=await Job.create(req.body);await audit(req.user._id,'CREATE','Job',j._id);res.status(201).json(j)};
exports.update=async(req,res)=>{const j=await Job.findByIdAndUpdate(req.params.id,req.body,{new:true});if(!j)return res.status(404).json({message:'Job not found'});await audit(req.user._id,'UPDATE','Job',j._id,req.body);res.json(j)};
exports.assign=async(req,res)=>{const j=await Job.findByIdAndUpdate(req.params.id,{technicianId:req.body.technicianId,status:'ASSIGNED',trackingStatus:'Technician Assigned'},{new:true});res.json(j)};
exports.inventory=async(req,res)=>res.json(await Inventory.find().sort('name'));
exports.inventoryRequest=async(req,res)=>{const i=await Inventory.findOne({sku:req.body.sku});if(!i)return res.status(404).json({message:'SKU not found'});i.quantity+=Number(req.body.quantity||0);await i.save();res.json(i)};
exports.diagnostics=async(req,res)=>res.json(await Vehicle.findById(req.params.vehicleId));
exports.technicians=async(req,res)=>res.json(await User.find({role:'TECHNICIAN',active:true}).select('name phone hubId'));
