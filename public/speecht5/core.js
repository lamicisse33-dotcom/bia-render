(function(root){
function encode(text,config){
 if(config.vocab["’"]===undefined&&Number.isInteger(config.vocab["'"]))text=String(text).replace(/[’‘]/g,"'");
 const clean=String(text).normalize('NFKC').replace(/\s+/gu,' ').trim();
 if(!clean)return [];
 const chars=Array.from('▁'+clean.replace(/ /g,'▁'));
 const ids=chars.map(c=>{const id=config.vocab[c];if(!Number.isInteger(id))throw Error('SpeechT5 ne reconnaît pas le caractère « '+c+' ».');return id;});
 return [...ids,config.eos];
}
function split(text){
 const words=String(text).trim().split(/\s+/u).filter(Boolean),parts=[];let line='';
 for(const word of words){if(Array.from(word).length>120)throw Error('Un mot est trop long pour cet essai SpeechT5.');if(line&&Array.from(line+' '+word).length>120){parts.push(line);line='';}line+=(line?' ':'')+word;}
 if(line)parts.push(line);return parts;
}
root.BiaSpeechT5Core={encode,split};
})(typeof self==='undefined'?globalThis:self);
