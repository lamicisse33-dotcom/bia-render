// Separate from the validated ordinary capture: snapshots do not stop listening.
class CaptureReprise extends AudioWorkletProcessor{
 constructor(){super();this.sum=0;this.count=0;this.phase=0;this.pcm=[];this.port.onmessage=({data:d})=>{if(d==='apercu'){this.envoyer();this.port.postMessage({apercu:true});}};}
 envoyer(){if(!this.pcm.length)return;const pcm=Float32Array.from(this.pcm);this.pcm=[];this.port.postMessage({pcm},[pcm.buffer]);}
 process(inputs){const a=inputs[0]?.[0];if(!a)return true;for(const x of a){this.sum+=x;this.count++;this.phase+=16000;if(this.phase>=sampleRate){this.phase-=sampleRate;this.pcm.push(this.sum/this.count);this.sum=0;this.count=0;}if(this.pcm.length>=4000)this.envoyer();}return true;}
}
registerProcessor('bia-reprise',CaptureReprise);
