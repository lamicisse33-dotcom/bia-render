export async function register(){
 if(process.env.NEXT_RUNTIME==='nodejs'&&process.env.NEXT_PHASE!=='phase-production-build'){
  const {reprendreAudioMemoire}=await import('./lib/audio-memoire');
  void reprendreAudioMemoire();
  const {chargerDialoguesRapides}=await import("./lib/dialogue-rapide");
  void chargerDialoguesRapides();
  const {rechaufferAudiosPrepares}=await import('./lib/prechauffage-dialogue');
  void rechaufferAudiosPrepares();
  // One bounded production check per process during this publication only.
  if(process.env.RENDER_GIT_COMMIT&&process.env.BIA_CODE_MAITRE&&Date.now()<Date.parse('2026-10-13T20:15:00Z')){
   setTimeout(()=>{void import('./lib/essai-correction-vocale').then(m=>m.verifierCorrectionVocale()).catch(()=>{});},20000).unref();
  }
 }
}
