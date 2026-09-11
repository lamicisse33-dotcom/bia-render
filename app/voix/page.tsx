"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { REPERTOIRE } from "@/lib/repertoire-textes";
import { ralentir, vitesseChoisie } from "@/lib/ralentir";

/* ── ÉCOUTER AVANT D'ENREGISTRER ────────────────────────────────────────────

   Lamine, le 11 septembre 2026 : « il faut me créer une fenêtre de discussion
   pour que je puisse tester les voix avant qu'on enregistre quoi que ce soit,
   pour voir si ça sonne correctement en wolof — une page où je peux coller mes
   corrections pour les écouter. »

   C'est la pièce qui manquait, et il a raison de la demander MAINTENANT. On
   s'apprêtait à enregistrer quarante-deux phrases d'un coup sans que personne
   ne les ait jamais entendues. Une faute d'orthographe en wolof ne se voit pas
   — elle s'entend. « Dëgg » et « dégg » se lisent presque pareil et ne se
   disent pas du tout pareil.

   DEUX CHOSES SUR CETTE PAGE :

   EN HAUT, un champ libre. On y colle n'importe quoi, on appuie, on écoute.
   C'est là qu'on essaie une tournure, qu'on compare deux orthographes, qu'on
   vérifie si le moteur dit « ñ » comme il faut.

   EN DESSOUS, les quarante-deux phrases, chacune modifiable et écoutable. Les
   corrections restent SUR L'APPAREIL — il peut fermer la page, revenir demain,
   son travail est là. Quand tout sonne juste, un bouton recopie l'ensemble
   pour me l'envoyer.

   CHAQUE ÉCOUTE SE PAIE, et c'est écrit en gros. Environ deux centimes par
   phrase. Ce n'est pas cher, mais quelqu'un qui essaie cent fois sans le
   savoir trouve sa facture en fin de mois — alors on compte à voix haute.

   ── CETTE PAGE EST PROVISOIRE ─────────────────────────────────────────────

   Lamine, le 11 septembre 2026 : « elle sera provisoire, le temps que je
   puisse tester la liste que tu m'as donnée. Après, on le supprime. »

   Elle a un seul travail : lui faire entendre les quarante-deux phrases avant
   qu'on les enregistre. Ce travail fini, elle n'a plus de raison d'exister —
   et une page qui dépense du crédit n'a rien à faire dans une application
   qu'on ouvre au public.

   POUR LA RETIRER, TROIS GESTES, ET RIEN D'AUTRE N'EN DÉPEND :
     1. effacer le dossier app/voix/ ;
     2. effacer le bloc « LA PAGE POUR ÉCOUTER » à la fin de app/globals.css ;
     3. c'est tout. lib/repertoire-textes.ts RESTE : c'est le répertoire
        lui-même qui s'en sert, pas cette page.

   Le bandeau en haut de l'écran le dit aussi, pour que personne ne la prenne
   pour une pièce du produit. */

const DOLLAR_PAR_SIGNE = 0.22 / 1000;
const CLE_CORRECTIONS = "bia-corrections-voix";

type Corrections = Record<string, string>;

