# Plan vitesse — ce qui existe déjà, mesuré

Comparaison point par point de `docs/PLAN-VITESSE-2026-10-25.md` avec le code
et les compteurs de la version **servie** `a1352367a09b`, le 25 octobre 2026.

**Rien n'a été modifié pour écrire ce tableau.** Chaque ligne porte une mesure
lue sur `/api/etat` ou un fichier du dépôt, pas une impression.

Point de restauration posé avant tout : **`avant-plan-vitesse-20261025`**
(`git checkout avant-plan-vitesse-20261025`).

## La mesure de départ

| | Khalam Rapide | Khalam (voix de Kha) |
|---|---|---|
| TTFS médian | **1 709 ms** (10 tours) | **non mesuré** — 0 tour journalisé |
| dont avant le premier mot du modèle | 1 694 ms | — |
| dont démarrage du haut-parleur | 15 ms | — |
| silence exigé avant de clore | 1 200 ms | 1 200 ms |
| silence réellement observé | 1 694 ms | — |
| coupures suspectes | 0 | 0 |

**Le fait central : sur Khalam Rapide, le silence de fin de parole pèse
1 200 ms des 1 709 ms.** Le modèle et le réseau ne valent qu'environ 500 ms.
L'objectif ≤ 2 s est déjà tenu ; ≤ 1 s est arithmétiquement hors d'atteinte
tant que le silence vaut 1 200 ms.

Sur Khalam, la chaîne rapide **ne sert pas** :

```
anticipation      préparations 0   prêtes 0   servies 0
briques           sans_preparation 2
écoute            4 segments, 4 réussis
porte qui refuse  transcription_apres_fermeture
```

L'écoute progressive réussit 4 fois sur 4 et son travail est **jeté** : la
transcription arrive après la fermeture de la capture. C'est la même porte
qu'au 23 octobre, et c'est là que se gagnent les secondes sur la voix de Kha.

## §4 — Khalam Oreille

| Point de la fiche | État | Mesure / fichier |
|---|---|---|
| Transcription en streaming par blocs | **À AMÉLIORER** | existe : `lib/ecoute-progressive.ts`. Blocs d'envoi 100 ms, mais **premier segment à 1 000 ms puis 4 000 ms** — la fiche demande 100–200 ms |
| Provisoires transmises au cerveau pendant la parole | **À AMÉLIORER** | le chemin existe, mais `préparations 0` : rien n'arrive |
| VAD adapté français/wolof | **À CONSTRUIRE** | `silenceQuiSuffit()` rend **1 200 ms fixes**, aucune adaptation à la langue |
| Distinguer hésitation et vraie fin | **À CONSTRUIRE** | l'échelle adaptative existait, elle a été aplatie le 20 octobre |
| Écoute longue 120 s | **DÉJÀ FAIT** | `lib/ecoute-longue.ts`, couverture 120 s éprouvée |
| Pas de doublons ni de mots inventés | **DÉJÀ FAIT** | un reste silencieux n'est jamais envoyé seul (une ASR générative invente sur du silence) |
| Mélange français–wolof préservé | **DÉJÀ FAIT** | `indice_langue` par segment |
| Provisoire jamais pris pour définitif | **DÉJÀ FAIT** | `verifierSuite()` : `exact` / `verification` / `refus` |
| Segments obsolètes supprimés | **DÉJÀ FAIT** | `actuel()` annule le tour, `Tour annulé` |
| Sa voix non prise pour une demande | **DÉJÀ FAIT** | filtre d'écho + garde de parole, 0 auto-coupure sur 43 tours |

## §5 — Réponse anticipée

| Point | État | Mesure / fichier |
|---|---|---|
| Préparation silencieuse pendant la parole | **À AMÉLIORER** | tout le code existe ; `préparations 0` en production |
| Annulation si changement de sujet | **DÉJÀ FAIT** | `verifierSuite()` refuse sur *non, mais, finalement, waaye, déedéet, bul* — exactement le cas Thiès → Saint-Louis |
| Numéro de version par transcription | **DÉJÀ FAIT** | `empreinteAnticipation()` (SHA-256), tour + propriétaire |
| Interdiction d'émettre une réponse périmée | **DÉJÀ FAIT** | préfixe strict + `refus` |
| Validation avant action sensible | **DÉJÀ FAIT** | `eligibleAnticipation()` exclut mémoriser, corriger, envoyer, acheter, appeler… |
| Limite de consommation | **DÉJÀ FAIT** | quota par propriétaire, une fabrication par tour |

## §6 — Cerveau

| Point | État | Mesure / fichier |
|---|---|---|
| A. Streaming des jetons | **À AMÉLIORER** | les briques partent par morceaux, mais le **TTFT n'est pas mesuré en production** (seulement dans `lib/essai-modele-briques.ts`) |
| B. Cache des éléments permanents | **DÉJÀ FAIT** | `CACHE_CONTEXTE_ANTHROPIC`, TTL 1 h, sur le socle et les instructions du maître |
| C. Routage local avant d'appeler | **DÉJÀ FAIT** | `reponses-gardees`, `repertoire` (1 465 lignes de réponses enregistrées), `dialogue-devoirs`, `prises-validees` |
| D. Réponses courtes aux questions simples | **DÉJÀ FAIT** | `uneQuestionParTour`, tête courte 20 signes |
| E. Contexte sans tout renvoyer | **DÉJÀ FAIT** | fil borné, souvenirs par pertinence, compression Live |
| F. Pas de double réponse | **DÉJÀ FAIT** | `voix-page.ts` depuis le 24 octobre : une seule voix par session |
| Comparer les modèles sur du vrai wolof | **À AMÉLIORER** | l'essai existe (`BIA_BRIQUES_MODEL`), le verdict wolof reste à refaire sur ses phrases |

