/* ── QUI OUVRE DES SESSIONS CHEZ GOOGLE, ET COMBIEN ───────────────────────

   Lamine, dimanche 25 octobre, midi : « Khalam Rapide refuse encore avec le
   code 1011 alors que le quota gratuit aurait dû se remettre à zéro à 7 h.
   Trouve pourquoi : combien de sessions ont été ouvertes depuis minuit, par
   qui. »

   LA QUESTION N'AVAIT AUCUNE RÉPONSE, et c'est le défaut à corriger d'abord.
   Rien ne comptait les ouvertures : ni celles de son téléphone, ni celles de
   mes essais. On ne pouvait que supposer — et supposer sur un quota qu'on ne
   voit pas, c'est ne rien savoir.

   ── CE QUE J'AI DÉJÀ ÉCARTÉ PAR LA MESURE ────────────────────────────────

   Le diagnostic de démarrage : `verifierGeminiLive()` n'est appelé NULLE
   PART. Un redémarrage de Render n'ouvre donc aucune session. Vérifié par
   recherche dans tout le dépôt, pas supposé.

   ── CE QUE JE DOIS DIRE DE MOI ───────────────────────────────────────────

   /api/gemini-live/essai, que j'ai écrit hier soir pour trouver la cause du
   refus, ouvre NEUF sessions quand on l'appelle sans préciser de variante.
   Je l'ai lancé ainsi au moins une fois, plus deux essais ciblés : une
   douzaine de sessions, de ma main. Et surtout : cette route était OUVERTE
   à tout internet, bornée à un appel toutes les quinze secondes — soit, pour
   qui la trouve, plus de deux mille sessions par heure. Je ne sais pas si
   quelqu'un l'a trouvée ; je sais que je l'avais laissée ouverte, et ce
   compteur est là pour qu'on ne soit plus jamais réduit à l'ignorer.

   ── LE JOUR COMMENCE À MINUIT UTC ────────────────────────────────────────

   Dakar est à UTC+0, donc minuit chez lui. Le compte repart tout seul au
   changement de jour, sans tâche ni horloge : on compare simplement la date
   portée par le relevé. */

type Compte = { total: number; par_origine: Record<string, number>; refus_1011: number; premiere: string; derniere: string };
type Etat = { jour: string; compte: Compte; hier: Compte | null };

const vide = (): Compte => ({ total: 0, par_origine: {}, refus_1011: 0, premiere: "", derniere: "" });
const jourUTC = () => new Date().toISOString().slice(0, 10);

const g = globalThis as typeof globalThis & { biaSessionsLive?: Etat };
const etat: Etat = (g.biaSessionsLive ??= { jour: jourUTC(), compte: vide(), hier: null });

/* Les seuls noms acceptés. Un client bricolé ne doit pas pouvoir inventer
   une origine et brouiller la seule colonne qui répond à « par qui ». */
const ORIGINES = new Set(["telephone", "essai", "diagnostic", "inconnue"]);

function jourCourant(): Compte {
  const aujourdhui = jourUTC();
  if (etat.jour !== aujourdhui) { etat.hier = etat.compte; etat.jour = aujourdhui; etat.compte = vide(); }
  return etat.compte;
}

/** Une session vient d'être demandée à Google. */
export function noterSessionLive(origine: string): void {
  const c = jourCourant();
  const nom = ORIGINES.has(origine) ? origine : "inconnue";
  c.total += 1;
  c.par_origine[nom] = (c.par_origine[nom] || 0) + 1;
  const maintenant = new Date().toISOString();
  if (!c.premiere) c.premiere = maintenant;
  c.derniere = maintenant;
}

/** Google a refusé pour quota. Compté à part : c'est le chiffre qui dit si
    le quota est épuisé, et il ne doit pas se confondre avec les ouvertures. */
export function noterRefusQuota(): void {
  jourCourant().refus_1011 += 1;
}

export function resumeSessionsLive() {
  const c = jourCourant();
  return {
    revision: "sessions-live-v1",
    jour_utc: etat.jour,
    depuis_minuit: { ...c, par_origine: { ...c.par_origine } },
    veille: etat.hier ? { ...etat.hier, par_origine: { ...etat.hier.par_origine } } : null,
    limite:
      "Compté DEPUIS LE DERNIER DÉMARRAGE de l'instance, pas depuis minuit absolu : Render redémarre, "
      + "et ce qui vit en mémoire repart à zéro. Un total bas peut donc vouloir dire « peu de sessions » "
      + "ou « instance jeune » — `premiere` dit à partir de quand on compte. Les ouvertures qui ont eu "
      + "lieu avant cette heure-là ne sont pas ici, et elles comptent quand même pour Google.",
  };
}
