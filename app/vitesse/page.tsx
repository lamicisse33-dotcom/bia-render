"use client";

/* ── OÙ PASSE LE TEMPS — LU DEPUIS L'IPHONE ──────────────────────────────────

   Lamine, le 15 septembre 2026 : « comme tu testes surtout sur iPhone, il faut
   que ces mesures soient accessibles facilement. »

   /api/etat rend déjà tout, mais c'est un mur de JSON : sur un téléphone,
   chercher `ou_passe_le_temps` dedans est une épreuve. Cette page ne mesure
   rien et ne décide rien — elle LIT /api/etat et met le chiffre qui compte en
   haut, en gros.

   Elle s'ouvre sur app.khalam.app/vitesse, sans code : il n'y a ici que des
   durées en millisecondes. Ni question, ni réponse, ni qui parle.           */

import { useCallback, useEffect, useState } from "react";

type Part = { quoi: string; ms: number; part: number };
type Groupe = {
  tours: number; vecu_ms: number; queue_ms: number; transcription_ms: number;
  modele_ms: number; voix_ms: number; demarrage_ms: number; ailleurs_ms: number;
};
type Tour = {
  voie: string; source: string; attente: boolean; queue_ms: number;
  transcription_ms: number; modele_ms: number; voix_ms: number;
  demarrage_ms: number; ailleurs_ms: number; vecu_ms: number;
};
type Appel = {
  appels: number; premier_octet_ms: number; complet_ms: number;
  coulee_ms: number; verdict: string; signes_median: number;
};
type MesureVoix = { signes: number; premier_ms?: number; fin_ms: number;
  octets: number; ms_par_signe: number; prises?: number; motif?: string };
type MoteurEssaye = {
  nom: string; absent: boolean; motif?: string; resultats?: MesureVoix[];
  plancher_ms?: number; ms_par_signe?: number; premier_octet_ms?: number;
  une_phrase_ms?: number; coule?: boolean; verdict?: string;
};
type Essai = {
  quand: string;
  moteurs?: MoteurEssaye[];
  meilleur_avant_le_premier_audio?: string;
  resultats: MesureVoix[];
  plancher_ms: number; ms_par_signe: number; verdict: string;
};
type Lecture = {
  reponses: number; en_plusieurs_morceaux: number;
  couture_max_ms: number; couture_mediane_ms: number;
};
/* ── L'ESSAI DE L'OREILLE ────────────────────────────────────────────────
   Posé le 18 septembre au soir. On ne type pas son détail : c'est une mesure
   qu'on lit, pas une donnée dont le code dépend. Les trois verdicts sont des
   phrases, écrites par le serveur pour être lues telles quelles. */
type EssaiOreille = {
  quand: string;
  moteur?: string;
  sons_ecoutes?: number;
  mots_donnes?: number;
  les_cent_mots?: string;
  le_wolof?: string;
  ce_que_les_cent_mots_apportent?: string;
  /* La quatrieme question, ajoutee le 19 septembre : quelle oreille entend le
     mieux son wolof. Soynade dit « largement meilleur » ; on le chiffre. */
  soynade?: string;
  soynade_mots_faux_pour_cent?: number | null;
  soynade_ms?: number | null;
  mots_faux_avec_les_mots_pour_cent?: number | null;
  mots_faux_sans_les_mots_pour_cent?: number | null;
  langues_reconnues?: Record<string, number>;
  son_annonce?: string;
};
type Etat = {
  version?: string;
  essai_oreille?: EssaiOreille | null;
  lecture?: Lecture | null;
  essai_voix?: Essai | null;
  etapes?: { ecoute: Appel | null; modele: Appel | null;
    voix_tete: Appel | null; voix: Appel | null } | null;
  tours?: {
    tours: number;
    ou_passe_le_temps: Part[];
    reponse_du_modele: Groupe | null;
    reponse_enregistree: Groupe | null;
    avec_phrase_dattente: number;
    partis_avant_la_fin: number;
    sources: Record<string, number>;
    derniers: Tour[];
  } | null;
};

const sec = (ms: number) => `${(ms / 1000).toFixed(1)} s`;