export default function PageVoix() {
  const [code, setCode] = useState("");
  const [libre, setLibre] = useState("");
  const [corrections, setCorrections] = useState<Corrections>({});
  const [joue, setJoue] = useState("");
  const [etat, setEtat] = useState("");
  const [signes, setSignes] = useState(0);
  const [copie, setCopie] = useState("");
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    try {
      setCode(localStorage.getItem("bia-code") || "");
      const gardees = localStorage.getItem(CLE_CORRECTIONS);
      if (gardees) setCorrections(JSON.parse(gardees) as Corrections);
    } catch {}
  }, []);

  /* Ses corrections sont gardées à chaque frappe. Perdre une heure de travail
     parce qu'on a fermé un onglet serait impardonnable. */
  useEffect(() => {
    try { localStorage.setItem(CLE_CORRECTIONS, JSON.stringify(corrections)); } catch {}
  }, [corrections]);

  const contexte = useCallback(() => {
    if (!ctxRef.current || ctxRef.current.state === "closed") {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctxRef.current = new C();
    }
    return ctxRef.current;
  }, []);

  const taire = useCallback(() => {
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
    setJoue("");
  }, []);

  /* On demande les morceaux l'un après l'autre et on les enchaîne, comme BIA
     le fait — sinon une phrase longue s'arrêterait au milieu et on croirait
     que c'est le texte qui cloche. */
  const ecouter = useCallback(async (texte: string, quoi: string) => {
    const propre = texte.trim();
    if (!propre) return;
    if (!code) { setEtat("Il faut ton code d'accès, en haut."); return; }

    taire();
    setJoue(quoi);
    setEtat("");
    try {
      const ctx = contexte();
      if (ctx.state === "suspended") await ctx.resume();

      let partie = 0;
      let total = 1;
      let quand = ctx.currentTime + 0.05;
      let envoyes = 0;

      while (partie < total) {
        const r = await fetch("/api/voix", {
          method: "POST",
          headers: { "content-type": "application/json", "x-bia-code": code },
          body: JSON.stringify({ texte: propre, partie, ou: "essai" }),
        });
        if (r.status === 401) { setEtat("Ce code n'est pas valable."); setJoue(""); return; }
        const d = await r.json() as { parties?: number; audio?: string | null; erreur?: string };
        total = Math.max(1, Number(d.parties) || 1);
        if (!d.audio) {
          setEtat(d.erreur ? `La voix a refusé : ${d.erreur}` : "Aucun son n'est revenu.");
          setJoue("");
          return;
        }
        const octets = Uint8Array.from(atob(d.audio), (c) => c.charCodeAt(0)).buffer;
        const brut = await ctx.decodeAudioData(octets.slice(0));
        // Le même ralentissement que dans la conversation : on doit entendre
        // ce que les gens entendront, pas autre chose.
        const pose = ralentir(ctx, brut, vitesseChoisie());
        const source = ctx.createBufferSource();
        source.buffer = pose;
        source.connect(ctx.destination);
        source.start(quand);
        quand += pose.duration;
        sourceRef.current = source;
        if (partie === total - 1) source.onended = () => setJoue("");
        envoyes += propre.length / total;
        partie++;
      }
      setSignes((n) => n + Math.round(envoyes));
    } catch (e) {
      setEtat(String((e as Error).message));
      setJoue("");
    }
  }, [code, contexte, taire]);

  const texteDe = (cle: string, defaut: string) =>
    corrections[cle] !== undefined ? corrections[cle] : defaut;

  const changees = REPERTOIRE.filter((e) => texteDe(e.cle, e.wolof).trim() !== e.wolof.trim()).length;

  /* Ce qu'il m'envoie à la fin : seulement ce qu'il a CHANGÉ, avec la clé, pour
     que je pose les corrections sans risque de me tromper de phrase. */
  async function copierLesCorrections() {
    const lignes = REPERTOIRE
      .filter((e) => texteDe(e.cle, e.wolof).trim() !== e.wolof.trim())
      .map((e) => `${e.cle}\n  avant : ${e.wolof}\n  après : ${texteDe(e.cle, e.wolof).trim()}`);
    if (!lignes.length) { setCopie("Rien n'a été changé pour l'instant."); return; }
    const tout = `CORRECTIONS DE LAMINE — ${lignes.length} phrase(s)\n\n${lignes.join("\n\n")}\n`;
    try {
      await navigator.clipboard.writeText(tout);
      setCopie(`${lignes.length} correction(s) copiée(s). Colle-les-moi dans la discussion.`);
    } catch {
      setCopie("La copie a échoué. Sélectionne le texte ci-dessous à la main.");
    }
    setTimeout(() => setCopie(""), 6000);
  }

  const dollars = (signes * DOLLAR_PAR_SIGNE).toFixed(3);

  return (
    <main className="voix">
      {/* Il l'a demandé provisoire ; on l'écrit sur la page elle-même, sinon
          dans trois semaines personne ne saura si elle doit rester. */}
      <p className="voix-provisoire">
        Page provisoire — le temps d&apos;écouter et de corriger les phrases.
        On la retire une fois l&apos;enregistrement fait.
      </p>
      <h1>Écouter avant d&apos;enregistrer</h1>
      <p className="voix-intro">
        Colle une phrase, écoute-la, corrige-la. <strong>Rien n&apos;est enregistré
        ici</strong> — on enregistre une seule fois, quand tout sonne juste.
      </p>

      <label className="voix-code">
        Ton code
        <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="KOD" autoCapitalize="characters" autoComplete="off" />
      </label>

      {/* ── LE CHAMP LIBRE, EN HAUT — c'est ce qu'il a demandé ───────────── */}
      <section className="voix-libre">
        <h2>Essayer un texte</h2>
        <textarea value={libre} onChange={(e) => setLibre(e.target.value)} rows={4}
          placeholder="Colle ici ta phrase en wolof, et écoute-la…"
          aria-label="Texte à écouter" />
        <div className="voix-rangee">
          <button type="button" className="voix-ecouter"
            onClick={() => void ecouter(libre, "libre")} disabled={!libre.trim()}>
            {joue === "libre" ? "▌▌ En train de parler" : "▶ Écouter"}
          </button>
          {joue ? <button type="button" className="voix-pale" onClick={taire}>Arrêter</button> : null}
        </div>
      </section>

      {etat ? <p className="voix-etat">{etat}</p> : null}

      <p className="voix-compte">
        Essais de cette page : <b>{signes}</b> signes, soit <b>{dollars} $</b>.
        {" "}Chaque écoute se paie — une phrase courte coûte environ deux centimes.
      </p>

      {/* ── LES 42 PHRASES ─────────────────────────────────────────────────── */}
      <section className="voix-liste">
        <h2>Les {REPERTOIRE.length} phrases du répertoire</h2>
        <p className="voix-intro">
          Écoute chacune. Si le wolof ne sonne pas comme à Dakar, réécris-le
          ici — tes corrections restent sur ce téléphone, même si tu fermes la
          page. {changees > 0 ? <b>{changees} déjà corrigée(s).</b> : null}
        </p>

        {REPERTOIRE.map((e, i) => {
          const valeur = texteDe(e.cle, e.wolof);
          const change = valeur.trim() !== e.wolof.trim();
          return (
            <article key={e.cle} className={change ? "voix-item change" : "voix-item"}>
              <p className="voix-quand">
                <span>{i + 1}</span> on lui dit&nbsp;: {e.formes.slice(0, 3).map((f) => `« ${f} »`).join(", ")}
              </p>
              <textarea value={valeur} rows={2}
                aria-label={`Réponse en wolof — ${e.cle}`}
                onChange={(ev) => setCorrections((c) => ({ ...c, [e.cle]: ev.target.value }))} />
              <p className="voix-francais">{e.francais}</p>
              <div className="voix-rangee">
                <button type="button" className="voix-ecouter"
                  onClick={() => void ecouter(valeur, e.cle)}>
                  {joue === e.cle ? "▌▌" : "▶"} Écouter
                </button>
                {change ? (
                  <button type="button" className="voix-pale"
                    onClick={() => setCorrections((c) => { const n = { ...c }; delete n[e.cle]; return n; })}>
                    Remettre la mienne
                  </button>
                ) : null}
              </div>
            </article>
          );
        })}
      </section>

      <div className="voix-fin">
        <button type="button" className="voix-ecouter" onClick={() => void copierLesCorrections()}>
          Copier mes corrections ({changees})
        </button>
        {copie ? <p className="voix-etat">{copie}</p> : null}
        <p className="voix-intro">
          Envoie-les-moi dans la discussion : je les pose dans BIA, et c&apos;est
          seulement après qu&apos;on enregistre — une fois, pour toujours.
        </p>
      </div>
    </main>
  );
}
