import {randomUUID} from 'node:crypto';
import {lexiqueConfig} from './lexique';
import {lireExtraitAudio,type ExtraitCorpus} from './corpus';
import {salutationReconnue} from './salutations-dialogue';
import {teteDeLaReponse} from './diffusion';
import {ouvrirRepliques} from './flux-repliques';
const g=globalThis as typeof globalThis&{biaLatencePipeline?:{rapport:any;travail?:Promise<void>}};
const etat=g.biaLatencePipeline??={rapport:null};
export const resumeLatencePipeline=()=>etat.rapport;
/** Bounded read-only replay. No transcript, private recording URL or key is exported. */
export function verifierLatencePipeline(){return etat.travail??=(async()=>{
 const rapport:any={date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),mesure:'Appels réels : enregistrement archivé, ASR, réponse et premier audio HTTP. Hors microphone et lecture navigateur.',etape:'preparation',lecture_navigateur_mesuree:false};etat.rapport=rapport;
 const base='https://app.khalam.app',headers={'x-bia-code':process.env.BIA_CODE_MAITRE||''};
 try{
  const table=process.env.SUPABASE_TABLE_CORPUS||'khalam_corpus';
  const r=await fetch(`${lexiqueConfig.url}/rest/v1/${table}?select=cle,chemin,entendu,verifie,langue,type_audio&order=cle.desc&limit=200`,{headers:{apikey:lexiqueConfig.cle,Authorization:`Bearer ${lexiqueConfig.cle}`},signal:AbortSignal.timeout(8000),cache:'no-store'});
  if(!r.ok)throw Error('corpus_HTTP_'+r.status);const lignes=await r.json() as ExtraitCorpus[];
  const exemple=lignes.find(e=>salutationReconnue(e.verifie||e.entendu));
  if(exemple){
   const source=await lireExtraitAudio(exemple.chemin);if(!source)throw Error('enregistrement_absent');const audio=await source.blob(),bytes=new Uint8Array(await audio.arrayBuffer()),tour=randomUUID(),coupe=Math.floor(bytes.length/2);
   rapport.etape='depot';const debut=Date.now();
   const uploads=await Promise.all([bytes.slice(0,coupe),bytes.slice(coupe)].map(async(b,i)=>{const f=new FormData();f.append('tour',tour);f.append('indice',String(i));f.append('type',audio.type);f.append('nom',exemple.chemin.split('/').at(-1)||'archive.wav');f.append('morceau',new Blob([b],{type:audio.type}));return (await fetch(base+'/api/ecouter/morceau',{method:'POST',headers,body:f,signal:AbortSignal.timeout(10000)})).status;}));
   rapport.depot={morceaux:2,statuts:uploads,ms:Date.now()-debut};
   const f=new FormData();f.append('tour',tour);f.append('total','2');f.append('depot_confirme','1');f.append('diagnostic','1');f.append('indice_langue','wo');
   rapport.etape='transcription';let t=Date.now(),rr=await fetch(base+'/api/ecouter',{method:'POST',headers,body:f,signal:AbortSignal.timeout(30000)}),d=await rr.json();
   rapport.recousu={statut:rr.status,renvoyer:d.renvoyer===true,ms:Date.now()-t};
   if(d.renvoyer===true){const entier=new FormData();entier.append('audio',audio,exemple.chemin.split('/').at(-1)||'archive.wav');entier.append('tour',tour);entier.append('diagnostic','1');entier.append('indice_langue','wo');t=Date.now();rr=await fetch(base+'/api/ecouter',{method:'POST',headers,body:entier,signal:AbortSignal.timeout(30000)});d=await rr.json();}
   rapport.transcription={statut:rr.status,ms:Date.now()-t,chronometrage:d.chronometrage||null,salutation_reconnue:!!salutationReconnue(String(d.texte||'')),date_extrait:exemple.cle.split('/')[0]};
  }else rapport.transcription={enregistrement_salutation_disponible:false};
  rapport.etape='cerveau_voix';const debut=Date.now();
  const response=await fetch(base+'/api/chat',{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({message:'Explique en une phrase courte pourquoi le ciel est bleu. Réponds en français.',history:[],diffuse:true,apprentissageTest:true}),signal:AbortSignal.timeout(30000)});
  const reader=response.body!.getReader(),decoder=new TextDecoder();let tampon='',texte='',tete='',premierTexte:number|null=null,premierePhrase:number|null=null,finTexte=0,voix:Promise<any>|undefined;
  for(;;){const v=await reader.read();if(v.done)break;tampon+=decoder.decode(v.value,{stream:true});let k;
   while((k=tampon.indexOf('\n\n'))>=0){const paquet=tampon.slice(0,k);tampon=tampon.slice(k+2);const event=paquet.match(/^event:\s*(.+)$/m)?.[1],json=paquet.match(/^data:\s*(.+)$/m)?.[1];if(!json)continue;const d=JSON.parse(json);
    if(event==='texte'){premierTexte??=Date.now()-debut;texte+=d.morceau||'';if(!tete&&(tete=teteDeLaReponse(texte))){premierePhrase=Date.now()-debut;
     voix=(async()=>{const t=Date.now();try{const r=await fetch(base+'/api/chatterbox-test/bia',{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({texte:tete,langue:'fr',voice:'female',lecture_fidele:false,continu:true}),signal:AbortSignal.timeout(25000)});if(!r.ok)return {statut:r.status,audio_recu:false};const flux=ouvrirRepliques(r,()=>{}),first=await flux.morceau(0);return {audio_recu:!!first.audio,premier_audio_ms:Date.now()-t,depuis_demande_ms:Date.now()-debut};}catch{return {audio_recu:false,delai_ms:Date.now()-t};}})();
    }}if(event==='fin')finTexte=Date.now()-debut;
   }
  }
  rapport.conversation={statut:response.status,premier_texte_ms:premierTexte,premiere_phrase_ms:premierePhrase,texte_complet_ms:finTexte,voix:voix?await voix:null};rapport.etape='termine';
 }catch(e){rapport.etape='echec';rapport.erreur=String((e as Error).message).replace(/https?:\/\/\S+/g,'service').slice(0,140);}
 rapport.fin=new Date().toISOString();
})();}
