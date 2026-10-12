import {bordsAudio} from './bords-audio';
import {lireWav} from './mp3';
import {assemblerSonsCourants} from './assembler-sons-courants';
const g=globalThis as typeof globalThis&{biaIntegriteAudio?:{rapport?:unknown;essai?:Promise<unknown>}};
const etat=g.biaIntegriteAudio??={};
export const resumeIntegriteAudio=()=>({politique:'silence_numerique_seulement_v1',diagnostic:etat.rapport??null});
/** A bounded real synthesis check, not an ASR verdict or a browser listening test. */
export function verifierIntegriteAudio(){return etat.essai??=(async()=>{
 const cas:Array<Record<string,unknown>>=[];
 try{
  const {POST}=await import('../app/api/chatterbox-test/bia/route');
  const {NextRequest}=await import('next/server');
  for(const texte of ['Dañu bëgg ma def lu ma bëggul.','Bul jël suspicion comme preuve.']){
   let total=1,empreinte:string|undefined,anciens=0,nouveaux=0,echantillons=0;
   const clips:ArrayBuffer[]=[];
   for(let partie=0;partie<total;partie++){
    const r=await POST(new NextRequest('https://app.khalam.app/api/chatterbox-test/bia',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({texte,langue:'wo',voice:'female',lecture_fidele:true,partie,empreinte})}));
    const d=await r.json();
    if(!r.ok||!d.audio||d.partie!==partie||!Number.isInteger(d.parties)||d.parties<1||d.parties>12||(partie>0&&(d.empreinte!==empreinte||d.parties!==total)))throw Error('synthese_incomplete');
    total=d.parties;empreinte=d.empreinte;
    const b=Buffer.from(d.audio,'base64'),clip=b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);
    clips.push(clip);const w=lireWav(clip);if(w.canaux!==1)throw Error('format_audio');
    let a=0,z=w.pcm.length;while(a<z&&Math.abs(w.pcm[a])<197)a++;while(z>a&&Math.abs(w.pcm[z-1])<197)z--;
    const marge=Math.round(w.hz*.025);a=Math.max(0,a-marge);z=Math.min(w.pcm.length,z+marge);
    const bord=bordsAudio([w.pcm],w.hz);
    for(let i=0;i<w.pcm.length;i++)if(w.pcm[i]!==0){echantillons++;if(i<a||i>=z)anciens++;if(i<bord.debut||i>=bord.fin)nouveaux++;}
   }
   const assembled=lireWav(assemblerSonsCourants(clips).wav);
   const gardes=assembled.pcm.reduce((n,s)=>n+Number(s!==0),0);
   if(nouveaux||gardes!==echantillons)throw Error('echantillons_perdus');
   cas.push({type:cas.length?'wolof_francais':'wolof',parties:total,echantillons_non_nuls:echantillons,ancien_rognage_non_nuls_supprimes:anciens,nouveau_rognage_non_nuls_supprimes:nouveaux,assemblage_non_nuls_conserves:gardes});
  }
  return etat.rapport={quand:new Date().toISOString(),statut:'termine',mesure:'Conservation du signal généré ; mots prononcés et écoute navigateur non vérifiés',cas};
 }catch(e){return etat.rapport={quand:new Date().toISOString(),statut:'echec',motif:e instanceof Error?e.message:'verification',cas};}
})();}
