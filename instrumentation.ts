export async function register(){
 if(process.env.NEXT_RUNTIME==='nodejs'&&process.env.NEXT_PHASE!=='phase-production-build'){
  const {reprendreAudioMemoire}=await import('./lib/audio-memoire');
  void reprendreAudioMemoire();
  const {chargerDialoguesRapides}=await import("./lib/dialogue-rapide");
  void chargerDialoguesRapides();
  const {rechaufferAudiosPrepares}=await import('./lib/prechauffage-dialogue');
  void rechaufferAudiosPrepares();
  // Owner-requested migration: one private read/write per process, never a
  // conversation dependency. No new voice generation or model probe.
  if(process.env.KHALAM_INTERPRETE_CODE){
   setTimeout(()=>{void import('./lib/biba-corrections').then(m=>m.integrerCorrectionsBiba()).catch(()=>{});},15000).unref();
  }
  setTimeout(()=>{void import('./lib/memoire-organisee').then(m=>m.organiserMemoire()).catch(()=>{});},45000).unref();
  if(process.env.RENDER_GIT_COMMIT&&process.env.BIA_CODE_MAITRE&&Date.now()<Date.parse('2026-10-13T21:25:00Z')){
   setTimeout(()=>{void import('./lib/essai-latence-salutation').then(m=>m.verifierLatenceSalutation()).catch(()=>{}).then(()=>import('./lib/essai-parcours-rapide')).then(m=>m.verifierParcoursRapide()).catch(()=>{});},60000).unref();
  }
  // One bounded production check per process during this publication only.
  if(process.env.RENDER_GIT_COMMIT&&process.env.BIA_CODE_MAITRE&&Date.now()<Date.parse('2026-10-13T20:15:00Z')){
   setTimeout(()=>{void import('./lib/essai-correction-vocale').then(m=>m.verifierCorrectionVocale()).catch(()=>{});},20000).unref();
  }
 }
}
