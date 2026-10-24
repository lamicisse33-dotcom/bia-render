/* ── LE WOLOF APPRIS SURVIT-IL À HAIKU ? MESURÉ, PAS AFFIRMÉ ───────────────

   Levier 2 du plan −2 s. Lamine : « Haiku pour le texte des briques, wolof
   appris vérifié sur mes phrases réelles, réversible par variable Render. »

   AGENTS.md est net : « privilégier un dialogue fondé sur leurs formulations
   exactes » et « ne pas inventer une reformulation wolof à la place d'une
   formulation apprise ». Un modèle plus petit qui reformule le wolof validé
   serait une régression bien plus grave que 300 ms gagnées. Donc on mesure
   avant de garder.

   CE QUE CET ESSAI FAIT : il lit ses devoirs réels (lecture seule), prend les
   répliques dont la version wolof est validée, pose la question qui les
   précède — ses propres phrases, pas des phrases inventées pour l'occasion —
   et demande une brique DEUX FOIS : une au modèle configuré, une à Sonnet.
   Puis il regarde si la formulation apprise ressort MOT POUR MOT.

   CE QU'IL NE FAIT PAS : aucune écriture, aucun audio, aucune conversation
   enregistrée. Les drapeaux de diagnostic des briques interdisent déjà le
   corpus et les devoirs.

   CE QU'IL PUBLIE : des booléens, des longueurs, des durées et des
   identifiants de devoir. AUCUN texte wolof, aucune transcription, aucune
   réponse. Le verdict doit être lisible sans exporter sa langue. */

import {etatBriques} from './briques-etat';
import {MODELE_SONNET,modeleBriques} from './cerveau-anthropic';

type Cas={
  devoir:string;replique:string;langue:string;
  question_signes:number;apprise_signes:number;
  modele:Record<string,{brique:boolean;mot_pour_mot:boolean|null;reply_signes:number|null;modele_ms:number|null;erreur?:string}>;
};

const normaliser=(s:string)=>String(s||'').normalize('NFC').toLowerCase()
  .replace(/[’']/g,"'").replace(/[.,!?;:()«»"…—–-]/g,' ').replace(/\s+/g,' ').trim();

export function verifierModeleBriques(){
  const etat=etatBriques as Record<string,unknown>;
  if(etat.essai_modele)return;
  const code=process.env.BIA_CODE_MAITRE;
  if(!code)return;
  etat.essai_modele={statut:'en_cours'};
  void (async()=>{
    const rapport:Record<string,unknown>={
      statut:'en_cours',date:new Date().toISOString(),
      version:(process.env.RENDER_GIT_COMMIT||'').slice(0,12),
      modele_configure:modeleBriques(),modele_temoin:MODELE_SONNET,
      perimetre:'Devoirs réels en lecture seule. Deux préparations de brique par réplique, modèle configuré puis témoin Sonnet, sur la question qui précède la formulation apprise. Aucune écriture, aucun audio, aucune conversation enregistrée. Publie des booléens, des longueurs et des durées ; aucun texte wolof, aucune transcription.',
      cas:[] as Cas[],
    };
    etat.essai_modele=rapport;
    try{
      const [{indexDialogue},{preparerBrique}]=await Promise.all([import('./dialogue-devoirs'),import('./briques-reponse')]);
      const index=await indexDialogue();
      /* Les répliques de Bia dont le wolof est assez long pour qu'une
         reformulation se voie, et dont la question qui précède existe. */
      const choisies:Array<{devoir:string;replique:string;question:string;apprise:string;langue:string}>=[];
      for(const d of index){
        if(d.id.startsWith('lexique:'))continue;
        for(let i=1;i<d.repliques.length&&choisies.length<3;i++){
          const r=d.repliques[i] as {id:string;wo?:string;fr?:string;role?:string};
          const avant=d.repliques[i-1] as {wo?:string;fr?:string;role?:string};
          const apprise=String(r.wo||'').trim(),question=String(avant?.wo||'').trim();
          if(r.role!=='bia'||apprise.length<40||question.length<20)continue;
          choisies.push({devoir:d.id,replique:r.id,question,apprise,langue:'wo'});
          break;
        }
        if(choisies.length>=3)break;
      }
      rapport.repliques_trouvees=choisies.length;
      if(!choisies.length){rapport.statut='aucune_formulation_wolof_assez_longue';return;}
      for(const c of choisies){
        const cas:Cas={devoir:c.devoir,replique:c.replique,langue:c.langue,
          question_signes:c.question.length,apprise_signes:c.apprise.length,modele:{}};
        (rapport.cas as Cas[]).push(cas);
        for(const modele of [modeleBriques(),MODELE_SONNET]){
          const debut=Date.now();
          try{
            const r=await preparerBrique({texte:c.question,tour:'essai-modele-briques-'+c.replique,
              history:[],resume:'',voice:'female',persona:'bia',modeleEssai:modele},
              code,true,AbortSignal.timeout(30000));
            const reply=r&&'brique' in r&&r.brique?String(r.brique.texte||''):'';
            cas.modele[modele]={
              brique:Boolean(reply),
              /* MOT POUR MOT : la formulation apprise, normalisée, doit se
                 retrouver entière dans la brique. Une reformulation, même
                 proche, est un échec — c'est la consigne de Lamine. */
              mot_pour_mot:reply?normaliser(reply).includes(normaliser(c.apprise)):null,
              reply_signes:reply?reply.length:null,
              modele_ms:Date.now()-debut,
            };
          }catch(e){
            cas.modele[modele]={brique:false,mot_pour_mot:null,reply_signes:null,modele_ms:Date.now()-debut,
              erreur:e instanceof Error?e.message.slice(0,60):'essai_non_confirme'};
          }
        }
      }
      const cas=rapport.cas as Cas[];
      const part=(m:string)=>cas.filter(c=>c.modele[m]?.mot_pour_mot===true).length;
      const duree=(m:string)=>{const v=cas.map(c=>c.modele[m]?.modele_ms).filter((x):x is number=>typeof x==='number').sort((a,b)=>a-b);
        return v.length?v[Math.floor((v.length-1)/2)]:null;};
      const configure=modeleBriques();
      rapport.bilan={
        repliques:cas.length,
        mot_pour_mot_configure:part(configure),
        mot_pour_mot_temoin:part(MODELE_SONNET),
        modele_ms_median_configure:duree(configure),
        modele_ms_median_temoin:duree(MODELE_SONNET),
        /* LE VERDICT, et il est volontairement sévère : le modèle configuré ne
           doit pas reproduire MOINS de formulations que le témoin. Un gain de
           temps payé par une reformulation wolof n'est pas un gain. */
        wolof_appris_preserve:part(configure)>=part(MODELE_SONNET),
      };
      rapport.statut='termine';
    }catch(e){
      rapport.statut='echec';
      rapport.erreur=e instanceof Error?e.message.slice(0,80):'essai_non_confirme';
    }finally{
      rapport.fin=new Date().toISOString();
    }
  })().catch(()=>{});
}
