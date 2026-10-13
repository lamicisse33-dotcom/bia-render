/** Keep the answer and its first complete question; then wait for the speaker.
 * URLs are not questions. Faithful quotations/readings bypass this helper. */
export function uneQuestionParTour(texte:string){
 const liens=[...texte.matchAll(/https?:\/\/\S+/g)].map(m=>[m.index!,m.index!+m[0].length]);
 const questions=[...texte.matchAll(/\?/g)].filter(m=>!liens.some(([a,b])=>m.index!>=a&&m.index!<b));
 return questions.length>1?texte.slice(0,questions[0].index!+1).trim():texte;
}
