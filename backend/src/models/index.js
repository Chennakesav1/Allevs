const mongoose=require('mongoose'); const {Schema}=mongoose;
const id=Schema.Types.ObjectId;
const userSchema=new Schema({name:{type:String,required:true},email:{type:String,unique:true,sparse:true,lowercase:true},phone:{type:String,unique:true,sparse:true},address:Schema.Types.Mixed,profileImage:String,aadharNumber:String,panNumber:String,identityDocuments:{aadhar:{url:String,fileName:String,uploadedAt:Date},pan:{url:String,fileName:String,uploadedAt:Date},currentBill:{url:String,fileName:String,uploadedAt:Date}},settings:{type:Schema.Types.Mixed,default:{notifications:true,securityAlerts:true,offers:false}},passwordHash:{type:String},role:{type:String,enum:['CUSTOMER','TECHNICIAN','STAFF','HUB_MANAGER','FRANCHISEE','CENTRAL_ADMIN','SUPER_ADMIN'],required:true},franchiseeId:id,hubId:id,active:{type:Boolean,default:true},refreshTokenHash:String,otpHash:String,otpExpiry:Date,otpVerified:{type:Boolean,default:false},isPasswordSet:{type:Boolean,default:false},monthlySalary:{type:Number,default:0,min:0},joiningDate:Date,payrollNotes:String},{timestamps:true});
const vehicleSchema=new Schema({customerId:{type:id,ref:'User',required:true},vin:{type:String,unique:true,required:true},registrationNo:String,model:String,batterySoc:{type:Number,default:0},batterySoh:{type:Number,default:100},status:{type:String,default:'ACTIVE'},sourcePurchaseId:{type:id,ref:'VehicleRental'}},{timestamps:true});
const hubSchema=new Schema({name:String,code:{type:String,unique:true},city:String,address:String,lat:Number,lng:Number,status:{type:String,default:'ONLINE'},chargerCount:{type:Number,default:0},franchiseeId:id},{timestamps:true});
const chargerSchema=new Schema({hubId:{type:id,ref:'Hub'},code:{type:String,unique:true},status:{type:String,default:'AVAILABLE'},powerKw:{type:Number,default:7.2},connectorType:{type:String,default:'AC'},pricePerKwh:{type:Number,default:12},lastHeartbeat:Date,lastTelemetry:Schema.Types.Mixed},{timestamps:true});
const jobSchema=new Schema({createdBy:{type:id,ref:'User',index:true},createdSource:{type:String,enum:['ASSIGNED','STAFF_OWN'],default:'ASSIGNED',index:true},selfCreated:{type:Boolean,default:false,index:true},customerSnapshot:Schema.Types.Mixed,bikeDetails:Schema.Types.Mixed,previousWorkSummary:String,customerId:{type:id,ref:'User'},vehicleId:{type:id,ref:'Vehicle'},commandVehicleId:{type:id,ref:'CommandVehicle'},maintenanceId:{type:id,ref:'FleetMaintenance',index:true},complaintId:{type:id,ref:'Complaint',index:true},vehicleSnapshot:Schema.Types.Mixed, bikeId:String, rentalId:{type:id,ref:'VehicleRental'},franchiseeId:{type:id,ref:'User'},hubId:{type:id,ref:'Hub'},technicianId:{type:id,ref:'User'},serviceType:{type:String,default:'REPAIR'},problem:String,priority:{type:String,default:'NORMAL'},status:{type:String,enum:['PENDING','ASSIGNED','EN_ROUTE','REACHED','INSPECTION','IN_PROGRESS','PAUSED','WAITING_FOR_PARTS','QC','COMPLETED','CANCELLED','EMERGENCY'],default:'PENDING'},location:Schema.Types.Mixed,parts:[{partId:id,qty:Number,unitPrice:Number}],labourAmount:{type:Number,default:0},totalAmount:{type:Number,default:0},diagnosis:String,rootCause:String,workPerformed:String,solution:String,partsReplaced:[String],testResult:String,finalCondition:String,recommendations:String,nextServiceAt:Date,labourHours:Number,completionNotes:String,trackingStatus:{type:String,default:'Technician Assigned'},slaDueAt:Date,startedAt:Date,pausedAt:Date,pauseReason:String,pauseHistory:[{pausedAt:Date,resumedAt:Date,reason:String,category:String,details:String,expectedResumeAt:Date,workCompletedBeforePause:String,partsRequired:String,durationSeconds:Number}],elapsedSeconds:{type:Number,default:0},completedAt:Date,remarks:String,odometerReading:Number,batteryPercent:Number},{timestamps:true});
const jobCardSchema=new Schema({jobId:{type:id,ref:'Job',unique:true},complaint:String,diagnosis:String,workPerformed:String,technicianNotes:String,partsUsed:[{partId:id,qty:Number,unitPrice:Number}],photos:[String],beforeAfter:[{before:String,after:String}],customerApproval:{type:Boolean,default:false},qcApproved:{type:Boolean,default:false},completedAt:Date},{timestamps:true});
const inventorySchema=new Schema({hubId:id,sku:{type:String,unique:true},name:String,category:String,quantity:{type:Number,default:0},reorderLevel:{type:Number,default:5},unitPrice:{type:Number,default:0},supplierId:id},{timestamps:true});
const supplierSchema=new Schema({name:String,phone:String,email:String,address:String,active:{type:Boolean,default:true}},{timestamps:true});
const purchaseOrderSchema=new Schema({hubId:id,supplierId:id,items:[{sku:String,quantity:Number,unitPrice:Number}],status:{type:String,default:'DRAFT'},total:{type:Number,default:0}},{timestamps:true});
const paymentSchema=new Schema({customerId:id,jobId:id,invoiceId:id,amount:Number,method:String,status:{type:String,default:'PENDING'},provider:String,providerRef:String,orderId:String,signature:String},{timestamps:true});
const invoiceSchema=new Schema({invoiceNo:{type:String,unique:true},customerId:id,jobId:id,rentalId:id,items:[{description:String,qty:Number,rate:Number,amount:Number}],subtotal:Number,tax:Number,total:Number,status:{type:String,default:'UNPAID'},paidAt:Date,pdfUrl:String},{timestamps:true});
const walletSchema=new Schema({customerId:{type:id,unique:true},balance:{type:Number,default:0},currency:{type:String,default:'INR'}},{timestamps:true});
const walletTxSchema=new Schema({
  customerId:{type:id,ref:'User',index:true},
  type:{type:String,enum:['CREDIT','DEBIT']},
  amount:Number,
  referenceType:String,
  referenceId:id,
  description:String,
  balanceAfter:Number,
  status:{type:String,enum:['SUCCESS','PENDING','FAILED','CANCELLED'],default:'SUCCESS'},
  razorpayOrderId:{type:String,index:true},
  razorpayPaymentId:{type:String},
  provider:String,
  providerRef:String,
  customerName:String,
  customerEmail:String,
  customerPhone:String,
},{timestamps:true});
walletTxSchema.index({ razorpayPaymentId: 1 }, { unique: true, sparse: true });

