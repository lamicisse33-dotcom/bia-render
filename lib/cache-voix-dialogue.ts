/** Bounded process-local cache. Keys include model configuration, voice,
 * language and exact prepared text. No audio or text goes into logs. */
export class CacheVoixDialogue<T>{
 private entries=new Map<string,{value:T;bytes:number;expires:number}>();private bytes=0;
 constructor(private maxBytes=32*1024*1024,private ttl=30*60_000,private now=Date.now){}
 get(key:string):T|undefined{const x=this.entries.get(key);if(!x)return;if(x.expires<=this.now()){this.remove(key);return;}this.entries.delete(key);this.entries.set(key,x);return x.value;}
 set(key:string,value:T,bytes:number){if(!Number.isFinite(bytes)||bytes<=0||bytes>this.maxBytes)return;this.remove(key);while(this.bytes+bytes>this.maxBytes&&this.entries.size)this.remove(this.entries.keys().next().value!);this.entries.set(key,{value,bytes,expires:this.now()+this.ttl});this.bytes+=bytes;}
 private remove(key:string){const x=this.entries.get(key);if(x){this.bytes-=x.bytes;this.entries.delete(key);}}
}
