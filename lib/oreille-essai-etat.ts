const state={preparations:0,transcriptions:0,erreurs:0,dernier_evenement:'',derniere_date:'',derniere_duree_ms:0};
export function mesurerOreilleEssai(kind:string,ms:number){
 if(kind==='pret')state.preparations++;else if(kind==='transcription')state.transcriptions++;else if(kind==='erreur')state.erreurs++;
 state.dernier_evenement=kind;state.derniere_date=new Date().toISOString();state.derniere_duree_ms=Math.max(0,Math.min(600000,Number.isFinite(ms)?ms:0));
}
export const resumeOreilleEssai=()=>({...state,moteur:'moonshine',checkpoint:9137,calcul:'navigateur',selection_par_defaut:false,configuration_production_modifiee:false});