const walletRechargeSchema=new Schema({
  customerId:{type:id,ref:'User',required:true,index:true},
  orderId:{type:String,required:true,unique:true,index:true},
  amount:{type:Number,required:true},
  amountPaise:{type:Number,required:true},
  currency:{type:String,default:'INR'},
  status:{type:String,enum:['CREATED','AUTHORIZED','PAID','FAILED','CANCELLED'],default:'CREATED',index:true},
  paymentId:{type:String,index:true},
  signature:String,
  failureReason:String,
  creditedAt:Date,
  cancelledAt:Date,
  provider:{type:String,default:'RAZORPAY'},
},{timestamps:true});
const chargingSchema=new Schema({chargerId:id,customerId:id,vehicleId:id,energyKwh:{type:Number,default:0},amount:{type:Number,default:0},ratePerKwh:Number,status:{type:String,default:'PENDING'},startAt:Date,endAt:Date,meterStart:Number,meterEnd:Number,providerRef:String},{timestamps:true});
const telemetrySchema=new Schema({vehicleId:id,chargerId:id,soc:Number,soh:Number,temperature:Number,voltage:Number,current:Number,powerKw:Number,faultCodes:[String],source:String,recordedAt:{type:Date,default:Date.now}},{timestamps:true});
const diagnosticSchema=new Schema({vehicleId:id,faultCodes:[String],healthScore:Number,summary:String,raw:Schema.Types.Mixed,createdAt:{type:Date,default:Date.now}});
const notificationSchema=new Schema({userId:id,type:String,title:String,message:String,read:{type:Boolean,default:false},data:Schema.Types.Mixed},{timestamps:true});
const reviewSchema=new Schema({customerId:id,jobId:id,rating:{type:Number,min:1,max:5},comment:String,technicianRating:Number,serviceRating:Number,chargerRating:Number,franchiseeId:id,franchiseeRating:{type:Number,min:1,max:5}});
const complaintSchema=new Schema({
  customerId:{type:id,ref:'User',required:true},
  jobId:{type:id,ref:'Job'},
  maintenanceId:{type:id,ref:'FleetMaintenance',index:true},
  category:String,
  message:String,
  subject:String,
  status:{type:String,enum:['OPEN','IN_PROGRESS','PAUSED','STAFF_COMPLETED','SOLVED','CLOSED'],default:'OPEN'},
  priority:{type:String,default:'NORMAL'},
  franchiseeId:{type:id,ref:'User'},
  vehicleId:id,
  vehicleSnapshot:Schema.Types.Mixed,
  paymentDetails:Schema.Types.Mixed,
  franchiseeName:String,
  fleetOperatorName:String,
  resolution:String,
  solvedAt:Date,
  feedbackRequested:{type:Boolean,default:false},
  feedbackSubmitted:{type:Boolean,default:false},
  franchiseeRating:{type:Number,min:1,max:5},
  feedback:String,
  feedbackAt:Date,
  replacementRequested:{type:Boolean,default:false},
  replacementVehicleId:id,
  replacementVehicleSnapshot:Schema.Types.Mixed,
  replacementAt:Date,
  faultReason:String,
  faultVehicleId:id,
  assignedStaffId:{type:id,ref:'User'},
  assignedStaffName:String,
  assignedAt:Date,
  startedAt:Date,
  pausedAt:Date,
  resumedAt:Date,
  pauseReason:String,
  closedAt:Date,
  handoverDate:Date,
  serviceCount:{type:Number,default:0},
  previousIssue:String,
  chatClosed:{type:Boolean,default:false},
  chatClosedAt:Date,
  serviceCenterSentAt:Date,
  serviceCenterName:String,
  serviceCenterAddress:String,
  serviceCenterMapsUrl:String,
  serviceCenter:{name:String,address:String,mapUrl:String},
  commandJobId:{type:id,ref:'Job',index:true},
  staffStatus:{type:String,enum:['PENDING','ASSIGNED','IN_PROGRESS','PAUSED','COMPLETED'],default:'PENDING'},
  staffStartedAt:Date,
  staffPausedAt:Date,
  staffResumedAt:Date,
  staffPauseHistory:[{pausedAt:Date,resumedAt:Date,reason:String,category:String,details:String,expectedResumeAt:Date,workCompletedBeforePause:String,partsRequired:String,durationSeconds:Number}],
  staffCompletedAt:Date,
  staffCompletedBy:{type:id,ref:'User'},
  staffCompletedByName:String,
  staffCompletionSummary:String,
  completionProofId:{type:id,ref:'JobProof'},
  messages:[{senderId:id,senderRole:String,message:String,createdAt:{type:Date,default:Date.now}}]
},{timestamps:true});
const faultVehicleSchema=new Schema({complaintId:{type:id,ref:'Complaint'},customerId:{type:id,ref:'User'},franchiseeId:{type:id,ref:'User'},vehicleId:id,vehicleSnapshot:Schema.Types.Mixed,paymentSnapshot:Schema.Types.Mixed,reason:String},{timestamps:true});
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
  chassisNo:          String,
  motorNo:            String,
  insuranceExpiry:   Date,
  odometerKm:        Number,
  seatingCapacity:   Number,
  topSpeedKph:       Number,
  batteryCapacityKwh: Number,
  rangeKm:            Number,
  chargingType:       String,
  pricePerDay:        Number,
  description:        String,
  quantity:           { type: Number, default: 1, min: 0 },
  bikeId:             String,
  bikeIds:            [String],
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

