"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DOLLAR_PAR_SIGNE, useParler } from "@/lib/parler";
import { useDicter } from "@/lib/dicter";
import type { Lecon, Paire } from "@/lib/lecons";

/* ── LA PAGE D'APPRENTISSAGE DE BIA ─────────────────────────────────────────

   Lamine, le 13 septembre 2026 au soir : « ça peut être une page à part, page
   d'apprentissage de BIA. Son rôle, c'est essayer de prononcer exactement ce
   que je dis et de comprendre le sens, pour qu'ensuite ce soit dans le
   répertoire. »

   UNE LEÇON = UNE SITUATION. Ce qu'on lui dit — au moins dix façons — et ce
   qu'elle répond — quatre ou cinq réponses. Tout par paires : le wolof, et
   juste à côté ce que ça veut dire. « Le français, c'est par là qu'elle
   comprend. »

   TROIS CHOSES QUE CETTE PAGE DOIT FAIRE, ET RIEN D'AUTRE :

     1. qu'il DICTE au lieu de taper — quatorze lignes de wolof à l'écrit sur un
        téléphone, et il ne ferait jamais la deuxième leçon ;
     2. qu'il ENTENDE ce qu'il vient d'écrire, avec la voix et le ralentissement
        de la vraie conversation, pour corriger jusqu'à ce que ça sonne juste ;
     3. qu'il ESSAIE — qu'il redemande autrement et voie si elle retrouve.

   RIEN N'EST ENCORE BRANCHÉ SUR LA CONVERSATION. C'est voulu, et convenu avec
   lui : il essaie le geste d'abord, on branche ensuite. Une leçon validée est
   gardée dans le seau `lecons` ; BIA ne s'en sert pas encore.

   RÉSERVÉE AU CODE MAÎTRE — sa demande, mot pour mot : « moi uniquement, les
   testeurs n'auront pas accès à cette partie ». La vérification est côté
   serveur (voir app/api/lecon/route.ts) : cacher un bouton ne protège rien. */

const VISE = 10;      // le nombre de façons qu'il s'est fixé
const REPONSES_VISEES = 4;

const PAIRE_VIDE: Paire = { wolof: "", francais: "" };

/** Une leçon toute neuve, avec de quoi commencer sans avoir à ajouter des
    lignes une à une. */
function lecconNeuve(): Lecon {
  return {
    cle: "", titre: "",
    dit: Array.from({ length: 3 }, () => ({ ...PAIRE_VIDE })),
    repond: Array.from({ length: 2 }, () => ({ ...PAIRE_VIDE })),
    quand: "", version: 0,
  };
}

