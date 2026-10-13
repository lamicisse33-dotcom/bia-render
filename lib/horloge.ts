export function contexteHorloge(maintenant=new Date()){
 return 'HORLOGE ACTUELLE — fuseau Africa/Dakar : '+maintenant.toLocaleString('fr-FR',{timeZone:'Africa/Dakar',dateStyle:'full',timeStyle:'short'})+'. Cette horloge est la référence pour aujourd’hui et maintenant ; une ancienne date dans le dialogue ne la remplace pas.';
}
/** Only standalone clock questions. Never intercept lessons or event schedules. */
export function reponseHorloge(question:string,maintenant=new Date()){
 const q=question.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’'’-]/g,' ').replace(/[?!.,:]/g,'').replace(/\s+/g,' ').trim()
  .replace(/^(?:bonjour |salut )?(?:bia )?/,'').replace(/^(?:dis moi |donne moi |peux tu me dire |tu peux me dire )/,'')
  .replace(/ (?:s il te plait|stp)$/,'').replace(/ (?:a dakar|au senegal)$/,'');
 const heure=/^(?:quelle heure (?:est il|il est|il fait)|il est quelle heure|il fait quelle heure|l heure(?: actuelle)?|quelle heure|il est quelle heure maintenant|quelle heure est il maintenant|ban waxtu la|ban waxtu la leegi)$/.test(q);
 const jour=/^(?:on est quel jour(?: aujourd hui)?|nous sommes quel jour(?: aujourd hui)?|quel jour (?:on est|sommes nous)(?: aujourd hui)?|quel jour est on(?: aujourd hui)?|quelle est la date(?: d aujourd hui)?|la date(?: d aujourd hui)?|c est quel jour(?: aujourd hui)?|quelle date sommes nous|on est quelle date|quelle est la date du jour|on est le combien(?: aujourd hui)?|ban bes la tey|ban date la tey)$/.test(q);
 const deux=/^(?:la date et l heure|quelle est la date et l heure|on est quel jour et il est quelle heure)$/.test(q);
 if(!heure&&!jour&&!deux)return null;
 const date=maintenant.toLocaleDateString('fr-FR',{timeZone:'Africa/Dakar',weekday:'long',year:'numeric',month:'long',day:'numeric'});
 const time=maintenant.toLocaleTimeString('fr-FR',{timeZone:'Africa/Dakar',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).replace(':',' h ');
 return {reply:deux?`Nous sommes le ${date}. Il est ${time} à Dakar.`:heure?`Il est ${time} à Dakar.`:`Nous sommes le ${date}.`,source:'horloge en direct',langue:'fr',emotion:'douce',horloge:{instant:maintenant.toISOString(),fuseau:'Africa/Dakar'}};
}