// ── Vehicle Sale (customer purchases an approved vehicle) ──────────────
const vehicleRentalSchema = new Schema({
  customerId:       { type: id, ref: 'User', required: true },
  vehicleId:        { type: id, ref: 'PendingVehicle', required: true },
  vehicleSource:    { type: String, enum: ['PENDING_VEHICLE','COMMAND_VEHICLE'], default: 'PENDING_VEHICLE' },
  bikeId:           { type: String, index: true },
  // Customer location / delivery info (the customer's requested location)
  pincode:          String,
  state:            String,
  district:         String,
  area:             String,
  fullAddress:      String,
  customerLocation: {
    pincode: String,
    state: String,
    district: String,
    area: String,
    fullAddress: String,
  },
  kycSnapshot: { aadharNumber: String, panNumber: String, documents: Schema.Types.Mixed },
  // Exact franchise pickup point selected by the customer/vehicle owner.
  // This is intentionally stored on the booking so it remains available in history.
  franchiseeId:     { type: id, ref: 'User' },
  franchiseeName:   String,
  pickupLocation: {
    name: String,
    address: String,
    city: String,
    district: String,
    state: String,
    pincode: String,
    lat: Number,
    lng: Number,
  },
  // Purchase details
  purchaseDate:     { type: Date, default: Date.now },
  saleQuantity:     { type: Number, default: 1, min: 1 },
  // Legacy field names retained for existing MongoDB documents/API compatibility.
  startDate:        Date,
  endDate:          Date,
  durationDays:     Number,
  rentalPlan:       { type: String, enum: ['DAILY','WEEKLY','MONTHLY','SALE'], default: 'SALE' },
  planUnits:        { type: Number, default: 1, min: 1 },
  vehicleCount:     { type: Number, default: 1, min: 1 },
  rentalRate:       Number,
  securityDeposit:  { type: Number, default: 0 },
  discountPercent:  { type: Number, default: 0 },
  discountAmount:   { type: Number, default: 0 },
  pricePerDay:      Number,
  price:            Number,
  totalAmount:      Number,
  // Razorpay payment fields
  razorpayOrderId:  String,
  razorpayPaymentId:String,
  razorpaySignature:String,
  paymentStatus:    { type: String, enum: ['PENDING','PAID','FAILED'], default: 'PENDING' },
  // Sale lifecycle
  status: {
    type: String,
    enum: ['BOOKED','PAYMENT_DONE','HANDOVER_PENDING','HANDED_OVER','CANCELLED','ACTIVE','COMPLETED'],
    default: 'BOOKED',
  },
  handoverDate:     Date,
  returnDate:       Date,
  pendingExtension: {
    days: Number,
    amount: Number,
    orderId: String,
    createdAt: Date,
    plan: { type: String, enum: ['DAILY','WEEKLY','MONTHLY'] },
    rate: Number,
    unitLabel: String,
  },
  extensionHistory: { type: [Schema.Types.Mixed], default: [] },
  extensionCount: { type: Number, default: 0, min: 0 },
  // Immutable-style booking history snapshots. Each lifecycle/payment change
  // appends a full snapshot so Customer Bookings history remains available.
  bookingHistory:   { type: [Schema.Types.Mixed], default: [] },
  // Vehicle snapshot (so details remain even if vehicle doc changes)
  vehicleSnapshot:  Schema.Types.Mixed,
}, { timestamps: true });

