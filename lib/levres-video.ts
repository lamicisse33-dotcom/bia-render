/** Déformation douce de la même image vidéo : jamais de lèvres rapportées. */
export function echelleLevres(niveau:number,gap:number,parle:boolean){
 if(!parle||!Number.isFinite(niveau))return 1;
 const energie=Math.max(0,Math.min(1,niveau));
 // Une déformation limitée préserve les dents et la morphologie d'origine.
 const cible=.76+.54*Math.sqrt(energie);
 return Math.max(.76,Math.min(1.3,1+(cible-1)*Math.min(1,Math.max(0,gap)/.025)));
}
export function lisserLevres(avant:number,cible:number,dt:number){
 return avant+(cible-avant)*(1-Math.exp(-Math.max(0,Math.min(100,dt))/(cible>avant?65:110)));
}
export function origineLevre(y:number,x:number,largeur:number,gap:number,echelle:number){
 const r=largeur*.65,source=Math.max(3,largeur*(.04+gap*.5)),cible=source*echelle,ay=Math.abs(y);
 const smooth=(a:number,b:number,v:number)=>{const t=Math.max(0,Math.min(1,(v-a)/(b-a)));return t*t*(3-2*t);};
 const poids=(1-smooth(largeur*.32,largeur*.6,Math.abs(x)))*(1-smooth(r*.8,r,ay));
 const sy=ay<cible?ay*source/cible:source+(ay-cible)*(r-source)/Math.max(1,r-cible);
 return y+(Math.sign(y)*sy-y)*poids;
}
