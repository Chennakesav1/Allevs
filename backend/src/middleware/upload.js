const multer=require('multer');const path=require('path');const fs=require('fs');const dir=path.resolve(process.env.UPLOAD_DIR||'uploads');fs.mkdirSync(dir,{recursive:true});
const storage=multer.diskStorage({destination:dir,filename:(req,file,cb)=>cb(null,`${Date.now()}-${Math.round(Math.random()*1e9)}${path.extname(file.originalname)}`)});
module.exports=multer({storage,limits:{fileSize:10*1024*1024}});
