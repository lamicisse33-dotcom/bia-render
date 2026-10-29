/** Signal visuel seul, prélevé à l'horloge de lecture réelle. Aucune attente
 * ni modification de l'audio. Un signal périmé ferme la bouche. */
let niveau = 0, date = -Infinity;
let lecteur: (()=>number) | null = null;
export function brancherBoucheAudio(lire:()=>number){ lecteur=lire; }
export function arreterBoucheAudio(){ lecteur=null;niveau=0;date=-Infinity; }
export function publierBoucheAudio(valeur: number, maintenant = performance.now()) {
  niveau = Number.isFinite(valeur) ? Math.max(0, Math.min(1, valeur)) : 0;
  date = maintenant;
}
export function lireBoucheAudio(maintenant = performance.now()) {
  if(lecteur){try{return {niveau:Math.max(0,Math.min(1,lecteur()||0)),age:0,disponible:true};}catch{return {niveau:0,age:0,disponible:true};}}
  const age = maintenant - date;
  return {niveau: age >= 0 && age < 180 ? niveau : 0, age,disponible:age>=0&&age<180};
}
export function ouvertureBoucheAudio(niveau: number) {
  return niveau < .045 ? 0 : Math.min(1, Math.pow((niveau-.045)/.955,.65));
}
