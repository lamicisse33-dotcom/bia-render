/** Route explicit reading requests before chat. The payload never goes to a LLM. */
export function demandeLecture(message:string, textePresent=""): {texte:string;auto:boolean}|null {
  const commande=/^\s*(?:(?:bia|s['’]il te pla[îi]t)\s*[,;:]?\s+)*(?:MODE_APPRENTISSAGE|D[ÉE]MARRER APPRENTISSAGE|lis(?:[- ]moi)?\s+(?:(?:tout\s+)?ce\s+texte|(?:à|a)\s+haute\s+voix|le\s+(?:texte|message))|commence\s+la\s+lecture|exercice\s+de\s+lecture)(?=$|[\s:,.!?])/i;
  const match=message.match(commande);if(!match)return null;
  let suite=message.slice(match[0].length);
  suite=suite.replace(/^\s+(?:du\s+texte\s+suivant|le\s+texte\s+suivant|suivant|ci-dessous|en\s+entier|intégralement)(?=$|[\s:,.!?])/i,"");
  suite=suite.replace(/^[ \t]*[:.!?]?[ \t]*(?:\r?\n)?/,"");
  const texte=suite.trim()?suite:textePresent;
  return {texte,auto:Boolean(texte.trim())};
}
