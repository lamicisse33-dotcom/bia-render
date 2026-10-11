import type {ResultatWeb} from "./actions-internet";
const normal=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
export const demandeMeteo=(q:string)=>/\b(meteo|pluie|pleuvoir|temperature|temps qu.il|taw|il fera|il fait chaud)\b/.test(normal(q));
export const demandeInfos=(q:string)=>/\b(actualites?|infos?|nouvelles|xibaar|journal)\b/.test(normal(q));
const villes:Record<string,[number,number]>={dakar:[14.7167,-17.4677],thies:[14.7886,-16.926],saint_louis:[16.0179,-16.4896],kaolack:[14.1519,-16.0726],ziguinchor:[12.5833,-16.2667],touba:[14.85,-15.8833],tambacounda:[13.7707,-13.6673],kolda:[12.8833,-14.95]};
const cache=new Map<string,{until:number;data:ResultatWeb[]}>();
const pending=new Map<string,Promise<ResultatWeb[]>>();
async function cached(key:string,load:()=>Promise<{data:ResultatWeb[];until:number}>){
 const old=cache.get(key);if(old&&old.until>Date.now())return old.data;
 const running=pending.get(key);if(running)return running;
 const p=load().then(x=>{if(cache.size>100)cache.delete(cache.keys().next().value!);cache.set(key,x);return x.data;}).finally(()=>pending.delete(key));pending.set(key,p);return p;
}
export async function meteoPublique(q:string):Promise<ResultatWeb[]>{
 const n=normal(q);const city=Object.keys(villes).find(v=>n.includes(v.replace("_"," ")));
 // Never silently substitute Dakar for a different requested location.
 if(!city)return [{titre:"Précision nécessaire",url:"https://api.met.no/",extrait:"Demande à l’utilisateur dans quelle ville il souhaite la météo. Villes actuellement prises en charge : Dakar, Thiès, Saint-Louis, Kaolack, Ziguinchor, Touba, Tambacounda et Kolda."}];
 return cached("meteo:"+city,async()=>{
  const [lat,lon]=villes[city];const url="https://api.met.no/weatherapi/locationforecast/2.0/compact?lat="+lat+"&lon="+lon;
  const r=await fetch(url,{headers:{"User-Agent":"KhalamBIA/1.0 https://khalam.app"},cache:"no-store",signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error("Météo "+r.status);
  const d=await r.json();const now=Date.now();
  const periods=d.properties.timeseries.filter((x:any)=>Date.parse(x.time)>=now-3600000).slice(0,72).map((x:any)=>({heure:x.time,temperature_c:x.data.instant.details.air_temperature,vent_ms:x.data.instant.details.wind_speed,precipitations_mm:x.data.next_1_hours?.details?.precipitation_amount,condition:x.data.next_1_hours?.summary?.symbol_code}));
  const expires=Date.parse(r.headers.get("expires")||"");
  return {until:Number.isFinite(expires)?Math.max(now+60000,expires):now+1800000,data:[{titre:"Prévisions météo — "+city.replace("_"," "),url:"https://www.met.no/",extrait:JSON.stringify({source:"MET Norway, CC BY 4.0",mise_a_jour:d.properties.meta.updated_at,ville:city,fuseau:"Africa/Dakar, UTC",nature:"Prévisions du modèle, pas des observations mesurées. Ne pas présenter comme certitude.",periodes:periods})}]};
 });
}
const decode=(s:string)=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/<[^>]*>/g,"").trim();
export async function infosPubliques(q:string):Promise<ResultatWeb[]>{
 const data=await cached("bbc-afrique",async()=>{
  const r=await fetch("https://feeds.bbci.co.uk/afrique/rss.xml",{cache:"no-store",signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error("Actualités "+r.status);
  const xml=await r.text();const tag=(x:string,t:string)=>decode(x.match(new RegExp("<"+t+"(?:\\s[^>]*)?>([\\s\\S]*?)</"+t+">","i"))?.[1]||"");
  const data=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].filter(m=>{const t=Date.parse(tag(m[1],"pubDate"));return Number.isFinite(t)&&t>=Date.now()-7*86400000&&t<=Date.now()+3600000;}).sort((a,b)=>Date.parse(tag(b[1],"pubDate"))-Date.parse(tag(a[1],"pubDate"))).slice(0,30).map(m=>({titre:tag(m[1],"title"),url:tag(m[1],"link"),extrait:"BBC Afrique — publié "+tag(m[1],"pubDate")+". Titre de flux uniquement : "+tag(m[1],"title")+". Ne pas inventer le contenu de l’article."})).filter(x=>/^https:\/\/www.bbc\.(com|co.uk)\//.test(x.url));
  return {data,until:Date.now()+600000};
 });
 if(/senegal|dakar/.test(normal(q)))return data.filter(x=>/senegal|dakar/.test(normal(x.titre))).slice(0,5);
 return data.slice(0,5);
}
