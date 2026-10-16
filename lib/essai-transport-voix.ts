import {ouvrirRepliques} from './flux-repliques';
import {preparerEcoute} from './preparer-ecoute';
import {createHash} from 'node:crypto';
import {chezOreilleLocale} from './ecoute-locale';
const g=globalThis as typeof globalThis&{biaTransportVoix?:{rapport:unknown;travail?:Promise<void>}};
const etat=g.biaTransportVoix??={rapport:null};
export const resumeTransportVoix=()=>etat.rapport;
function pcmWav(wav:Buffer){
 if(wav.toString('ascii',0,4)!=='RIFF'||wav.toString('ascii',8,12)!=='WAVE')throw Error('wav_invalide');
 let fmt:Buffer|undefined,pcm:Buffer|undefined;
 for(let p=12;p+8<=wav.length;){const n=wav.readUInt32LE(p+4);if(p+8+n>wav.length)throw Error('wav_incomplet');const cle=wav.toString('ascii',p,p+4);if(cle==='fmt ')fmt=wav.subarray(p+8,p+8+n);if(cle==='data')pcm=wav.subarray(p+8,p+8+n);p+=8+n+n%2;}
 if(!fmt||!pcm||fmt.readUInt16LE(0)!==1||fmt.readUInt16LE(2)!==1||fmt.readUInt32LE(4)!==24000||fmt.readUInt16LE(14)!==16)throw Error('format_inattendu');
 return pcm;
}
export function reunirWav(frames:Buffer[]){
 const pcm=Buffer.concat(frames.map(pcmWav)),header=Buffer.alloc(44);
 header.write('RIFF');header.writeUInt32LE(36+pcm.length,4);header.write('WAVE',8);header.write('fmt ',12);header.writeUInt32LE(16,16);header.writeUInt16LE(1,20);header.writeUInt16LE(1,22);header.writeUInt32LE(24000,24);header.writeUInt32LE(48000,28);header.writeUInt16LE(2,32);header.writeUInt16LE(16,34);header.write('data',36);header.writeUInt32LE(pcm.length,40);
 return Buffer.concat([header,pcm]);
}
const normal=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
/** Fixed same-text transport comparisons. No public paid trigger or data writes. */
export function verifierTransportVoix(){return etat.travail??=(async()=>{
 etat.rapport={statut:'en_cours',date:new Date().toISOString()};const cas=[];
 for(const [langue,texte] of [['fr','Le budget doit rester accessible à tous.'],['wo','Dañu bëgg ma def lu ma bëggul.'],['wo','Mu dem ci marse bi, jënd soble ak tamaate, te dellusi ci kër ga.']]){
  const passes=[];
  for(const mode of ['complet','stream','stream_replay']){
   const debut=Date.now(),frames:Buffer[]=[],arrivees:number[]=[],durees:number[]=[];let premier=0,generation:number|undefined,tempsGPU:unknown,preparation:number|undefined,cache=false,paquets=0,samples=0;
   try{
    const r=await fetch('https://app.khalam.app/api/chatterbox-test/bia'+(mode!=='complet'?'/stream':''),{method:'POST',headers:{'content-type':'application/json','x-chatterbox-test-key':process.env.CHATTERBOX_TEST_KEY||''},body:JSON.stringify({texte,langue,voice:'female',partie:0,...(mode==='complet'?{continu:true}:{})}),signal:AbortSignal.timeout(35000)});
    if(mode==='complet'){
     const flux=ouvrirRepliques(r,()=>{}),clip=await flux.morceau(0) as any;premier=Date.now()-debut;frames.push(Buffer.from(clip.audio,'base64'));generation=clip.generation_ms;tempsGPU=clip.temps_gpu;preparation=clip.preparation_ms;cache=!!clip.audio_en_cache;
     for(let i=1;i<clip.parties;i++)await flux.morceau(i);
    }else{
     if(!r.ok||!r.body)throw Error('stream_indisponible');const reader=r.body.getReader(),decoder=new TextDecoder();let buffer='',fin=false;
     for(;;){const v=await reader.read();if(v.done)break;buffer+=decoder.decode(v.value,{stream:true});let n;
      while((n=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,n);buffer=buffer.slice(n+1);if(!line.trim())continue;const d=JSON.parse(line);
       if(d.type==='meta'){preparation=d.preparation_ms;cache=!!d.audio_en_cache;}
       else if(d.type==='audio'){if(d.sequence!==paquets||d.offset_samples!==samples)throw Error('sequence_invalide');premier||=Date.now()-debut;const frame=Buffer.from(d.audio_base64,'base64');if(pcmWav(frame).length!==d.samples*2)throw Error('echantillons_incomplets');frames.push(frame);arrivees.push(Date.now()-debut);durees.push(d.samples/24000*1000);paquets++;samples+=d.samples;}
       else if(d.type==='end'){if(d.packets!==paquets||d.samples!==samples)throw Error('fin_invalide');generation=d.generation_ms;fin=true;}
       else throw Error('stream_interrompu');
      }
     }
     if(!fin||!paquets)throw Error('fin_absente');
    }
    const reception=Date.now()-debut,wav=reunirWav(frames);let verification:unknown={statut:'non_verifiee'};
    if(langue==='wo'){const ecriture=await chezOreilleLocale(new Blob([wav],{type:'audio/wav'}));verification={statut:'reconnaissance_indicative_WO',transcription:ecriture?.texte||null};}
    if(langue==='fr'){const {ecriture}=await preparerEcoute(new Blob([wav]),'verification.wav','fr');verification={statut:'reconnaissance_FR',texte_exact:normal(ecriture.texte)===normal(texte)};}
    let finAudio=0,trou=0;for(let i=0;i<arrivees.length;i++){if(i)trou=Math.max(trou,Math.max(0,arrivees[i]+60-finAudio));finAudio=Math.max(finAudio,arrivees[i]+60)+durees[i];}
    passes.push({sha256_pcm:createHash('sha256').update(pcmWav(wav)).digest('hex'),mode,premier_audio_ms:premier,couture_estimee_max_ms:Math.round(trou),arrivees_ms:arrivees,reception_complete_ms:reception,generation_ms:generation,preparation_ms:preparation,temps_gpu:tempsGPU,audio_en_cache:cache,paquets:mode!=='complet'?paquets:1,echantillons:(wav.length-44)/2,integrite:true,verification});
   }catch{passes.push({mode,erreur:true,ms:Date.now()-debut});}
  }
  cas.push({langue,passes,signal_identique_complet_stream:!!passes[0]?.sha256_pcm&&passes[0].sha256_pcm===passes[1]?.sha256_pcm});
 }
 etat.rapport={statut:'termine',date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),mesure:'Mêmes phrases, vraie voix GPU ; réception HTTP et vérification des échantillons. Reconnaissance française automatique ; écoute humaine non mesurée.',cas};
})().catch(()=>{etat.rapport={statut:'erreur',date:new Date().toISOString()};});}