// ── CommandVehicle: vehicles created by Command Center and assigned to fleet operators ──
const commandVehicleSchema = new Schema({
  // Core vehicle details
  category:           String,
  make:               { type: String, required: true },
  model:              { type: String, required: true },
  year:               String,
  color:              String,
  registrationNo:     String,
  chassisNo:          String,
  motorNo:            String,
  insuranceExpiry:    Date,
  odometerKm:         Number,
  batterySoc:         { type: Number, min: 0, max: 100 },
  seatingCapacity:    Number,
  topSpeedKph:        Number,
  batteryCapacityKwh: Number,
  rangeKm:            Number,
  chargingType:       String,
  pricePerDay:        Number,
  quantity:           { type: Number, default: 1 },
  // Unique physical bike identifier. Every individual bike is a separate inventory record.
  bikeId:             { type: String, unique: true, sparse: true, index: true },
  generalServiceIntervalDays: { type: Number, default: 45 },
  nextGeneralServiceAt: Date,
  lastGeneralServiceAt: Date,
  lastGeneralServiceAlertAt: Date,
  rentalPlans: {
    daily: { enabled: { type: Boolean, default: false }, amount: { type: Number, default: 0 } },
    weekly: { enabled: { type: Boolean, default: false }, amount: { type: Number, default: 0 } },
    monthly: { enabled: { type: Boolean, default: false }, amount: { type: Number, default: 0 } },
  },
  securityDeposit: { type: Number, default: 0 },
  discountPercent: { type: Number, default: 0, min: 0, max: 100 },
  fleetInventoryStatus: { type: String, enum: ['SETUP_REQUIRED','DRAFT','ACTIVE','INACTIVE'], default: 'SETUP_REQUIRED' },
  activatedAt: Date,
  activatedBy: { type: id, ref: 'User' },
  description:        String,
  images:             [{ name: String, url: String }],
  // Assignment to fleet operator
  fleetOperatorId:    { type: id, ref: 'User' },
  fleetOperatorName:  String,
  // Physical location state used by Fleet Inventory tabs.
  // AT_FLEET = available at fleet; AT_CUSTOMER = currently handed over.
  fleetLocationStatus: { type: String, enum: ['AT_FLEET','AT_CUSTOMER'], default: 'AT_FLEET', index: true },
  currentCustomerId: { type: id, ref: 'User' },
  currentRentalId: { type: id, ref: 'VehicleRental' },
  fleetOperatorEmail: String,
  assignedAt:         Date,
  assignedBy:         { type: id, ref: 'User' },
  // Status in fleet operator inventory
  status: {
    type: String,
    enum: ['UNASSIGNED', 'ASSIGNED', 'ACTIVE', 'INACTIVE'],
    default: 'UNASSIGNED',
  },
  // Created by
  createdBy:  { type: id, ref: 'User' },
}, { timestamps: true });




