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

/* ── CE QU'ON NE SAIT PAS ENCORE CHIFFRER, ET QU'ON COMPTE QUAND MÊME ──────

   Trouvé le 19 septembre 2026 en cherchant où passe l'argent : la
   TRANSCRIPTION n'a JAMAIS figuré sur cette facture. Ni du temps
   d'ElevenLabs, ni depuis qu'on est passé chez Soynade. Elle prend pourtant
   22 % de l'attente de chaque échange — c'est le troisième poste de temps,
   et le seul à zéro dollar affiché.

   Un poste à zéro sur une facture, ce n'est pas une bonne nouvelle : c'est
   un poste qu'on ne regarde pas. C'est exactement ce qui a produit les
   cinquante dollars en trois jours.

   ── POURQUOI ON NE MET PAS DE PRIX ────────────────────────────────────────

   Parce que je ne le connais pas. Le tarif de la transcription de Soynade
   n'est écrit nulle part dans ce projet, et je ne vais pas en inventer un :
   un compteur qui ment est pire que pas de compteur — c'est écrit dix lignes
   plus haut, et ça vaut ici.

   On compte donc ce qu'on sait compter : le nombre d'écoutes et les octets
   d'audio envoyés. Le jour où Soynade répond, il y a UNE ligne à écrire. */
const oreille = new Map<string, { appels: number; octets: number }>();

/** Une écoute envoyée à transcrire. `ou` nomme le moteur. */
export function noterOreille(octets: number, ou = "soynade") {
  const d = oreille.get(ou) || { appels: 0, octets: 0 };
  d.appels += 1;
  d.octets += Number(octets) || 0;
  oreille.set(ou, d);
}

/* ── LE FIL MIS EN CACHE, ET SI ÇA A SERVI ────────────────────────────────

   Une borne de cache posée sur le dernier message déjà dit. Elle ne se pose
   que tant que la fenêtre des douze messages n'a pas commencé à glisser —
   au-delà, le début du fil change à chaque tour, le cache ne retrouve rien,
   et on paierait l'écriture sans jamais la relire.

   On compte les deux cas. RÈGLE : un réglage qu'on ne compte pas est un
   réglage qu'on croit. Le verdict se lit dans `cache_lu` du modèle, qui doit
   monter, et dans `entree`, qui doit descendre. */
const fil = { avec_borne: 0, sans_borne: 0, messages: 0, tours: 0 };

export function noterFil(borne: boolean, messages: number) {
  fil.tours += 1;
  fil.messages += Number(messages) || 0;
  if (borne) fil.avec_borne += 1; else fil.sans_borne += 1;
}

export function resumeDuFil() {
  if (!fil.tours) return null;
  return {
    tours: fil.tours,
    mis_en_cache: fil.avec_borne,
    trop_long_pour_le_cache: fil.sans_borne,
    messages_moyens: Number((fil.messages / fil.tours).toFixed(1)),
  };
}

/* ── CE QUI PART VERS LE TÉLÉPHONE, EN OCTETS ─────────────────────────────

   Render facture la bande passante sortante au-delà de 5 Go, et le compteur
   était à 70 % le 19 septembre sans qu'on sache qui mangeait. Le wav des
   réponses vivantes était le suspect ; maintenant il est encodé en mp3 avant
   de partir, et on compte les deux : ce qu'on AURAIT envoyé, ce qu'on envoie. */
const octetsDeVoix = { reponses: 0, wav: 0, mp3: 0, encodage_ms: 0, encodages_rates: 0 };

export function noterOctetsDeVoix(wav: number, mp3: number, encodageMs: number) {
  octetsDeVoix.reponses += 1;
  octetsDeVoix.wav += Number(wav) || 0;
  octetsDeVoix.mp3 += Number(mp3) || 0;
  octetsDeVoix.encodage_ms += Number(encodageMs) || 0;
  if (!mp3) octetsDeVoix.encodages_rates += 1;
}

