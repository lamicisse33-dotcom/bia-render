import type {MorceauVoix} from "./flux-khalam";
export function piperLocaleDisponible():boolean {
 if(typeof window==="undefined")return false;
 const engine=(window as Window&{BiaLocalVoice?:{epoch?:number;settings?:unknown}}).BiaLocalVoice;
 return typeof engine?.epoch==="number"&&typeof engine.settings==="function";
}
/** /api/voix is intercepted by the installed WKWebView adapter: no TTS network request. */
export async function lirePiperLocale(texte:string,partie:number,signal:AbortSignal):Promise<MorceauVoix>{
 if(!piperLocaleDisponible())throw Error("Piper est absent de cette fenêtre. Ouvre l’application BIA installée sur le téléphone.");
 const r=await fetch("/api/voix",{method:"POST",signal,headers:{"content-type":"application/json"},body:JSON.stringify({texte,partie,ou:"apprentissage"})});
 if(!r.ok||!r.headers.get("x-bia-local-voice"))throw Error("Le pont Piper du téléphone n’a pas répondu.");
 const d=await r.json();
 if(!Number.isSafeInteger(d.parties)||d.parties<1||typeof d.audio!=="string"||!d.audio)throw Error("Piper n’a produit aucun son.");
 return d;
}
