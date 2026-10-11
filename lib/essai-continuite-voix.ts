import {ouvrirRepliques} from "./flux-repliques";
import {continuiteVoix as etat} from "./continuite-voix-etat";
/** WAV clip duration after the same conservative edge trim as the web player. */
function dureeParlee(base64:string){
 const b=Buffer.from(base64,"base64");let rate=0,channels=0,bits=0,format=0,data:Buffer|undefined;
 if(b.toString("ascii",0,4)!=="RIFF"||b.toString("ascii",8,12)!=="WAVE")throw Error("wav");
 for(let p=12;p+8<=b.length;){const n=b.readUInt32LE(p+4),kind=b.toString("ascii",p,p+4);if(p+8+n>b.length)throw Error("wav");if(kind==="fmt "){format=b.readUInt16LE(p+8);channels=b.readUInt16LE(p+10);rate=b.readUInt32LE(p+12);bits=b.readUInt16LE(p+22);}if(kind==="data")data=b.subarray(p+8,p+8+n);p+=8+n+(n%2);}
 if(!data||format!==1||bits!==16||!rate||!channels)throw Error("pcm");
 const step=2*channels,length=Math.floor(data.length/step);let a=0,z=length;
 while(a<z&&Math.abs(data.readInt16LE(a*step))/32768<.006)a++;
 while(z>a&&Math.abs(data.readInt16LE((z-1)*step))/32768<.006)z--;
 return (Math.min(length,z+rate*.025)-Math.max(0,a-rate*.025))/rate;
}
export function verifierContinuiteVoix(){return etat.essai??=(async()=>{
 const cases=[];
 try{
  for(const texte of ["Dañu bëgg ma def lu ma bëggul.","Bul jël suspicion comme preuve."]){
   const passes=[];
   for(let essai=0;essai<2;essai++){
    const debut=Date.now();const r=await fetch("https://app.khalam.app/api/chatterbox-test/bia",{method:"POST",headers:{"content-type":"application/json","x-chatterbox-test-key":process.env.CHATTERBOX_TEST_KEY||""},body:JSON.stringify({texte,voice:"female",langue:"wo",lecture_fidele:true,continu:true}),signal:AbortSignal.timeout(40000)});
    const flux=ouvrirRepliques(r,()=>{});let total=1,fin=0,gap=0,first=0,hits=0;const arrivals:number[]=[],durations:number[]=[];
    for(let i=0;i<total;i++){
     const clip=await flux.morceau(i) as Awaited<ReturnType<typeof flux.morceau>>&{audio_en_cache?:boolean};
     const t=Date.now()-debut;arrivals.push(t);total=clip.parties;if(!i)first=t;
     if(i)gap=Math.max(gap,Math.max(0,t+60-fin));
     const duration=dureeParlee(clip.audio!);durations.push(duration);fin=Math.max(fin,t+60)+1000*duration;if(clip.audio_en_cache)hits++;
    }
    const son=(total>1&&durations[0]<1.6?arrivals[1]:arrivals[0])+60;
    fin=son+1000*durations[0];gap=0;
    for(let i=1;i<total;i++){gap=Math.max(gap,Math.max(0,arrivals[i]+60-fin));fin=Math.max(fin,arrivals[i]+60)+1000*durations[i];}
    passes.push({premier_morceau_ms:first,premier_son_estime_ms:son,parties:total,arrivees_ms:arrivals,couture_estimee_max_ms:Math.round(gap),cache:hits});
   }
   cases.push({type:cases.length?"wolof_francais":"wolof",passes});
  }
  return etat.diagnostic={quand:new Date().toISOString(),statut:"termine",mesure:"réception HTTP et simulation du calendrier audio ; écoute navigateur non mesurée",cas:cases};
 }catch{return etat.diagnostic={quand:new Date().toISOString(),statut:"echec",cas:cases};}
})();}
