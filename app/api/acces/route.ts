import {NextRequest,NextResponse} from 'next/server';
import {verifierEntree} from '@/lib/codes';
import {verifierNumero,noterEssaiRate,tropDEssais} from '@/lib/acces-lien';
import {empreinteCode} from '@/lib/acces-numero';
import {MESSAGES_NUMERO} from '@/lib/acces-numero';

/* ── LA PORTE : UN NUMÉRO ET UN CODE, LES DEUX OBLIGATOIRES ────────────────

   Lamine, le 28 octobre 2026. Avant ce jour, un code suffisait, et il
   suffisait à n'importe qui l'ayant reçu par WhatsApp — un code prêté
   marchait sur dix téléphones.

   LE NUMÉRO NE PASSE QUE PAR UN EN-TÊTE, jamais par l'adresse : une adresse
   se retrouve dans l'historique du navigateur, dans les journaux du serveur
   et dans le référent envoyé au site suivant. Rien ici n'écrit le numéro
   dans un journal, et la réponse ne le renvoie pas. */
export async function GET(request:NextRequest){
 const code=request.headers.get('x-bia-code');
 const numero=request.headers.get('x-bia-numero');
 const cle=empreinteCode(code||'');
 if(cle&&tropDEssais(cle))
  return NextResponse.json({ok:false,erreur:MESSAGES_NUMERO.essais},{status:429,headers:{'cache-control':'no-store'}});

 const verdict=verifierEntree(code);
 const messages={absent:'Saisis ton code d’accès.',invalide:'Code refusé. Vérifie ton code.',expire:'Ce code a expiré.',epuise:'Ce code a atteint sa limite d’utilisation.'};
 if(!verdict.ok){
  /* Un code refusé compte comme un essai : c'est CE compteur qui freine
     celui qui en essaie cent à la suite. Un code absent, non — personne ne
     devine en laissant le champ vide, et le compter bloquerait la page qui
     interroge la porte avant que l'utilisateur ait tapé quoi que ce soit. */
  if(verdict.raison==='invalide'&&cle)noterEssaiRate(cle);
  return NextResponse.json({ok:false,erreur:messages[verdict.raison]},{status:401,headers:{'cache-control':'no-store'}});
 }

 const numeroOk=await verifierNumero(code||'',numero,verdict.maitre);
 if(!numeroOk.ok)
  return NextResponse.json({ok:false,erreur:numeroOk.message},{status:401,headers:{'cache-control':'no-store'}});

 return NextResponse.json({ok:true,maitre:verdict.maitre,lie:numeroOk.lie},
  {status:200,headers:{'cache-control':'no-store'}});
}
