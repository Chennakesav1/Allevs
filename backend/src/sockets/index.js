module.exports=(io)=>{io.on('connection',socket=>{socket.on('join:job',id=>socket.join(`job:${id}`));socket.on('join:hub',id=>socket.join(`hub:${id}`));});};