export default function PageLecon() {
  const [code, setCode] = useState("");
  const [lecons, setLecons] = useState<Lecon[]>([]);
  const [lecon, setLecon] = useState<Lecon>(lecconNeuve);
  const [etatListe, setEtatListe] = useState("");
  const [bilan, setBilan] = useState("");
  const [occupe, setOccupe] = useState(false);
  const [essai, setEssai] = useState("");
  const [verdict, setVerdict] = useState("");

  const { joue, etat: etatVoix, signes, ecouter, taire } = useParler(code);

  /* Ce que l'écoute écrit revient TOUJOURS du côté wolof : c'est le wolof
     qu'il dicte. Le français, il l'écrit — c'est une explication, pas une
     transcription. */
  const poserLeTexte = useCallback((quoi: string, texte: string) => {
    const [ou, rang] = quoi.split(":");
    const i = Number(rang);
    setLecon((l) => {
      const suite = { ...l };
      const liste = ou === "dit" ? [...l.dit] : [...l.repond];
      if (!liste[i]) return l;
      /* On AJOUTE à ce qui est déjà là plutôt que d'écraser : il peut dicter
         une phrase en deux fois, ou compléter ce qu'il a commencé à taper. */
      const avant = liste[i].wolof.trim();
      liste[i] = { ...liste[i], wolof: avant ? `${avant} ${texte}` : texte };
      if (ou === "dit") suite.dit = liste; else suite.repond = liste;
      return suite;
    });
  }, []);

  const { enregistre, ecrit, basculer, abandonner, etat: etatMicro, setEtat: setEtatMicro } =
    useDicter(code, poserLeTexte);

  useEffect(() => {
    try { setCode(localStorage.getItem("bia-code") || ""); } catch {}
  }, []);

  /* On lâche le micro en quittant la page : un micro laissé ouvert allume la
     pastille du téléphone et fait croire qu'on écoute encore. */
  useEffect(() => abandonner, [abandonner]);

  const charger = useCallback(async (leCode: string) => {
    if (!leCode) return;
    setEtatListe("Elle relit ses leçons…");
    try {
      const r = await fetch("/api/lecon", { headers: { "x-bia-code": leCode } });
      const d = await r.json() as { lecons?: Lecon[]; erreur?: string };
      if (d.erreur) { setEtatListe(d.erreur); return; }
      setLecons(d.lecons || []);
      setEtatListe((d.lecons || []).length ? "" : "Aucune leçon pour l'instant. La première est en dessous.");
    } catch (e) {
      setEtatListe(`Les leçons ne se lisent pas : ${(e as Error).message}`);
    }
  }, []);

  useEffect(() => { void charger(code); }, [code, charger]);

  const changer = (ou: "dit" | "repond", i: number, cote: keyof Paire, valeur: string) => {
    setLecon((l) => {
      const liste = (ou === "dit" ? l.dit : l.repond).map((p, n) => n === i ? { ...p, [cote]: valeur } : p);
      return ou === "dit" ? { ...l, dit: liste } : { ...l, repond: liste };
    });
  };

  const ajouter = (ou: "dit" | "repond") => setLecon((l) => ou === "dit"
    ? { ...l, dit: [...l.dit, { ...PAIRE_VIDE }] }
    : { ...l, repond: [...l.repond, { ...PAIRE_VIDE }] });

  const retirer = (ou: "dit" | "repond", i: number) => setLecon((l) => ou === "dit"
    ? { ...l, dit: l.dit.filter((_, n) => n !== i) }
    : { ...l, repond: l.repond.filter((_, n) => n !== i) });

  const pleines = (p: Paire[]) => p.filter((x) => x.wolof.trim() && x.francais.trim());
  const facons = pleines(lecon.dit).length;
  const reponses = pleines(lecon.repond).length;

  /* Ce qui manque, dit en clair AVANT d'appuyer sur Valider — pour qu'il ne
     découvre pas un refus après avoir travaillé un quart d'heure. */
  const manque = useMemo(() => {
    const griefs: string[] = [];
    if (!lecon.titre.trim()) griefs.push("le nom de la leçon");
    if (!facons) griefs.push("au moins une façon de le lui dire");
    if (!reponses) griefs.push("au moins une réponse");
    const boiteuses = [...lecon.dit, ...lecon.repond]
      .filter((p) => (p.wolof.trim() ? 0 : 1) + (p.francais.trim() ? 0 : 1) === 1).length;
    if (boiteuses) griefs.push(`${boiteuses} ligne(s) où il manque le wolof ou le français`);
    return griefs;
  }, [lecon, facons, reponses]);

  const valider = async () => {
    if (manque.length) { setBilan(`Il manque ${manque.join(", ")}.`); return; }
    setOccupe(true);
    setBilan("Elle garde la leçon…");
    try {
      const r = await fetch("/api/lecon", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": code },
        body: JSON.stringify(lecon),
      });
      const d = await r.json() as { lecon?: Lecon; erreur?: string };
      if (d.erreur) { setBilan(d.erreur); return; }
      setBilan(`« ${d.lecon?.titre} » est apprise : ${facons} façon(s) de le dire, ${reponses} réponse(s).`);
      setLecon(lecconNeuve());
      await charger(code);
    } catch (e) {
      setBilan(`Ça n'a pas abouti : ${(e as Error).message}`);
    } finally {
      setOccupe(false);
    }
  };

  const essayer = async () => {
    const quoi = essai.trim();
    if (!quoi) return;
    setVerdict("Elle cherche…");
    try {
      const r = await fetch(`/api/lecon?essai=${encodeURIComponent(quoi)}`, { headers: { "x-bia-code": code } });
      const d = await r.json() as { trouve?: { titre: string; forme: string } | null; erreur?: string };
      if (d.erreur) { setVerdict(d.erreur); return; }
      setVerdict(d.trouve
        ? `Elle retrouve : « ${d.trouve.titre} », par la façon « ${d.trouve.forme} ».`
        : "Elle ne retrouve RIEN. Ajoute cette façon de le dire à la leçon — c'est exactement pour ça que le bouton existe.");
    } catch (e) {
      setVerdict(`L'essai a échoué : ${(e as Error).message}`);
    }
  };

  const ouvrir = (l: Lecon) => {
    taire();
    setLecon({ ...l, dit: l.dit.map((p) => ({ ...p })), repond: l.repond.map((p) => ({ ...p })) });
    setBilan("");
    setVerdict("");
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const Lignes = ({ ou, titre, aide, vise }: {
    ou: "dit" | "repond"; titre: string; aide: string; vise: number;
  }) => {
    const liste = ou === "dit" ? lecon.dit : lecon.repond;
    return (
      <section className="lecon-bloc">
        <p className="lecon-titre">{titre}</p>
        <p className="lecon-aide">{aide}</p>
        <div className="lecon-entetes">
          <span>En wolof</span>
          <span>Ce que ça veut dire</span>
        </div>
        {liste.map((p, i) => {
          const marque = `${ou}:${i}`;
          const enCours = enregistre === marque;
          return (
            <div className="lecon-ligne" key={marque}>
              <div className="lecon-paire">
                <textarea
                  className="lecon-case" rows={2} value={p.wolof}
                  placeholder={ou === "dit" ? "ce qu'on lui dit…" : "ce qu'elle répond…"}
                  onChange={(e) => changer(ou, i, "wolof", e.target.value)} />
                <textarea
                  className="lecon-case lecon-case-fr" rows={2} value={p.francais}
                  placeholder="en français…"
                  onChange={(e) => changer(ou, i, "francais", e.target.value)} />
              </div>
              <div className="lecon-gestes">
                <button type="button" className={enCours ? "lecon-micro lecon-micro-on" : "lecon-micro"}
                  disabled={ecrit && !enCours} onClick={() => void basculer(marque)}>
                  {enCours ? "■ j'ai fini" : "● dicter"}
                </button>
                <button type="button" className="lecon-lien" disabled={!p.wolof.trim()}
                  onClick={() => void ecouter(p.wolof, marque)}>
                  {joue === marque ? "elle dit…" : "écouter"}
                </button>
                <button type="button" className="lecon-lien lecon-pale"
                  onClick={() => retirer(ou, i)}>retirer</button>
              </div>
            </div>
          );
        })}
        <button type="button" className="lecon-ajout" onClick={() => ajouter(ou)}>
          + {ou === "dit" ? "une autre façon de le dire" : "une autre réponse"}
        </button>
        <span className="lecon-compte">
          {(ou === "dit" ? facons : reponses)} / {vise}
          {(ou === "dit" ? facons : reponses) >= vise ? " ✓" : ""}
        </span>
      </section>
    );
  };

  return (
    <main className="lecon-page">
      <p className="lecon-retour"><a href="/">← revenir à BIA</a></p>
      <h1 className="lecon-grand">Apprendre à BIA</h1>
      <p className="lecon-aide">
        Une leçon, c&apos;est une situation : <strong>ce qu&apos;on lui dit</strong>, et
        {" "}<strong>ce qu&apos;elle répond</strong>. Chaque ligne va par deux — le wolof, et
        juste à côté ce que ça veut dire. C&apos;est par le français qu&apos;elle comprend.
      </p>

      {!code ? (
        <p className="lecon-aide">
          <input className="lecon-case" placeholder="ton code maître"
            value={code} onChange={(e) => setCode(e.target.value.trim())} />
          {" "}Cette page est réservée à ton code maître.
        </p>
      ) : null}

      <input className="lecon-case lecon-nom" placeholder="Le nom de la leçon — « me tenir compagnie »"
        value={lecon.titre} onChange={(e) => setLecon((l) => ({ ...l, titre: e.target.value }))} />

      <Lignes ou="dit" titre="Ce qu'on lui dit" vise={VISE}
        aide={`Toutes les façons de le dire, en wolof comme en français. Tu en vises ${VISE} : c'est ce qui fait qu'elle n'a plus à deviner.`} />

      <Lignes ou="repond" titre="Ce qu'elle répond" vise={REPONSES_VISEES}
        aide="Quatre ou cinq réponses, pour qu'elle ne dise pas la même chose à chaque fois. Écoute chacune avant de valider : une faute de wolof ne se voit pas, elle s'entend." />

      <section className="lecon-bloc">
        <p className="lecon-titre">Essaie</p>
        <p className="lecon-aide">
          Redemande-le autrement, comme le ferait quelqu&apos;un d&apos;autre. Si elle ne
          retrouve pas, c&apos;est qu&apos;il manque cette façon-là dans la leçon.
          {" "}<em>N&apos;essaie qu&apos;après avoir validé : elle cherche dans ce qui est gardé.</em>
        </p>
        <div className="lecon-paire">
          <input className="lecon-case" placeholder="dis-le autrement…"
            value={essai} onChange={(e) => setEssai(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void essayer(); }} />
          <button type="button" className="lecon-ajout" onClick={() => void essayer()}>essayer</button>
        </div>
        {verdict ? <p className="lecon-aide">{verdict}</p> : null}
      </section>

      <p className="lecon-valider">
        <button type="button" className="lecon-grand-bouton" disabled={occupe || !code}
          onClick={() => void valider()}>
          {occupe ? "elle garde…" : "Valider la leçon"}
        </button>
        {manque.length ? <span className="lecon-compte">Il manque {manque.join(", ")}.</span> : null}
      </p>

      {bilan ? <p className="lecon-aide">{bilan}</p> : null}
      {etatMicro ? <p className="lecon-aide" onClick={() => setEtatMicro("")}>{etatMicro}</p> : null}
      {etatVoix ? <p className="lecon-aide">{etatVoix}</p> : null}
      {ecrit ? <p className="lecon-aide">Elle écoute ce que tu viens de dire…</p> : null}
      <p className="lecon-aide">
        Écouter se paie : {(signes * DOLLAR_PAR_SIGNE).toFixed(3)} $ depuis que la page est
        ouverte. Valider ne coûte rien — les réponses ne seront enregistrées qu&apos;au
        moment où tu le décideras, environ deux centimes chacune.
      </p>

      <section className="lecon-bloc">
        <p className="lecon-titre">Ce qu&apos;elle a déjà appris {lecons.length ? `(${lecons.length})` : ""}</p>
        {etatListe ? <p className="lecon-aide">{etatListe}</p> : null}
        {lecons.map((l) => (
          <p className="lecon-aide" key={l.cle}>
            <button type="button" className="lecon-lien" onClick={() => ouvrir(l)}>{l.titre}</button>
            {" — "}{l.dit.length} façon(s), {l.repond.length} réponse(s)
          </p>
        ))}
      </section>
    </main>
  );
}
