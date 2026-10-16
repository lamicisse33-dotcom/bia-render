const MAX_CHARS = 140;
const MAX_WORDS = 16;

export function decouperVoixKhalam(text: string,phraseCourte=false) {
  const complet=text.trim().replace(/\s+/gu,' ');
  // A measured 14-word Wolof sentence was faithful as a whole, whereas a
  // ten-word head hallucinated a continuation. Keep bounded complete clauses.
  if(phraseCourte&&complet.length<=90&&complet.split(/\s+/u).length<=MAX_WORDS
     &&/[.!?…]$/u.test(complet)&&(complet.match(/[.!?…]/gu)||[]).length===1)return [complet];
  const parts: string[] = [];
  let words: string[] = [];
  const flush = (lierSuite=false) => {
    let fin=words.length;
    // Keep a trailing conjunction with the clause it introduces instead of
    // ending a generated clip on "te", "ak" or "et". Preserve every word.
    if(lierSuite)while(fin>3&&/^(?:te|ak|walla|waaye|et|ou|mais|donc)$/iu.test(words[fin-1]))fin--;
    if(fin)parts.push(words.slice(0,fin).join(" "));
    words=words.slice(fin);
  };
  for (const word of text.trim().split(/\s+/).filter(Boolean)) {
    if (word.length > MAX_CHARS) {
      flush();
      // Split exceptional unbroken tokens without cutting a Unicode surrogate.
      let fragment = "";
      for (const char of word) {
        if ((fragment + char).length > MAX_CHARS) {
          parts.push(fragment);
          fragment = "";
        }
        fragment += char;
      }
      if (fragment) parts.push(fragment);
      continue;
    }
    // Shorter head starts playback sooner; later parts keep synthesis efficient.
    const maxWords = parts.length === 0 ? 10 : MAX_WORDS;
    const maxChars = parts.length === 0 ? 90 : MAX_CHARS;
    if (words.length >= maxWords || [...words, word].join(" ").length > maxChars) flush(true);
    if(words.length&&[...words,word].join(" ").length>MAX_CHARS)flush();
    words.push(word);
    if (/[.!?;:]$/.test(word)) flush();
  }
  flush();
  return parts;
}

