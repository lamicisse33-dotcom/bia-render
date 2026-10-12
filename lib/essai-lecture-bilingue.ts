import {preparerPassagesKhalam} from './passages-khalam';
import {assemblerSonsCourants} from './assembler-sons-courants';
import {transcrire} from './ecoute';
const g=globalThis as typeof globalThis&{biaEssaiLectureBilingue?:{rapport:any;travail?:Promise<void>}};
const etat=g.biaEssaiLectureBilingue??={rapport:{statut:'non_lance',cas:[]}};
export const resumeLectureBilingue=()=>etat.rapport;
/** Fixed, finite diagnostic. ASR is evidence to review, never an acoustic guarantee. */
export function lancerEssaiLectureBilingue(){
 if(etat.travail)return etat.rapport;
 etat.rapport={statut:'en_cours',quand:new Date().toISOString(),mesure:'Synthèse réelle et transcription indicative ; écoute humaine non vérifiée',cas:[]};
 etat.travail=(async()=>{
  const {POST}=await import('../app/api/chatterbox-test/bia/route');const {NextRequest}=await import('next/server');
  const phrases=[
   ['wo','Dañu bëgg ma def lu ma bëggul.'],
   ['wo','Xale yi dañuy xalaat ci seen xarit.'],
   ['wo','Bul jël décision ci suspicion rekk.'],
   ['wo','Ndax message bi leer na ci li mu signifier, wala dafa am bennene explication.'],
   ['fr','Explique cet exercice avec un exemple.'],
  ] as const;
  try{
   for(const [langue,texte]of phrases){
    const plan=await preparerPassagesKhalam(texte,langue,false,true);
    const clips:ArrayBuffer[]=[];const profils:string[]=[];let total=1,empreinte:string|undefined;
    const debut=Date.now();const arrivees:number[]=[];
    for(let partie=0;partie<total;partie++){
     const r=await POST(new NextRequest('https://app.khalam.app/api/chatterbox-test/bia',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({texte,langue,voice:'female',lecture_fidele:true,partie,empreinte})}));
     const d=await r.json();
     if(!r.ok||!d.audio||d.partie!==partie||!Number.isInteger(d.parties)||d.parties<1||d.parties>24||(partie>0&&(d.empreinte!==empreinte||total!==d.parties)))throw Error(d.error||'synthese_incomplete');
     total=d.parties;empreinte=d.empreinte;arrivees.push(Date.now()-debut);profils.push(d.langue);
     const b=Buffer.from(d.audio,'base64');clips.push(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
    }
    const audio=assemblerSonsCourants(clips,60);
    const cas:any={texte,plan,profils,parties:total,synthese_ms:Date.now()-debut,arrivees_ms:arrivees,duree_audio_s:audio.secondes,texte_transmis:plan.map(p=>p.texte).join(' ')};
    etat.rapport.cas.push(cas);
    try{const r=await transcrire(new Blob([audio.wav],{type:'audio/wav'}),'diagnostic-lecture.wav',langue);cas.transcription_indicative=r.texte;cas.oreille=r.moteur;}
    catch{cas.transcription_erreur='Comparaison automatique indisponible';}
   }
   etat.rapport.statut='termine';
  }catch(e){etat.rapport.statut='echec';etat.rapport.erreur=e instanceof Error?e.message:'diagnostic';}
  etat.rapport.fini=new Date().toISOString();
 })();
 return etat.rapport;
}
