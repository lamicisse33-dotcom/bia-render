/** Deux modèles déjà essayés avec la clé actuelle ; aucun nouveau compte. */
export const MODELE_LIVE_25='gemini-2.5-flash-native-audio-preview-12-2025';
export const MODELE_LIVE_38='gemini-3.8-live';
export function modelesLiveDisponibles(principal:string,exclus:string[]=[]){
 const propre=principal.replace(/^models\//,'');
 return [...new Set([propre,propre===MODELE_LIVE_25?MODELE_LIVE_38:MODELE_LIVE_25])].filter(m=>!exclus.includes(m));
}
export function panneLiveRecuperable(code:number,motif:string){
 return code===1006||[429,500,502,503,504].includes(code)||/quota|resource.exhausted|overload|unavailable|temporar|service error|internal error/i.test(motif);
}
