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
