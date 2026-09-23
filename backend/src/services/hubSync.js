const { Hub } = require('../models');
const DEFAULT_KML_URL = 'https://www.google.com/maps/d/kml?forcekml=1&mid=1EyUYSeqg-jH4dTRtjCnUSfVRXVF7KK8';
const DEFAULT_INTERVAL_MS = 10 * 60 * 1000;
let running = false, lastRun = null, lastSuccess = null, lastError = null, lastStats = null;
const clean = v => v == null ? '' : String(v).replace(/^\uFEFF/, '').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").trim();
const stripTags = v => clean(String(v || '').replace(/<br\s*\/?>/gi,'\n').replace(/<[^>]*>/g,' '));
function field(map,...names){ for(const name of names){ const k=Object.keys(map).find(x=>x.replace(/^\uFEFF/,'').trim().toLowerCase()===name.trim().toLowerCase()); if(k&&clean(map[k])) return clean(map[k]); } return ''; }
function parseDataBlock(block){ const out={}; const re=/<Data\b[^>]*\bname=["']([^"']+)["'][^>]*>[\s\S]*?<value>([\s\S]*?)<\/value>[\s\S]*?<\/Data>/gi; let m; while((m=re.exec(block))) out[clean(m[1])]=stripTags(m[2]); return out; }
function parseDescription(desc){ const out={}; const text=stripTags(desc).replace(/\r/g,''); for(const line of text.split('\n')){ const i=line.indexOf(':'); if(i>0){const k=clean(line.slice(0,i)),v=clean(line.slice(i+1)); if(k&&v&&!out[k]) out[k]=v;}} return out; }
function num(v){ if(v===''||v==null)return null; const n=Number(String(v).replace(/,/g,'').trim()); return Number.isFinite(n)?n:null; }
function normalizeId(v){ const s=clean(v); if(!s)return ''; const n=Number(s); return Number.isFinite(n)&&Number.isInteger(n)?String(n):s; }
function parseKml(xml){
  const out=[]; const re=/<Placemark\b[^>]*>[\s\S]*?<\/Placemark>/gi; let pm;
  while((pm=re.exec(xml))){ const b=pm[0]; const name=clean((b.match(/<name>([\s\S]*?)<\/name>/i)||[])[1]); const desc=(b.match(/<description>([\s\S]*?)<\/description>/i)||[])[1]||''; const merged={...parseDescription(desc),...parseDataBlock(b)}; const c=clean((b.match(/<coordinates>([\s\S]*?)<\/coordinates>/i)||[])[1]).split(/\s+/)[0].split(','); const lng=num(c[0]),lat=num(c[1]); if(!name||lat===null||lng===null)continue;
    const sourceId=normalizeId(field(merged,'QIS ID/No.','QIS ID','Unique ID','Unique Id','Unique ID2','ID','Source ID')||clean((b.match(/\bid=["']([^"']+)["']/i)||[])[1])); const serial=normalizeId(field(merged,'Sr.No.','Sr.No','S.No.','S.No','Sr No','Serial No')); const city=field(merged,'City')||field(merged,'District'); const area=field(merged,'Area','Locality','Location','Address'); const region=field(merged,'Region','Circle'); const address=field(merged,'Full Address','Address','Location')||[area,city].filter(Boolean).join(', '); const siteType=field(merged,'Site Type','Type'); const qisName=field(merged,'QIS Name'); const energizationDate=field(merged,'Energization Date','Energisation Date'); const swaps=num(field(merged,'Swaps','Swap','No. of Swaps','No of Swaps')); const identity=sourceId ? `${sourceId}|${name}` : `${name}|${lat}|${lng}`; const sourceKey=`SMI-${identity.replace(/[^a-zA-Z0-9_-]+/g,'-')}`;
    out.push({sourceKey,sourceId:sourceId||null,name,code:sourceId?`SMI-${sourceId}`:`SMI-${serial||out.length+1}`,city:city||null,address:address||null,lat,lng,siteType:siteType||null,area:area||null,region:region||null,energizationDate:energizationDate||null,swaps,qisName:qisName||null});
  } return out;
}
async function fetchKml(){ const url=process.env.GOOGLE_MY_MAPS_KML_URL||DEFAULT_KML_URL; const r=await fetch(url,{headers:{'User-Agent':'allEV-HubSync/1.0'},redirect:'follow'}); if(!r.ok)throw new Error(`Google My Maps returned HTTP ${r.status}`); const type=r.headers.get('content-type')||''; const buf=Buffer.from(await r.arrayBuffer()); const text=buf.toString('utf8'); if(/^PK/.test(text))throw new Error('Google My Maps returned KMZ/ZIP. Set GOOGLE_MY_MAPS_KML_URL to a KML/XML export endpoint.'); if(!/<Placemark\b/i.test(text))throw new Error(`Google My Maps response did not contain KML placemarks (content-type: ${type||'unknown'})`); return parseKml(text); }
async function syncGoogleMapHubs(){
  if(running)return {ok:false,skipped:true,stats:lastStats};
  running=true; lastRun=new Date();
  try{
    const source=await fetchKml();
    if(!source.length)throw new Error('Google My Maps export contained zero valid locations; existing hub data was left untouched.');

    const incomingIds=new Set(source.map(h=>h.sourceId).filter(Boolean));
    const existing=await Hub.find({sourceMap:'SM Infrastructure'}).select('_id sourceKey sourceId name').lean();
    const byId=new Map();
    for(const h of existing){ if(h.sourceId){ const key=String(h.sourceId); if(!byId.has(key))byId.set(key,[]); byId.get(key).push(h); } }
    const matched=new Set();
    const ops=[];
    let added=0, updated=0;

    for(const h of source){
      let old=null;
      const candidates=h.sourceId ? (byId.get(String(h.sourceId))||[]) : [];
      if(candidates.length===1) old=candidates[0];
      else if(candidates.length>1) old=candidates.find(x=>String(x.name||'').trim().toLowerCase()===String(h.name||'').trim().toLowerCase()) || candidates[0];
      if(old){
        matched.add(String(old._id)); updated++;
        ops.push({updateOne:{filter:{_id:old._id},update:{$set:{sourceKey:h.sourceKey,name:h.name,code:h.code,city:h.city,address:h.address,lat:h.lat,lng:h.lng,sourceId:h.sourceId,sourceMap:'SM Infrastructure',siteType:h.siteType,area:h.area,region:h.region,energizationDate:h.energizationDate,swaps:h.swaps,qisName:h.qisName}}}});
      }else{
        added++;
        ops.push({updateOne:{filter:{sourceKey:h.sourceKey},update:{$set:{sourceKey:h.sourceKey,name:h.name,code:h.code,city:h.city,address:h.address,lat:h.lat,lng:h.lng,sourceId:h.sourceId,sourceMap:'SM Infrastructure',siteType:h.siteType,area:h.area,region:h.region,energizationDate:h.energizationDate,swaps:h.swaps,qisName:h.qisName},$setOnInsert:{status:'ONLINE',chargerCount:0}},upsert:true}});
      }
    }
    if(ops.length)await Hub.bulkWrite(ops,{ordered:false});

    const stale=existing.filter(h=>!matched.has(String(h._id)) && (!h.sourceId || !incomingIds.has(String(h.sourceId)))).map(h=>h._id);
    if(stale.length)await Hub.deleteMany({_id:{$in:stale},sourceMap:'SM Infrastructure'});

    lastStats={sourceCount:source.length,added,updated,removed:stale.length,syncedAt:new Date().toISOString()};
    lastSuccess=new Date(); lastError=null;
    console.log(`[HubSync] Google My Maps synced: ${source.length} (+${added}, ~${updated}, -${stale.length})`);
    return {ok:true,stats:lastStats};
  }catch(e){
    lastError={message:e.message,at:new Date().toISOString()};
    console.error(`[HubSync] ${e.message}`);
    return {ok:false,error:e.message,stats:lastStats};
  }finally{running=false;}
}

function startHubSyncScheduler(){ if(String(process.env.GOOGLE_MY_MAPS_SYNC_ENABLED||'true').toLowerCase()==='false')return console.log('[HubSync] Disabled'); const interval=Math.max(60000,Number(process.env.GOOGLE_MY_MAPS_SYNC_INTERVAL_MS||DEFAULT_INTERVAL_MS)); syncGoogleMapHubs(); setInterval(syncGoogleMapHubs,interval); console.log(`[HubSync] Automatic Google My Maps sync enabled every ${Math.round(interval/60000)} minutes`); }
function getHubSyncStatus(){return {running,lastRun,lastSuccess,lastError,lastStats};}
module.exports={syncGoogleMapHubs,startHubSyncScheduler,getHubSyncStatus};
