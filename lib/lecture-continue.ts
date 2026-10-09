export const MAX_EXERCICE = 100_000;
export const MAX_SEGMENT = 500;

/** Preserve every character. A long sentence is split at punctuation first,
 * then a conjunction/word boundary only when the engine limit requires it. */
export function segmentsLecture(texte: string, max = MAX_SEGMENT): string[] {
  if (!texte.trim()) return [];
  if (texte.length > MAX_EXERCICE) throw new Error("Exercice trop long : maximum 100 000 caractères.");
  if (max < 20) throw new Error("Limite de segment invalide");
  const sentences = Array.from(new Intl.Segmenter("fr", {granularity:"sentence"}).segment(texte), s => s.segment);
  const out:string[]=[];
  for (let sentence of sentences) {
    while (sentence.length > max) {
      const head=sentence.slice(0,max);
      const pauses=[...head.matchAll(/[,;:—]\s+|\s+(?=(?:et|mais|car|donc|puis|parce que|ak|te|waaye)\s)/giu)];
      let cut=pauses.length ? pauses[pauses.length-1].index! + pauses[pauses.length-1][0].length : head.lastIndexOf(" ")+1;
      if (cut < 1) { cut=max; if (/[\uD800-\uDBFF]/.test(sentence[cut-1])) cut--; }
      out.push(sentence.slice(0,cut)); sentence=sentence.slice(cut);
    }
    if (sentence) out.push(sentence);
  }
  return out;
}

export type EtatLecture = "prêt"|"lecture"|"pause"|"erreur"|"terminé"|"arrêté";
export type Progression = {etat:EtatLecture; index:number; total:number; erreur?:string};
/** One cursor owns a reading. Failures never skip a segment or claim completion. */
export class LectureContinue {
  private token=0; private paused=false; private running=false;
  private controller:AbortController|null=null;
  private segments:string[]=[]; private index=0; private completion=false;
  constructor(private synthese:(texte:string,signal:AbortSignal)=>Promise<unknown>,
    private jouer:(audio:unknown,signal:AbortSignal)=>Promise<void>,
    private transport:{pause:()=>void; reprendre:()=>void; stop:()=>void},
    private informer:(p:Progression)=>void) {}
  private emit(etat:EtatLecture,erreur?:string) { this.informer({etat,index:this.index,total:this.segments.length,erreur}); }
  demarrer(texte:string) { this.stop(); this.segments=segmentsLecture(texte); this.index=0; this.completion=false;
    if (!this.segments.length) {this.emit("prêt");return;} this.paused=false; this.transport.reprendre(); void this.run(); }
  pause() {this.paused=true;this.transport.pause();this.emit("pause");}
  reprendre() {this.paused=false;this.transport.reprendre();if(!this.running)void this.run();else this.emit("lecture");}
  stop() {this.token++;this.controller?.abort();this.transport.stop();this.running=false;this.paused=true;this.emit("arrêté");}
  private async gate(token:number) {while(this.paused&&token===this.token)await new Promise(r=>setTimeout(r,60));
    if(token!==this.token)throw new Error("arrêté");}
  private async run() {
    if(this.running||!this.segments.length||this.completion)return;
    const token=this.token; this.running=true;this.controller=new AbortController();const signal=this.controller.signal;
    this.emit("lecture");
    try {
      while(this.index<=this.segments.length) {
        await this.gate(token);
        const text=this.index===this.segments.length?"Exercice terminé":this.segments[this.index];
        let succeeded=false;let last="";
        for(let attempt=0;attempt<3;attempt++) {
          try {const audio=await this.synthese(text,signal);await this.gate(token);await this.jouer(audio,signal);
            if(token!==this.token)return;succeeded=true;break;
          } catch(e) {if(signal.aborted||token!==this.token)return;last=e instanceof Error?e.message:"Voix indisponible";
            if(attempt<2)await new Promise(r=>setTimeout(r,400*(attempt+1)));await this.gate(token);}
        }
        if(!succeeded){this.paused=true;this.emit("erreur",last);return;}
        if(this.index===this.segments.length){this.completion=true;this.emit("terminé");return;}
        this.index++;this.emit(this.paused?"pause":"lecture");
      }
    }catch(e){if(token===this.token)this.emit("erreur",String(e));}
    finally{if(token===this.token)this.running=false;}
  }
}
