export type TypeApprentissage="instruction"|"exercice"|"memorisation"|"test";
export function routerApprentissage(message:string):{type:TypeApprentissage;contenu:string;explicite:boolean}{
 const m=message.match(/^\s*(INSTRUCTION|EXERCICE|M[ÉE]MORISATION|TEST)\s*:\s*/i);
 if(m){const key=m[1].normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase() as TypeApprentissage;return {type:key,contenu:message.slice(m[0].length),explicite:true};}
 const t=message.trim();
 if(/^(?:à partir de maintenant|a partir de maintenant|désormais|desormais|ne transforme|ne lis pas|ne sauvegarde pas)\b/i.test(t))return {type:"instruction",contenu:t,explicite:false};
 if(/^(?:sauvegarde|enregistre|mémorise|memorise)\b/i.test(t))return {type:"memorisation",contenu:t,explicite:false};
 if(/^réponds à (?:cette|la) (?:nouvelle )?question/i.test(t))return {type:"test",contenu:t,explicite:false};
 const consigne=t.match(/^(?:lis|lis-moi)\s+(?:les phrases suivantes|le texte suivant|ce devoir)\s*[:\n]\s*/i);
 return {type:"exercice",contenu:consigne?t.slice(consigne[0].length):message,explicite:false};
}