// ── Fleet Operator operational models ─────────────────────────────
const customerPaymentSchema = new Schema({
  franchiseeId:{type:id,ref:'User',required:true,index:true},
  customerId:{type:id,ref:'User',required:true,index:true},
  rentalId:{type:id,ref:'VehicleRental',required:true,index:true},
  vehicleId:{type:id,ref:'CommandVehicle'},
  bikeId:{type:String,index:true},
  purchaseDate:Date,
  dueDate:Date,
  invoiceId:{type:id,ref:'Invoice'},
  customerSnapshot:{name:String,email:String,phone:String,address:Schema.Types.Mixed},
  vehicleSnapshot:Schema.Types.Mixed,
  rentalPlan:String,planUnits:Number,rentalRate:Number,securityDeposit:Number,discountPercent:Number,discountAmount:Number,
  paymentType:{type:String,enum:['RENTAL','SALE','EXTENSION'],default:'RENTAL',index:true},
  description:String,extensionCount:{type:Number,default:0},extensionUnits:Number,extensionDueDate:Date,
  amount:{type:Number,required:true},currency:{type:String,default:'INR'},paymentThrough:{type:String,default:'RAZORPAY'},
  razorpayOrderId:{type:String,index:true},razorpayPaymentId:{type:String},razorpaySignature:String,
  status:{type:String,enum:['PAID','REFUNDED','PARTIAL_REFUND'],default:'PAID',index:true},paidAt:{type:Date,default:Date.now},
},{timestamps:true});
customerPaymentSchema.index({razorpayPaymentId:1},{unique:true,sparse:true});

