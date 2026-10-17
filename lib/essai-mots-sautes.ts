import {assemblerSonsCourants} from './assembler-sons-courants';
import {preparerPassagesKhalam} from './passages-khalam';
import {chezOreilleLocale} from './ecoute-locale';
const PHRASE='Dañu bëgg ma def lu ma bëggul.';
const g=globalThis as typeof globalThis&{biaMotsSautes?:{rapport:any;audios:Array<{seed:number;audio:string;nom?:string}>;travail?:Promise<void>}};
const etat=g.biaMotsSautes??={rapport:null,audios:[]};
export const resumeMotsSautes=()=>etat.rapport;
export const audiosMotsSautes=()=>({rapport:etat.rapport,audios:etat.audios});
const normal=(s:string)=>s.normalize('NFC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
/** Fixed three-take diagnostic. No rewrite, no learned-rule change, no automatic promotion. */
export function verifierMotsSautes(){return etat.travail??=(async()=>{
 const r:any={statut:'en_cours',phrase:PHRASE,date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),mesure:'Trois prises complètes du texte exact. Transcription automatique indicative, validation humaine requise.',prises:[]};etat.rapport=r;
 try{
  const plan=await preparerPassagesKhalam(PHRASE,'wo');r.plan=plan;r.texte_transmis=plan.map(p=>p.texte).join(' ');r.texte_identique=normal(r.texte_transmis)===normal(PHRASE);
  // Do not generate an invented substitute if preparation altered this sentence.
  if(!r.texte_identique||plan.length!==1||plan[0].langue!=='wo'){r.statut='preparation_a_verifier';return;}
  const {POST}=await import('../app/api/chatterbox-test/route');const {NextRequest}=await import('next/server');
  for(const seed of [913,914,915]){
   const debut=Date.now();const p:any={seed};r.prises.push(p);
   try{
    const response=await POST(new NextRequest('https://app.khalam.app/api/chatterbox-test',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({input:{text:plan[0].texte,language:'wo',voice:'female',seed,preserve_segment:true}})}));
    const d=await response.json();if(!response.ok||!d.output?.audio_base64)throw Error('generation_HTTP_'+response.status);
    p.generation_ms=d.output.generation_ms;p.duree_secondes=d.output.duration_seconds;p.reception_ms=Date.now()-debut;
    etat.audios.push({seed,audio:d.output.audio_base64});
    // Sequential ASR only after TTS completed; never speculative competing transcriptions.
    const transcription=await chezOreilleLocale(new Blob([Buffer.from(d.output.audio_base64,'base64')],{type:'audio/wav'}));
    p.transcription_indicative=transcription?.texte??null;p.correspondance_indicative=transcription?normal(transcription.texte)===normal(PHRASE):null;
   }catch(e){p.erreur=/^generation_HTTP_\d+$/.test((e as Error).message)?(e as Error).message:'essai_indisponible';}
  }
  if(!r.prises.some((p:any)=>p.correspondance_indicative===true)){
   // Preserve word order exactly; compare two bounded groupings only in this diagnostic.
   for(const [id,groupes] of [[916,['Dañu bëgg ma def','lu ma bëggul.']],[917,['Dañu bëgg ma','def lu ma bëggul.']]] as const){
    const p:any={seed:913,essai:id,groupes:[...groupes]};r.prises.push(p);const clips:ArrayBuffer[]=[];const debut=Date.now();
    try{
     if(normal(groupes.join(' '))!==normal(PHRASE))throw Error('texte_altere');
     for(const text of groupes){
      const response=await POST(new NextRequest('https://app.khalam.app/api/chatterbox-test',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({input:{text,language:'wo',voice:'female',seed:913,preserve_segment:true}})}));
      const d=await response.json();if(!response.ok||!d.output?.audio_base64)throw Error('generation_HTTP_'+response.status);
      const b=Buffer.from(d.output.audio_base64,'base64');clips.push(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
     }
     const joint=assemblerSonsCourants(clips,60);p.duree_secondes=joint.secondes;p.reception_ms=Date.now()-debut;
     etat.audios.push({seed:id,nom:id===916?'Deux groupes : pause après « def »':'Deux groupes : pause avant « def »',audio:Buffer.from(joint.wav).toString('base64')});
     const transcription=await chezOreilleLocale(new Blob([joint.wav],{type:'audio/wav'}));p.transcription_indicative=transcription?.texte??null;p.correspondance_indicative=transcription?normal(transcription.texte)===normal(PHRASE):null;
    }catch{p.erreur='essai_groupes_indisponible';}
   }
  }
  r.statut='termine';r.fin=new Date().toISOString();
 }catch{r.statut='echec_preparation';}
})();}
