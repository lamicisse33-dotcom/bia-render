import type {MorceauVoix} from "./flux-khalam";

/** One lookahead only. Its errors are observed before advancing the cursor,
 * and its request shares the reading's cancellation signal. */
export async function* morceauxLecture(
  first:MorceauVoix,
  demander:(partie:number,empreinte?:string)=>Promise<MorceauVoix>,
  signal:AbortSignal,
  anticiper=false,
):AsyncGenerator<string> {
  const total=first.parties;
  if(!Number.isSafeInteger(total)||total<1)throw Error("Découpage vocal invalide");
  type Resultat={piece:MorceauVoix}|{error:unknown};
  let prochain:Promise<Resultat>|null=null;
  let piece=first;
  try {
    for(let part=0;part<total;part++){
      if(signal.aborted)throw Error("arrêté");
      if(part){
        if(prochain){const result=await prochain;prochain=null;if("error" in result)throw result.error;piece=result.piece;}
        else piece=await demander(part,first.empreinte);
      }
      if(signal.aborted)throw Error("arrêté");
      if(piece.parties!==total||(piece.partie!==undefined&&piece.partie!==part)||
        (first.empreinte!==undefined&&piece.empreinte!==first.empreinte))
        throw Error("Le découpage a changé pendant la lecture. Réessaie ce passage.");
      if(!piece.audio)throw Error("Morceau vocal absent");
      if(anticiper&&!piece.flux&&part+1<total)
        prochain=demander(part+1,first.empreinte).then(piece=>({piece}),error=>({error}));
      try {
        yield piece.audio;
        if(piece.flux)for await(const packet of piece.flux){if(signal.aborted)throw Error("arrêté");yield packet;}
      }finally{piece.annuler?.();}
    }
  }finally{
    // Full WAV requests normally have no disposer. Also clean up a late result
    // if a future transport supplies one; rejected lookahead is already caught.
    if(prochain)void prochain.then(r=>{if("piece" in r)r.piece.annuler?.();});
  }
}
