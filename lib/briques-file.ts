/** Ordered playback of immutable, already synthesized bricks. No microphone here. */
/** Validated, ordered audio clips can be consumed before the utterance ends. */
export function creerFluxBrique(){
 const clips:string[]=[];let fini=false,erreur:Error|null=null,reveiller:(()=>void)|undefined;
 return {
  pousser(audio:string){if(fini||erreur)throw Error('Flux terminé');clips.push(audio);reveiller?.();},
  fermer(){fini=true;reveiller?.();},
  echouer(e=new Error('Audio interrompu')){erreur=e;reveiller?.();},
  async *[Symbol.asyncIterator](){let i=0;for(;;){if(erreur)throw erreur;if(i<clips.length){yield clips[i++];continue;}if(fini)return;await new Promise<void>(r=>{reveiller=r;});}},
 };
}
export type BriqueAudio = {numero:number;texte:string;audio:string;langue:'wo'|'fr';voice:'female'|'male';flux?:ReturnType<typeof creerFluxBrique>};
export function creerFileBriques() {
  const briques:BriqueAudio[]=[];
  let close=false, cancel=false, reveiller:(()=>void)|undefined, lecture=false,erreur:Error|null=null,lectureEnFlux=false;
  return {
    ajouter(b:BriqueAudio) {
      if(close||cancel)return;
      if(b.numero<briques.length)return; // idempotent delivery
      if(b.numero!==briques.length)throw Error('Brique manquante');
      briques.push(Object.freeze({...b}));reveiller?.();
    },
    get pretes(){return briques.length;},
    get lectureEnFlux(){return lectureEnFlux;},
    echouer(e:Error){erreur=e;for(const b of briques)b.flux?.echouer(e);reveiller?.();},
    fermer(){close=true;reveiller?.();},
    annuler(){cancel=true;for(const b of briques)b.flux?.echouer(new Error('Lecture annulée'));reveiller?.();},
    async lire(o:{signal:AbortSignal;jouer:(b:BriqueAudio)=>Promise<boolean>;attente:(ms:number)=>void;taire:()=>void;mesure:(gap:number)=>void;delai?:number}) {
      if(lecture)throw Error('Lecture déjà commencée');lecture=true;
      const dits:string[]=[];let index=0,reflexions=0,delaiDepasse=false;
      const interrompre=()=>{cancel=true;o.taire();reveiller?.();};
      o.signal.addEventListener('abort',interrompre,{once:true});
      try {
        while(!cancel&&!o.signal.aborted) {
          if(erreur)throw erreur;
          if(index<briques.length) {
            o.taire();const b=briques[index++];
            if(b.flux)lectureEnFlux=true;
            if(!await o.jouer(b))throw Error('Lecture de brique échouée');
            dits.push(b.texte);continue;
          }
          if(close)break;
          const debut=Date.now();
          await new Promise<void>(resolve=>{
            let rendu=false;
            const finir=()=>{if(rendu)return;rendu=true;clearTimeout(timer);clearTimeout(limite);reveiller=undefined;resolve();};
            const timer=setTimeout(()=>{if(!cancel&&!o.signal.aborted&&index>0&&reflexions<2){reflexions++;o.attente(Date.now()-debut);}},o.delai??1400);
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

