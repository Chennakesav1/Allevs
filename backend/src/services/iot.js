const EventEmitter=require('events'); const bus=new EventEmitter();
let mqttClient=null;
function start(io){if(!process.env.MQTT_URL)return {mode:'mock'}; try{const mqtt=require('mqtt');mqttClient=mqtt.connect(process.env.MQTT_URL,{username:process.env.MQTT_USERNAME,password:process.env.MQTT_PASSWORD});mqttClient.on('connect',()=>mqttClient.subscribe(process.env.MQTT_TOPIC||'ev/+/telemetry'));mqttClient.on('message',(topic,payload)=>{try{const data=JSON.parse(payload.toString());bus.emit('telemetry',data);io.emit('telemetry:update',data)}catch(e){}});return {mode:'mqtt'}}catch(e){console.error('MQTT unavailable',e.message);return {mode:'mock'}}}
function publish(topic,data){if(mqttClient)mqttClient.publish(topic,JSON.stringify(data)); else bus.emit('telemetry',data)}
module.exports={start,publish,bus};
