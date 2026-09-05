const mongoose=require('mongoose');async function connectDB(){await mongoose.connect(process.env.MONGO_URI,{serverSelectionTimeoutMS:5000});console.log('MongoDB connected')}module.exports=connectDB;
