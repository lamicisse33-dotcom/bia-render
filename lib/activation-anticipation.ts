/** Appearance is visual: both BIA portraits use the selected Khalam voice.
 * Learning/correction and captured continuations still use the ordinary path. */
export function exclusionAnticipation(o:{persona:string;voixCompatible:boolean;desactivee:boolean;apprentissage:boolean;correctionDevoir:boolean;correctionListe:boolean;prenom:boolean;reprise:boolean}):string {
  if(!o.voixCompatible)return 'voix_incompatible';
  if(o.desactivee)return 'desactivee';
  if(o.apprentissage)return 'apprentissage';
  if(o.correctionDevoir)return 'correction_devoir';
  if(o.correctionListe)return 'correction_liste';
  if(o.prenom)return 'prenom';
  if(o.reprise)return 'reprise';
  return '';
}