## §7 — Khalam Voice

| Point | État | Mesure / fichier |
|---|---|---|
| Modèle chargé et maintenu chaud | **À VÉRIFIER** | pod RunPod ; aucune mesure de démarrage à froid dans `/api/etat` |
| Génération progressive, premiers segments émis | **DÉJÀ FAIT** | `app/api/chatterbox-test/bia/stream`, livraison NDJSON |
| Pauses entre blocs | **DÉJÀ FAIT** | `blanc` mesuré entre briques |
| Dernier mot et dernière syllabe conservés | **À VÉRIFIER — PRIORITÉ** | EOS explicite et empreinte exigés, mais **l'anomalie de la fiche (audio plus court en streaming) n'a jamais été vérifiée par comparaison de durée** |
| Apostrophes, ponctuation, caractères spéciaux | **DÉJÀ FAIT** | règles de prononciation partagées |
| Mots wolof sautés | **DÉJÀ FAIT** | épreuves de mots sautés |
| Horloge de lecture unique | **DÉJÀ FAIT** | un seul `AudioContext`, ordonnancement par `currentTime` |
| Lèvres synchronisées sur l'audio joué | **DÉJÀ FAIT** | animation déclenchée par `commence` de la lecture, pas par le texte |

## §8 — RunPod / GPU

| Point | État | Mesure |
|---|---|---|
| VRAM, CPU, RAM, température | **À CONSTRUIRE** | **aucune** mesure GPU dans `/api/etat` |
| Deux moteurs en parallèle sur le GPU | **À AMÉLIORER** | file avec priorité à l'écoute (`ordonnancement_audio`), mais pas de mesure de contention |
| FP16/BF16, CUDA Graphs | **À CONSTRUIRE** | hors du dépôt, côté pod |
| Charge simultanée | **À CONSTRUIRE** | **aucune** mesure |

## §9 — Réseau

| Point | État | Mesure |
|---|---|---|
| Connexion persistante pendant la session | **DÉJÀ FAIT côté rapide** (WebSocket) · **À CONSTRUIRE côté Khalam** (un POST par tour) |
| Reconnexion automatique | **À AMÉLIORER** | `sessionResumption` demandé à Google ; rien côté Khalam |
| Erreurs 503 tracées | **À AMÉLIORER** | `lib/panne.ts` existe, pas de séparation santé / voix |
| Mesure depuis un vrai téléphone à Dakar | **DÉJÀ FAIT** | `journal_parole` : les 1 709 ms viennent de son téléphone |

## §11 — Mesures

| Indicateur | État | Où |
|---|---|---|
| VAD (délai de fin de parole) | **DÉJÀ FAIT** | `silence_observe_ms` vs `silence_exige_ms` |
| ASR final | **À AMÉLIORER** | `attente_finale_ms` existe, pas dans le journal |
| LLM TTFT | **À CONSTRUIRE** | mesuré seulement en essai, pas en production |
| TTS TTFA | **À AMÉLIORER** | `premier_son` des briques ≠ premier paquet |
| TTFS | **DÉJÀ FAIT** | `journal_parole`, les deux moteurs |
| Audio complet | **À CONSTRUIRE** | non mesuré |
| WER / CER | **À CONSTRUIRE** | **aucune** mesure de précision |
| Erreurs audio | **À AMÉLIORER** | coupures comptées, mots perdus non |
| **p50 / p95 / p99** | **À CONSTRUIRE** | **seule la médiane existe** — aucun p95 nulle part |
| Identifiant commun par échange | **À AMÉLIORER** | `session + tour` côté rapide seulement |

## §10 — Non-régression, 12 points

Déjà tenus par une épreuve : écoute longue 120 s · aucune interruption de
l'utilisateur · lexique et leçons Supabase · mots sautés · lèvres synchronisées
· mémoire et contexte · retour arrière (tag posé).

Restent sans épreuve automatique : naturel de la voix · prononciation
française dans le wolof · caractères spéciaux prononcés · réécoute audio ·
répétitions et inventions. **Ceux-là ne se jugent qu'à l'oreille.**

## Les trois contradictions à arbitrer

1. **Le silence.** La fiche demande 300–600 ms ; il a demandé 1 200 ms le
   24 octobre contre les coupures. On ne peut pas avoir les deux. ≤ 1 s au
   premier son exige de redescendre.
2. **≤ 1 s depuis Dakar.** Budget de la fiche : 950 ms, dont 250 ms de fin de
   parole. Avec 1 200 ms de silence, le plancher est à 1 200 ms + modèle +
   réseau. Sans toucher au silence, **≤ 1 s est impossible, et ce n'est pas
   une question d'optimisation.**
3. **Deux moteurs, deux cibles.** Khalam Rapide est déjà sous 2 s. La voix de
   Kha, elle, n'a aucune mesure récente — c'est là que le travail paye.
