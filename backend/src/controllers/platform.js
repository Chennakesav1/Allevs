const M=require('../models'); const {notify}=require('../services/notify'); const {emi,roi,expansion}=require('../services/finance'); const {autoAssign}=require('../services/dispatch'); const {detectCharging}=require('../services/anomaly');
const ok=(res,data,status=200)=>res.status(status).json(data); const fail=(res,e)=>res.status(400).json({message:e.message||String(e)});
exports.customer={
 profile:async(req,res)=>ok(res,await M.User.findById(req.user._id).select('-passwordHash -refreshTokenHash')),
 vehicles:async(req,res)=>ok(res,await M.Vehicle.find({customerId:req.user._id})),
 addVehicle:async(req,res)=>{try{return ok(res,await M.Vehicle.create({...req.body,customerId:req.user._id}),201)}catch(e){fail(res,e)}},
 services:async(req,res)=>ok(res,[{type:'REPAIR',name:'Repair'},{type:'RECHARGE',name:'Recharge'},{type:'RECYCLE',name:'Recycle'},{type:'BATTERY_SERVICE',name:'Battery Service'},{type:'INSPECTION',name:'Vehicle Inspection'},{type:'OTHER',name:'Other'}]),
 book:async(req,res)=>{try{const j=await M.Job.create({...req.body,customerId:req.user._id,slaDueAt:new Date(Date.now()+24*3600000)});await autoAssign(j);return ok(res,j,201)}catch(e){fail(res,e)}},
 bookings:async(req,res)=>ok(res,await M.Job.find({customerId:req.user._id}).populate('vehicleId technicianId hubId').sort('-createdAt')),
 tracking:async(req,res)=>ok(res,await M.Job.findOne({_id:req.params.id,customerId:req.user._id}).populate('technicianId')),
 wallet:async(req,res)=>ok(res,await M.Wallet.findOne({customerId:req.user._id})||await M.Wallet.create({customerId:req.user._id})),
 walletTx:async(req,res)=>ok(res,await M.WalletTransaction.find({customerId:req.user._id}).sort('-createdAt')),
 addMoney:async(req,res)=>{try{const amount=Number(req.body.amount);if(!amount||amount<=0)throw Error('Invalid amount');const w=await M.Wallet.findOneAndUpdate({customerId:req.user._id},{$inc:{balance:amount}},{new:true,upsert:true});await M.WalletTransaction.create({customerId:req.user._id,type:'CREDIT',amount,referenceType:'TOPUP',description:'Wallet top-up',balanceAfter:w.balance});return ok(res,w)}catch(e){fail(res,e)}},
 pay:async(req,res)=>{try{const p=await M.Payment.create({...req.body,customerId:req.user._id,status:'PENDING',provider:process.env.RAZORPAY_KEY_ID?'RAZORPAY':'MANUAL'});return ok(res,p,201)}catch(e){fail(res,e)}},
 invoices:async(req,res)=>ok(res,await M.Invoice.find({customerId:req.user._id}).sort('-createdAt')),
 review:async(req,res)=>ok(res,await M.Review.create({...req.body,customerId:req.user._id}),201),
 complaints:async(req,res)=>ok(res,await M.Complaint.find({customerId:req.user._id}).sort('-createdAt')),
 complaint:async(req,res)=>ok(res,await M.Complaint.create({...req.body,customerId:req.user._id}),201),
 telemetry:async(req,res)=>ok(res,await M.Telemetry.find({vehicleId:req.params.vehicleId}).sort('-recordedAt').limit(100)),
 notifications:async(req,res)=>ok(res,await M.Notification.find({userId:req.user._id}).sort('-createdAt').limit(100))
};
exports.staff={
 jobs:async(req,res)=>ok(res,await M.Job.find().populate('vehicleId customerId technicianId hubId').sort('-createdAt')),
 create:async(req,res)=>{try{const j=await M.Job.create(req.body);await autoAssign(j);return ok(res,j,201)}catch(e){fail(res,e)}},
 update:async(req,res)=>{try{const j=await M.Job.findByIdAndUpdate(req.params.id,req.body,{new:true});if(!j)return ok(res,{message:'Job not found'},404);return ok(res,j)}catch(e){fail(res,e)}},
 assign:async(req,res)=>{try{const j=await M.Job.findByIdAndUpdate(req.params.id,{technicianId:req.body.technicianId,status:'ASSIGNED',trackingStatus:'Technician Assigned'},{new:true});return ok(res,j)}catch(e){fail(res,e)}},
 start:async(req,res)=>ok(res,await M.Job.findByIdAndUpdate(req.params.id,{status:'IN_PROGRESS',trackingStatus:'Repair/Service'},{new:true})),
 complete:async(req,res)=>{try{const j=await M.Job.findById(req.params.id);if(!j)return ok(res,{message:'Not found'},404);j.status='COMPLETED';j.trackingStatus='Completed';await j.save();const card=await M.JobCard.findOne({jobId:j._id});const items=(card?.partsUsed||j.parts||[]).map(p=>({description:p.description||'Parts',qty:p.qty||1,rate:p.unitPrice||0,amount:(p.qty||1)*(p.unitPrice||0)}));const subtotal=Number(j.labourAmount||0)+items.reduce((s,x)=>s+x.amount,0);const tax=subtotal*0.18;const inv=await M.Invoice.create({invoiceNo:`INV-${Date.now()}`,customerId:j.customerId,jobId:j._id,items:[{description:'Labour',qty:1,rate:j.labourAmount||0,amount:j.labourAmount||0},...items],subtotal,tax,total:subtotal+tax});await notify(req.io,j.customerId,'SERVICE_COMPLETED','Service completed',`Job ${j._id} completed`,{jobId:j._id,invoiceId:inv._id});return ok(res,{job:j,invoice:inv})}catch(e){fail(res,e)}},
 jobCard:async(req,res)=>ok(res,await M.JobCard.findOne({jobId:req.params.id})||await M.JobCard.create({jobId:req.params.id})),
 saveJobCard:async(req,res)=>ok(res,await M.JobCard.findOneAndUpdate({jobId:req.params.id},req.body,{new:true,upsert:true})),
 inventory:async(req,res)=>ok(res,await M.Inventory.find().sort('name')),
 inventoryIssue:async(req,res)=>{const i=await M.Inventory.findOne({sku:req.body.sku});if(!i)return ok(res,{message:'SKU not found'},404);const q=Number(req.body.quantity);if(i.quantity<q)return ok(res,{message:'Insufficient stock'},409);i.quantity-=q;await i.save();return ok(res,i)},
 inventoryRequest:async(req,res)=>ok(res,await M.PurchaseOrder.create(req.body),201),
 diagnostics:async(req,res)=>ok(res,await M.Diagnostic.find({vehicleId:req.params.vehicleId}).sort('-createdAt').limit(20)),
 technicians:async(req,res)=>ok(res,await M.User.find({role:'TECHNICIAN',active:true}).select('name phone hubId')),
 suppliers:async(req,res)=>ok(res,await M.Supplier.find()),
 purchaseOrders:async(req,res)=>ok(res,await M.PurchaseOrder.find().sort('-createdAt'))
};
exports.franchise={
 dashboard:async(req,res)=>{const filter=req.user.franchiseeId?{franchiseeId:req.user.franchiseeId}:{};const hubs=await M.Hub.find(filter);const hubIds=hubs.map(x=>x._id);const [rev,exp,jobs,chargers,staff]=await Promise.all([M.Financial.aggregate([{$match:{hubId:{$in:hubIds},kind:'REVENUE'}},{$group:{_id:null,total:{$sum:'$amount'}}}]),M.Financial.aggregate([{$match:{hubId:{$in:hubIds},kind:'EXPENSE'}},{$group:{_id:null,total:{$sum:'$amount'}}}]),M.Job.countDocuments({hubId:{$in:hubIds}}),M.Charger.countDocuments({hubId:{$in:hubIds},status:'AVAILABLE'}),M.User.countDocuments({hubId:{$in:hubIds}})]);return ok(res,{revenue:rev[0]?.total||0,expenses:exp[0]?.total||0,profit:(rev[0]?.total||0)-(exp[0]?.total||0),jobs,activeChargers:chargers,staff})},
 financials:async(req,res)=>ok(res,await M.Financial.find(req.user.franchiseeId?{franchiseeId:req.user.franchiseeId}:{}).sort('-date')),
 roi:async(req,res)=>{const r=roi(Number(req.query.investment||0),Number(req.query.monthlyRevenue||0),Number(req.query.monthlyExpense||0));return ok(res,r)},
 capex:async(req,res)=>ok(res,await M.Financial.find({kind:'CAPEX',...(req.user.franchiseeId?{franchiseeId:req.user.franchiseeId}:{})})),
 emi:async(req,res)=>{const principal=Number(req.query.principal||0),rate=Number(req.query.rate||12),months=Number(req.query.months||36);return ok(res,{principal,annualRate:rate,tenureMonths:months,monthlyEmi:emi(principal,rate,months)})},
 inventory:async(req,res)=>ok(res,await M.Inventory.find()),staff:async(req,res)=>ok(res,await M.User.find({role:{$in:['STAFF','TECHNICIAN','HUB_MANAGER']}}).select('name role hubId active')),jobs:async(req,res)=>ok(res,await M.Job.find().populate('technicianId hubId vehicleId').sort('-createdAt'))
};
exports.admin={
 dashboard:async(req,res)=>{const [customers,jobs,chargers,hubs,openAnomalies,revenue]=await Promise.all([M.User.countDocuments({role:'CUSTOMER'}),M.Job.countDocuments(),M.Charger.countDocuments(),M.Hub.countDocuments(),M.Anomaly.countDocuments({status:'OPEN'}),M.Financial.aggregate([{$match:{kind:'REVENUE'}},{$group:{_id:null,total:{$sum:'$amount'}}}])]);return ok(res,{customers,jobs,chargers,hubs,openAnomalies,revenue:revenue[0]?.total||0})},
 hubs:async(req,res)=>ok(res,await M.Hub.find().sort('name')),chargers:async(req,res)=>ok(res,await M.Charger.find().populate('hubId').sort('code')),live:async(req,res)=>ok(res,await M.Charger.find().select('code status powerKw lastHeartbeat lastTelemetry hubId')),
 revenue:async(req,res)=>ok(res,await M.Financial.find({kind:'REVENUE'}).sort('-date').limit(500)),anomalies:async(req,res)=>ok(res,await M.Anomaly.find().sort('-createdAt').limit(500)),
 franchisees:async(req,res)=>ok(res,await M.User.find({role:'FRANCHISEE'}).select('name email phone franchiseeId')),
 demand:async(req,res)=>ok(res,await M.Expansion.find().sort('-demandScore').limit(100)),
 expansion:async(req,res)=>{const p=expansion({demandScore:Number(req.query.demandScore||70),competitionScore:Number(req.query.competitionScore||40),evDensityScore:Number(req.query.evDensityScore||80),expectedRevenue:Number(req.query.expectedRevenue||500000),expectedCost:Number(req.query.expectedCost||4000000)});return ok(res,p)},
 health:async(req,res)=>{const fs=await M.Financial.aggregate([{$group:{_id:'$franchiseeId',revenue:{$sum:{$cond:[{$eq:['$kind','REVENUE']},'$amount',0]}},expense:{$sum:{$cond:[{$eq:['$kind','EXPENSE']},'$amount',0]}}}}]);return ok(res,fs.map(x=>({...x,score:Math.max(0,Math.min(100,Math.round((x.revenue/(x.revenue+x.expense||1))*70+30)))})))},
 createHub:async(req,res)=>ok(res,await M.Hub.create(req.body),201),createCharger:async(req,res)=>ok(res,await M.Charger.create(req.body),201),updateCharger:async(req,res)=>ok(res,await M.Charger.findByIdAndUpdate(req.params.id,req.body,{new:true})),
 ingestTelemetry:async(req,res)=>{try{const t=await M.Telemetry.create(req.body);if(req.io){req.io.emit('telemetry:update',t)};if(t.chargerId&&t.powerKw!=null){const c=await M.Charger.findByIdAndUpdate(t.chargerId,{lastTelemetry:t,lastHeartbeat:new Date()},{new:true});if(c)await detectCharging({hubId:c.hubId,chargerId:c._id,expected:Number(req.body.expectedEnergy||t.powerKw),actual:Number(req.body.actualEnergy||t.powerKw)})};if(t.vehicleId)await M.Vehicle.findByIdAndUpdate(t.vehicleId,{batterySoc:t.soc,batterySoh:t.soh});return ok(res,t,201)}catch(e){fail(res,e)}}
};
