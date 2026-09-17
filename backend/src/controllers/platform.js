const M=require('../models'); const {notify}=require('../services/notify'); const {emi,roi,expansion}=require('../services/finance'); const {autoAssign}=require('../services/dispatch'); const {detectCharging}=require('../services/anomaly');
const ok=(res,data,status=200)=>res.status(status).json(data); const fail=(res,e)=>res.status(400).json({message:e.message||String(e)});
const crypto=require('crypto');
const getRazorpay=()=>{
  if(!process.env.RAZORPAY_KEY_ID||!process.env.RAZORPAY_KEY_SECRET) throw Error('Razorpay not configured');
  const Razorpay=require('razorpay');
  return new Razorpay({key_id:process.env.RAZORPAY_KEY_ID,key_secret:process.env.RAZORPAY_KEY_SECRET});
};
const creditWalletRecharge=async({customerId,recharge,paymentId,signature})=>{
  // Idempotency: a payment/order may credit the wallet exactly once.
  const existing=await M.WalletTransaction.findOne({$or:[{razorpayPaymentId:paymentId},{razorpayOrderId:recharge.orderId}],type:'CREDIT',status:'SUCCESS'});
  if(existing){
    const wallet=await M.Wallet.findOne({customerId});
    return {wallet,tx:existing,alreadyCredited:true};
  }
  const customer=await M.User.findById(customerId).select('name email phone').lean();
  const w=await M.Wallet.findOneAndUpdate({customerId},{$inc:{balance:recharge.amount}},{new:true,upsert:true});
  const tx=await M.WalletTransaction.create({
    customerId,type:'CREDIT',amount:recharge.amount,referenceType:'RAZORPAY_RECHARGE',
    description:'Wallet recharge via Razorpay',balanceAfter:w.balance,status:'SUCCESS',provider:'RAZORPAY',
    providerRef:paymentId,razorpayPaymentId:paymentId,razorpayOrderId:recharge.orderId,
    customerName:customer?.name,customerEmail:customer?.email,customerPhone:customer?.phone,
  });
  recharge.status='PAID'; recharge.paymentId=paymentId; recharge.signature=signature; recharge.creditedAt=new Date();
  await recharge.save();
  return {wallet:w,tx,alreadyCredited:false};
};

