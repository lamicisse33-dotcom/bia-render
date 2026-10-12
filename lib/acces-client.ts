export async function verifierAcces(code:string):Promise<{maitre:boolean}>{
 const r=await fetch('/api/acces',{headers:{'x-bia-code':code},cache:'no-store',signal:AbortSignal.timeout(8000)});
 const d=await r.json();
 if(!r.ok||d.ok!==true)throw Error(d.erreur||'Code refusé. Vérifie ton code.');
 return {maitre:d.maitre===true};
}
