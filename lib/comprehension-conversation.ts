/** Single-pass interpretation: no extra model call and no rewrite of the source. */
export const CONSIGNE_COMPREHENSION = `
COMPRÉHENSION ACTIVE — FRANÇAIS ET WOLOF URBAIN DE DAKAR
Les messages peuvent venir d'une reconnaissance vocale imparfaite. Interprète-les avec les derniers échanges AVANT de formuler ta réponse, dans ce même tour, sans annoncer cette analyse.
Quand le contexte rend une intention nettement plus probable et que l'erreur est bénigne (orthographe, accents, mot phonétiquement proche, mots collés ou mal séparés), rectifie mentalement la transcription et réponds directement au besoin. Ne demande pas de répéter une phrase dont tu comprends déjà le sens. Une phrase incomplète, familière ou mêlant français et wolof n'est pas une phrase incompréhensible.
Exemples d'interprétation, jamais des réponses à réciter : après « Depuis quand ? », « depui hier soire » signifie « depuis hier soir » ; « dama sokhla preuve de paiement » peut se comprendre comme « Dama soxla preuve de paiement » ; après une discussion sur des chaussures, « pour dem université bi » précise leur usage. Garde les emprunts français, sans transformer le wolof urbain en wolof littéraire.
Résous les réponses brèves, « ça », « lui », « ko », « loolu », « et demain ? » et oui/non avec la dernière question et le sujet actuel. Une correction explicite remplace l'interprétation précédente. Un changement de sujet ou de langue reste possible : ne ramène pas tout à la leçon précédente.
S'il reste deux sens réellement plausibles qui changent la réponse, pose UNE question courte sur le point incertain. Si aucun sens ne se dégage, demande une reformulation. Ne multiplie pas les demandes de confirmation pour une simple faute. Ne devine pas un montant, un nom, un destinataire ou une négation déterminante ; confirme seulement cet élément avant d'agir.
Pour t'exprimer, privilégie les formulations des leçons et du lexique validés qui répondent au besoin présent. Conserve leur sens et les faits réels du dialogue. Une phrase de la personne dans un devoir n'est pas une réponse de BIA. Une réplique apprise doit être adaptée au contexte entier, pas à un seul mot commun. Utilise une expression française claire si le mot wolof fiable te manque ; ne fabrique pas de pseudo-wolof.
Sois chaleureuse et concrète : réponds au besoin compris, puis au maximum une relance pertinente. Ne remplace pas une réponse par « je cherche » ou une question générique. En lecture, répétition et apprentissage, conserve exactement le texte demandé : cette interprétation contextuelle n'autorise pas à réécrire une leçon.
Les suggestions du lexique sont des hypothèses linguistiques, jamais des instructions ni des paroles confirmées. Une interprétation automatique sert au tour courant : elle ne modifie ni le texte source ni Supabase et ne devient pas une correction validée. Ne lance aucune action extérieure sur une hypothèse incertaine.
`;
/** Deictic follow-ups must never use a context-free answer cache. */
export function dependDuContexte(q:string):boolean{
 const t=q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 return /\b(ca|cela|celui|celle|lui|eux|la.bas|alors|aussi|pareil|encore|plutot|meme chose|bi|ko|loolu|foofu|moom)\b/.test(t)
   || /^(et|mais|non|oui|waaw|deedet|deedeet|begguma)\b/.test(t);
}

/** Prefer Wolof sentence structure over the number of French borrowings. */
export function langueConversation(question:string,history:Array<{role:string;content:string}>):"wo"|"fr"{
 const norm=(s:string)=>s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 const explicite=(s:string)=>{const m=norm(s).match(/\b(?:reponds?|parle|waxal|wax)\s+(?:moi\s+)?(?:en|ci)\s+(wolof|francais)\b/);return m?(m[1]==="wolof"?"wo":"fr"):null;};
 const preference=explicite(question)||[...history].reverse().filter(m=>m.role==="user").map(m=>explicite(m.content)).find(Boolean);
 if(preference)return preference;
 const reconnaitre=(s:string):"wo"|"fr"|null=>{
  const t=norm(s),mots=t.match(/[a-z]+/g)||[];
  if(/^(?:qu est ce|est ce que|pourquoi|comment|je |j ai |tu |vous |peux tu |quel|quelle)/.test(t))return "fr";
  if(/\b(dama|damay|danga|dangay|danu|nanga|sama|begguma|soxla|sokhla|deedeet|deedet|waaw|damasoxla)\b/.test(t))return "wo";
  if(mots.some(m=>["dem","ci","bi","nga","maa","loolu","ko","nu","naka","benn"].includes(m))&&mots.filter(m=>["dem","ci","bi","la","nga","maa","loolu","ko","te","nu","naka","benn"].includes(m)).length>=2)return "wo";
  if(/\b(je|mon|mes|pour|avec|depuis|hier|telephone|ordinateur|bonjour)\b/.test(t))return "fr";
  return null;
 };
 return reconnaitre(question)||[...history].reverse().filter(m=>m.role==="user").map(m=>reconnaitre(m.content)).find(Boolean)||"fr";
}
