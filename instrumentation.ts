export async function register(){
 if(process.env.NEXT_RUNTIME==='nodejs'&&process.env.NEXT_PHASE!=='phase-production-build'){
  const {reprendreAudioMemoire}=await import('./lib/audio-memoire');
  void reprendreAudioMemoire();
  const {chargerDialoguesRapides}=await import("./lib/dialogue-rapide");
  void chargerDialoguesRapides();
  const {rechaufferAudiosPrepares}=await import('./lib/prechauffage-dialogue');
  void rechaufferAudiosPrepares();
 }
}
