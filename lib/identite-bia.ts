import {normaliser} from './normaliser';
import {REPERTOIRE} from './repertoire-textes';

const nom=REPERTOIRE.find(e=>e.cle==='ton-nom')!;
const formes=new Set([...nom.formes,'comment t appelles tu','comment vous appelez vous','comment tu t appelle','tu t appelles comment','ton nom c est quoi','quel est votre nom'].map(normaliser));
const etat={nom:'Bia',revision:'identite-bia-v1',reponses_directes:0,diagnostic:null as unknown};
export const resumeIdentite=()=>({...etat});

/** Whole questions only: never intercept a lesson, quotation or other request. */
export function reponseIdentite(question:string){
 const q=normaliser(question).replace(/^(?:bonjour|salut|bonsoir)\s+/,'').replace(/^(?:rara|abia)\s+/,'');
 if(!formes.has(q))return null;
 const langue=/\b(comment|quel|ton|votre|tu|vous)\b/.test(q)?'fr':'wo';
 etat.reponses_directes++;
 return {reply:langue==='fr'?nom.francais:nom.wolof,langue,emotion:'douce',source:'identité Bia',identite:true};
}

let diagnostic:Promise<unknown>|undefined;
/** Authenticated fixed text checks, no synthesis, model call or lesson write. */
export function verifierIdentite(){return diagnostic??=(async()=>{
 const {POST}=await import('../app/api/chat/route');
 const {NextRequest}=await import('next/server');
 const resultats=[];
 for(const persona of ['rara','bia'])for(const message of ["Comment tu t'appelles ?",'Quel est ton nom ?','Noo tudd ?','Sa tur mooy lan ?']){
  const debut=Date.now();
  const r=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message,persona,history:[{role:'bia',text:"Je m'appelle Rara."}]})}));
  const d=await r.json();
  resultats.push({persona,message,reply:d.reply,ok:r.ok&&d.identite===true&&d.reply===(message.includes('nom')||message.includes('appelles')?nom.francais:nom.wolof),ms:Date.now()-debut});
 }
 etat.diagnostic={date:new Date().toISOString(),total:resultats.length,correctes:resultats.filter(r=>r.ok).length,lecture_audio_mesuree:false,resultats};
 return etat.diagnostic;
})();}
