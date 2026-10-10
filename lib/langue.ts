/* Détection français / wolof — reprise du module de l'Interprète, réduite à
   ce dont BIA a besoin : savoir dans quelle langue lire une réponse. */

const MOTS_WOLOF = new Set(["maa","mangi","maangi","naa","nga","ngeen","yaa","yow","moom","noo","ñu","ñungi","ñoom","yeen","mooy","moo","lañu","lañ","laa","nañu","dafa","dafay","dama","damay","dinaa","dina","dinañu","doon","naan","wara","war","mën","bëgg","begg","naka","ndax","ñaata","naata","lan","lu","kan","ku","fan","fu","kañ","ana","nu","waaw","déedéet","deedeet","jërëjëf","jerejef","baax","baaxna","amul","amna","jamm","nanga","noppi","waay","kay","dem","ñëw","new","wax","def","jënd","jaay","jox","lekk","toog","taxaw","jàng","jang","liggéey","liggeey","dellu","jël","xam","gis","ci","ak","itam","rekk","léegi","leegi","tey","suba","démb","demb","walla","te","ndaxte","bala","ginnaaw","fii","foofu","lépp","lepp","yépp","bépp","beneen","xaalis","dërëm","njëg","salaam","salam","man","sama","bi","yi"]);

const MOTS_FRANCAIS = new Set(["taxi","texte","lecture","exercice","numéro","rue","lune","plume","sucre","du","lis","lire","utilise","utiliser","français","française","j","l","d","qu","le","les","de","des","un","une","et","est","sont","était","je","tu","il","elle","nous","vous","ils","elles","on","que","qui","quoi","pour","avec","dans","sur","sous","chez","pas","mais","donc","alors","aussi","très","plus","moins","combien","pourquoi","comment","quand","où","quel","quelle","bonjour","merci","oui","non","monsieur","madame","ai","as","avez","avons","suis","êtes","sommes","peux","peut","veux","veut","voulez","faire","fait","aller","vais","prendre","ce","cette","ces","mon","ma","mes","ton","votre","vos","leur","au","aux","en","se","me","te","lui","nos","notre","être","avoir","cela","tout","tous","comme","son","sa","ses","par","si","bien"]);

const LETTRES_WOLOF = /[ñŋ]|ë/;

/** 'wo' | 'fr' — le wolof l'emporte en cas d'égalité, c'est la langue de BIA. */
export function detecterLangue(texte: string): "wo" | "fr" {
  const mots = String(texte || "").toLowerCase()
    .replace(/[’']/g, " ").replace(/[.,!?;:()«»"…]/g, " ")
    .split(/\s+/).filter(Boolean);

  let wo = 0, fr = 0;
  for (const mot of mots) {
    if (MOTS_WOLOF.has(mot)) wo += 1;
    else if (MOTS_FRANCAIS.has(mot)) fr += 1;
    else if (LETTRES_WOLOF.test(mot)) wo += 0.75;
  }
  return wo >= fr ? "wo" : "fr";
}
