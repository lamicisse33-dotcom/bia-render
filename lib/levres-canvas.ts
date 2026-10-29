import {echelleLevres,lisserLevres,origineLevre} from './levres-video';
/** Même déformation locale en Canvas2D pour les navigateurs sans WebGL.
 * La texture provient toujours de l'image vidéo courante, jamais d'un atlas. */
export function dessinerLevresCompatibles(c:HTMLCanvasElement,lire:()=>{video:HTMLVideoElement|null;tr:number[]|null;niveau:number;parle:boolean},erreur:()=>void){
 const ctx=c.getContext('2d',{alpha:false}),patch=document.createElement('canvas'),p=patch.getContext('2d',{alpha:false});
 if(!ctx||!p){erreur();return()=>{};}
 let stop=false,raf=0,avant=performance.now(),dernier=0,scale=1,compte=0,mesureDebut=performance.now();
 c.dataset.rendu='canvas2d';
 const peindre=(t:number)=>{
  if(stop)return;
  if(t-dernier>=30){
   const e=lire(),v=e.video,tr=e.tr;
   if(v&&tr&&v.readyState>=2&&!v.seeking){
    if(c.width!==v.videoWidth||c.height!==v.videoHeight){c.width=v.videoWidth;c.height=v.videoHeight;}
    scale=lisserLevres(scale,echelleLevres(e.niveau,tr[4],e.parle),t-avant);
    try{
     ctx.drawImage(v,0,0,c.width,c.height);
     if(Math.abs(scale-1)>.002){
      const rx=Math.ceil(tr[2]*.6),ry=Math.ceil(tr[2]*.65);
      if(patch.width!==rx*2||patch.height!==ry*2){patch.width=rx*2;patch.height=ry*2;}
      p.setTransform(1,0,0,1,rx,ry);p.rotate(-tr[3]);p.drawImage(v,-tr[0],-tr[1]);
      ctx.save();ctx.translate(tr[0],tr[1]);ctx.rotate(tr[3]);
      const dx=rx/8,dy=ry/18;
      for(let x=-rx;x<rx-.01;x+=dx)for(let y=-ry;y<ry-.01;y+=dy){
       const a=origineLevre(y,x+dx/2,tr[2],tr[4],scale),b=origineLevre(y+dy,x+dx/2,tr[2],tr[4],scale);
       ctx.drawImage(patch,x+rx,a+ry,dx,Math.max(.01,b-a),x,y,dx+.1,dy+.1);
      }
      ctx.restore();
     }
     compte++;if(t-mesureDebut>=1000){c.dataset.fps=(compte*1000/(t-mesureDebut)).toFixed(1);compte=0;mesureDebut=t;}
    }catch{stop=true;erreur();return;}
   }
   avant=t;dernier=t;
  }
  raf=requestAnimationFrame(peindre);
 };raf=requestAnimationFrame(peindre);
 return()=>{stop=true;cancelAnimationFrame(raf);};
}
