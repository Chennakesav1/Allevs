const mongoose=require('mongoose'); const {Schema}=mongoose;
const id=Schema.Types.ObjectId;
const userSchema=new Schema({name:{type:String,required:true},email:{type:String,unique:true,sparse:true,lowercase:true},phone:{type:String,unique:true,sparse:true},passwordHash:{type:String},role:{type:String,enum:['CUSTOMER','TECHNICIAN','STAFF','HUB_MANAGER','FRANCHISEE','CENTRAL_ADMIN','SUPER_ADMIN'],required:true},franchiseeId:id,hubId:id,active:{type:Boolean,default:true},refreshTokenHash:String,otpHash:String,otpExpiry:Date,otpVerified:{type:Boolean,default:false},isPasswordSet:{type:Boolean,default:false}},{timestamps:true});
const vehicleSchema=new Schema({customerId:{type:id,ref:'User',required:true},vin:{type:String,unique:true,required:true},registrationNo:String,model:String,batterySoc:{type:Number,default:0},batterySoh:{type:Number,default:100},status:{type:String,default:'ACTIVE'}},{timestamps:true});
const hubSchema=new Schema({name:String,code:{type:String,unique:true},city:String,address:String,lat:Number,lng:Number,status:{type:String,default:'ONLINE'},chargerCount:{type:Number,default:0},franchiseeId:id},{timestamps:true});
const chargerSchema=new Schema({hubId:{type:id,ref:'Hub'},code:{type:String,unique:true},status:{type:String,default:'AVAILABLE'},powerKw:{type:Number,default:7.2},connectorType:{type:String,default:'AC'},pricePerKwh:{type:Number,default:12},lastHeartbeat:Date,lastTelemetry:Schema.Types.Mixed},{timestamps:true});
const jobSchema=new Schema({customerId:{type:id,ref:'User'},vehicleId:{type:id,ref:'Vehicle'},hubId:{type:id,ref:'Hub'},technicianId:{type:id,ref:'User'},serviceType:{type:String,default:'REPAIR'},problem:String,priority:{type:String,default:'NORMAL'},status:{type:String,enum:['PENDING','ASSIGNED','EN_ROUTE','REACHED','INSPECTION','IN_PROGRESS','WAITING_FOR_PARTS','QC','COMPLETED','CANCELLED','EMERGENCY'],default:'PENDING'},location:Schema.Types.Mixed,parts:[{partId:id,qty:Number,unitPrice:Number}],labourAmount:{type:Number,default:0},totalAmount:{type:Number,default:0},trackingStatus:{type:String,default:'Technician Assigned'},slaDueAt:Date},{timestamps:true});
const jobCardSchema=new Schema({jobId:{type:id,ref:'Job',unique:true},complaint:String,diagnosis:String,workPerformed:String,technicianNotes:String,partsUsed:[{partId:id,qty:Number,unitPrice:Number}],photos:[String],beforeAfter:[{before:String,after:String}],customerApproval:{type:Boolean,default:false},qcApproved:{type:Boolean,default:false},completedAt:Date},{timestamps:true});
const inventorySchema=new Schema({hubId:id,sku:{type:String,unique:true},name:String,category:String,quantity:{type:Number,default:0},reorderLevel:{type:Number,default:5},unitPrice:{type:Number,default:0},supplierId:id},{timestamps:true});
const supplierSchema=new Schema({name:String,phone:String,email:String,address:String,active:{type:Boolean,default:true}},{timestamps:true});
const purchaseOrderSchema=new Schema({hubId:id,supplierId:id,items:[{sku:String,quantity:Number,unitPrice:Number}],status:{type:String,default:'DRAFT'},total:{type:Number,default:0}},{timestamps:true});
const paymentSchema=new Schema({customerId:id,jobId:id,invoiceId:id,amount:Number,method:String,status:{type:String,default:'PENDING'},provider:String,providerRef:String,orderId:String,signature:String},{timestamps:true});
const invoiceSchema=new Schema({invoiceNo:{type:String,unique:true},customerId:id,jobId:id,items:[{description:String,qty:Number,rate:Number,amount:Number}],subtotal:Number,tax:Number,total:Number,status:{type:String,default:'UNPAID'},paidAt:Date,pdfUrl:String},{timestamps:true});
const walletSchema=new Schema({customerId:{type:id,unique:true},balance:{type:Number,default:0},currency:{type:String,default:'INR'}},{timestamps:true});
const walletTxSchema=new Schema({customerId:id,type:{type:String,enum:['CREDIT','DEBIT']},amount:Number,referenceType:String,referenceId:id,description:String,balanceAfter:Number},{timestamps:true});
const chargingSchema=new Schema({chargerId:id,customerId:id,vehicleId:id,energyKwh:{type:Number,default:0},amount:{type:Number,default:0},ratePerKwh:Number,status:{type:String,default:'PENDING'},startAt:Date,endAt:Date,meterStart:Number,meterEnd:Number,providerRef:String},{timestamps:true});
const telemetrySchema=new Schema({vehicleId:id,chargerId:id,soc:Number,soh:Number,temperature:Number,voltage:Number,current:Number,powerKw:Number,faultCodes:[String],source:String,recordedAt:{type:Date,default:Date.now}},{timestamps:true});
const diagnosticSchema=new Schema({vehicleId:id,faultCodes:[String],healthScore:Number,summary:String,raw:Schema.Types.Mixed,createdAt:{type:Date,default:Date.now}});
const notificationSchema=new Schema({userId:id,type:String,title:String,message:String,read:{type:Boolean,default:false},data:Schema.Types.Mixed},{timestamps:true});
const reviewSchema=new Schema({customerId:id,jobId:id,rating:{type:Number,min:1,max:5},comment:String,technicianRating:Number,serviceRating:Number,chargerRating:Number},{timestamps:true});
const complaintSchema=new Schema({customerId:id,jobId:id,category:String,message:String,status:{type:String,default:'OPEN'},priority:{type:String,default:'NORMAL'}},{timestamps:true});
const assetSchema=new Schema({hubId:id,name:String,category:String,serialNo:String,purchaseCost:Number,purchaseDate:Date,status:{type:String,default:'ACTIVE'},utilization:Number},{timestamps:true});
const maintenanceSchema=new Schema({assetId:id,chargerId:id,type:String,dueAt:Date,status:{type:String,default:'SCHEDULED'},notes:String},{timestamps:true});
const anomalySchema=new Schema({type:String,severity:{type:String,default:'MEDIUM'},hubId:id,chargerId:id,userId:id,jobId:id,expected:Number,actual:Number,deviation:Number,status:{type:String,default:'OPEN'},details:Schema.Types.Mixed},{timestamps:true});
const financialSchema=new Schema({franchiseeId:id,hubId:id,kind:{type:String,enum:['REVENUE','EXPENSE','CAPEX']},category:String,amount:Number,date:{type:Date,default:Date.now},referenceId:id,description:String},{timestamps:true});
const emiSchema=new Schema({franchiseeId:id,principal:Number,annualRate:Number,tenureMonths:Number,monthlyEmi:Number,startDate:Date},{timestamps:true});
const expansionSchema=new Schema({location:String,demandScore:Number,competitionScore:Number,evDensityScore:Number,expectedRevenue:Number,expectedCost:Number,roi:Number,paybackMonths:Number,recommendation:String,inputs:Schema.Types.Mixed},{timestamps:true});
const auditSchema=new Schema({actorId:id,action:String,entity:String,entityId:id,metadata:Schema.Types.Mixed},{timestamps:true});

