'use client';
import {useEffect,useRef} from 'react';
import mesures from '../../public/personnages/satin-anime-20261028/levres.json';
import {echelleLevres,lisserLevres} from '@/lib/levres-video';
import {dessinerLevresCompatibles} from '@/lib/levres-canvas';
import type {SequenceSatin} from '@/lib/animation-satin';
const vertex=`attribute vec2 p;varying vec2 uv;void main(){uv=(p+1.)*.5;gl_Position=vec4(p,0,1);}`;
const fragment=`precision highp float;varying vec2 uv;uniform sampler2D image;uniform vec2 size,centre;uniform float largeur,angle,gap,echelle;
void main(){
 vec2 pixel=vec2(uv.x*size.x,(1.-uv.y)*size.y);vec2 d=pixel-centre;
 float c=cos(angle),s=sin(angle);vec2 q=vec2(c*d.x+s*d.y,-s*d.x+c*d.y);
 float rayon=largeur*.65;float source=max(3.,largeur*(.04+gap*.5));float cible=source*echelle;
 float y=abs(q.y);float sy=y<cible?y*source/cible:source+(y-cible)*(rayon-source)/max(1.,rayon-cible);
 float poids=(1.-smoothstep(largeur*.32,largeur*.6,abs(q.x)))*(1.-smoothstep(rayon*.8,rayon,y));
 q.y=mix(q.y,sign(q.y)*sy,poids);vec2 src=centre+vec2(c*q.x-s*q.y,s*q.x+c*q.y);
 gl_FragColor=texture2D(image,vec2(src.x/size.x,1.-src.y/size.y));}`;
/** Prototype isolé : le corps, les yeux et les mains proviennent du même
 * instant vidéo que les lèvres. Aucun atlas ni planche générée n'est utilisé. */
export function LevresVideo({video,clip,niveau,parle,onErreur}:{video:React.RefObject<HTMLVideoElement|null>;clip:SequenceSatin;niveau:()=>number;parle:boolean;onErreur:(message:string)=>void}){
 const tempsVideo=useRef<number|null>(null);
 const canvas=useRef<HTMLCanvasElement>(null),courant=useRef({clip,niveau,parle,onErreur});courant.current={clip,niveau,parle,onErreur};
 useEffect(()=>{
  const v=video.current;if(!v?.requestVideoFrameCallback)return;
  let stop=false,id=0;
  const suivre:VideoFrameRequestCallback=(_t,frame)=>{if(stop)return;tempsVideo.current=frame.mediaTime;id=v.requestVideoFrameCallback(suivre);};
  id=v.requestVideoFrameCallback(suivre);
  return()=>{stop=true;v.cancelVideoFrameCallback(id);tempsVideo.current=null;};
 },[video]);
 useEffect(()=>{
  const c=canvas.current;if(!c)return;
  const gl=c.getContext('webgl',{alpha:false,antialias:false});
  if(!gl)return dessinerLevresCompatibles(c,()=>{
   const e=courant.current,v=video.current,p=mesures[e.clip];
   const tr=v?p.frames[Math.min(p.frames.length-1,Math.max(0,Math.floor((tempsVideo.current??v.currentTime)*p.fps)))]:null;
   return {video:v,tr,niveau:e.niveau(),parle:e.parle};
  },()=>courant.current.onErreur('Rendu vidéo indisponible'));
  c.dataset.rendu='webgl';
  let stop=false,raf=0,avant=performance.now(),scale=1,textureFrame=-1;
  const shader=(type:number,code:string)=>{const sh=gl.createShader(type)!;gl.shaderSource(sh,code);gl.compileShader(sh);if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(sh)||'shader');return sh;};
  let programme:WebGLProgram|null=null,tex:WebGLTexture|null=null,buffer:WebGLBuffer|null=null,vs:WebGLShader|null=null,fs:WebGLShader|null=null;
  try{
   vs=shader(gl.VERTEX_SHADER,vertex);fs=shader(gl.FRAGMENT_SHADER,fragment);programme=gl.createProgram()!;gl.attachShader(programme,vs);gl.attachShader(programme,fs);gl.linkProgram(programme);
   if(!gl.getProgramParameter(programme,gl.LINK_STATUS))throw Error('programme');gl.useProgram(programme);
   buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
   const pos=gl.getAttribLocation(programme,'p');gl.enableVertexAttribArray(pos);gl.vertexAttribPointer(pos,2,gl.FLOAT,false,0,0);
   tex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tex);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
   const u=Object.fromEntries(['size','centre','largeur','angle','gap','echelle'].map(n=>[n,gl.getUniformLocation(programme!,n)]));
   const peindre=(t:number)=>{
    if(stop)return;
    const v=video.current,e=courant.current;
    if(v&&v.readyState>=2&&!v.seeking&&v.videoWidth){
     if(c.width!==v.videoWidth||c.height!==v.videoHeight){c.width=v.videoWidth;c.height=v.videoHeight;gl.viewport(0,0,c.width,c.height);}
     const piste=mesures[e.clip],index=Math.min(piste.frames.length-1,Math.max(0,Math.floor((tempsVideo.current??v.currentTime)*piste.fps))),tr=piste.frames[index];
     scale=lisserLevres(scale,echelleLevres(e.niveau(),tr[4],e.parle),t-avant);
     try{if(textureFrame!==index){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,v);textureFrame=index;}gl.uniform2f(u.size,c.width,c.height);gl.uniform2f(u.centre,tr[0],tr[1]);gl.uniform1f(u.largeur,tr[2]);gl.uniform1f(u.angle,tr[3]);gl.uniform1f(u.gap,tr[4]);gl.uniform1f(u.echelle,scale);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);}catch(err){stop=true;e.onErreur(err instanceof Error?err.message:'Texture vidéo indisponible');return;}
    }
    avant=t;raf=requestAnimationFrame(peindre);
   };raf=requestAnimationFrame(peindre);
  }catch(err){courant.current.onErreur(err instanceof Error?err.message:'Initialisation graphique');}
  const perdu=(e:Event)=>{e.preventDefault();stop=true;courant.current.onErreur('Contexte graphique perdu');};c.addEventListener('webglcontextlost',perdu);
  return()=>{stop=true;cancelAnimationFrame(raf);c.removeEventListener('webglcontextlost',perdu);if(tex)gl.deleteTexture(tex);if(buffer)gl.deleteBuffer(buffer);if(programme)gl.deleteProgram(programme);if(vs)gl.deleteShader(vs);if(fs)gl.deleteShader(fs);};
 },[video]);
 return <canvas ref={canvas} width={1176} height={1764} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'contain',background:'#000'}} aria-label="Bia : essai des lèvres sur la vidéo originale"/>;
}
