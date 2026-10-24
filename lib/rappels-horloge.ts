/* ── L'HORLOGE QUI FAIT SONNER, ET CE QUI LA TIENT ÉVEILLÉE ───────────────

   Lamine : « rappel qui sonne même BIA fermée (notification sur téléphone
   installé ; serveur qui ne dort pas — vérifie reveil.yml — ou notification
   locale programmée) ».

   J'AI VÉRIFIÉ reveil.yml, ET IL NE RÉVEILLE RIEN. Son en-tête le dit
   lui-même : le `schedule` a été retiré le 13 septembre 2026, parce que sur
   un dépôt privé en forfait gratuit les tâches programmées de GitHub sont
   décalées, sautées, et auraient mangé le quota en deux semaines. Il ne
   reste qu'un bouton « Run workflow » à presser à la main.

   CE QUI TIENT BIA ÉVEILLÉE AUJOURD'HUI est un service extérieur,
   cron-job.org, qui demande /api/etat toutes les cinq minutes. C'est écrit
   dans ce même fichier. Donc :

     — l'instance est debout, et un setInterval de trente secondes tourne ;
     — mais je ne peux pas vérifier d'ici que ce ping existe encore. On ne
       s'appuie donc pas dessus : CHAQUE passage par /api/etat et par
       /api/rappels balaie aussi les rappels dus. Si le ping extérieur vit,
       la précision est de trente secondes ; s'il meurt, elle devient « au
       premier qui ouvre BIA », et le compteur `perdues` le dira.

   LA NOTIFICATION LOCALE PROGRAMMÉE, elle, n'existe pas : voir l'en-tête de
   lib/push-web.ts. Ce n'est pas un choix, c'est ce que les navigateurs
   offrent.

   ── UN RAPPEL NE SONNE QU'UNE FOIS PAR JOUR ET PAR HEURE ─────────────────

   La marque du jour est écrite AVANT l'envoi. Si l'envoi échoue, le créneau
   est perdu pour aujourd'hui — et compté. L'inverse (marquer après) ferait
   sonner le téléphone en boucle toutes les trente secondes pendant que le
   service de push a un hoquet, ce qui est bien pire qu'un rappel manqué. */

import { sonneriesDues, texteSonnerie, jourLocal, type Rappel } from "./rappels";
import { ecrire, toutesLesPersonnes, type Abonnement } from "./rappels-depot";
import { envoyerPush } from "./push-web";

type Etat = {
  balayages: number;
  sonneries_envoyees: number;
  sonneries_echouees: number;
  creneaux_perdus: number;
  abonnements_retires: number;
  sans_abonnement: number;
  dernier_balayage: string;
  derniers: Array<{ quand: string; heure: string; retard_min: number; envoyes: number; echecs: number }>;
  motifs: Record<string, number>;
};
const g = globalThis as typeof globalThis & { biaRappelsHorloge?: Etat; biaRappelsTic?: ReturnType<typeof setInterval> };
const etat: Etat = (g.biaRappelsHorloge ??= {
  balayages: 0, sonneries_envoyees: 0, sonneries_echouees: 0, creneaux_perdus: 0,
  abonnements_retires: 0, sans_abonnement: 0, dernier_balayage: "", derniers: [], motifs: {},
});
const noter = (m: string) => { etat.motifs[m] = (etat.motifs[m] || 0) + 1; };

export function resumeHorloge() {
  return { ...etat, motifs: { ...etat.motifs }, derniers: etat.derniers.slice(-10) };
}

let enCours = false;

/** Un passage : qui doit sonner maintenant sonne. Jamais deux à la fois. */
export async function balayerLesRappels(maintenant = Date.now()): Promise<void> {
  if (enCours) return;
  enCours = true;
  try {
    etat.balayages++;
    etat.dernier_balayage = new Date(maintenant).toISOString();
    const lignes = await toutesLesPersonnes();
    for (const { personne, document } of lignes) {
      const rappels: Rappel[] = document.rappels || [];
      if (!rappels.length) continue;
      const { dues, perdues } = sonneriesDues(rappels, maintenant);
      if (perdues.length) {
        etat.creneaux_perdus += perdues.length;
        /* Perdu veut dire perdu : on marque le jour pour ne pas le repasser
           en revue toutes les trente secondes jusqu'à minuit. */
        for (const p of perdues) p.rappel.sonne[p.heure] = jourLocal(maintenant);
      }
      if (!dues.length) { if (perdues.length) await ecrire(personne, document); continue; }

      const abonnements: Abonnement[] = document.abonnements || [];
      if (!abonnements.length) {
        etat.sans_abonnement += dues.length;
        noter("aucun_abonnement");
        /* AUCUN abonnement : on ne marque PAS le créneau. Le téléphone n'a
           jamais été prévenu ; le marquer effacerait un rappel qui n'a
           jamais sonné. Il restera dû jusqu'à la limite de retard, puis
           tombera dans « perdues » — visible, et non silencieux. */
        continue;
      }

      for (const d of dues) {
        d.rappel.sonne[d.heure] = jourLocal(maintenant);
        const { titre, corps } = texteSonnerie(d.rappel, d.heure);
        let envoyes = 0, echecs = 0;
        const vivants: Abonnement[] = [];
        for (const a of abonnements) {
          const v = await envoyerPush(a, { titre, corps, heure: d.heure, rappel: d.rappel.id });
          if (v.ok) { envoyes++; vivants.push(a); continue; }
          echecs++;
          if (v.disparu) { etat.abonnements_retires++; noter("abonnement_disparu"); continue; }
          noter(`push_${v.statut || "reseau"}`);
          vivants.push(a);
        }
        etat.sonneries_envoyees += envoyes;
        etat.sonneries_echouees += echecs ? 1 : 0;
        etat.derniers = [...etat.derniers.slice(-9), {
          quand: new Date(maintenant).toISOString(), heure: d.heure, retard_min: d.retard_min, envoyes, echecs,
        }];
        document.abonnements = vivants;
      }
      await ecrire(personne, document);
    }
  } catch (e) {
    noter("balayage_impossible");
    console.error("BIA — balayage des rappels :", (e as Error).message);
  } finally {
    enCours = false;
  }
}

/* Le battement de trente secondes. `unref` : il ne doit jamais empêcher le
   processus de se terminer proprement lors d'un redéploiement. */
export function armerHorloge(): void {
  if (g.biaRappelsTic) return;
  const tic = setInterval(() => { void balayerLesRappels(); }, 30000);
  (tic as unknown as { unref?: () => void }).unref?.();
  g.biaRappelsTic = tic;
}