const fleetMaintenanceSchema = new Schema({
  franchiseeId:{type:id,ref:'User',required:true,index:true},
  vehicleId:{type:id,ref:'CommandVehicle',required:true,index:true},
  bikeId:{type:String,index:true},
  type:{type:String,default:'SERVICE'},
  title:String,description:String,
  status:{type:String,enum:['SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED'],default:'SCHEDULED',index:true},
  priority:{type:String,enum:['LOW','NORMAL','HIGH','CRITICAL'],default:'NORMAL'},
  scheduledAt:Date,startedAt:Date,completedAt:Date,nextServiceAt:Date,
  odometerKm:Number,batterySoc:Number,cost:{type:Number,default:0},vendor:String,invoiceUrl:String,
  parts:[{name:String,sku:String,qty:Number,unitPrice:Number}],notes:String,
  // Customer/vendor context captured at the time maintenance is scheduled.
  customerId:{type:id,ref:'User',index:true},
  rentalId:{type:id,ref:'VehicleRental',index:true},
  customerSnapshot:{name:String,email:String,phone:String,address:Schema.Types.Mixed},
  customerLocation:String,
  customerMapsUrl:String,
  vendorLocation:String,
  vendorMapsUrl:String,
  commandAssignedTo:{type:id,ref:'User'},
  // Staff can complete the assigned job without closing the customer service.
  // Command Center performs the final service completion.
  staffStatus:{type:String,enum:['PENDING','IN_PROGRESS','PAUSED','COMPLETED'],default:'PENDING'},
  staffStartedAt:Date,
  staffPausedAt:Date,
  staffPauseReason:String,
  staffResumedAt:Date,
  staffPauseHistory:[{pausedAt:Date,resumedAt:Date,reason:String,category:String,details:String,expectedResumeAt:Date,workCompletedBeforePause:String,partsRequired:String,durationSeconds:Number}],
  staffCompletedAt:Date,
  staffCompletedBy:{type:id,ref:'User'},
  staffCompletedByName:String,
  staffCompletionSummary:String,
  diagnosis:String,rootCause:String,workPerformed:String,solution:String,partsReplaced:[String],testResult:String,finalCondition:String,recommendations:String,nextServiceAt:Date,labourHours:Number,completionNotes:String,
  completedBy:{type:id,ref:'User'},
  completedByName:String,
  completionSummary:String,
  customerFeedback:{rating:{type:Number,min:1,max:5},comment:String,submittedAt:Date},
  commandJobId:{type:id,ref:'Job',index:true},
  createdBy:{type:id,ref:'User'},
},{timestamps:true});

const fleetDocumentSchema = new Schema({
  // Documents are owned by Command Center and shared to the assigned fleet operator.
  franchiseeId:{type:id,ref:'User',index:true},
  shareStatus:{type:String,enum:['DRAFT','SHARED','REVOKED'],default:'DRAFT',index:true},
  issuedToSnapshot:Schema.Types.Mixed,
  vehicleId:{type:id,ref:'CommandVehicle',required:true,index:true},
  bikeId:{type:String,index:true},
  vehicleSnapshot:Schema.Types.Mixed,
  type:{type:String,enum:['RC','INSURANCE','PUC','FITNESS','PERMIT','SERVICE','OTHER'],default:'OTHER'},
  title:String,fileName:String,url:String,number:String,issuedAt:Date,expiresAt:Date,status:{type:String,enum:['ACTIVE','EXPIRED','REVOKED'],default:'ACTIVE'},notes:String,
  uploadedBy:{type:id,ref:'User'},
  sentAt:Date,
  sentBy:{type:id,ref:'User'},
},{timestamps:true});
fleetDocumentSchema.index({franchiseeId:1,vehicleId:1,expiresAt:1});

