/** One already-cached acknowledgement per pending turn, never a second
 * response. Cancellation also prevents a late decode from starting playback. */
export function programmerReactionCourante(o:{actuel:()=>boolean;jouer:(actuel:()=>boolean)=>Promise<void>;arreter:()=>void;delai?:number}){
 let annule=false,commence=false;
 const actif=()=>!annule&&o.actuel();
 const timer=setTimeout(()=>{if(!actif())return;commence=true;void o.jouer(actif).catch(()=>{});},o.delai??650);
 return ()=>{if(annule)return;annule=true;clearTimeout(timer);if(commence)o.arreter();};
}
