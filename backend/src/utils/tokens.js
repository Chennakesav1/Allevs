const jwt=require('jsonwebtoken');
// Access token: 8 hours — users stay logged in for a full session without needing a silent refresh.
// Refresh token: 7 days — allows silent re-login after the browser is closed and reopened.
const access=(u)=>jwt.sign({id:u._id,role:u.role},process.env.JWT_ACCESS_SECRET,{expiresIn:'8h'});
const refresh=(u)=>jwt.sign({id:u._id,role:u.role},process.env.JWT_REFRESH_SECRET,{expiresIn:'7d'});
module.exports={access,refresh};