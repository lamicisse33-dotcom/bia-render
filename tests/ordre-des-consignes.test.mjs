/* ── RIEN DE MOBILE DEVANT LE CACHE ─────────────────────────────────────────

   Lamine, le 26 octobre 2026 : « montre-moi l'ORDRE des blocs envoyés au
   modèle et dis-moi lesquels changent à chaque tour. Mets le stable d'abord,
   le variable en dernier. »

   LA FAUTE QU'IL A FAIT TROUVER. Le bloc des devoirs était premier, devant le
   socle mis en cache. Il sort de contexteDevoirs(question, history) : il
   change à chaque tour. Un cache de préfixe ne se lit que si tout ce qui le
   précède est identique — ce bloc rendait donc illisibles les 56 564 signes
   de socle et de registre placés derrière lui.

   CE QUE CETTE ÉPREUVE PROTÈGE, ET POURQUOI ELLE LIT LA SOURCE. Le défaut ne
   se voit pas à l'exécution : la réponse est juste, la consigne est complète,
   la facture seule le dit, trois jours plus tard. Il ne se voit que dans
   l'ORDRE du tableau. On lit donc le tableau lui-même, et on exige que le
   dernier bloc portant `cache_control` arrive avant le premier bloc qui n'en
   porte pas. Le jour où quelqu'un ajoutera un bloc, il le mettra derrière —
   ou cette épreuve le dira avant la facture.                              */
import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';

const source = fs.readFileSync('app/api/chat/route.ts', 'utf8');

test('aucun bloc à plein tarif ne précède un bloc mis en cache', () => {
  const debut = source.indexOf('const consigne=[');
  assert(debut > 0, 'le tableau des consignes doit rester trouvable');
  const fin = source.indexOf('];', debut);
  const tableau = source.slice(debut, fin);

  /* Une ligne par bloc, dans l'ordre d'envoi. On ne garde que les lignes qui
     poussent vraiment un bloc de texte au modèle. */
  const blocs = tableau.split('\n')
    .filter((l) => l.includes('{type:"text"'))
    .map((l) => ({ cache: l.includes('cache_control'), ligne: l.trim() }));

  assert(blocs.length >= 4, `on attend au moins quatre blocs, vu ${blocs.length}`);
  assert(blocs.some((b) => b.cache), 'au moins un bloc doit être mis en cache');

  const dernierEnCache = blocs.reduce((n, b, i) => (b.cache ? i : n), -1);
  const premierPleinTarif = blocs.findIndex((b) => !b.cache);

  if (premierPleinTarif !== -1) {
    assert(
      premierPleinTarif > dernierEnCache,
      `le bloc à plein tarif n° ${premierPleinTarif + 1} précède le dernier bloc en cache `
      + `(n° ${dernierEnCache + 1}) : il rend ce cache illisible. Bloc fautif : ${blocs[premierPleinTarif].ligne}`,
    );
  }
});

test('le socle et le registre restent les deux blocs mis en cache, et ils ouvrent la pile', () => {
  const debut = source.indexOf('const consigne=[');
  const tableau = source.slice(debut, source.indexOf('];', debut));
  const blocs = tableau.split('\n').filter((l) => l.includes('{type:"text"'));
  assert(blocs[0].includes('text:socle') && blocs[0].includes('cache_control'),
    'le socle doit rester le premier bloc, et rester en cache');
  assert(blocs[1].includes('text:registre') && blocs[1].includes('cache_control'),
    'le registre doit rester le second bloc, et rester en cache');
  /* Et le bloc qui dépend de la question doit rester DERRIÈRE eux. */
  const devoirs = blocs.findIndex((l) => l.includes('text:devoirs'));
  assert(devoirs === -1 || devoirs >= 2, 'les devoirs dépendent de la question : jamais devant le cache');
});
