/* Détection français / wolof — reprise du module de l'Interprète, réduite à
   ce dont BIA a besoin : savoir dans quelle langue lire une réponse. */

const MOTS_WOLOF = new Set(["bul","buntt","tay","ndox","ay","ji","bu","ngir","waaye","nekk","ma","la","maa","mangi","maangi","naa","nga","ngeen","yaa","yow","moom","noo","ñu","ñungi","ñoom","yeen","mooy","moo","lañu","lañ","laa","nañu","dafa","dafay","dama","damay","dinaa","dina","dinañu","doon","naan","wara","war","mën","bëgg","begg","naka","ndax","ñaata","naata","lan","lu","kan","ku","fan","fu","kañ","ana","nu","waaw","déedéet","deedeet","jërëjëf","jerejef","baax","baaxna","amul","amna","jamm","nanga","noppi","waay","kay","dem","ñëw","new","wax","def","jënd","jaay","jox","lekk","toog","taxaw","jàng","jang","liggéey","liggeey","dellu","jël","xam","gis","ci","ak","itam","rekk","léegi","leegi","tey","suba","démb","demb","walla","te","ndaxte","bala","ginnaaw","fii","foofu","lépp","lepp","yépp","bépp","beneen","xaalis","dërëm","njëg","salaam","salam","man","sama","bi","yi"]);

const MOTS_FRANCAIS = new Set(["décision","décisions","suspicion","suspicions","franc","fcfa","xof","bus","la","prendre","rentrer","bouteille","francs","cfa","taxi","texte","lecture","exercice","numéro","rue","lune","plume","sucre","du","lis","lire","utilise","utiliser","français","française","j","l","d","qu","le","les","de","des","un","une","et","est","sont","était","je","tu","il","elle","nous","vous","ils","elles","on","que","qui","quoi","pour","avec","dans","sur","sous","chez","pas","mais","donc","alors","aussi","très","plus","moins","combien","pourquoi","comment","quand","où","quel","quelle","bonjour","merci","oui","non","monsieur","madame","ai","as","avez","avons","suis","êtes","sommes","peux","peut","veux","veut","voulez","faire","fait","aller","vais","prendre","ce","cette","ces","mon","ma","mes","ton","votre","vos","leur","au","aux","en","se","me","te","lui","nos","notre","être","avoir","cela","tout","tous","comme","son","sa","ses","par","si","bien"]);

export type LangueVoix = "wo" | "fr";
// Borrowings used in the teacher's urban-Wolof lessons. Keep this list
// conservative: unknown words and homographs must not all become French.
const EMPRUNTS_FRANCAIS = ["Wave", "bus", "prix", "transfert", "transferts", "cash", "famille", "familles", "pression", "pressions"];
const COMMUNS = new Set(["ma","la","te","lu","nu","man","fan"]);
export function indicesLangue(texte: string) {
  let wo=0, fr=0;
  for (const mot of texte.toLowerCase().normalize("NFC").match(/\p{L}+/gu) || []) {
    if (COMMUNS.has(mot)) continue;
    if (MOTS_WOLOF.has(mot)) wo++;
    else if (MOTS_FRANCAIS.has(mot)) fr++;
    else if (/[ñŋë]/u.test(mot)) wo++;
  }
  return {wo,fr};
}
export function detecterLangue(texte:string, defaut:LangueVoix="wo"):LangueVoix {
  const {wo,fr}=indicesLangue(texte);
  if (!wo&&!fr) return defaut;
  // French borrowings must not erase the Wolof grammar surrounding them.
  return wo >= fr ? "wo" : "fr";
}
export type PassageVoix = {texte:string; langue:LangueVoix};
/** Preserve the source exactly. Unknown words inherit their neighbouring context.
 * This is a lexical detector, not a guarantee for every homograph or unknown word. */
export function passagesLanguesVoix(texte:string, defaut:LangueVoix="wo", empruntsFrancais:readonly string[]=[]):PassageVoix[] {
  const out:PassageVoix[]=[];
  empruntsFrancais=[...EMPRUNTS_FRANCAIS,...empruntsFrancais];
  const emprunts=new Set([...empruntsFrancais,"franc","francs","CFA","FCFA","XOF"].map(m=>m.toLocaleLowerCase().normalize("NFC")));
  for (const sentence of Array.from(new Intl.Segmenter("fr",{granularity:"sentence"}).segment(texte),s=>s.segment)) {
    const tokens=Array.from(sentence.matchAll(/\s*\S+/gu),m=>m[0]);
    if (!tokens.length) {if(out.length)out[out.length-1].texte+=sentence;continue;}
    tokens[tokens.length-1]+=sentence.slice(tokens.join("").length);
    // Match validated French expressions on whole tokens, never substrings.
    const keys=tokens.map(t=>(t.toLocaleLowerCase().normalize("NFC").match(/[\p{L}\p{N}]+/gu)||[]).join(" "));
    const protectedIndices=new Set<number>();
    for(const expression of empruntsFrancais){
      const words=(expression.toLocaleLowerCase().normalize("NFC").match(/[\p{L}\p{N}]+/gu)||[]);
      if(!words.length)continue;
      for(let start=0;start<keys.length;start++){
        let combined="";
        for(let end=start;end<keys.length;end++){
          combined+=(combined?" ":"")+keys[end];
          if(combined===words.join(" ")){
            for(let j=start;j<=end;j++)protectedIndices.add(j);
            break;
          }
          if(!words.join(" ").startsWith(combined))break;
        }
      }
    }
    const labels=tokens.map((token,index)=>{
      if(protectedIndices.has(index))return "fr" as const;
      const mots=token.toLocaleLowerCase().normalize("NFC").match(/[\p{L}\p{N}]+/gu)||[];
      if(mots.length===1&&emprunts.has(mots[0]))return "fr" as const;
      const {wo,fr}=indicesLangue(token);
      return wo ? "wo" as const : fr || /\d/u.test(token) ? "fr" as const : null;
    });
    const first=labels.find(l=>l!==null)||detecterLangue(sentence,defaut);
    let current:LangueVoix=first;
    let buf="";
    for(let i=0;i<tokens.length;i++){
      const label=labels[i]||current;
      if(label!==current&&buf){out.push({texte:buf,langue:current});buf="";}
      current=label;buf+=tokens[i];
    }
    if(buf)out.push({texte:buf,langue:current});
  }
  if(out.map(p=>p.texte).join("")!==texte)throw new Error("Découpage vocal incomplet");
  return out;
}

/** Review clues only: an unknown word is not necessarily incorrect. */
export function ambiguitiesWolof(texte:string,defaut:LangueVoix="wo"):string[] {
 const out=new Set<string>();
 for(const passage of passagesLanguesVoix(texte,defaut)){
  if(passage.langue!=="wo")continue;
  for(const mot of passage.texte.match(/\p{L}[\p{L}\p{M}'’-]*/gu)||[]){
   const key=mot.toLowerCase().normalize("NFC");
   if(COMMUNS.has(key)||(!MOTS_WOLOF.has(key)&&!MOTS_FRANCAIS.has(key)))out.add(mot);
  }
 }
 return [...out];
}