const handoverInspectionSchema = new Schema({
  franchiseeId:{type:id,ref:'User',required:true,index:true},
  rentalId:{type:id,ref:'VehicleRental',required:true,index:true},
  vehicleId:{type:id,ref:'CommandVehicle',index:true},
  customerId:{type:id,ref:'User',index:true},
  stage:{type:String,enum:['HANDOVER','RETURN'],required:true},
  inspectedAt:{type:Date,default:Date.now},
  odometerKm:Number,batterySoc:Number,damageNotes:String,photos:[{name:String,url:String}],documentsChecked:[String],customerConfirmed:{type:Boolean,default:false},signatureData:String,extraCharges:{type:Number,default:0},notes:String,createdBy:{type:id,ref:'User'},
},{timestamps:true});

const fleetExpenseSchema = new Schema({
  franchiseeId:{type:id,ref:'User',required:true,index:true},
  vehicleId:{type:id,ref:'CommandVehicle',index:true},
  category:{type:String,enum:['MAINTENANCE','FUEL','CHARGING','INSURANCE','TAX','STAFF','OTHER'],default:'OTHER'},
  amount:{type:Number,required:true,min:0},date:{type:Date,default:Date.now},description:String,receiptUrl:String,createdBy:{type:id,ref:'User'},
},{timestamps:true});

