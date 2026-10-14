// Only a temporary PCM ring goes to a local worker. Nothing is uploaded.
class CaptureLocuteur extends AudioWorkletProcessor{
 constructor(){super();this.sum=0;this.count=0;this.phase=0;this.pcm=[];}
 process(inputs){
  const a=inputs[0]?.[0];if(!a)return true;
  for(const x of a){
   this.sum+=x;this.count++;this.phase+=16000;
   if(this.phase>=sampleRate){this.phase-=sampleRate;this.pcm.push(this.sum/this.count);this.sum=0;this.count=0;}
   if(this.pcm.length===1600){const data=Float32Array.from(this.pcm);this.pcm=[];this.port.postMessage(data,[data.buffer]);}
  }
  return true;
 }
}
registerProcessor('bia-locuteur',CaptureLocuteur);
