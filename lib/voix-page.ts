/* ── UNE SEULE VOIX À LA FOIS — ET SUR KHALAM RAPIDE, C'EST LA SIENNE ─────

   Lamine, le 24 octobre 2026 : « en Khalam Rapide, quand la carte s'affiche
   ou quand elle écrit un message, la voix de Kha parle EN MÊME TEMPS que la
   voix de Khalam Rapide. Les deux se télescopent. »

   LA CAUSE EST SIMPLE ET ELLE ÉTAIT PRÉVISIBLE. Les écrans de BIA ont leur
   propre voix, et c'est voulu depuis septembre : la carte annonce les
   virages avec les sons enregistrés de Kha, et le papier dit « j'écris »
   pendant la dizaine de secondes de fabrication. Sur Khalam, c'est la MÊME
   voix que celle de la conversation, donc on n'entend qu'une personne. Sur
   Khalam Rapide, la conversation a sa propre voix — et les deux se mettent
   à parler ensemble.

   J'avais déjà posé cette garde pour la photo (`photographierPourBia` ne
   prononce rien, une épreuve le vérifie), et je ne l'avais pas généralisée.
   C'est la même faute que la balise « mail » du 15 septembre : le remède
   écrit à un seul endroit, et tous les autres chemins laissés ouverts.

   ── CE FICHIER EST LE SEUL INTERRUPTEUR ──────────────────────────────────

   Tant qu'une session Khalam Rapide est ouverte, la PAGE ne prononce plus
   rien : ni la carte, ni le papier, ni un rappel, ni une recherche, ni ce
   qu'on ajoutera demain. Elle affiche, c'est tout. La règle vaut pour les
   chemins futurs sans qu'on ait à y penser — c'est précisément ce qui
   manquait.

   ET KHALAM GARDE SA VOIX ENTIÈRE. Hors session rapide, cette garde ne
   refuse rien du tout : `pageeutParler()` rend vrai, et pas une ligne du
   chemin Khalam ne change.

   AUCUN IMPORT : une épreuve le charge seul, et il ne doit dépendre de rien. */

/* ── LA GARDE S'ATTEINT PAR globalThis, ET CE N'EST PAS UN CAPRICE ────────

   Première version : app/page.tsx appelait `pageeutParler(...)` directement
   dans speak(). DIX-SEPT épreuves sont parties en rouge. Elles extraient le
   corps de speak() et l'exécutent dans un décor `with(env)` où chaque nom
   doit être fourni à la main : tout nom neuf dans ces lignes est un nom à
   ajouter dans dix-sept décors — donc un nom qu'on oubliera, et une garde
   qui sautera sans bruit.

   C'est la troisième fois aujourd'hui (silenceDemande, journalTourRef, et
   celle-ci). La leçon est apprise pour de bon : on ne pose plus de nom neuf
   dans speak() ni dans les callbacks extraits.

   `globalThis` est le seul nom disponible PARTOUT, décors d'épreuve compris.
   La garde y est donc accrochée, et l'appel s'écrit avec des `?.` : si le
   module n'est pas chargé — ce qui est le cas dans ces décors — la garde est
   simplement absente et rien ne change. */
type Etat = {
  session: boolean; refus: Record<string, number>; autorises: number;
  /** La garde elle-même, atteignable sans importer quoi que ce soit. */
  peutParler?: (quoi: string) => boolean;
};
const g = globalThis as typeof globalThis & { biaVoixPage?: Etat };
const etat: Etat = (g.biaVoixPage ??= { session: false, refus: {}, autorises: 0 });

/** La session Khalam Rapide s'ouvre ou se ferme. */
export function sessionRapide(ouverte: boolean): void {
  etat.session = Boolean(ouverte);
}

/** La session rapide est-elle ouverte ? */
export const sessionRapideOuverte = (): boolean => etat.session;

/** La page a-t-elle le droit de prononcer quelque chose ?
    `quoi` nomme le chemin, pour qu'un refus ne soit jamais anonyme. */
export function pageeutParler(quoi: string): boolean {
  if (!etat.session) { etat.autorises += 1; return true; }
  const nom = String(quoi || "sans_nom").slice(0, 40);
  etat.refus[nom] = (etat.refus[nom] || 0) + 1;
  return false;
}

/* On l'accroche au moment où le module se charge : la page l'atteindra par
   globalThis, sans l'importer dans les lignes que les épreuves extraient. */
etat.peutParler = pageeutParler;

/** Ce que la garde a refusé, et par quel chemin. Publié dans /api/etat :
    un chemin qui apparaît ici est un chemin qui AURAIT parlé par-dessus. */
export function resumeVoixPage() {
  const refus = Object.entries(etat.refus).sort((a, b) => b[1] - a[1]);
  return {
    revision: "une-seule-voix-v1",
    session_rapide_ouverte: etat.session,
    paroles_autorisees: etat.autorises,
    paroles_refusees: refus.reduce((n, [, f]) => n + f, 0),
    par_chemin: Object.fromEntries(refus),
    limite:
      "Des noms de chemins et des comptes. Un chemin listé ici a tenté de prononcer quelque chose " +
      "pendant une session Khalam Rapide : il a été refusé, et l'écran s'est affiché sans voix. " +
      "Hors session rapide, cette garde ne refuse rien.",
  };
}