// ── Staff Portal v3 feature models ────────────────────────────────
const attendanceSchema = new Schema({
  userId:{type:id,ref:'User',required:true,index:true}, dateKey:{type:String,index:true},
  clockIn:Date, clockOut:Date, breaks:[{startedAt:Date,endedAt:Date}],
  status:{type:String,default:'PRESENT'}, lateMinutes:{type:Number,default:0}, earlyMinutes:{type:Number,default:0},
  location:{lat:Number,lng:Number,accuracy:Number,updatedAt:Date}, dutyArea:String,
},{timestamps:true});
attendanceSchema.index({userId:1,dateKey:1},{unique:true});
const leaveRequestSchema = new Schema({
  userId:{type:id,ref:'User',required:true,index:true}, leaveType:{type:String,default:'CASUAL'},
  startDate:Date,endDate:Date,days:{type:Number,default:1},reason:String,
  status:{type:String,enum:['PENDING','APPROVED','REJECTED','CANCELLED'],default:'PENDING'},
  reviewedBy:{type:id,ref:'User'},reviewedAt:Date,reviewerNote:String,
},{timestamps:true});
const supportTicketSchema = new Schema({
  userId:{type:id,ref:'User',required:true,index:true}, ticketNo:{type:String,unique:true,index:true},
  category:{type:String,default:'GENERAL'},subject:String,description:String,
  priority:{type:String,default:'NORMAL'},status:{type:String,enum:['OPEN','IN_PROGRESS','RESOLVED','CLOSED'],default:'OPEN'},
  messages:[{senderId:id,senderRole:String,message:String,createdAt:{type:Date,default:Date.now}}],
  assignedTo:{type:id,ref:'User'},resolvedAt:Date,
},{timestamps:true});
const staffDocumentSchema = new Schema({userId:{type:id,ref:'User',index:true},title:String,type:String,url:String,fileName:String,status:{type:String,default:'AVAILABLE'},expiresAt:Date},{timestamps:true});
const payslipSchema = new Schema({userId:{type:id,ref:'User',index:true},month:String,gross:Number,earnings:{type:Schema.Types.Mixed,default:{}},deductions:{type:Schema.Types.Mixed,default:{}},net:Number,url:String,status:{type:String,default:'PUBLISHED'},notes:String,createdBy:{type:id,ref:'User'},confirmedAt:Date},{timestamps:true});
const shiftSchema = new Schema({userId:{type:id,ref:'User',index:true},dateKey:String,startTime:String,endTime:String,location:String,hubId:id,status:{type:String,default:'SCHEDULED'}},{timestamps:true});
const recognitionSchema = new Schema({userId:{type:id,ref:'User',index:true},title:String,description:String,badge:String,awardedBy:{type:id,ref:'User'},awardedAt:{type:Date,default:Date.now}},{timestamps:true});
const staffChecklistSchema = new Schema({userId:{type:id,ref:'User',index:true},jobId:{type:id,ref:'Job'},dateKey:String,title:String,items:[{label:String,done:{type:Boolean,default:false}}]},{timestamps:true});
const jobProofSchema = new Schema({jobId:{type:id,ref:'Job',required:true,index:true},userId:{type:id,ref:'User',required:true},bikeId:{type:String,index:true},odometerReading:Number,batteryPercent:Number,photos:[{name:String,url:String}],documents:[{name:String,url:String}],signatureData:String,report:{notes:String,issue:String,diagnosis:String,rootCause:String,workPerformed:String,solution:String,partsReplaced:[String],testResult:String,finalCondition:String,recommendations:String,nextServiceAt:Date,labourHours:Number,completionNotes:String},pauseHistory:Schema.Types.Mixed,submittedAt:Date},{timestamps:true});

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
  WalletRecharge:mongoose.model('WalletRecharge',walletRechargeSchema),
  ChargingSession:mongoose.model('ChargingSession',chargingSchema),
  Telemetry:mongoose.model('Telemetry',telemetrySchema),
  Diagnostic:mongoose.model('Diagnostic',diagnosticSchema),
  Notification:mongoose.model('Notification',notificationSchema),
  Review:mongoose.model('Review',reviewSchema),
  Complaint:mongoose.model('Complaint',complaintSchema),
  FaultVehicle:mongoose.model('FaultVehicle',faultVehicleSchema),
  Asset:mongoose.model('Asset',assetSchema),
  Maintenance:mongoose.model('Maintenance',maintenanceSchema),
  Anomaly:mongoose.model('Anomaly',anomalySchema),
  Financial:mongoose.model('Financial',financialSchema),
  EMI:mongoose.model('EMI',emiSchema),
  Expansion:mongoose.model('Expansion',expansionSchema),
  AuditLog:mongoose.model('AuditLog',auditSchema),
  PendingVehicle:mongoose.model('PendingVehicle',pendingVehicleSchema),
  PendingStaff:mongoose.model('PendingStaff',pendingStaffSchema),
  VehicleRental:mongoose.model('VehicleRental',vehicleRentalSchema),
  CommandVehicle:mongoose.model('CommandVehicle',commandVehicleSchema),
  Attendance:mongoose.model('Attendance',attendanceSchema),
  LeaveRequest:mongoose.model('LeaveRequest',leaveRequestSchema),
  SupportTicket:mongoose.model('SupportTicket',supportTicketSchema),
  StaffDocument:mongoose.model('StaffDocument',staffDocumentSchema),
  Payslip:mongoose.model('Payslip',payslipSchema),
  Shift:mongoose.model('Shift',shiftSchema),
  Recognition:mongoose.model('Recognition',recognitionSchema),
  StaffChecklist:mongoose.model('StaffChecklist',staffChecklistSchema),
  JobProof:mongoose.model('JobProof',jobProofSchema),
  CustomerPayment:mongoose.model('CustomerPayment',customerPaymentSchema),
  FleetMaintenance:mongoose.model('FleetMaintenance',fleetMaintenanceSchema),
  FleetDocument:mongoose.model('FleetDocument',fleetDocumentSchema),
  HandoverInspection:mongoose.model('HandoverInspection',handoverInspectionSchema),
  FleetExpense:mongoose.model('FleetExpense',fleetExpenseSchema),
};
module.exports=models;