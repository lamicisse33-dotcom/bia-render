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
  question_signes:number;apprise_signes:number;history_tours:number;
  modele:Record<string,{brique:boolean;mot_pour_mot:boolean|null;reply_signes:number|null;texte_pret_ms:number|null;preparation_complete_ms:number|null;erreur?:string}>;
};

const normaliser=(s:string)=>String(s||'').normalize('NFC').toLowerCase()
  .replace(/[’']/g,"'").replace(/[.,!?;:()«»"…—–-]/g,' ').replace(/\s+/g,' ').trim();

export function verifierModeleBriques(){
  const etat=etatBriques as Record<string,unknown>;
  /* Une seule série par processus. Un essai non concluant n'est pas une
     réussite : le prochain démarrage le reprend. */
  const precedent=etat.essai_modele as {statut?:string}|undefined;
  if(precedent&&precedent.statut==='termine')return;
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
      /* ── POURQUOI LE PREMIER ESSAI N'A RIEN PU CONCLURE ──────────────────

         00:31 et 00:37 : zéro formulation reproduite mot pour mot, par AUCUN
         des deux modèles. La cause la plus probable n'est pas le modèle :
         c'est que je posais la question NUE, sans l'échange qui la précède.
         `contexteMemoireCommune(texte, history, 6500)` choisit la mémoire à
         partir des deux ; sans historique, le devoir qui porte la formulation
         pouvait tout simplement ne pas être retrouvé, et aucun modèle ne peut
         reprendre mot pour mot ce qu'on ne lui a pas donné.

         On passe donc l'échange réel qui précède, comme un vrai tour, et on
         prend jusqu'à cinq répliques au lieu de trois. Si le verdict reste
         `non_concluant` avec ça, alors la sonde est en cause et je le dirai —
         pas Haiku. */
      const choisies:Array<{devoir:string;replique:string;question:string;apprise:string;langue:string;history:Array<{role:string;text:string}>}>=[];
      for(const d of index){
        if(d.id.startsWith('lexique:'))continue;
        for(let i=1;i<d.repliques.length&&choisies.length<5;i++){
          const r=d.repliques[i] as {id:string;wo?:string;fr?:string;role?:string};
          const avant=d.repliques[i-1] as {wo?:string;fr?:string;role?:string};
          const apprise=String(r.wo||'').trim(),question=String(avant?.wo||'').trim();
          if(r.role!=='bia'||apprise.length<40||question.length<20)continue;
          const history=(d.repliques.slice(Math.max(0,i-5),i-1) as Array<{wo?:string;role?:string}>)
            .map(p=>({role:p.role==='bia'?'bia':'user',text:String(p.wo||'').trim()}))
            .filter(p=>p.text.length>0);
          choisies.push({devoir:d.id,replique:r.id,question,apprise,langue:'wo',history});
          break;
        }
        if(choisies.length>=5)break;
      }
      rapport.repliques_trouvees=choisies.length;
      if(!choisies.length){rapport.statut='aucune_formulation_wolof_assez_longue';return;}
      for(const c of choisies){
        const cas:Cas={devoir:c.devoir,replique:c.replique,langue:c.langue,
          question_signes:c.question.length,apprise_signes:c.apprise.length,
          history_tours:c.history.length,modele:{}};
        (rapport.cas as Cas[]).push(cas);
        for(const modele of [modeleBriques(),MODELE_SONNET]){
          const debut=Date.now();
          /* LE TEXTE SEUL, pas le texte PLUS la voix. Première version de cet
             essai : je chronométrais `preparerBrique` en entier, donc la
             synthèse audio aussi, et j'appelais ça `modele_ms` — 3 à 7 s pour
             un appel de modèle, ce qui aurait dû me sauter aux yeux. `debut`
             du flux est appelé quand la brique TEXTE est prête. */
          let textePret:number|null=null;
          try{
            const r=await preparerBrique({texte:c.question,tour:'essai-modele-briques-'+c.replique,
              history:c.history,resume:'',voice:'female',persona:'bia',modeleEssai:modele},
              code,true,AbortSignal.timeout(30000),undefined,
              {debut:()=>{textePret??=Date.now()-debut;},morceau:()=>{}});
            const reply=r&&'brique' in r&&r.brique?String(r.brique.texte||''):'';
            cas.modele[modele]={
              brique:Boolean(reply),
              /* MOT POUR MOT : la formulation apprise, normalisée, doit se
                 retrouver entière dans la brique. Une reformulation, même
                 proche, est un échec — c'est la consigne de Lamine. */
              mot_pour_mot:reply?normaliser(reply).includes(normaliser(c.apprise)):null,
              reply_signes:reply?reply.length:null,
              texte_pret_ms:textePret,
              preparation_complete_ms:Date.now()-debut,
            };
          }catch(e){
            cas.modele[modele]={brique:false,mot_pour_mot:null,reply_signes:null,texte_pret_ms:textePret,
              preparation_complete_ms:Date.now()-debut,
              erreur:e instanceof Error?e.message.slice(0,60):'essai_non_confirme'};
          }
        }
      }
      const cas=rapport.cas as Cas[];
      const part=(m:string)=>cas.filter(c=>c.modele[m]?.mot_pour_mot===true).length;
      const refus=(m:string)=>cas.filter(c=>c.modele[m]?.brique===false).length;
      const duree=(m:string,cle:'texte_pret_ms'|'preparation_complete_ms')=>{
        const v=cas.map(c=>c.modele[m]?.[cle]).filter((x):x is number=>typeof x==='number').sort((a,b)=>a-b);
        return v.length?v[Math.floor((v.length-1)/2)]:null;};
      const configure=modeleBriques();
      /* ── ZÉRO CONTRE ZÉRO N'EST PAS UNE RÉUSSITE ──────────────────────────

         Première version : le verdict valait `configure >= temoin`, donc VRAI
         quand AUCUN des deux ne reproduisait la formulation. C'est exactement
         ce qui s'est passé le 24 octobre à 00:31, et le champ a affiché
         `wolof_appris_preserve: true` sur une épreuve qui n'avait rien
         éprouvé. Un compteur qui dit « bon » quand il n'a rien vu est pire
         qu'un compteur absent. */
      const concluant=part(configure)+part(MODELE_SONNET)>0;
      rapport.bilan={
        repliques:cas.length,
        mot_pour_mot_configure:part(configure),
        mot_pour_mot_temoin:part(MODELE_SONNET),
        briques_refusees_configure:refus(configure),
        briques_refusees_temoin:refus(MODELE_SONNET),
        texte_pret_ms_median_configure:duree(configure,'texte_pret_ms'),
        texte_pret_ms_median_temoin:duree(MODELE_SONNET,'texte_pret_ms'),
        preparation_complete_ms_median_configure:duree(configure,'preparation_complete_ms'),
        preparation_complete_ms_median_temoin:duree(MODELE_SONNET,'preparation_complete_ms'),
        concluant,
        /* LE VERDICT, volontairement sévère, et NUL quand rien n'est en jeu :
           le modèle configuré ne doit reproduire ni moins de formulations, ni
           refuser plus de briques que le témoin. Un gain de temps payé par une
           reformulation wolof, ou par un refus, n'est pas un gain. */
        wolof_appris_preserve:concluant?part(configure)>=part(MODELE_SONNET):null,
        briques_aussi_souvent_produites:refus(configure)<=refus(MODELE_SONNET),
      };
      rapport.statut=concluant?'termine':'non_concluant';
    }catch(e){
      rapport.statut='echec';
      rapport.erreur=e instanceof Error?e.message.slice(0,80):'essai_non_confirme';
    }finally{
      rapport.fin=new Date().toISOString();
    }
  })().catch(()=>{});
}
