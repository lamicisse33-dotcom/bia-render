/* Détection français / wolof — reprise du module de l'Interprète, réduite à
   ce dont BIA a besoin : savoir dans quelle langue lire une réponse. */

const MOTS_WOLOF = new Set(["bul","buntt","tay","ndox","ay","ji","bu","ngir","waaye","nekk","ma","la","maa","mangi","maangi","naa","nga","ngeen","yaa","yow","moom","noo","ñu","ñungi","ñoom","yeen","mooy","moo","lañu","lañ","laa","nañu","dafa","dafay","dama","damay","dinaa","dina","dinañu","doon","naan","wara","war","mën","bëgg","begg","naka","ndax","ñaata","naata","lan","lu","kan","ku","fan","fu","kañ","ana","nu","waaw","déedéet","deedeet","jërëjëf","jerejef","baax","baaxna","amul","amna","jamm","nanga","noppi","waay","kay","dem","ñëw","new","wax","def","jënd","jaay","jox","lekk","toog","taxaw","jàng","jang","liggéey","liggeey","dellu","jël","xam","gis","ci","ak","itam","rekk","léegi","leegi","tey","suba","démb","demb","walla","te","ndaxte","bala","ginnaaw","fii","foofu","lépp","lepp","yépp","bépp","beneen","xaalis","dërëm","njëg","salaam","salam","man","sama","bi","yi"]);

const MOTS_FRANCAIS = new Set(["décision","décisions","suspicion","suspicions","franc","fcfa","xof","bus","la","prendre","rentrer","bouteille","francs","cfa","taxi","texte","lecture","exercice","numéro","rue","lune","plume","sucre","du","lis","lire","utilise","utiliser","français","française","j","l","d","qu","le","les","de","des","un","une","et","est","sont","était","je","tu","il","elle","nous","vous","ils","elles","on","que","qui","quoi","pour","avec","dans","sur","sous","chez","pas","mais","donc","alors","aussi","très","plus","moins","combien","pourquoi","comment","quand","où","quel","quelle","bonjour","merci","oui","non","monsieur","madame","ai","as","avez","avons","suis","êtes","sommes","peux","peut","veux","veut","voulez","faire","fait","aller","vais","prendre","ce","cette","ces","mon","ma","mes","ton","votre","vos","leur","au","aux","en","se","me","te","lui","nos","notre","être","avoir","cela","tout","tous","comme","son","sa","ses","par","si","bien"]);

export type LangueVoix = "wo" | "fr";
// Borrowings used in the teacher's urban-Wolof lessons. Keep this list
// conservative: unknown words and homographs must not all become French.
const EMPRUNTS_FRANCAIS = ["Wave", "bus", "prix", "transfert", "transferts", "cash", "famille", "familles", "pression", "pressions"];
const COMMUNS = new Set(["ma","la","te","lu","nu","man","fan"]);
// These Wolof x-words must not inherit French from a preceding borrowing.
for(const mot of ['soxla','xam','xamuma','xamoo','xamul','xamunu','xamle','xamante','xalaat','xalaatal','xalaatuma','xalaatam','xale','xaley','xarit','xaritam','xaritoo','xool','xoolal','xoolaat','xooluma','xew','xewul','xewxew','xaalis','xaalisu','xaj','xorom','xol','xolu','xolam','xey','xëy','xeex','xëcc','xel','xelam','xéewël','xibaar','xibaaru','xar','xaar','xaaral','xaari','wax','waxal','waxuma','waxul','waxoon','ndax','ndaxam','bëggul','bëgguma','ngii','fay','fayee','may','ték','warra'])MOTS_WOLOF.add(mot);
for(const mot of ['message','messages','appel','appels','appeler','appelée','appeler','répondre','répond','réponse','réponses','problème','problèmes','explication','explications','expliquer','exemple','exemples','exercice','exercices','examen','examens','excuse','excuses','expression','expressions','expérience','expériences','exactement','ex','copain','copine','relation','relations','situation','solutions','solution','conseil','conseils','discussion','discuter','téléphone','numéro','numéros','crédit','crédits','réseau','internet','connexion','contact','contacts','rendez-vous','rendez','carte','bancaire','banque','boutique','client','clients','cliente','clientes','commerce','commerçant','commerçante','étudiant','étudiante','études','école','université','cours','devoir','devoirs','leçon','leçons','mariage','marier','amour','couple','confiance','preuve','preuves','risque','risques','raison','raisons','immédiatement','doute','doutes','important','importante','normal','normale','naturel','naturelle','budget','dépense','dépenses','paiement','payer','argent','montant','reste','refus','refuser','accepter','décider','signifier','signifie','clarifier','comprendre'])MOTS_FRANCAIS.add(mot);
/** Recognize compact Wolof clitics only when their entire remainder is an
 * already known Wolof word. An x alone never makes a French word Wolof. */