// ── NEW: Pending Vehicle Submissions ──────────────────────────────
const pendingVehicleSchema = new Schema({
  // Franchisee who submitted
  franchiseeId:    { type: id, ref: 'User' },
  franchiseeName:  String,
  franchiseeEmail: String,
  // Vehicle details (mirrors the frontend form)
  category:           String,
  make:               String,
  model:              String,
  year:               String,
  color:              String,
  registrationNo:     String,
  batteryCapacityKwh: Number,
  rangeKm:            Number,
  chargingType:       String,
  pricePerDay:        Number,
  description:        String,
  // images stored as base64 data-URLs (small previews) or upload paths
  images: [{ name: String, url: String }],
  // Approval workflow
  status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
    default: 'PENDING_APPROVAL',
  },
  reviewedBy:       { type: id, ref: 'User' },
  reviewedAt:       Date,
  rejectionReason:  String,
}, { timestamps: true });

// ── NEW: Pending Staff Submissions ────────────────────────────────
const pendingStaffSchema = new Schema({
  // Franchisee who submitted
  franchiseeId:    { type: id, ref: 'User' },
  franchiseeName:  String,
  franchiseeEmail: String,
  // Staff details
  name:       String,
  email:      String,
  phone:      String,
  role:       String,
  hubId:      String,
  address:    String,
  aadhar:     String,
  panNumber:  String,
  aadharPhoto: { name: String, url: String },
  panPhoto:    { name: String, url: String },
  removedFromFranchisee: { type: Boolean, default: false },
  removedAt: Date,
  // Approval workflow
  status: {
    type: String,
    enum: ['PENDING_APPROVAL', 'APPROVED', 'REJECTED'],
    default: 'PENDING_APPROVAL',
  },
  reviewedBy:       { type: id, ref: 'User' },
  reviewedAt:       Date,
  rejectionReason:  String,
  assignedPassword: String, // generated on approval (hashed before storing in User collection)
  userId:           { type: id, ref: 'User' }, // set when User record is created on approval
}, { timestamps: true });

const models={
  User:mongoose.model('User',userSchema),
  Vehicle:mongoose.model('Vehicle',vehicleSchema),
  Hub:mongoose.model('Hub',hubSchema),
  Charger:mongoose.model('Charger',chargerSchema),
  Job:mongoose.model('Job',jobSchema),
  JobCard:mongoose.model('JobCard',jobCardSchema),
  Inventory:mongoose.model('Inventory',inventorySchema),
  Supplier:mongoose.model('Supplier',supplierSchema),
  PurchaseOrder:mongoose.model('PurchaseOrder',purchaseOrderSchema),
  Payment:mongoose.model('Payment',paymentSchema),
  Invoice:mongoose.model('Invoice',invoiceSchema),
  Wallet:mongoose.model('Wallet',walletSchema),
  WalletTransaction:mongoose.model('WalletTransaction',walletTxSchema),
  ChargingSession:mongoose.model('ChargingSession',chargingSchema),
  Telemetry:mongoose.model('Telemetry',telemetrySchema),
  Diagnostic:mongoose.model('Diagnostic',diagnosticSchema),
  Notification:mongoose.model('Notification',notificationSchema),
  Review:mongoose.model('Review',reviewSchema),
  Complaint:mongoose.model('Complaint',complaintSchema),
  Asset:mongoose.model('Asset',assetSchema),
  Maintenance:mongoose.model('Maintenance',maintenanceSchema),
  Anomaly:mongoose.model('Anomaly',anomalySchema),
  Financial:mongoose.model('Financial',financialSchema),
  EMI:mongoose.model('EMI',emiSchema),
  Expansion:mongoose.model('Expansion',expansionSchema),
  AuditLog:mongoose.model('AuditLog',auditSchema),
  PendingVehicle:mongoose.model('PendingVehicle',pendingVehicleSchema),
  PendingStaff:mongoose.model('PendingStaff',pendingStaffSchema),
};
module.exports=models;