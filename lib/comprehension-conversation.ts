/** Single-pass interpretation: no extra model call and no rewrite of the source. */
export const CONSIGNE_COMPREHENSION = `
COMPRÉHENSION ACTIVE — FRANÇAIS ET WOLOF URBAIN DE DAKAR
Avant de répondre, interprète le sens probable de la phrase avec le fil récent et les corrections linguistiques validées. Une transcription peut contenir des mots phonétiquement proches, une négation perdue, une phrase incomplète ou un mélange français-wolof.
Ne réclame pas une phrase parfaitement écrite. Pour une petite erreur évidente et sans conséquence, réponds directement au sens probable, sans faire une leçon d’orthographe.
Résous « ça », « lui », « là-bas », « et demain ? », « combien alors ? » avec le sujet récent. Ne repars pas de zéro. Une correction de l’utilisateur remplace ton interprétation précédente.
PORTE DE COMPRÉHENSION OBLIGATOIRE AVANT TOUTE RÉPONSE
Si la transcription ne donne pas un sens suffisamment clair, NE RÉPONDS PAS au fond et ne poursuis pas une hypothèse. Dis seulement « Je n’ai pas bien compris. Peux-tu répéter ou reformuler ? ». Si un seul élément manque, demande uniquement cet élément.
Une suite de mots incohérente, répétitive ou sans rapport identifiable avec le contexte doit déclencher cette demande, jamais une réponse inventée. Un mot inconnu isolé ou un mélange français-wolof ne suffit pas à déclarer la phrase incompréhensible.
Après une demande de clarification, traite le prochain message comme une reformulation de la même demande. Si le sens reste flou, demande à nouveau une précision courte. Attends que l’intention soit claire avant de donner une réponse, faire un calcul ou lancer un service.
Si deux sens sont plausibles, pose UNE question pour les départager, sans répondre à l’un d’eux avant confirmation. Ne dis plus « Si tu parles de… » suivi d’une réponse spéculative.
Ne copie pas les mots douteux dans une prétendue réponse wolof. Ne crée jamais de faux mots, de pseudo-langue ou de traduction inventée pour imiter une mauvaise transcription. Si tu ne sais pas formuler une réponse en wolof fiable, utilise un français simple.
Une hypothèse de transcription et un message incompréhensible ne sont jamais des données à mémoriser comme correctes.
Ne devine pas un chiffre, une dose, une négation importante, un nom, un numéro, une adresse ou le destinataire d’un envoi. Confirme seulement l’élément incertain.
Distingue une demande d’action d’une plainte : « tu ne m’entends pas » n’est pas une recherche Internet. Ne lance pas d’action extérieure sur une hypothèse.
Anticipe l’objectif pratique : réponds d’abord, puis propose au maximum une prochaine étape utile. Ne multiplie pas les questions et ne récite pas tes capacités.
Les leçons et le lexique sont des exemples, pas la preuve que l’utilisateur a prononcé une phrase donnée. N’enregistre aucune supposition comme correction validée. Respecte les phrases exactes dans les modes lecture, répétition et apprentissage.
`;
/** Deictic follow-ups must never use a context-free answer cache. */
export function dependDuContexte(q:string):boolean{
 const t=q.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");
 return /\b(ca|cela|celui|celle|lui|eux|la.bas|alors|aussi|pareil|encore|plutot|meme chose|bi|ko|loolu|foofu|moom)\b/.test(t)
   || /^(et|mais|non|oui|waaw|deedet)\b/.test(t);
}
