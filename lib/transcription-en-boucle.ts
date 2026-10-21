/** A suspicious mechanical loop is not evidence of what the person said.
 * Never keep a guessed prefix, infer a command, or rewrite it into consent. */
export function transcriptionEnBoucle(texte:string):boolean{
 const mots=texte.normalize('NFC').toLocaleLowerCase().match(/[\p{L}\p{N}]+/gu)||[];
 if(mots.length<12)return false;
 for(let taille=1;taille<=8;taille++){
  const frequences=new Map<string,number>();
  for(let i=0;i+taille<=mots.length;i++){const cle=mots.slice(i,i+taille).join(' ');frequences.set(cle,(frequences.get(cle)||0)+1);}
  for(const [cle,nombre] of frequences){
   if(nombre<5)continue;const motif=cle.split(' ');
   let couverts=0,occurrences=0,suite=0,maxSuite=0;
   for(let i=0;i+taille<=mots.length;){
    if(motif.every((m,j)=>mots[i+j]===m)){couverts+=taille;occurrences++;suite++;maxSuite=Math.max(maxSuite,suite);i+=taille;}
    else{suite=0;i++;}
   }
   // Preserve ordinary emphasis, self-corrections and repeated stop commands.
   if(taille>1&&occurrences>=5&&maxSuite>=3&&couverts>=12&&couverts/mots.length>=.55)return true;
   // Retain the older conservative rule for very long non-adjacent loops.
   if(mots.length>=24&&occurrences>=6&&couverts/mots.length>=.75)return true;
  }
 }
 return false;
}
const g=globalThis as typeof globalThis&{biaBouclesTranscription?:{rejetees:number;derniere?:{mots:number;quand:string}}};
const etat=g.biaBouclesTranscription??={rejetees:0};
export function noterBoucleTranscription(texte:string){etat.rejetees++;etat.derniere={mots:(texte.match(/[\p{L}\p{N}]+/gu)||[]).length,quand:new Date().toISOString()};}
export function resumeBouclesTranscription(){return {revision:'boucles-courtes-v1',...etat,cas_synthetiques:{capture_21_mots_rejetee:transcriptionEnBoucle('Wii waaw ba ma wax a doon walla doon walla doon walla doon waa doon walla doon walla doon walla doon'),oui_vas_y_conserve:!transcriptionEnBoucle('Oui, vas-y.'),vraie_distance_micro_testee:false}};}
