/** Format attendu par le relais avatar : mono PCM16 little endian à 16 kHz.
 * Une conversion conserve la durée entière, y compris les silences. */
export function pcmPourAvatar(canaux:readonly Float32Array[],hz:number){
 if(!canaux.length||!Number.isFinite(hz)||hz<=0||canaux.some(c=>c.length!==canaux[0].length))throw Error('Format audio invalide');
 const n=canaux[0].length,taille=Math.round(n*16000/hz),octets=new Uint8Array(taille*2),vue=new DataView(octets.buffer);
 for(let j=0;j<taille;j++){
  const p=j*hz/16000,i=Math.min(n-1,Math.floor(p)),k=Math.min(n-1,i+1),f=p-i;
  let v=0;for(const c of canaux)v+=(c[i]||0)*(1-f)+(c[k]||0)*f;
  v=Math.max(-1,Math.min(1,v/canaux.length));vue.setInt16(j*2,Math.round(v*(v<0?32768:32767)),true);
 }
 return octets;
}