export default function Vitesse() {
  const [etat, setEtat] = useState<Etat | null>(null);
  const [motif, setMotif] = useState("");
  const [quand, setQuand] = useState("");

/* ── L'ESSAI DE LA VOIX NE DOIT PAS S'ÉVAPORER ──────────────────────────────

   Lamine, le 17 septembre 2026 : « va vérifier, j'ai lancé le test. »

   Le résultat n'y était plus. Ce n'était pas lui : cet essai vit en mémoire
   vive, comme les autres compteurs — et entre son lancement et ma
   vérification, le serveur avait redémarré (il venait de pousser un commit,
   Render redéploie, la mémoire repart à zéro).

   LES AUTRES COMPTEURS PEUVENT SE PERMETTRE DE REPARTIR : ils se remplissent
   tout seuls dès qu'on parle à BIA. Celui-ci, non. Il coûte cinq appels à
   Soynade — de l'argent — et il ne se relance qu'à la main. Le perdre, c'est
   redemander à quelqu'un de repayer une mesure qu'il a déjà faite.

   ON LE GARDE DONC DANS LE TÉLÉPHONE. C'est le seul endroit qui survit à un
   déploiement, et c'est aussi celui de la personne qui a payé la mesure. Le
   serveur reste la source quand il l'a encore ; sinon on ressort celui qu'on
   avait gardé, avec sa date, pour qu'on ne le prenne jamais pour frais.        */
const BOITE_ESSAI = "bia-essai-voix";
/* Le même traitement pour l'oreille : un essai payé ne doit pas disparaître
   parce que Render a mis l'instance en veille au bout de quinze minutes. */
const BOITE_OREILLE = "bia-essai-oreille";

  const relire = useCallback(async () => {
    try {
      const r = await fetch("/api/etat", { cache: "no-store" });
      const neuf = await r.json() as Etat;
      if (neuf.essai_voix) {
        /* Le serveur l'a : on le garde pour le jour où il l'aura oublié. */
        try {
          localStorage.setItem(BOITE_ESSAI,
            JSON.stringify({ essai: neuf.essai_voix, quand: Date.now() }));
        } catch { /* rangement plein ou fermé : on s'en passe */ }
        /* IDEM POUR L'OREILLE, et la raison est la même : c'est une mesure
           payée. Son essai coûte vingt appels à ElevenLabs. */
      } else {
        /* Le serveur a redémarré. Ce qu'on avait gardé vaut mieux que rien —
           c'est une mesure payée, pas une supposition. */
        try {
          const garde = JSON.parse(localStorage.getItem(BOITE_ESSAI) || "null");
          if (garde?.essai) {
            neuf.essai_voix = garde.essai;
            setGardeDu(new Date(garde.quand).toLocaleString("fr-FR",
              { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }));
          }
        } catch { /* rien de gardé */ }
      }
      if (neuf.essai_oreille) {
        try {
          localStorage.setItem(BOITE_OREILLE,
            JSON.stringify({ essai: neuf.essai_oreille, quand: Date.now() }));
        } catch { /* rangement plein ou fermé */ }
      } else {
        try {
          const g = JSON.parse(localStorage.getItem(BOITE_OREILLE) || "null");
          if (g?.essai) neuf.essai_oreille = g.essai;
        } catch { /* rien de gardé */ }
      }
      setEtat(neuf);
      setMotif("");
      setQuand(new Date().toLocaleTimeString("fr-FR"));
    } catch (e) { setMotif((e as Error).message); }
  }, []);

  /* Toutes les cinq secondes : il fait ses essais d'une main et regarde de
     l'autre. Devoir tirer pour rafraîchir entre chaque tour lui ferait perdre
     le fil de ce qu'il vient de dire. */
  useEffect(() => { void relire(); const t = setInterval(relire, 5000); return () => clearInterval(t); }, [relire]);

  /* ── LE BOUTON QUI TRANCHE ──────────────────────────────────────────
     Sa demande du 15 septembre 2026 : cinq appels à Soynade, 20 / 50 / 100 /
     200 / 400 signes. La clé vit sur le serveur et doit y rester : c'est donc
     le serveur qui appelle, et cette page ne fait que demander. Le code
     maître est déjà dans ce navigateur — même origine que BIA. */
  const [enCours, setEnCours] = useState(false);
  /* Rempli seulement quand l'essai vient du téléphone et non du serveur : il
     porte alors sa date, pour qu'on ne le prenne pas pour une mesure d'il y a
     une minute. */
  const [gardeDu, setGardeDu] = useState("");
  const lancerLEssai = useCallback(async () => {
    let code = "";
    try { code = localStorage.getItem("bia-code") || ""; } catch { }
    if (!code) { setMotif("ouvre BIA une fois sur ce téléphone, puis reviens"); return; }
    setEnCours(true);
    try {
      await fetch("/api/essai-voix", { method: "POST", headers: { "x-bia-code": code } });
      await relire();
    } catch (e) { setMotif((e as Error).message); }
    setEnCours(false);
  }, [relire]);

  /* ── LE BOUTON QUI MANQUAIT DEPUIS SIX JOURS ────────────────────────
     Celui de la voix existait depuis le 15 septembre. L'oreille, non — et
     pendant six jours les cent mots corrigés de Lamine étaient refusés à
     chaque écoute sans que rien ne le dise. Voir
     AVANT-DE-DIRE-QUE-C-EST-BON.md, règle 1. */
  const [oreilleEnCours, setOreilleEnCours] = useState(false);
  const lancerLOreille = useCallback(async () => {
    let code = "";
    try { code = localStorage.getItem("bia-code") || ""; } catch { }
    if (!code) { setMotif("ouvre BIA une fois sur ce téléphone, puis reviens"); return; }
    setOreilleEnCours(true);
    try {
      await fetch("/api/essai-oreille", { method: "POST", headers: { "x-bia-code": code } });
      await relire();
    } catch (e) { setMotif((e as Error).message); }
    setOreilleEnCours(false);
  }, [relire]);

  const t = etat?.tours;
  const gros = t?.ou_passe_le_temps?.[0];

  /* ── LES TROIS SECONDES QUI N'APPARTENAIENT À PERSONNE ─────────────────

     Les dix tours du 15 septembre au soir : la « transcription » coûte 3,4 s
     dans le tour — mais l'appel à ElevenLabs, lui, ne met que 0,9 s. Presque
     trois secondes se passent AILLEURS, et la page les mettait sur le dos du
     moteur de transcription qui n'y est pour rien.

     C'est l'envoi du son : le clip enregistré part du téléphone jusqu'à
     Render, à Francfort. On le nomme, parce qu'un morceau qu'on ne nomme pas
     ne se répare jamais. */
  const envoiDuSon = t?.reponse_du_modele && etat?.etapes?.ecoute
    ? Math.max(0, t.reponse_du_modele.transcription_ms - etat.etapes.ecoute.complet_ms)
    : 0;

  return (
    /* ── POURQUOI CETTE PAGE NE DEFILAIT PAS ──────────────────────────────

       Lamine, le 15 septembre 2026 : « elle ne defile pas. Il faut que je
       puisse la faire tourner jusqu'en bas. »

       La cause n'est pas ici, elle est dans globals.css : `html, body {
       overflow: hidden }`. C'est voulu — BIA est une application plein ecran
       qui ne doit pas rebondir sous le doigt quand on lui parle. Mais cette
       regle vaut pour TOUT le domaine, et elle a enferme cette page-ci : le
       bouton de l'essai Soynade etait sous le pli, inatteignable. Il a donc
       regarde trois fois un tableau dont il manquait la moitie.

       On ne touche pas a la regle globale — l'enlever ferait rebondir BIA
       elle-meme. On fait de ce cadre-ci son PROPRE conteneur de defilement :
       fixe aux quatre bords, il defile a l'interieur, et le corps derriere ne
       bouge pas d'un pixel.

       `-webkit-overflow-scrolling: touch` pour l'inertie de l'iPhone, et une
       marge basse en `env(safe-area-inset-bottom)` : sans elle, la derniere
       ligne se cache derriere la barre d'accueil. */
    <main style={{ position: "fixed", inset: 0, overflowY: "auto",
      WebkitOverflowScrolling: "touch", overscrollBehavior: "contain",
      background: "#0d0b09", color: "#f3ece2",
      font: "16px/1.5 system-ui, -apple-system, sans-serif",
      padding: "20px 16px calc(80px + env(safe-area-inset-bottom, 0px))" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <h1 style={{ font: "600 22px/1.3 system-ui", margin: "0 0 4px" }}>Où passe le temps</h1>
        <p style={{ margin: "0 0 24px", opacity: 0.55, fontSize: 13 }}>
          {etat?.version ? `version ${etat.version}` : "…"}{quand ? ` · relu à ${quand}` : ""}
          {motif ? ` · ${motif}` : ""}
        </p>

        {!t && (
          <>
            {/* Le serveur a pu redemarrer et vider ses tours : l'essai, lui,
                ne depend d'aucun tour et doit rester lancable. */}
            <EssaiOreilleBloc essai={etat?.essai_oreille} enCours={oreilleEnCours} lancer={lancerLOreille} />
            <EssaiSoynade essai={etat?.essai_voix} enCours={enCours} lancer={lancerLEssai} gardeDu={gardeDu} />
            <p style={{ opacity: 0.7 }}>
              Aucun tour mesuré depuis le dernier redémarrage du serveur.
              Parle-lui une fois et cette page se remplit toute seule.
            </p>
          </>
        )}

        {t && (
          <>
            {/* ── LE CHIFFRE QUI DONNE LA SENSATION DE VITESSE ──────────
                Lamine, le 15 septembre 2026 au soir : « l'objectif à
                surveiller désormais n'est plus seulement le temps total, mais
                FIN DE PAROLE UTILISATEUR → PREMIÈRE SYLLABE DE BIA. C'est ce
                chiffre qui donne la sensation de vitesse. »
                Il était enfoui dans un bloc plus bas. Il passe en tête. */}
            {t.reponse_du_modele && (
              <section style={{ background: "#1a1511", border: "1px solid #2e2620",
                borderRadius: 14, padding: "18px 16px", marginBottom: 14 }}>
                <p style={{ margin: 0, opacity: 0.6, fontSize: 13 }}>
                  De ta dernière syllabe à la première d’elle
                </p>
                <p style={{ margin: "6px 0 2px", font: "600 34px/1.1 system-ui", color: "#e8b25f" }}>
                  {sec(t.reponse_du_modele.vecu_ms)}
                </p>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.75 }}>
                  quand elle doit réfléchir · {t.reponse_du_modele.tours} tour(s)
                  {t.reponse_enregistree
                    ? ` — et ${sec(t.reponse_enregistree.vecu_ms)} sur une réponse déjà enregistrée`
                    : ""}
                </p>
                <p style={{ margin: "10px 0 0", fontSize: 13,
                  color: t.partis_avant_la_fin > 0 ? "#7fc48f" : "#d79a8c" }}>
                  {t.partis_avant_la_fin > 0
                    ? `${t.partis_avant_la_fin} réponse(s) sur ${t.tours} sont parties AVANT la fin du modèle`
                    : "aucune réponse n’est partie avant la fin du modèle — la diffusion ne sert pas encore"}
                </p>
                <Coutures l={etat?.lecture} />
              </section>
            )}

            {gros && (
              <section style={{ background: "#1a1511", border: "1px solid #2e2620",
                borderRadius: 14, padding: "14px 16px", marginBottom: 22 }}>
                <p style={{ margin: 0, opacity: 0.6, fontSize: 13 }}>Le plus gros morceau</p>
                <p style={{ margin: "4px 0 2px", font: "600 22px/1.2 system-ui", color: "#e8b25f" }}>
                  {gros.quoi}
                </p>
                <p style={{ margin: 0, fontSize: 14, opacity: 0.8 }}>
                  {sec(gros.ms)} — {gros.part} % de l’attente
                </p>
              </section>
            )}

            {/* L'ESSAI D'ABORD : c'est le geste qu'il vient faire, et il
                etait en bas d'une page qui ne defilait pas. Ce qu'on vient
                CHERCHER se met en haut ; ce qu'on vient LIRE peut attendre. */}
            <EssaiOreilleBloc essai={etat?.essai_oreille} enCours={oreilleEnCours} lancer={lancerLOreille} />
            <EssaiSoynade essai={etat?.essai_voix} enCours={enCours} lancer={lancerLEssai} gardeDu={gardeDu} />

            <Barres parts={t.ou_passe_le_temps} envoi={envoiDuSon} />

            <Appels e={etat?.etapes} />

            <Bloc titre="Quand elle doit réfléchir" g={t.reponse_du_modele} />
            <Bloc titre="Quand la réponse est déjà enregistrée" g={t.reponse_enregistree} />

            <p style={{ margin: "18px 0 6px", opacity: 0.6, fontSize: 13 }}>
              {t.tours} tour(s) mesuré(s) · {t.avec_phrase_dattente} avec une phrase d’attente
            </p>
            <p style={{ margin: "0 0 24px", opacity: 0.5, fontSize: 12 }}>
              {Object.entries(t.sources).map(([s, n]) => `${s} ×${n}`).join(" · ")}
            </p>

            <h2 style={{ font: "600 15px/1.3 system-ui", margin: "0 0 8px", opacity: 0.8 }}>
              Les derniers tours
            </h2>
            <div style={{ overflowX: "auto" }}>
              <table style={{ borderCollapse: "collapse", fontSize: 12, minWidth: 520 }}>
                <thead>
                  <tr style={{ opacity: 0.55, textAlign: "right" }}>
                    <th style={{ textAlign: "left", padding: "4px 8px" }}>source</th>
                    <th style={{ padding: "4px 8px" }}>silence</th>
                    <th style={{ padding: "4px 8px" }}>écoute</th>
                    <th style={{ padding: "4px 8px" }}>modèle</th>
                    <th style={{ padding: "4px 8px" }}>voix</th>
                    <th style={{ padding: "4px 8px" }}>départ</th>
                    <th style={{ padding: "4px 8px" }}>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {[...t.derniers].reverse().map((x, i) => (
                    <tr key={i} style={{ borderTop: "1px solid #241d18", textAlign: "right" }}>
                      <td style={{ textAlign: "left", padding: "5px 8px", opacity: 0.75 }}>
                        {x.source}{x.attente ? " ·att" : ""}
                      </td>
                      <td style={{ padding: "5px 8px" }}>{x.queue_ms}</td>
                      <td style={{ padding: "5px 8px" }}>{x.transcription_ms}</td>
                      <td style={{ padding: "5px 8px" }}>{x.modele_ms}</td>
                      <td style={{ padding: "5px 8px" }}>{x.voix_ms}</td>
                      <td style={{ padding: "5px 8px" }}>{x.demarrage_ms}</td>
                      <td style={{ padding: "5px 8px", fontWeight: 600 }}>{x.vecu_ms}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p style={{ margin: "10px 0 0", opacity: 0.45, fontSize: 11 }}>
              En millisecondes. « silence » = de sa dernière syllabe à lui jusqu’à la coupure du
              micro. « départ » = du son fabriqué à la première syllabe réellement entendue.
              « TOTAL » = tout le tour, tel qu’il le vit.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

/* ── ATTENDRE, OU COULER ────────────────────────────────────────────────
   Sa question du 15 septembre 2026, et c'est elle qui décide de tout ce qui
   suit : les quatre secondes du modèle et de la voix, est-ce qu'on les
   ATTEND avant le premier octet, ou est-ce qu'elles COULENT après ? Dans le
   premier cas il n'y a rien à gagner. Dans le second, il y a tout. */
function Appels({ e }: { e?: { ecoute: Appel | null; modele: Appel | null;
  voix_tete: Appel | null; voix: Appel | null } | null }) {
  if (!e || (!e.ecoute && !e.modele && !e.voix && !e.voix_tete)) return null;
  const un = (titre: string, a: Appel | null) => {
    if (!a) return null;
    const part = a.complet_ms ? Math.round((a.premier_octet_ms / a.complet_ms) * 100) : 0;
    return (
      <div key={titre} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 5 }}>
          <span style={{ fontWeight: 600 }}>{titre}</span>
          <span style={{ opacity: 0.6 }}>{a.appels} appel(s)</span>
        </div>
        <div style={{ display: "flex", height: 18, borderRadius: 4, overflow: "hidden",
          background: "#1a1511", marginBottom: 5 }}>
          <div title="avant le premier octet" style={{ width: `${part}%`, background: "#c2543f" }} />
          <div title="ce qui coule ensuite" style={{ width: `${100 - part}%`, background: "#4f8a5b" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, opacity: 0.75 }}>
          <span>premier octet : {sec(a.premier_octet_ms)}</span>
          <span>puis {sec(a.coulee_ms)} qui coulent</span>
          <span>total {sec(a.complet_ms)}</span>
        </div>
        <p style={{ margin: "5px 0 0", fontSize: 12, color: a.coulee_ms > 500 ? "#7fc48f" : "#d79a8c" }}>
          {a.verdict}
        </p>
      </div>
    );
  };
  return (
    <section style={{ marginBottom: 24, paddingTop: 4 }}>
      <h2 style={{ font: "600 15px/1.3 system-ui", margin: "0 0 10px" }}>
        Attendre, ou couler
      </h2>
      {un("La transcription — avant le texte", e.ecoute)}
      {un("Le modèle — avant le premier mot", e.modele)}
      {un("La voix — la PREMIÈRE phrase, celle qu'on attend", e.voix_tete)}
      {un("La voix — la suite, pendant qu'elle parle", e.voix)}
      <p style={{ margin: 0, opacity: 0.45, fontSize: 11 }}>
        En rouge, le temps où rien n’arrive : il faut l’attendre. En vert, ce qui coule
        ensuite : on pourrait commencer à parler sans l’attendre.
      </p>
    </section>
  );
}

/* ── SOYNADE, AUX CINQ LONGUEURS ────────────────────────────────────────
   « Si la durée dépend fortement de la longueur, alors on garde Soynade et on
   simule nous-mêmes le streaming. Si Soynade prend toujours ~3–4 secondes
   même pour 20 caractères, alors je ne perdrais plus de temps à optimiser
   autour. » — Lamine, 15 septembre 2026. */
/* ── CE QUE L'OREILLE ENTEND, SUR LA VRAIE VOIX DE KHA ────────────────────

   Trois questions, trois phrases écrites par le serveur. On les affiche
   telles quelles : celui qui lit ne doit pas avoir à interpréter un tableau
   pour savoir si son oreille marche. */
function EssaiOreilleBloc({ essai, enCours, lancer }:
  { essai?: EssaiOreille | null; enCours: boolean; lancer: () => void }) {
  /* Le rouge dit « il y a une decision a prendre », pas « c'est casse ». Un
     match nul entre deux oreilles inutilisables en est une. */
  const mauvais = (p?: string) => Boolean(p && /REFUS|ZÉRO|AGGRAVENT|aucun effet|PAS MESURÉ|MATCH NUL|reste meilleur/.test(p));
  return (
    <section style={{ marginBottom: 26, paddingTop: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <h2 style={{ font: "600 15px/1.3 system-ui", margin: 0 }}>Son oreille, sur la voix de Kha</h2>
        <button onClick={lancer} disabled={enCours} style={{
          font: "500 13px/1 system-ui", padding: "9px 14px", borderRadius: 8,
          border: "1px solid #3a2f26", background: enCours ? "#1a1511" : "#e8b25f",
          color: enCours ? "#8a7a68" : "#1a1108", cursor: enCours ? "default" : "pointer" }}>
          {enCours ? "en cours…" : essai ? "recommencer" : "essayer l’oreille"}
        </button>
      </div>
      {!essai && (
        <p style={{ margin: 0, opacity: 0.7, fontSize: 14, lineHeight: 1.5 }}>
          Dix enregistrements de Kha, dont on connaît le texte mot pour mot, sont
          transcrits deux fois — avec les cent mots corrigés, puis sans. Ça dit
          trois choses : si les mots sont acceptés, si le wolof est reconnu, et si
          ces cent mots servent vraiment à quelque chose.
        </p>
      )}
      {essai && (
        <div style={{ display: "grid", gap: 10 }}>
          {[
            { titre: "Les cent mots corrigés", phrase: essai.les_cent_mots },
            { titre: "Le wolof", phrase: essai.le_wolof },
            { titre: "Ce que les cent mots apportent", phrase: essai.ce_que_les_cent_mots_apportent },
            { titre: "Soynade contre ElevenLabs", phrase: essai.soynade },
          ].map((l) => (
            <div key={l.titre} style={{
              border: `1px solid ${mauvais(l.phrase) ? "#5a2a24" : "#2a2420"}`,
              background: mauvais(l.phrase) ? "#1d100e" : "#141210",
              borderRadius: 10, padding: "11px 13px" }}>
              <div style={{ font: "600 13px/1.3 system-ui", marginBottom: 4,
                color: mauvais(l.phrase) ? "#e08b7a" : "#e8b25f" }}>{l.titre}</div>
              <div style={{ font: "400 14px/1.5 system-ui", opacity: 0.92 }}>{l.phrase || "—"}</div>
            </div>
          ))}
          <p style={{ margin: 0, opacity: 0.55, fontSize: 12.5, lineHeight: 1.5 }}>
            {essai.sons_ecoutes} son(s) écouté(s) · {essai.mots_donnes} mots donnés · moteur{" "}
            {essai.moteur} · mots faux : {essai.mots_faux_sans_les_mots_pour_cent ?? "—"} % sans
            eux, {essai.mots_faux_avec_les_mots_pour_cent ?? "—"} % avec.{" "}
            {essai.soynade_mots_faux_pour_cent != null
              ? ` Soynade : ${essai.soynade_mots_faux_pour_cent} % de mots faux en ${essai.soynade_ms} ms.`
              : ""}{" "}
            {essai.son_annonce}. Langues reconnues :{" "}
            {Object.entries(essai.langues_reconnues || {}).map(([k, n]) => `${k} ${n}`).join(" · ") || "aucune"}.
          </p>
        </div>
      )}
    </section>
  );
}

function EssaiSoynade({ essai, enCours, lancer, gardeDu }:
  { essai?: Essai | null; enCours: boolean; lancer: () => void; gardeDu?: string }) {
  const max = Math.max(1, ...(essai?.resultats || []).map((r) => r.fin_ms));
  return (
    <section style={{ marginBottom: 26, paddingTop: 4 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
        <h2 style={{ font: "600 15px/1.3 system-ui", margin: 0 }}>La voix, aux cinq longueurs</h2>
        {/* ── D'OÙ VIENT CE CHIFFRE ────────────────────────────────────────
            Quand le serveur a redémarré, l'essai ressort du téléphone. Il
            reste juste — c'est une mesure payée — mais il n'est pas d'il y a
            une minute, et le lecteur doit le savoir. Un chiffre juste présenté
            sans sa date, c'est la faute qu'on a déjà payée le 18 au soir. */}
        {gardeDu ? <span style={{ font: "400 12px/1.3 system-ui", color: "#9a8f80" }}>
          gardé sur ce téléphone — mesuré le {gardeDu}
        </span> : null}
        <button onClick={lancer} disabled={enCours} style={{
          font: "500 13px/1 system-ui", padding: "9px 14px", borderRadius: 8,
          border: "1px solid #3a2f26", background: enCours ? "#1a1511" : "#e8b25f",
          color: enCours ? "#8a7a68" : "#1a1108", cursor: enCours ? "default" : "pointer" }}>
          {enCours ? "en cours…" : essai ? "recommencer" : "lancer l’essai"}
        </button>
      </div>
      {!essai && (
        <p style={{ margin: 0, opacity: 0.6, fontSize: 13 }}>
          Cinq appels à Soynade — 20, 50, 100, 200 et 400 signes. C’est ce test qui dit
          s’il faut découper les phrases ou changer de moteur de voix.
        </p>
      )}
      {essai?.moteurs?.length ? (
        <>
          {essai.meilleur_avant_le_premier_audio && (
            <p style={{ margin: "0 0 12px", fontSize: 14 }}>
              Le plus rapide avant le premier audio :{" "}
              <b style={{ color: "#7fc48f" }}>{essai.meilleur_avant_le_premier_audio}</b>
            </p>
          )}
          {essai.moteurs.map((m) => (
            <div key={m.nom} style={{ marginBottom: 18, paddingBottom: 14,
              borderBottom: "1px solid #241d18" }}>
              <p style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 600 }}>
                {m.nom}
                {m.absent && <span style={{ fontWeight: 400, opacity: 0.55 }}> — {m.motif}</span>}
              </p>
              {/* ── UNE ERREUR RÉPÉTÉE NE SE LIT PAS CINQ FOIS ──────────
                  Cinq lignes identiques de quatre-vingts signes chacune
                  noyaient le reste du tableau. Quand toutes les prises ont
                  échoué de la même façon, on le dit UNE fois. */}
              {!m.absent && (m.resultats || []).every((r) => r.motif) && (
                <p style={{ margin: "0 0 6px", fontSize: 12, opacity: 0.7 }}>
                  {(m.resultats || []).length} appels refusés —{" "}
                  {((m.resultats || [])[0]?.motif || "").slice(0, 110)}
                </p>
              )}
              {!m.absent && !(m.resultats || []).every((r) => r.motif)
                && (m.resultats || []).map((r) => {
                const grand = Math.max(1, ...(m.resultats || []).map((x) => x.fin_ms));
                const part = r.fin_ms ? Math.round(((r.premier_ms || r.fin_ms) / r.fin_ms) * 100) : 0;
                return (
                  <div key={r.signes} style={{ marginBottom: 7 }}>
                    <div style={{ display: "flex", justifyContent: "space-between",
                      fontSize: 12, marginBottom: 2, opacity: 0.8 }}>
                      <span>{r.signes} signes</span>
                      <span>{r.motif ? r.motif : `premier ${sec(r.premier_ms || r.fin_ms)} · total ${sec(r.fin_ms)}`}</span>
                    </div>
                    <div style={{ display: "flex", height: 8, borderRadius: 4, overflow: "hidden",
                      background: "#1a1511", width: `${Math.round((r.fin_ms / grand) * 100)}%` }}>
                      <div style={{ width: `${part}%`, background: "#c2543f" }} />
                      <div style={{ width: `${100 - part}%`, background: "#4f8a5b" }} />
                    </div>
                  </div>
                );
              })}
              {!m.absent && (
                <p style={{ margin: "8px 0 0", fontSize: 12,
                  /* Vert seulement quand il y a une bonne nouvelle. Un moteur
                     refusé ou un plancher trop haut ne s'annonce pas en vert :
                     c'est ce que faisait la page, et ça se lisait de travers. */
                  color: /PLANCHER|refus|permission|pas assez/.test(m.verdict || "")
                    ? "#d79a8c" : "#7fc48f" }}>
                  {m.verdict}
                </p>
              )}
            </div>
          ))}
          <p style={{ margin: "4px 0 0", opacity: 0.45, fontSize: 11 }}>
            En rouge, le temps avant le premier octet audio — c’est lui qui décide.
            En vert, ce qui coule ensuite. Essai du {new Date(essai.quand).toLocaleString("fr-FR")}
          </p>
        </>
      ) : essai && (
        <>
          {essai.resultats.map((r) => (
            <div key={r.signes} style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
                <span style={{ opacity: 0.85 }}>{r.signes} signes</span>
                <span style={{ opacity: 0.6 }}>
                  {r.motif ? r.motif : `${sec(r.fin_ms)} · ${r.ms_par_signe} ms/signe`}
                </span>
              </div>
              <div style={{ height: 8, background: "#1a1511", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.round((r.fin_ms / max) * 100)}%`,
                  background: "#e8b25f", borderRadius: 4 }} />
              </div>
            </div>
          ))}
          <p style={{ margin: "10px 0 0", fontSize: 13,
            color: /SUIT la longueur/.test(essai.verdict) ? "#7fc48f" : "#d79a8c" }}>
            {essai.verdict}
          </p>
          <p style={{ margin: "4px 0 0", opacity: 0.45, fontSize: 11 }}>
            essai du {new Date(essai.quand).toLocaleString("fr-FR")}
          </p>
        </>
      )}
    </section>
  );
}

/* ── LA PROCHAINE LIMITE POSSIBLE ───────────────────────────────────────
   Lamine, le 15 septembre 2026 au soir : « la prochaine limite possible n'est
   plus forcément le temps de calcul, mais la couture audio entre les
   morceaux. » Il a raison : maintenant qu'elle parle avant d'avoir tout
   fabriqué, un morceau qui n'arrive pas à temps s'entend comme un trou. Le
   téléphone mesure déjà ce trou ; il n'était affiché nulle part. */
function Coutures({ l }: { l?: Lecture | null }) {
  if (!l || !l.reponses) return null;
  const mauvais = l.couture_max_ms > 120;
  return (
    <p style={{ margin: "6px 0 0", fontSize: 13, color: mauvais ? "#d79a8c" : "#7fc48f" }}>
      {l.en_plusieurs_morceaux === 0
        ? "aucune réponse dite en plusieurs morceaux — pas encore de couture à craindre"
        : mauvais
          ? `trou audible entre deux morceaux : jusqu’à ${l.couture_max_ms} ms (médiane ${l.couture_mediane_ms} ms)`
          : `aucun trou audible : ${l.couture_max_ms} ms au pire sur ${l.en_plusieurs_morceaux} réponse(s) en plusieurs morceaux`}
    </p>
  );
}

function Barres({ parts, envoi = 0 }: { parts: Part[]; envoi?: number }) {
  /* L'envoi du son n'est pas une borne : c'est une SOUSTRACTION entre ce que
     le tour a compté et ce que l'appel a vraiment duré. On le montre à part,
     et on retire son poids de la transcription pour ne pas le compter deux
     fois. Voir `envoiDuSon` plus haut. */
  const detaillees = envoi > 200
    ? parts.flatMap((p) => /transcription/.test(p.quoi)
      ? [{ quoi: "l’envoi de ta voix au serveur", ms: envoi, part: 0 },
         { quoi: "la transcription elle-même", ms: Math.max(0, p.ms - envoi), part: 0 }]
      : [p]).sort((a, b) => b.ms - a.ms)
    : parts;
  const max = Math.max(1, ...detaillees.map((p) => p.ms));
  return (
    <div style={{ marginBottom: 24 }}>
      {detaillees.map((p) => (
        <div key={p.quoi} style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 3 }}>
            <span style={{ opacity: 0.85 }}>{p.quoi}</span>
            <span style={{ opacity: 0.6 }}>{sec(p.ms)}</span>
          </div>
          <div style={{ height: 8, background: "#1a1511", borderRadius: 4, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${Math.round((p.ms / max) * 100)}%`,
              background: "#e8b25f", borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Bloc({ titre, g }: { titre: string; g: Groupe | null }) {
  if (!g) return null;
  const lignes: Array<[string, number]> = [
    ["silence avant la coupure", g.queue_ms],
    ["transcription", g.transcription_ms],
    ["modèle", g.modele_ms],
    ["fabrication de la voix", g.voix_ms],
    ["démarrage du son", g.demarrage_ms],
    /* Le temps qu'aucune borne ne couvre. Zéro quand tout est mesuré ;
       s'il grossit, c'est qu'un chemin nous échappe. */
    ["ailleurs", g.ailleurs_ms],
  ];
  return (
    <section style={{ marginBottom: 18 }}>
      <h2 style={{ font: "600 15px/1.3 system-ui", margin: "0 0 6px" }}>
        {titre} <span style={{ opacity: 0.5, fontWeight: 400 }}>({g.tours})</span>
      </h2>
      <p style={{ margin: "0 0 8px", font: "600 20px/1.2 system-ui", color: "#e8b25f" }}>
        {sec(g.vecu_ms)} <span style={{ fontSize: 13, opacity: 0.6, fontWeight: 400 }}>en tout</span>
      </p>
      {lignes.map(([quoi, ms]) => (
        <div key={quoi} style={{ display: "flex", justifyContent: "space-between",
          fontSize: 13, padding: "3px 0", opacity: 0.8 }}>
          <span>{quoi}</span><span>{ms} ms</span>
        </div>
      ))}
    </section>
  );
}
