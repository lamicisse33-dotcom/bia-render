// Suspended after live full-recording failures. Old open tabs must not start ASR.
export async function POST(){
 return Response.json({acceptee:false,raison:'anticipation_suspendue'});
}
