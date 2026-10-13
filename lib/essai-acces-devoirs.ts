import {NextRequest} from 'next/server';
import {devoirsALire,contexteDevoirs} from './devoirs-apprentissage';
import {indexDialogue,choixDuTour} from './dialogue-devoirs';
import {analyserDevoir,normaliserDialogue} from './dialogue-devoirs-core';
const g=globalThis as typeof globalThis&{biaAccesDevoirs?:{lecture:unknown;conversation:unknown;travail?:Promise<void>}};
const etat=g.biaAccesDevoirs??={lecture:null,conversation:null};
export const resumeAccesDevoirs=()=>({lecture:etat.lecture,conversation:etat.conversation});
/** Fixed read-only checks against the actual Supabase lesson. Public output
 * contains only counts and verdicts, never its text or storage identifier. */
export async function verifierAccesDevoirs(){
 const {devoirs,incomplets}=await devoirsALire(),index=await indexDialogue();
 const sources=devoirs.filter(d=>/\bDEVOIR\s*33\b/i.test(d.texte)).sort((a,b)=>b.date.localeCompare(a.date));
 const recente=sources[0],structure=recente?analyserDevoir(recente):null;
 const retenue=recente?index.find(d=>d.id===recente.id):null;
 const cas=[];
 for(const question of ['Parlons des enfants.','Parlons de mon enfant.','Xale bi.','Xalé bi.','Khalé bi.']){
  const tour=await choixDuTour(question,[]),brut=await contexteDevoirs(question);
  const positions=tour.choix.candidats.map((c,i)=>c.d.id===recente?.id?String(i):null).filter(x=>x!==null);
  const options=tour.choix.paquet.filter(p=>positions.includes(p.id)).flatMap(p=>p.repliques);
  cas.push({sujet:question,lecon_retrouvee:positions.length>0,repliques_transmises:options.length,texte_source_transmis:!!recente&&brut.includes(JSON.stringify(recente.texte).slice(1,-1))});
 }
 etat.lecture={date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),supabase_lu:true,devoirs:devoirs.length,incomplets,
  lecon_enfants:{presente:!!recente,versions:sources.length,validee:recente?.valide||false,date:recente?.date||null,indexee:!!retenue,
   repliques:structure?.repliques.length||0,identifiants_dans_texte:recente?(recente.texte.match(/BIA-ENF-\d+/gi)||[]).length:0,
   identifiants_dans_parole:structure?.repliques.some(p=>/BIA-ENF-\d+/i.test(p.fr+' '+p.wo))||false,
   premiere_paire_preservee:structure?.repliques.some(p=>p.wo==='Xale bi fan la nekk ?'&&p.fr==='Où est l’enfant ?')||false},cas};
 return etat.lecture;
}
/** Two bounded owner-authorised real brain calls during this publication.
 * No lesson mutation, audio generation, transcript or reply exposed. */
export function verifierConversationDevoirs(){return etat.travail??=(async()=>{
 const {POST}=await import('../app/api/chat/route'),index=await indexDialogue(),cas=[];
 const enfants=index.filter(d=>/\bdevoir 33\b/.test(normaliserDialogue(d.titre)));
 for(const message of ['Mon enfant pleure. Que me conseilles-tu ? Réponds en français.','Parlons des enfants. Réponds en wolof.']){
  const debut=Date.now();
  const r=await POST(new NextRequest('https://app.khalam.app/api/chat',{method:'POST',headers:{'content-type':'application/json','x-bia-code':process.env.BIA_CODE_MAITRE||''},body:JSON.stringify({message,history:[],apprentissageTest:true})}));
  const d=await r.json(),reply=String(d.reply||'');
  cas.push({langue_demandee:message.endsWith('wolof.')?'wo':'fr',statut:r.status,ms:Date.now()-debut,reponse_presente:!!reply,
   source:typeof d.source==='string'?d.source:null,lecon_enfants_selectionnee:enfants.some(e=>e.id===d.lecon_id),
   formulation_exacte:enfants.some(e=>e.repliques.some(p=>p.fr===reply||p.wo===reply)),
   nie_acces:/pas (?:d.accès|acces)|n.ai pas accès|ne peux pas (?:consulter|accéder)|n.arrive pas à consulter/i.test(reply)});
 }
 etat.conversation={date:new Date().toISOString(),version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),statut:'termine',cas};
})().catch(()=>{etat.conversation={date:new Date().toISOString(),statut:'erreur'};});}
