const MAX_CHARS = 140;
const MAX_WORDS = 16;

export function decouperVoixKhalam(text: string) {
  const parts: string[] = [];
  let words: string[] = [];
  const flush = () => {
    if (words.length) parts.push(words.join(" "));
    words = [];
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
    if (words.length >= maxWords || [...words, word].join(" ").length > maxChars) flush();
    words.push(word);
    if (/[.!?;:]$/.test(word)) flush();
  }
  flush();
  return parts;
}

