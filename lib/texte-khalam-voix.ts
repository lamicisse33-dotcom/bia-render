import { pourLaVoix, enLettres } from "./nombres";

export function sansGuillemetsFrancais(texte:string):string {
  return texte.replace(/[«»]/gu," ").replace(/\s+/gu," ").trim();
}

/** Presentation marks are silent; the displayed/stored text stays intact.
 * Keep Unicode letters (including Wolof), apostrophes and semantic punctuation. */
export function sansMiseEnFormeVocale(texte:string,compter=false):string {
 const rendu= sansGuillemetsFrancais(texte.normalize("NFC")
  .replace(/<https?:\/\/[^>]+>/giu," ")
  .replace(/!\[([^\]]*)\]\([^)]*\)/gu,"$1")
  .replace(/\[([^\]]+)\]\([^)]*\)/gu,"$1")
  .replace(/<\/?[a-z][^>]*>/giu," ")
  .replace(/&nbsp;/giu," ").replace(/&amp;/giu," et ").replace(/&quot;/giu," ")
  .replace(/&lt;/giu," inférieur à ").replace(/&gt;/giu," supérieur à ")
  .replace(/^[ \t]{0,3}(?:#{1,6}[ \t]+|>[ \t]*|[-*+][ \t]+|\d+[.)][ \t]+)/gmu,"")
  .replace(/(\d)\s*([+×*÷=])\s*(?=\d)/gu,(_,n,op)=>n+" "+(({"+":"plus","×":"fois","*":"fois","÷":"divisé par","=":"égale"} as Record<string,string>)[op]||op)+" ")
  .replace(/(?:\*{1,3}|_{1,3}|~~|\x60+)/gu," ")
   .replace(/[\[\]{}|]/gu," ").replace(/−(?=\d)/gu,"-")
  .replace(/[“”„‟"]/gu," ").replace(/[‘’]/gu,"'")
  .replace(/[\p{Extended_Pictographic}\uFE0F\u200D\u200B\u2060\uFEFF]/gu," ")
  .replace(/[•▪◦►▶✓✔★☆]/gu," ")
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu," ")
 ).replace(/\s+([,.])/gu,"$1");
 if(compter){stats.appels++;if(rendu!==texte.normalize("NFC").trim())stats.nettoyages++;}
 return rendu;
}
const g=globalThis as typeof globalThis&{biaTexteVoix?:{appels:number;nettoyages:number}};
const stats=g.biaTexteVoix??={appels:0,nettoyages:0};
export function resumeTexteVoix(){return {revision:"symboles-muets-v1",...stats,
 exemples_synthetiques:[
  {texte:'**Bonjour** 👋',voix:sansMiseEnFormeVocale('**Bonjour** 👋')},
  {texte:'« Ñu ngi fi, jërëjëf. »',voix:sansMiseEnFormeVocale('« Ñu ngi fi, jërëjëf. »')}
 ]};}

/** Spoken rendering only: the transcript retains its original spelling/numbers. */
export function texteKhalamVoix(texte: string): string {
  let t = sansMiseEnFormeVocale(texte,true);
  // Resolve clocks before generic numbers; say leading-zero minutes naturally.
  t = t.replace(/\b([01]?\d|2[0-3])\s*[hH:]\s*([0-5]\d)\b/g, (_, h, m) =>
    `${enLettres(Number(h))} heure${Number(h) === 1 ? "" : "s"}${Number(m) ? ` ${enLettres(Number(m))}` : ""}`);
  t = t.replace(/\b([01]?\d|2[0-3])\s*[hH]\b/g, (_, h) => `${enLettres(Number(h))} heure${Number(h) === 1 ? "" : "s"}`);
  t = t.replace(/(^|[\s(])-(?=\d)/g, "$1moins ");
  t = pourLaVoix(t, "fr");
  // Phone numbers and identifiers deliberately protected by pourLaVoix must
  // still reach the multilingual voice as French words, never ambiguous digits.
  return t.replace(/\d/g, c => ` ${enLettres(Number(c))} `).replace(/\s+/g, " ").trim();
}
