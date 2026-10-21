type Verrou={released?:boolean;release:()=>Promise<void>;addEventListener?:(type:string,fn:()=>void)=>void};
/** One native lock at a time. Never play silent media alongside BIA's voice. */
export function maintenirEcranEveille(o:{api?:{request:(type:'screen')=>Promise<Verrou>};visible:()=>boolean;noter:(event:'tenu'|'refuse'|'relache'|'api_absente',detail?:string)=>void;ecouter:(event:string,fn:()=>void)=>()=>void;planifier?:(fn:()=>void,ms:number)=>ReturnType<typeof setTimeout>;annuler?:(id:ReturnType<typeof setTimeout>)=>void}){
 let vivant=true,verrou:Verrou|null=null,enCours=false,timer:ReturnType<typeof setTimeout>|undefined;
 const planifier=o.planifier||setTimeout,annuler=o.annuler||clearTimeout;
 const programmer=(ms:number)=>{if(timer!==undefined)annuler(timer);if(vivant&&o.visible())timer=planifier(()=>{timer=undefined;void tenir();},ms);};
 const tenir=async()=>{
  if(!vivant||!o.visible()||!o.api||enCours)return;
  if(verrou&&!verrou.released){programmer(30000);return;}
  enCours=true;
  try{
   const nouveau=await o.api.request('screen');
   if(!vivant||!o.visible()){await nouveau.release();return;}
   verrou=nouveau;o.noter('tenu');
   let libere=false;
   nouveau.addEventListener?.('release',()=>{if(libere)return;libere=true;if(vivant)o.noter('relache');if(verrou===nouveau){verrou=null;programmer(1000);}});
  }catch(e){if(vivant)o.noter('refuse',e instanceof Error?e.name:'refus');programmer(15000);}
  finally{enCours=false;if(vivant&&o.visible()&&timer===undefined)programmer(verrou?30000:1000);}
 };
 const changer=()=>{
  if(!o.visible()){if(timer!==undefined)annuler(timer);timer=undefined;const ancien=verrou;verrou=null;void ancien?.release().catch(()=>{});}
  else void tenir();
 };
 const fins=['visibilitychange','pageshow','focus','pointerdown'].map(e=>o.ecouter(e,changer));
 if(!o.api)o.noter('api_absente');else void tenir();
 return ()=>{vivant=false;fins.forEach(f=>f());if(timer!==undefined)annuler(timer);const ancien=verrou;verrou=null;void ancien?.release().catch(()=>{});};
}