exports.customer={
 profile:async(req,res)=>ok(res,await M.User.findById(req.user._id).select('-passwordHash -refreshTokenHash')),
 updateProfile:async(req,res)=>{try{const allowed=['name','phone','aadharNumber','panNumber','address','settings'];const data={};for(const k of allowed)if(req.body[k]!==undefined)data[k]=req.body[k];if(data.name!==undefined&&!String(data.name).trim())throw Error('Name is required');if(data.phone!==undefined)data.phone=String(data.phone).trim();if(data.aadharNumber!==undefined)data.aadharNumber=String(data.aadharNumber).replace(/\s/g,'');if(data.panNumber!==undefined)data.panNumber=String(data.panNumber).trim().toUpperCase();const user=await M.User.findByIdAndUpdate(req.user._id,data,{new:true,runValidators:true}).select('-passwordHash -refreshTokenHash');return ok(res,user)}catch(e){fail(res,e)}},
 uploadProfileImage:async(req,res)=>{try{if(!req.file)throw Error('Profile image is required');const url=`/uploads/${req.file.filename}`;const user=await M.User.findByIdAndUpdate(req.user._id,{profileImage:url},{new:true}).select('-passwordHash -refreshTokenHash');return ok(res,user)}catch(e){fail(res,e)}},
 vehicles:async(req,res)=>ok(res,await M.Vehicle.find({customerId:req.user._id})),
 addVehicle:async(req,res)=>{try{return ok(res,await M.Vehicle.create({...req.body,customerId:req.user._id}),201)}catch(e){fail(res,e)}},
 services:async(req,res)=>ok(res,[{type:'REPAIR',name:'Repair'},{type:'RECHARGE',name:'Recharge'},{type:'RECYCLE',name:'Recycle'},{type:'BATTERY_SERVICE',name:'Battery Service'},{type:'INSPECTION',name:'Vehicle Inspection'},{type:'OTHER',name:'Other'}]),
 book:async(req,res)=>{try{const j=await M.Job.create({...req.body,customerId:req.user._id,slaDueAt:new Date(Date.now()+24*3600000)});await autoAssign(j);return ok(res,j,201)}catch(e){fail(res,e)}},
 bookings:async(req,res)=>ok(res,await M.Job.find({customerId:req.user._id}).populate('vehicleId technicianId hubId').sort('-createdAt')),
 tracking:async(req,res)=>ok(res,await M.Job.findOne({_id:req.params.id,customerId:req.user._id}).populate('technicianId')),
 wallet:async(req,res)=>ok(res,await M.Wallet.findOne({customerId:req.user._id})||await M.Wallet.create({customerId:req.user._id})),
 walletTx:async(req,res)=>ok(res,await M.WalletTransaction.find({customerId:req.user._id}).sort('-createdAt')),
 addMoney:async(req,res)=>{try{
  if(process.env.ENABLE_DEV_WALLET_TOPUP!=='true') return ok(res,{message:'Direct wallet top-up is disabled. Use Razorpay recharge.'},403);
  const amount=Number(req.body.amount); if(!amount||amount<=0)throw Error('Invalid amount');
  const customer=await M.User.findById(req.user._id).select('name email phone').lean();
  const w=await M.Wallet.findOneAndUpdate({customerId:req.user._id},{$inc:{balance:amount}},{new:true,upsert:true});
  await M.WalletTransaction.create({customerId:req.user._id,type:'CREDIT',amount,referenceType:'DEV_TOPUP',description:'Development wallet top-up',balanceAfter:w.balance,status:'SUCCESS',provider:'DEV',customerName:customer?.name,customerEmail:customer?.email,customerPhone:customer?.phone});
  return ok(res,w)
 }catch(e){fail(res,e)}},
 walletRechargeOrder:async(req,res)=>{try{
  const amount=Number(req.body.amount); if(!amount||amount<1)throw Error('Invalid amount');
  const rz=getRazorpay(); const amountPaise=Math.round(amount*100);
  const order=await rz.orders.create({amount:amountPaise,currency:'INR',receipt:`wallet_${Date.now()}`,notes:{customerId:String(req.user._id),type:'WALLET_RECHARGE'}});
  await M.WalletRecharge.create({customerId:req.user._id,orderId:order.id,amount,amountPaise:order.amount,currency:order.currency,status:'CREATED'});
  return ok(res,{orderId:order.id,amount:order.amount,currency:order.currency,keyId:process.env.RAZORPAY_KEY_ID})
 }catch(e){fail(res,e)}},
 walletVerifyRecharge:async(req,res)=>{try{
  const {razorpay_order_id,razorpay_payment_id,razorpay_signature}=req.body;
  if(!razorpay_order_id||!razorpay_payment_id||!razorpay_signature) throw Error('Incomplete payment verification data');
  const recharge=await M.WalletRecharge.findOne({orderId:razorpay_order_id,customerId:req.user._id});
  if(!recharge) return ok(res,{message:'Recharge order not found'},404);
  if(recharge.status==='PAID'){
    const wallet=await M.Wallet.findOne({customerId:req.user._id});
    return ok(res,{...wallet?.toObject(),paymentId:recharge.paymentId,orderId:recharge.orderId,status:'PAID',alreadyCredited:true});
  }
  const expected=crypto.createHmac('sha256',process.env.RAZORPAY_KEY_SECRET||'').update(`${razorpay_order_id}|${razorpay_payment_id}`).digest('hex');
  if(!process.env.RAZORPAY_KEY_SECRET||expected!==razorpay_signature){recharge.status='FAILED';recharge.failureReason='Invalid payment signature';await recharge.save();throw Error('Invalid payment signature');}
  // Server-to-server verification: never trust amount/status supplied by the browser.
  const rz=getRazorpay(); const payment=await rz.payments.fetch(razorpay_payment_id);
  if(payment.order_id!==recharge.orderId) throw Error('Payment does not belong to this recharge order');
  if(Number(payment.amount)!==Number(recharge.amountPaise)) throw Error('Payment amount mismatch');
  if(payment.currency!==recharge.currency) throw Error('Payment currency mismatch');
  if(payment.status!=='captured') throw Error(`Payment is not captured (${payment.status})`);
  const result=await creditWalletRecharge({customerId:req.user._id,recharge,paymentId:razorpay_payment_id,signature:razorpay_signature});
  return ok(res,{...result.wallet.toObject(),paymentId:razorpay_payment_id,orderId:recharge.orderId,status:'PAID',alreadyCredited:result.alreadyCredited})
 }catch(e){fail(res,e)}},
 walletRechargeStatus:async(req,res)=>{try{
  const recharge=await M.WalletRecharge.findOne({orderId:req.params.orderId,customerId:req.user._id});
  if(!recharge)return ok(res,{message:'Recharge order not found'},404);
  if(recharge.status==='PAID') return ok(res,{status:'PAID',orderId:recharge.orderId,paymentId:recharge.paymentId,amount:recharge.amount});
  const rz=getRazorpay();
  const payments=await rz.orders.fetchPayments(recharge.orderId);
  const paid=(payments.items||[]).find(p=>Number(p.amount)===Number(recharge.amountPaise)&&p.status==='captured');
  if(paid){
    const result=await creditWalletRecharge({customerId:req.user._id,recharge,paymentId:paid.id,signature:'SERVER_RECONCILED'});
    return ok(res,{status:'PAID',orderId:recharge.orderId,paymentId:paid.id,amount:recharge.amount,balance:result.wallet.balance,reconciled:true});
  }
  return ok(res,{status:recharge.status,orderId:recharge.orderId,amount:recharge.amount});
 }catch(e){fail(res,e)}},
 walletCancelRecharge:async(req,res)=>{try{
  const recharge=await M.WalletRecharge.findOne({orderId:req.params.orderId,customerId:req.user._id});
  if(!recharge)return ok(res,{message:'Recharge order not found'},404);
  if(recharge.status!=='PAID'){recharge.status='CANCELLED';recharge.cancelledAt=new Date();await recharge.save();}
  return ok(res,{status:recharge.status,orderId:recharge.orderId});
 }catch(e){fail(res,e)}},
 pay:async(req,res)=>{try{const p=await M.Payment.create({...req.body,customerId:req.user._id,status:'PENDING',provider:process.env.RAZORPAY_KEY_ID?'RAZORPAY':'MANUAL'});return ok(res,p,201)}catch(e){fail(res,e)}},
 invoices:async(req,res)=>ok(res,await M.Invoice.find({customerId:req.user._id}).sort('-createdAt')),
 review:async(req,res)=>ok(res,await M.Review.create({...req.body,customerId:req.user._id}),201),
 complaintOptions:async(req,res)=>{
  const customer=await M.User.findById(req.user._id).lean(); const pincode=req.query.pincode||customer?.address?.pincode; const addr=customer?.address||{};
  const franchisees=await M.User.find({role:'FRANCHISEE',active:true}).select('name email phone address').lean();
  const score=x=>x.address?.pincode===pincode?0:(x.address?.district&&addr.district&&x.address.district.toLowerCase()===addr.district.toLowerCase()?1:(x.address?.state&&addr.state&&x.address.state.toLowerCase()===addr.state.toLowerCase()?2:3));
  franchisees.sort((a,b)=>score(a)-score(b));
  const rentals=await M.VehicleRental.find({customerId:req.user._id,status:'ACTIVE'}).sort('-createdAt').lean();
  const owned=await M.Vehicle.find({customerId:req.user._id,status:'ACTIVE'}).lean();
  const activeVehicles=[...rentals.map(r=>({source:'RENTAL',rentalId:r._id,vehicleId:r.vehicleId,vehicleSnapshot:r.vehicleSnapshot,paymentDetails:{paymentStatus:r.paymentStatus,razorpayPaymentId:r.razorpayPaymentId,totalAmount:r.totalAmount,pricePerDay:r.pricePerDay,startDate:r.startDate,endDate:r.endDate},franchiseeId:r.vehicleSnapshot?.franchiseeId,franchiseeName:r.vehicleSnapshot?.franchiseeName})),...owned.map(v=>({source:'OWNED',vehicleId:v._id,vehicleSnapshot:{model:v.model,registrationNo:v.registrationNo,vin:v.vin,batterySoc:v.batterySoc,batterySoh:v.batterySoh},paymentDetails:{},franchiseeId:null,franchiseeName:''}))];
  return ok(res,{customerAddress:addr,franchisees,activeVehicles});
},
complaints:async(req,res)=>ok(res,await M.Complaint.find({customerId:req.user._id}).sort('-createdAt')),
complaint:async(req,res)=>{try{const {vehicleId,franchiseeId,category,message,subject,vehicleSnapshot,paymentDetails}=req.body;if(!vehicleId||!franchiseeId||!message)throw Error('Active bike, franchisee and complaint message are required');const fr=await M.User.findOne({_id:franchiseeId,role:'FRANCHISEE',active:true});if(!fr)throw Error('Selected franchisee is not available');const c=await M.Complaint.create({customerId:req.user._id,vehicleId,franchiseeId,franchiseeName:fr.name,category,message,subject:subject||category||'Vehicle Complaint',vehicleSnapshot,paymentDetails});await M.Notification.create({userId:fr._id,type:'COMPLAINT_NEW',title:'New Customer Complaint',message:`${req.user.name} raised a vehicle complaint`,data:{complaintId:c._id}});return ok(res,c,201)}catch(e){return fail(res,e)}},
feedback:async(req,res)=>{try{const {rating,feedback}=req.body;const c=await M.Complaint.findOne({_id:req.params.id,customerId:req.user._id});if(!c)return ok(res,{message:'Complaint not found'},404);if(c.status!=='SOLVED')return ok(res,{message:'Complaint is not solved yet'},409);const r=Number(rating);if(r<1||r>5)return ok(res,{message:'Rating must be 1 to 5'},400);c.franchiseeRating=r;c.feedback=feedback||'';c.feedbackSubmitted=true;c.feedbackAt=new Date();c.feedbackRequested=false;c.status='CLOSED';await c.save();await M.Review.create({customerId:req.user._id,rating:r,comment:feedback||'',franchiseeId:c.franchiseeId,franchiseeRating:r,jobId:c.jobId});return ok(res,c)}catch(e){return fail(res,e)}},
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
exports.franchise.faultVehicles=async(req,res)=>{const list=await M.FaultVehicle.find({franchiseeId:req.user._id}).populate('customerId','name email phone').sort('-createdAt').lean();return ok(res,list);};
exports.franchise.complaints=async(req,res)=>{const list=await M.Complaint.find({franchiseeId:req.user._id}).populate('customerId','name email phone').sort('-createdAt').lean();return ok(res,list);};
exports.franchise.solveComplaint=async(req,res)=>{try{const c=await M.Complaint.findOne({_id:req.params.id,franchiseeId:req.user._id});if(!c)return ok(res,{message:'Complaint not found'},404);if(c.status==='CLOSED')return ok(res,{message:'Complaint already closed'},409);const {resolution,replacementVehicleId,faultReason}=req.body;let replacement=null;if(replacementVehicleId){if(String(replacementVehicleId)===String(c.vehicleId))return ok(res,{message:'Replacement vehicle must be different from the faulty vehicle'},409);replacement=await M.PendingVehicle.findOneAndUpdate({_id:replacementVehicleId,franchiseeId:req.user._id,status:'APPROVED',$or:[{quantity:{$gt:0}},{quantity:{$exists:false}}]},[{$set:{quantity:{$subtract:[{$ifNull:['$quantity',1]},1]}}}],{new:true});if(!replacement)return ok(res,{message:'Replacement vehicle is not available in your inventory'},409);}if(replacement){const fault=await M.FaultVehicle.create({complaintId:c._id,customerId:c.customerId,franchiseeId:c.franchiseeId,vehicleId:c.vehicleId,vehicleSnapshot:c.vehicleSnapshot,paymentSnapshot:c.paymentDetails,reason:faultReason||'Vehicle replaced after complaint'});c.faultVehicleId=fault._id;c.faultReason=faultReason||'Vehicle replaced after complaint';c.replacementRequested=true;c.replacementVehicleId=replacement._id;c.replacementVehicleSnapshot=replacement.toObject();c.replacementAt=new Date();const activeRental=await M.VehicleRental.findOne({customerId:c.customerId,status:'ACTIVE',vehicleId:c.vehicleId});if(activeRental){activeRental.vehicleId=replacement._id;activeRental.vehicleSnapshot=replacement.toObject();await activeRental.save();}}c.resolution=resolution||'Complaint resolved by franchisee';c.status='SOLVED';c.solvedAt=new Date();c.feedbackRequested=true;await c.save();await M.Notification.create({userId:c.customerId,type:'COMPLAINT_SOLVED',title:'Complaint Solved',message:'Your complaint has been solved. Please rate the franchisee service.',data:{complaintId:c._id,replacementVehicleId:replacement?replacement._id:null}});return ok(res,c)}catch(e){return fail(res,e)}};

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

// ── NEW: Franchise complaint → assign to staff ──────────────────────
exports.franchise.assignComplaint = async (req, res) => {
  try {
    const { staffId, staffName } = req.body;
    const c = await M.Complaint.findOne({ _id: req.params.id, franchiseeId: req.user._id });
    if (!c) return ok(res, { message: 'Complaint not found' }, 404);
    c.assignedStaffId = staffId;
    c.assignedStaffName = staffName || 'Staff';
    c.status = 'IN_PROGRESS';
    await c.save();
    await M.Notification.create({
      userId: staffId,
      type: 'COMPLAINT_ASSIGNED',
      title: 'Complaint Assigned to You',
      message: `A customer complaint has been assigned to you by ${req.user.name}`,
      data: { complaintId: c._id },
    }).catch(() => {});
    return ok(res, c);
  } catch (e) { return fail(res, e); }
};

// ── NEW: Franchise create work order from complaint ─────────────────
exports.franchise.createWorkOrder = async (req, res) => {
  try {
    const { description, staffId, priority } = req.body;
    const c = await M.Complaint.findOne({ _id: req.params.id, franchiseeId: req.user._id });
    if (!c) return ok(res, { message: 'Complaint not found' }, 404);
    const job = await M.Job.create({
      customerId: c.customerId,
      vehicleId:  c.vehicleId,
      serviceType: 'COMPLAINT_JOB',
      description: description || c.message,
      status: staffId ? 'ASSIGNED' : 'PENDING',
      trackingStatus: staffId ? 'Technician Assigned' : 'Work Order Created',
      technicianId: staffId || undefined,
      complaintId: c._id,
      priority: priority || 'NORMAL',
      franchiseeId: req.user._id,
    });
    c.jobId = job._id;
    await c.save();
    if (staffId) {
      await M.Notification.create({
        userId: staffId,
        type: 'JOB_ASSIGNED',
        title: 'Work Order Assigned',
        message: `A work order from customer complaint has been assigned to you.`,
        data: { jobId: job._id },
      }).catch(() => {});
    }
    return ok(res, job, 201);
  } catch (e) { return fail(res, e); }
};