/** Treat common spoken/transcribed spellings as the same known brand. */
export function concerneProduits(question:string,historique:unknown=[]):boolean{
 const n=(t:string)=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[’'-]/g,' ');
 const marque=/\b(?:d[\s.-]*d[\s.-]*skin(?:g)?|dede[\s.-]*skin(?:g)?|ddsking)\b/;
 const sujet=/\b(?:cosmetiques?|produits? de beaute|savon noir|savon (?:pour le |du )?visage|lotion nettoyante|black soap|face soap|cleansing lotion)\b/;
 const q=n(question);
 if(marque.test(q)||sujet.test(q))return true;
 if(!/^(?:et\b|oui\b|non\b|d accord\b|leurs?\b|ses\b|ces\b|(?:quels?|quelles?) (?:sont |produits|gammes)|combien\b|ou (?:les|la|le|peut|puis)|comment (?:les|la|le|commander)|donne(?: moi)? (?:leur|son|le numero)|c est quoi\b|ca\b)/.test(q))return false;
 if(!Array.isArray(historique))return false;
 return historique.slice(-4).some(t=>t&&typeof t==='object'&&marque.test(n(String(t.text??t.content??''))));
}
