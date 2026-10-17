/** Ordered playback of immutable, already synthesized bricks. No microphone here. */
export type BriqueAudio = {numero:number;texte:string;audio:string;langue:'wo'|'fr';voice:'female'|'male'};
export function creerFileBriques() {
  const briques:BriqueAudio[]=[];
  let close=false, cancel=false, reveiller:(()=>void)|undefined, lecture=false;
  return {
    ajouter(b:BriqueAudio) {
      if(close||cancel)return;
      if(b.numero<briques.length)return; // idempotent delivery
      if(b.numero!==briques.length)throw Error('Brique manquante');
      briques.push(Object.freeze({...b}));reveiller?.();
    },
    get pretes(){return briques.length;},
    fermer(){close=true;reveiller?.();},
    annuler(){cancel=true;reveiller?.();},
    async lire(o:{signal:AbortSignal;jouer:(b:BriqueAudio)=>Promise<boolean>;attente:()=>void;taire:()=>void;mesure:(gap:number)=>void;delai?:number}) {
      if(lecture)throw Error('Lecture déjà commencée');lecture=true;
      const dits:string[]=[];let index=0,reflexions=0,delaiDepasse=false;
      const interrompre=()=>{cancel=true;o.taire();reveiller?.();};
      o.signal.addEventListener('abort',interrompre,{once:true});
      try {
        while(!cancel&&!o.signal.aborted) {
          if(index<briques.length) {
            o.taire();const b=briques[index++];
            if(!await o.jouer(b))throw Error('Lecture de brique échouée');
            dits.push(b.texte);continue;
          }
          if(close)break;
          const debut=Date.now();
          await new Promise<void>(resolve=>{
            let rendu=false;
            const finir=()=>{if(rendu)return;rendu=true;clearTimeout(timer);clearTimeout(limite);reveiller=undefined;resolve();};
            const timer=setTimeout(()=>{if(!cancel&&!o.signal.aborted&&index>0&&reflexions<2){reflexions++;o.attente();}},o.delai??1400);
            const limite=setTimeout(()=>{cancel=true;delaiDepasse=true;finir();},45000);
            reveiller=finir;
            if(cancel||close||o.signal.aborted)finir();
          });
          if(!cancel&&!o.signal.aborted&&index<briques.length)o.mesure(Date.now()-debut);
        }
        if(delaiDepasse)throw Error('Suite indisponible');
        return dits.join(' ');
      } finally {o.taire();o.signal.removeEventListener('abort',interrompre);}
    },
  };
}
