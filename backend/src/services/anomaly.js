const {Anomaly}=require('../models');
async function detectCharging({hubId,chargerId,expected,actual}){const deviation=expected?((actual-expected)/expected)*100:0;if(Math.abs(deviation)>=30)return Anomaly.create({type:'ENERGY_DEVIATION',severity:Math.abs(deviation)>=60?'HIGH':'MEDIUM',hubId,chargerId,expected,actual,deviation,details:{rule:'energy deviation > 30%'}});}
async function detectPaymentFailures({userId,count}){if(count>=3)return Anomaly.create({type:'REPEATED_FAILED_PAYMENTS',severity:'MEDIUM',userId,details:{failedAttempts:count}})}
module.exports={detectCharging,detectPaymentFailures};
