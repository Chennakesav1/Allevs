const crypto=require('crypto');
function razorpaySignature(orderId,paymentId,secret){return crypto.createHmac('sha256',secret).update(`${orderId}|${paymentId}`).digest('hex')}
function enabled(){return !!(process.env.RAZORPAY_KEY_ID&&process.env.RAZORPAY_KEY_SECRET)}
module.exports={razorpaySignature,enabled};
