/* Exact text/NFD alphabet of the Khalam Gratuit export. No phonetic rewrite. */
globalThis.KhalamPiperCore = {
 encode(text, config) {
  const map=config.phoneme_id_map;
  if(config.phoneme_type!=='text'||!map['^']?.length||!map['_']?.length||!map['$']?.length)throw Error('Alphabet Khalam Gratuit invalide.');
  const normalized=text.replace(/[’‘]/g,"'").replace(/[“”]/g,'"').replace(/…/g,'...').replace(/[–—]/g,'-').replace(/\s+/gu,' ').trim().normalize('NFD');
  const ids=[...map['^'],...map['_']],unknown=new Set();
  for(const char of normalized){
   /* ── UN MODÈLE ENTRAÎNÉ EN MINUSCULES ───────────────────────
      La table de Khalam Gratuit ne porte qu'une majuscule, « X » : son
      corpus était tout en minuscules. Or une phrase ordinaire commence
      par une majuscule — sans ce repli, le moteur refusait TOUTES les
      phrases, « Nanga def ? » comme « Bonjour ».

      Une majuscule ne s'entend pas : on prend donc sa minuscule quand
      le modèle la connaît, au lieu de se taire. On ne descend que sur
      un signe INCONNU — un modèle qui porte ses majuscules, comme
      l'ancien, garde donc exactement les siennes. */
   const signe=map[char]?.length?char
    :(char.toLowerCase()!==char&&map[char.toLowerCase()]?.length?char.toLowerCase():char);
   if(['^','_','$'].includes(char)||!map[signe]?.length){unknown.add(char);continue;}
   ids.push(...map[signe],...map['_']);
  }
  if(unknown.size)throw Error('Khalam Gratuit ne connaît pas ces caractères : '+[...unknown].join(' ')+'. Corrige le texte avant lecture.');
  if(!normalized)throw Error('Le texte est vide.');
  ids.push(...map['$']);return ids;
 },
 split(text) {
  if(typeof text!=='string'||text.length>50000)throw Error('Texte trop long.');
  const chars=Array.from(text.trim()),parts=[];
  while(chars.length){
   let end=Math.min(220,chars.length);
   if(end<chars.length){
    let boundary=-1;
    for(let i=0;i<end;i++)if(/[.!?;:]/u.test(chars[i])&&/\s/u.test(chars[i+1]||'')&&i>35)boundary=i+1;
    if(boundary<0)for(let i=end-1;i>0;i--)if(/\s/u.test(chars[i])){boundary=i;break;}
    if(boundary<1)throw Error('Un mot est trop long pour Khalam Gratuit.');
    end=boundary;
   }
   const part=chars.splice(0,end).join('').trim();if(part)parts.push(part);
  }
  if(!parts.length)throw Error('Le texte est vide.');return parts;
 },
 wav(audio, rate) {
  if(!audio.length||audio.some(x=>!Number.isFinite(x)))throw Error('Son Khalam Gratuit invalide.');
  let peak=0;for(const x of audio)peak=Math.max(peak,Math.abs(x));
  if(peak<.00001)throw Error('Khalam Gratuit a produit du silence.');
  const buf=new ArrayBuffer(44+audio.length*2),v=new DataView(buf);
  const str=(at,s)=>{for(let i=0;i<s.length;i++)v.setUint8(at+i,s.charCodeAt(i));};
  str(0,'RIFF');v.setUint32(4,buf.byteLength-8,true);str(8,'WAVE');str(12,'fmt ');
  v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,rate,true);
  v.setUint32(28,rate*2,true);v.setUint16(32,2,true);v.setUint16(34,16,true);str(36,'data');v.setUint32(40,audio.length*2,true);
  for(let i=0;i<audio.length;i++)v.setInt16(44+i*2,Math.round(Math.max(-1,Math.min(1,audio[i]))*32767),true);
  return buf;
 }
};
