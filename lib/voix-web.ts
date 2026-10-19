/** Adds SpeechT5 only for its explicit route; the original Piper module is unchanged. */
import * as piper from './piper-web';
import * as speech from './speecht5-web';
export const piperWebActif=()=>piper.piperWebActif()||speech.speecht5WebActif();
export const vitessePiperWeb=()=>speech.speecht5WebActif()?1:piper.vitessePiperWeb();
export const etatPiperWeb=()=>speech.speecht5WebActif()?speech.etatSpeechT5():piper.etatPiperWeb();
export const preparerPiperWeb=(code:string)=>speech.speecht5WebActif()?speech.preparerSpeechT5(code):piper.preparerPiperWeb(code);
export const mesurerPiperWeb=(etape:string,ms=0)=>speech.speecht5WebActif()?speech.mesurerSpeechT5(etape,ms):piper.mesurerPiperWeb(etape,ms);
export async function fetchVoixBia(url:string,init:RequestInit):Promise<Response>{
 if(url!=='/api/speecht5-web/synthese')return piper.fetchVoixBia(url,init);
 const body=JSON.parse(String(init.body));
 return Response.json(await speech.lireSpeechT5(body.texte,body.partie??0,new Headers(init.headers).get('x-bia-code')||'',init.signal??undefined));
}
