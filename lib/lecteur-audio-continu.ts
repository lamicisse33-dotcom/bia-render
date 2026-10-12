type Entree={buffer:AudioBuffer;offset:number;debut:number;source:AudioBufferSourceNode|null};
/** Schedule complete clips on the audio clock while later clips are decoded.
 * Pause retains offsets and queued clips; stopping rejects the active reading. */
export class LecteurAudioContinu {
 private entrees:Entree[]=[];
 private pausee=false;
 private finie=false;
 private attente:{resolve:()=>void;reject:(e:Error)=>void}|null=null;
 private erreur:Error|null=null;
 private commence=false;
 private finPrevue:number|null=null;
 readonly bilan={morceaux:0,couture_max_ms:0,couture_totale_ms:0};
 constructor(private ctx:BaseAudioContext,private premierSon:()=>void=()=>{}){}
 ajouter(buffer:AudioBuffer){
  if(this.erreur)throw this.erreur;
  if(this.finie)throw Error('Lecture déjà clôturée');
  this.entrees.push({buffer,offset:0,debut:0,source:null});
  this.bilan.morceaux++;
  if(!this.pausee)this.programmer();
 }
 private programmer(){
  let prochain=Math.max(this.ctx.currentTime+.025,this.finPrevue??0);
  for(const e of this.entrees){
   if(e.source){prochain=Math.max(prochain,e.debut+e.buffer.duration-e.offset);continue;}
   const source=this.ctx.createBufferSource();source.buffer=e.buffer;source.connect(this.ctx.destination);
   e.source=source;e.debut=prochain;
   source.onended=()=>{
    if(e.source!==source)return;
    source.disconnect();e.source=null;this.entrees=this.entrees.filter(x=>x!==e);
    if(this.finie&&!this.entrees.length){this.attente?.resolve();this.attente=null;}
   };
   source.start(prochain,e.offset);prochain+=e.buffer.duration-e.offset;
   const trou=this.finPrevue===null?0:Math.round(Math.max(0,e.debut-this.finPrevue)*1000);
   this.bilan.couture_max_ms=Math.max(this.bilan.couture_max_ms,trou);this.bilan.couture_totale_ms+=trou;
   this.finPrevue=prochain;
   if(!this.commence){this.commence=true;this.premierSon();}
  }
 }
 pause(){
  this.pausee=true;
  this.finPrevue=null;
  for(const e of this.entrees)if(e.source){
   e.offset=Math.min(e.buffer.duration,e.offset+Math.max(0,this.ctx.currentTime-e.debut));
   e.source.onended=null;e.source.stop();e.source.disconnect();e.source=null;
  }
 }
 reprendre(){if(this.erreur)return;this.pausee=false;this.programmer();}
 terminer():Promise<void>{
  this.finie=true;
  if(this.erreur)return Promise.reject(this.erreur);
  if(!this.entrees.length)return Promise.resolve();
  return new Promise((resolve,reject)=>{this.attente={resolve,reject};});
 }
 arreter(erreur=new Error('arrêté')){
  this.pause();this.erreur=erreur;this.entrees=[];this.attente?.reject(erreur);this.attente=null;
 }
}