function estMotWolof(mot:string):boolean {
 if(MOTS_WOLOF.has(mot))return true;
 const compact=mot.match(/^(?:damay|dafay|dinaa|dama|dafa|dina)(.+)$/u);
 return Boolean(compact&&MOTS_WOLOF.has(compact[1]));
}
export function indicesLangue(texte: string) {
  let wo=0, fr=0;
  for (const mot of texte.toLowerCase().normalize("NFC").match(/\p{L}+/gu) || []) {
    if (COMMUNS.has(mot)) continue;
    if (estMotWolof(mot)) wo++;
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
export type PassageVoix = {texte:string; langue:LangueVoix; prise?:Partial<Record<'female'|'male',number>>};
/** Preserve the source exactly. Unknown words inherit their neighbouring context.
 * This is a lexical detector, not a guarantee for every homograph or unknown word. */
export function passagesLanguesVoix(texte:string, defaut:LangueVoix="wo", empruntsFrancais:readonly string[]=[], expressionsWolof:readonly string[]=[]):PassageVoix[] {
  const out:PassageVoix[]=[];
  empruntsFrancais=[...EMPRUNTS_FRANCAIS,...empruntsFrancais];
  const emprunts=new Set([...empruntsFrancais,"franc","francs","CFA","FCFA","XOF"].map(m=>m.toLocaleLowerCase().normalize("NFC")));
  const motsDe=(phrases:readonly string[])=>new Set(phrases.flatMap(p=>p.toLowerCase().normalize('NFC').match(/\p{L}+/gu)||[]));
  const apprisFr=motsDe(empruntsFrancais),apprisWo=motsDe(expressionsWolof);
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
      // A learned isolated French "la"/"ma" cannot reclassify Wolof grammar.
      if(words.length===1&&(COMMUNS.has(words[0])||estMotWolof(words[0])))continue;
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
      if(mots.length===1&&emprunts.has(mots[0])&&!COMMUNS.has(mots[0])&&!estMotWolof(mots[0]))return "fr" as const;
      const {wo,fr}=indicesLangue(token);
      if(wo)return 'wo' as const;
      if(fr||/\d/u.test(token))return 'fr' as const;
      if(mots.length===1&&!COMMUNS.has(mots[0])){
        if(apprisFr.has(mots[0])&&!apprisWo.has(mots[0]))return 'fr' as const;
        if(apprisWo.has(mots[0])&&!apprisFr.has(mots[0]))return 'wo' as const;
      }
      return null;
    });
    // Neutral words follow the sentence or matching neighbours, never blindly
    // the last French borrowing ("prix la", "message bi", "explication xale...").
    const base=detecterLangue(sentence,defaut);
    const resolues=labels.map((label,i)=>{
      if(label)return label;
      const gauche=labels.slice(0,i).reverse().find(Boolean),droite=labels.slice(i+1).find(Boolean);
      return gauche&&droite&&gauche===droite?gauche:base;
    });
    let current:LangueVoix=resolues[0]||base;
    let buf="";
    for(let i=0;i<tokens.length;i++){
      const label=resolues[i];
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
   if(COMMUNS.has(key)||(!estMotWolof(key)&&!MOTS_FRANCAIS.has(key)))out.add(mot);
  }
 }
 return [...out];
}