/* Les réponses arrivées DIRECTEMENT en mp3 de chez Soynade (19 septembre),
   sans passer par l'encodeur : on les compte à part, sinon le compteur
   d'encodage se tairait sans qu'on sache si c'est parce qu'il n'a plus rien
   à faire ou parce qu'il est cassé. */
const voixDirecte = { reponses: 0, octets: 0 };
export function noterVoixDirecte(octets: number) {
  voixDirecte.reponses += 1;
  voixDirecte.octets += Number(octets) || 0;
}

export function resumeDesOctetsDeVoix() {
  if (!octetsDeVoix.reponses && !voixDirecte.reponses) return null;
  if (!octetsDeVoix.reponses) {
    return {
      morceaux: 0, megaoctets_si_wav: 0, megaoctets_envoyes: 0, fois_moins: 1,
      encodage_ms_moyen: 0, encodages_rates: 0,
      mp3_direct_de_soynade: voixDirecte.reponses,
      megaoctets_mp3_direct: Number((voixDirecte.octets / 1_048_576).toFixed(2)),
    };
  }
  const mo = (n: number) => Number((n / 1_048_576).toFixed(2));
  return {
    morceaux: octetsDeVoix.reponses,
    megaoctets_si_wav: mo(octetsDeVoix.wav),
    megaoctets_envoyes: mo(octetsDeVoix.mp3 || octetsDeVoix.wav),
    fois_moins: octetsDeVoix.mp3 ? Number((octetsDeVoix.wav / octetsDeVoix.mp3).toFixed(1)) : 1,
    encodage_ms_moyen: Math.round(octetsDeVoix.encodage_ms / octetsDeVoix.reponses),
    encodages_rates: octetsDeVoix.encodages_rates,
    mp3_direct_de_soynade: voixDirecte.reponses,
    megaoctets_mp3_direct: Number((voixDirecte.octets / 1_048_576).toFixed(2)),
  };
}

/* Les sons servis depuis la mémoire au lieu d'être refabriqués : ce qu'on
   n'a PAS payé. Si `servies` reste à zéro, le cache ne sert à rien et on le
   retirera — un mécanisme qu'on ne mesure pas est un mécanisme qu'on croit. */
const voixEnCache = { servies: 0, fabriquees: 0 };
export function noterVoixEnCache(servie: boolean) {
  if (servie) voixEnCache.servies += 1; else voixEnCache.fabriquees += 1;
}

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
    /* Sans prix, mais compté — et dit comme tel. */
    oreille: [...oreille.entries()].map(([ou, d]) => ({
      ou,
      ecoutes: d.appels,
      megaoctets: Number((d.octets / 1_048_576).toFixed(2)),
      /* Le poids moyen d'une écoute. Avant le 19 septembre (débit par
         défaut) : autour de 50 ko pour quatre secondes. À 32 kbit/s, ça
         doit tomber vers 16 ko. C'est le chiffre qui dit si l'option a pris. */
      ko_par_ecoute: d.appels ? Math.round(d.octets / d.appels / 1024) : 0,
      dollars: null,
      pourquoi_pas_de_dollars: "le tarif de transcription de Soynade n'est pas connu — à leur demander",
    })),
    octets_de_voix: resumeDesOctetsDeVoix(),
    voix_en_cache: voixEnCache.servies + voixEnCache.fabriquees ? { ...voixEnCache } : null,
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
  oreille.clear();
  fil.avec_borne = 0;
  fil.sans_borne = 0;
  fil.messages = 0;
  fil.tours = 0;
  octetsDeVoix.reponses = 0;
  octetsDeVoix.wav = 0;
  octetsDeVoix.mp3 = 0;
  octetsDeVoix.encodage_ms = 0;
  octetsDeVoix.encodages_rates = 0;
  voixEnCache.servies = 0;
  voixEnCache.fabriquees = 0;
  modele.clear();
  depuis = Date.now();
}
