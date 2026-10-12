/** A pending upload must never delay the complete recording already at hand. */
export async function envoyerEcoute(
  legere: FormData, entiere: FormData,
  depot: {total: number; deposes: number; perdu: boolean},
  envoyer: (corps: FormData) => Promise<Response>,
) {
  const confirme = !depot.perdu && depot.total > 0 && depot.deposes === depot.total;
  const r = await envoyer(confirme ? legere : entiere);
  // A restart or another instance may have lost an acknowledged deposit.
  return confirme && r.status === 409 ? envoyer(entiere) : r;
}
