const fs=require('fs');const path=require('path');const root=path.resolve(process.env.UPLOAD_DIR||'uploads');fs.mkdirSync(root,{recursive:true});
function localSave(file){return `/uploads/${file.filename}`}
module.exports={root,localSave};
