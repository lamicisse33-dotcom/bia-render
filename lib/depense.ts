/* ═══════════════════════════════════════════════════════════════════════════
   CE QUE BIA COÛTE, COMPTÉ AU LIEU D'ÊTRE DEVINÉ
   ═══════════════════════════════════════════════════════════════════════════

   Demandé par Lamine le 11 septembre 2026 : « fais le nécessaire pour
   diminuer les charges ».

   La première chose à faire n'est pas d'économiser : c'est de VOIR. Cette
   nuit-là, j'ai estimé son coût par échange trois fois, et je me suis trompé
   deux fois — une fois en comptant une phrase d'attente qu'il avait déjà
   supprimée, une fois en supposant la longueur de ses réponses. On ne règle
   pas une facture au raisonnement.

   Ce fichier compte donc ce qui part VRAIMENT :
   — les signes envoyés à Soynade, par route, parce que c'est ce qu'ils
     facturent — et non les mots affichés à l'écran ;
   — les jetons envoyés au modèle, en distinguant ceux qu'on paie plein tarif
     de ceux qui reviennent du cache, dix fois moins chers.

   ÇA VIT EN MÉMOIRE, et ça repart à zéro quand le serveur redémarre. C'est
   volontaire : aucune base à tenir, aucun coût de plus, et pour ce qu'on en
   fait — savoir où part l'argent d'une journée — c'est suffisant. Le chiffre
   qui fait foi reste celui du tableau de bord de Soynade.

   LES PRIX SONT ÉCRITS ICI, en clair, avec leur date. S'ils changent, c'est
   la seule ligne à toucher. */

/** Oolel Voices, tarif public au 11 septembre 2026 : 0,22 $ les 1 000 signes. */
const DOLLAR_PAR_SIGNE = 0.22 / 1000;

/* Claude Sonnet 5, tarifs publiés : 2 $ le million de jetons en entrée, 10 $
   en sortie. Un jeton relu depuis le cache coûte le dixième de l'entrée.

   L'ÉCRITURE EST PASSÉE DE 2,50 À 4 $ le 11 septembre 2026, et ce n'est pas
   une hausse de tarif : on garde maintenant le cache une heure au lieu de cinq
   minutes. Une heure se paie deux fois l'entrée à l'écriture, cinq minutes un
   quart de plus. Si on revenait un jour à cinq minutes, ce chiffre redescend à
   2,5 — sinon le compteur mentirait, et un compteur qui ment est pire que pas
   de compteur. */
const DOLLAR_PAR_JETON_ENTREE = 2 / 1_000_000;
const DOLLAR_PAR_JETON_SORTIE = 10 / 1_000_000;
const DOLLAR_PAR_JETON_CACHE_LU = 0.2 / 1_000_000;
const DOLLAR_PAR_JETON_CACHE_ECRIT = 4 / 1_000_000;

type Voix = { appels: number; signes: number };
type Modele = {
  appels: number;
  entree: number;
  sortie: number;
  cache_lu: number;
  cache_ecrit: number;
};

const voix = new Map<string, Voix>();
const modele = new Map<string, Modele>();
let depuis = Date.now();

/** Un envoi à la voix. `ou` dit d'où il part : la réponse, une attente, un
    document lu à haute voix, la page de réglage. */
export function noterVoix(signes: number, ou = "réponse") {
  const n = Number(signes) || 0;
  if (n <= 0) return;
  const d = voix.get(ou) || { appels: 0, signes: 0 };
  d.appels += 1;
  d.signes += n;
  voix.set(ou, d);
}

/** Ce que le modèle a réellement consommé, tel qu'il le rapporte lui-même. */
export function noterModele(usage: unknown, ou = "chat") {
  const u = (usage ?? {}) as Record<string, unknown>;
  const n = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const d = modele.get(ou) || { appels: 0, entree: 0, sortie: 0, cache_lu: 0, cache_ecrit: 0 };
  d.appels += 1;
  d.entree += n(u.input_tokens);
  d.sortie += n(u.output_tokens);
  d.cache_lu += n(u.cache_read_input_tokens);
  d.cache_ecrit += n(u.cache_creation_input_tokens);
  modele.set(ou, d);
}

const sou = (x: number) => Math.round(x * 10000) / 10000;

/* Le coût par jour, ramené depuis le temps écoulé. Sous une heure de service,
   la projection ne veut rien dire : on préfère ne rien annoncer plutôt
   qu'annoncer un chiffre qu'on lira comme une vérité. */
function parJour(total: number): number | null {
  const heures = (Date.now() - depuis) / 3_600_000;
  if (heures < 1) return null;
  return sou((total / heures) * 24);
}

export function depense() {
  let dollarsVoix = 0, dollarsModele = 0;

  const laVoix = [...voix.entries()].map(([ou, d]) => {
    const dollars = d.signes * DOLLAR_PAR_SIGNE;
    dollarsVoix += dollars;
    return { ou, appels: d.appels, signes: d.signes, dollars: sou(dollars) };
  }).sort((a, b) => b.dollars - a.dollars);

  const leModele = [...modele.entries()].map(([ou, d]) => {
    const dollars = d.entree * DOLLAR_PAR_JETON_ENTREE
      + d.sortie * DOLLAR_PAR_JETON_SORTIE
      + d.cache_lu * DOLLAR_PAR_JETON_CACHE_LU
      + d.cache_ecrit * DOLLAR_PAR_JETON_CACHE_ECRIT;
    dollarsModele += dollars;
    return {
      ou, appels: d.appels,
      entree: d.entree, sortie: d.sortie,
      cache_lu: d.cache_lu, cache_ecrit: d.cache_ecrit,
      dollars: sou(dollars),
    };
  }).sort((a, b) => b.dollars - a.dollars);

  const total = dollarsVoix + dollarsModele;
  const echanges = modele.get("chat")?.appels || 0;

  return {
    depuis: new Date(depuis).toISOString(),
    voix: laVoix,
    modele: leModele,
    dollars: { voix: sou(dollarsVoix), modele: sou(dollarsModele), total: sou(total) },
    /* Ce qu'on veut vraiment savoir : ce que coûte UNE question, et ce que
       coûterait une journée entière à ce rythme. */
    par_echange: echanges ? sou(total / echanges) : null,
    par_jour: parJour(total),
    /* La part des jetons qui revient du cache. Au-dessus de 80 %, la mise en
       cache de la consigne fait son travail ; en dessous, elle rate. */
    part_en_cache: (() => {
      const c = modele.get("chat");
      if (!c) return null;
      const plein = c.entree + c.cache_ecrit;
      const tout = plein + c.cache_lu;
      return tout ? Math.round((c.cache_lu / tout) * 100) : null;
    })(),
  };
}

/** Remettre les compteurs à zéro, pour mesurer une journée précise. */
export function oublierDepense() {
  voix.clear();
  modele.clear();
  depuis = Date.now();
}
