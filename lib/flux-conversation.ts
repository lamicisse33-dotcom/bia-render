type Usage = Record<string, unknown>;
type Paquet = { model?: string; error?: {message?:string}; usage?: Usage; x_groq?:{usage?:Usage}; choices?: Array<{index?:number;delta?:{content?:string};finish_reason?:string|null}> };
export async function lireFluxConversation(reponse: Response, emettre: (texte:string)=>void) {
  if (!reponse.body) throw new Error("Flux du cerveau absent");
  const reader = reponse.body.getReader(), decoder = new TextDecoder();
  let buffer="", content="", model="", finish="", usage:Usage={}, termine=false;
  const traiter = (line:string) => {
    if (!line.startsWith("data:")) return;
    const raw=line.slice(5).trim();
    if (raw === "[DONE]") {termine=true;return;}
    if (!raw) return;
    const p=JSON.parse(raw) as Paquet;
    if(p.error) throw new Error("Le flux du cerveau a échoué");
    if(p.model) model=p.model;
    if(p.usage || p.x_groq?.usage) usage=p.usage || p.x_groq!.usage!;
    for(const choice of p.choices || []) {
      if((choice.index || 0)!==0) continue;
      if(choice.finish_reason) finish=choice.finish_reason;
      const delta=choice.delta?.content;
      if(typeof delta==="string" && delta) {content+=delta;emettre(delta);}
    }
  };
  try {
    for (;;) {
      const {done,value}=await reader.read();
      buffer+=done ? decoder.decode() : decoder.decode(value,{stream:true});
      let cut:number;
      while((cut=buffer.indexOf("\n"))>=0) {
        traiter(buffer.slice(0,cut).replace(/\r$/,"")); buffer=buffer.slice(cut+1);
      }
      if(done) break;
    }
    if(buffer.trim()) traiter(buffer.replace(/\r$/,""));
    if(!termine && !finish) throw new Error("Flux du cerveau interrompu");
    return {model,usage,choices:[{message:{content},finish_reason:finish || "stop"}]};
  } catch(e) {await reader.cancel().catch(()=>{});throw e;}
  finally {reader.releaseLock();}
}
