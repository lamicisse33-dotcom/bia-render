<!-- Fiche de Lamine, enregistrée telle qu'il l'a écrite, le 25 octobre 2026.
     Rien n'est reformulé ni abrégé : c'est la référence des décisions et des
     comparaisons avant/après. La comparaison avec l'existant est dans
     docs/PLAN-VITESSE-COMPARAISON.md, à part, pour que cette fiche reste la
     sienne. -->

# FICHE TECHNIQUE BIA
## PLAN D'OPTIMISATION — VITESSE ET CONVERSATION VOCALE EN TEMPS RÉEL

Version 1.0 — 25 octobre 2026

## 1. Objectif général

Faire de BIA une assistante vocale aussi réactive et naturelle que possible, avec une expérience comparable à Gemini Live, tout en conservant notre technologie vocale et notre identité sénégalaise.

BIA doit pouvoir comprendre une personne parlant en français, en wolof urbain de Dakar, ou en mélangeant les deux langues, puis commencer à lui répondre presque immédiatement.

**OBJECTIF PRINCIPAL DE PERFORMANCE**

- **≤ 1 s** — Premier son après la fin de la parole, sur les demandes simples
- **≤ 2 s** — Premier son sur la majorité des demandes ordinaires
- **120 s** — Durée maximale d'une prise de parole continue
- **0** — Coupure intempestive de la parole de l'utilisateur

Ces valeurs sont des objectifs à valider par des tests, et non des performances déjà garanties.
Les priorités sont : rapidité, précision, naturel de la voix, stabilité et fiabilité.

## 2. Infrastructure à conserver

| Élément | Décision |
|---|---|
| RunPod A40 48 Go | Conserver pendant les optimisations |
| Khalam Voice / Chatterbox | Moteur vocal prioritaire |
| Khalam Oreille | Reconnaissance vocale prioritaire |
| Cerveau IA | Optimiser et mesurer le relais |
| Render | Conserver en vérifiant les délais et erreurs |
| Supabase | Conserver les leçons, mémoires et lexiques |
| Google Cloud | Évaluer uniquement si les mesures le justifient |

**Règle absolue :** ne pas modifier directement la production sans sauvegarde, essai indépendant et possibilité de retour immédiat à la version stable.

## 3. Nouvelle architecture recommandée

**Microphone BIA** — Audio continu, sans interruption

**Khalam Oreille — Streaming ASR** — Transcription provisoire par morceaux, détection wolof/français, finalisation en fin de parole

**Cerveau IA — Réponse anticipée**
- *Voie rapide* : salutations, réponses simples, leçons prévalidées
- *Voie complète* : questions complexes, raisonnements et recherches
- Préparation silencieuse et validation finale avant réponse audible

**Khalam Voice — Streaming TTS** — Synthèse par segments cohérents, émission des premiers paquets sans attendre la fin du texte

**BIA parle naturellement** — Lecture continue et synchronisation avec le visage animé

Le changement déterminant consiste à faire se chevaucher les opérations, au lieu d'attendre que chacune soit complètement terminée avant de commencer la suivante.

## 4. Optimisation de Khalam Oreille

**Priorité 1.** Le moteur doit commencer à comprendre dès que la personne parle, sans attendre l'arrêt complet du microphone.

### Modifications à réaliser

- Mettre en place une transcription audio en streaming, par petits blocs.
- Transmettre les transcriptions provisoires au cerveau pendant que l'utilisateur parle.
- Utiliser un détecteur de fin de parole (VAD) adapté au français et au wolof urbain.
- Distinguer les silences courts, les hésitations et les véritables fins de phrase.
- Maintenir l'écoute jusqu'à deux minutes, sans perte du début de la conversation.
- Éviter les doublons, les mots inventés et les phrases ajoutées à la fin.
- Préserver correctement les expressions mêlant français et wolof.
- Ne jamais considérer une transcription provisoire comme définitivement validée.
- Supprimer les segments provisoires devenus obsolètes lors des corrections de reconnaissance.
- Éviter que la synthèse vocale de BIA soit elle-même reconnue comme une nouvelle demande de l'utilisateur.

**Point essentiel :** l'oreille doit transmettre rapidement une première interprétation, mais la réponse audible ne doit commencer qu'une fois la demande réellement terminée.

### Réglages à expérimenter

| Paramètre | Valeur initiale de test |
|---|---|
| Blocs audio | 20–40 ms |
| Transcriptions provisoires | Toutes les 100–200 ms |
| Fin de parole | Dynamique, départ autour de 300–600 ms |
| Silences d'hésitation | Protection contre les coupures prématurées |
| Écoute longue | Jusqu'à 120 secondes |
| Corrections partielles | Autorisées avant finalisation |

Ces valeurs doivent être adaptées aux résultats réels de Khalam Oreille. Une détection trop rapide peut faire perdre la fin des phrases ; une détection trop lente donne l'impression que BIA réfléchit inutilement.

## 5. Réponse anticipée pendant que l'utilisateur parle

**Priorité 2.** C'est l'une des améliorations les plus importantes.

Lorsqu'une personne parle longtemps, BIA ne doit pas rester inactive jusqu'au dernier mot.

### Fonctionnement souhaité

- **0–2 s** — L'utilisateur commence : Khalam Oreille identifie progressivement la langue, les mots et l'intention.
- **2–5 s** — Le cerveau prépare : le modèle commence une réponse provisoire qui reste silencieuse.
- **5–10 s** — L'utilisateur complète sa demande : le cerveau actualise sa réponse si de nouvelles informations changent le sens de la question.
- **L'utilisateur termine** — La réponse est vérifiée et le premier segment vocal est envoyé immédiatement, si sa préparation est valide.

*Exemple illustratif d'une intervention de dix secondes, non une mesure de BIA.*

### Sécurité de l'anticipation

Il faut obligatoirement prévoir :

- Un système d'annulation des réponses anticipées si l'utilisateur change de sujet.
- Un numéro de version pour chaque transcription et chaque réponse préparée.
- L'interdiction d'émettre une ancienne réponse après une correction importante.
- La validation des informations nécessaires avant toute action sensible.
- Une limite de consommation pour éviter de lancer inutilement plusieurs appels au cerveau.

Exemple : si l'utilisateur dit « Je veux aller à Thiès... non, finalement à Saint-Louis », BIA doit abandonner immédiatement la préparation concernant Thiès.

## 6. Optimisation du cerveau IA

Le modèle ne doit pas ralentir les réponses simples qui pourraient être traitées directement.

Je recommande une architecture à deux voies, plutôt que deux cerveaux qui parleraient successivement.

| Type de demande | Traitement |
|---|---|
| Bonjour, salutations | Réplique vocale prévalidée |
| Questions déjà couvertes par les leçons | Recherche rapide dans les contenus validés |
| Questions simples | Cerveau rapide |
| Conversations longues | Cerveau complet avec contexte optimisé |
| Raisonnement complexe | Modèle plus puissant |
| Questions d'actualité | Recherche externe uniquement si nécessaire |

### Travail à réaliser

**A. Réduire le temps du premier mot** — Activer le streaming des réponses, alléger les instructions envoyées au modèle et mesurer le délai avant le premier jeton.

**B. Mettre en cache les éléments permanents** — Les instructions de personnalité, règles linguistiques et contenus stables doivent être réutilisés quand le fournisseur du modèle permet une mise en cache efficace.

**C. Réduire les appels inutiles** — La sélection du cerveau doit être rapide, idéalement effectuée par des règles locales avant de solliciter un autre modèle.

**D. Garder les réponses naturelles** — Une question simple appelle une réponse courte. Une question complexe peut nécessiter une réponse plus développée.

**E. Préserver le contexte** — BIA doit conserver les informations utiles de la conversation sans renvoyer systématiquement tout l'historique au modèle.

**F. Prévenir les doubles réponses** — Un seul moteur doit produire la réponse audible. Si un autre modèle prépare une meilleure réponse, il ne doit pas interrompre une phrase déjà commencée ni provoquer de contradiction.

### Choix du modèle

Claude Sonnet peut rester notre référence qualitative, avec un modèle rapide pour les requêtes ordinaires. Cependant, il faut comparer expérimentalement les modèles candidats sur de véritables échanges français–wolof.

Le modèle à retenir sera celui offrant le meilleur compromis entre précision, temps du premier jeton, qualité du wolof et coût par conversation.

## 7. Optimisation de Khalam Voice / Chatterbox

**Priorité 3.** Khalam Voice doit produire les premiers sons rapidement, mais aussi continuer à parler sans ralentissements.

### Travail technique à réaliser

- Charger le modèle en mémoire GPU et le maintenir prêt.
- Éviter les initialisations répétées entre deux demandes.
- Utiliser une génération audio progressive avec transmission des premiers segments.
- Envoyer les segments déjà synthétisés pendant que le moteur prépare la suite.
- Réduire les pauses anormales entre les blocs de synthèse.
- Préserver l'intonation et le rythme à travers les frontières de segments.
- Vérifier que le dernier mot et la dernière syllabe de chaque réponse sont conservés.
- Gérer proprement les apostrophes, les guillemets, la ponctuation et les caractères spéciaux.
- Éviter les mots wolof sautés et les sons incompréhensibles.
- Maintenir la prononciation française des termes français intégrés dans le wolof.

### Anomalie déjà identifiée

Lors de nos précédents essais de streaming, un texte wolof long avait donné environ 1,63 seconde avant le premier paquet audio, contre 2,28 secondes pour la génération complète.

Cependant, la version streaming semblait produire un audio plus court que la version complète.

Il faut donc vérifier en priorité que la rapidité n'est pas obtenue en supprimant des mots ou des portions audio.

### Gestion de l'audio

Je recommande :

- Une file de lecture continue avec tampon très court.
- Une gestion automatique des petits retards réseau.
- Des frontières de segments alignées autant que possible sur les phrases.
- Une transition acoustique propre entre segments.
- Une horloge de lecture unique pour éviter les décalages.
- La synchronisation du mouvement des lèvres avec l'audio réellement joué, et non simplement avec le texte généré.

Il ne faut jamais sacrifier la qualité du wolof pour gagner quelques millisecondes.

## 8. Optimisation de RunPod et du GPU

Notre A40 doit d'abord être mesuré et optimisé avant toute décision d'acheter un GPU plus puissant.

### Vérifications du serveur

| Contrôle | Résultat attendu |
|---|---|
| GPU | Modèles correctement chargés |
| VRAM | Marge suffisante lors des conversations |
| CPU | Aucun engorgement |
| RAM | Absence de pagination excessive |
| Température GPU | Pas de ralentissement thermique |
| Khalam Oreille | Processus stable |
| Khalam Voice | Processus stable |
| Réseau | Connexions persistantes |
| Charge simultanée | Dégradation mesurée et contrôlée |

Il faut également tester l'exécution simultanée des deux moteurs afin de vérifier qu'ils ne se bloquent pas mutuellement lorsqu'ils partagent le GPU.

### Optimisations à évaluer

- Inférence en FP16 ou BF16 selon les modèles et leur compatibilité.
- Utilisation éventuelle de CUDA Graphs ou d'un moteur d'inférence optimisé.
- Réservation de capacité GPU pour éviter que le TTS et l'ASR se concurrencent excessivement.
- Mise en file courte des demandes lorsque plusieurs utilisateurs parlent.
- Réutilisation des buffers et des ressources déjà allouées.
- Ajustement des tailles de traitement pour la faible latence plutôt que pour le débit maximal.

Chaque optimisation doit être comparée sur la qualité, la vitesse et la stabilité. Certaines techniques accélèrent le débit global sans accélérer la première réponse.

## 9. Optimisation du réseau, de Render et de l'application

Même avec un GPU rapide, une mauvaise communication entre le téléphone, Render et RunPod peut donner une expérience lente.

### Modifications à réaliser

- Garder les connexions client–serveur ouvertes pendant la session vocale.
- Utiliser WebSocket ou WebRTC selon le chemin audio retenu.
- Éviter les allers-retours inutiles entre plusieurs services.
- Ne pas faire transiter l'audio par le cerveau lorsque cela n'est pas nécessaire.
- Réduire les conversions répétées entre formats audio.
- Utiliser un format audio unique et cohérent dans la mesure du possible.
- Gérer automatiquement les reconnexions après une interruption réseau.
- Contrôler les erreurs 503 et identifier leur origine exacte.
- Séparer les requêtes de santé des moteurs et les vraies requêtes vocales.
- Mesurer les délais depuis un véritable téléphone connecté au réseau sénégalais.

### Cas particulier de Dakar

Les mesures doivent être réalisées sur des connexions Wi-Fi et 4G utilisées au Sénégal. Il est inutile de gagner 200 millisecondes sur le GPU si les communications entre les serveurs en ajoutent 800.

## 10. Préserver absolument les acquis de BIA

Les optimisations de vitesse ne doivent pas dégrader les fonctions déjà mises au point.

### Liste de contrôle de non-régression — 0/12

1. Voix sénégalaise naturelle et claire
2. Wolof urbain de Dakar et français mélangés
3. Prononciation correcte des mots français
4. Écoute longue jusqu'à deux minutes
5. Aucune interruption de l'utilisateur par BIA
6. Conservation des leçons et du lexique Supabase
7. Aucun mot sauté ni caractère spécial prononcé
8. Réécoute audio fonctionnelle
9. Synchronisation des lèvres avec le son
10. Mémoire et contexte des conversations préservés
11. Réponses sans répétitions ni inventions
12. Possibilité de revenir à la version précédente

## 11. Mesurer objectivement la vitesse

Il faut installer une mesure de bout en bout. Sans cette instrumentation, nous risquons de changer plusieurs réglages sans savoir lequel apporte réellement un gain.

### Indicateurs indispensables

| Indicateur | Ce qu'il mesure |
|---|---|
| VAD | Délai pour détecter la fin de parole |
| ASR final | Temps de finalisation de la transcription |
| LLM TTFT | Temps avant le premier jeton du cerveau |
| TTS TTFA | Temps avant le premier paquet audio |
| TTFS | Temps avant le premier son effectivement entendu |
| Audio complet | Temps nécessaire à la réponse entière |
| WER / CER | Précision de la reconnaissance vocale |
| Erreurs audio | Coupures, mots perdus, interruptions |
| p50 / p95 / p99 | Latences habituelles et cas les plus lents |

Pour chaque échange, enregistrer un identifiant commun et des horodatages aux différentes étapes. Il faut distinguer le temps de calcul, le temps d'attente et le temps de transfert réseau.

### Objectifs de validation

**BUDGET CIBLE DE LATENCE — EXEMPLE POUR UNE DEMANDE SIMPLE**

| Étape | Budget |
|---|---|
| Fin de parole et transcription | 250 ms |
| Finalisation du cerveau | 300 ms |
| Premier son TTS | 250 ms |
| Transfert et lecture | 150 ms |
| **Budget théorique total** | **950 ms** |

*Budget indicatif à tester. Ce n'est pas une mesure actuelle ; les étapes peuvent aussi se chevaucher.*

Nous devons tester séparément les phrases françaises, les phrases wolof, les mélanges français-wolof et les longues interventions.

Il faudra également mesurer les résultats avec 1, 5, 10, 25 et 50 conversations simultanées, puis augmenter progressivement le nombre d'utilisateurs selon la capacité réelle du serveur.

Notre objectif à long terme de 1 000 utilisateurs ne signifie pas que 1 000 personnes pourront parler simultanément sur un seul A40.

## 12. Programme d'exécution recommandé

1. **Audit** — Sauvegarder et mesurer. Sauvegarde du code, modèles, configurations et réglages. Relevé complet des latences actuelles et de l'utilisation CPU/GPU.
2. **Oreille** — Activer le traitement continu. Optimisation du VAD, du streaming de transcription et de la détection de fin de parole.
3. **Cerveau** — Anticiper les réponses. Préparation silencieuse, streaming des jetons, routage simple/complexe et protection contre les réponses obsolètes.
4. **Voix** — Produire l'audio progressivement. Accélération du premier son, suppression des silences et correction des flux audio tronqués.
5. **Réseau** — Réduire les transferts inutiles. Connexions persistantes, amélioration des échanges Render–RunPod et de la lecture sur téléphone.
6. **Tests** — Comparer la version optimisée avec l'originale. Tests sur les mêmes conversations, validation des fonctions et mesure des gains réels avant déploiement.

## 13. Conditions obligatoires avant mise en production

Une nouvelle version ne doit pas être déployée si elle est plus rapide mais moins fiable.

Les critères minimaux de validation sont :

- Une réduction mesurée du temps avant le premier son.
- Une précision de reconnaissance qui ne se dégrade pas significativement.
- Aucun nouveau problème de texte ou d'audio tronqué.
- Une lecture sans interruption anormale.
- Un fonctionnement correct sur iPhone et Android.
- Une stabilité démontrée en présence de conversations simultanées.
- Un coût d'hébergement et d'inférence maîtrisé.
- Une procédure de retour arrière testée.

Le déploiement doit être progressif, avec surveillance des erreurs et comparaison aux mesures de référence.

## 14. Décision concernant Google Cloud et les GPU

À ce stade, je ne recommande pas de migrer BIA vers Google Cloud uniquement pour chercher de la vitesse.

Le GPU A40 actuellement utilisé est une base raisonnable pour mesurer et optimiser notre système.

Une fois les problèmes logiciels identifiés, on pourra évaluer un GPU plus récent à charge identique. Un changement de matériel sera justifié uniquement si les mesures démontrent que le GPU constitue réellement le principal goulot d'étranglement.

Il faut tenir compte des coûts complets : GPU, CPU, RAM, stockage, trafic, redémarrages et disponibilité.

## 15. Résultat final attendu

Après optimisation, l'expérience utilisateur souhaitée est la suivante :

L'utilisateur ouvre BIA et commence à parler normalement. BIA écoute, comprend progressivement, garde le contexte et prépare silencieusement ses réponses. Dès que la personne a réellement terminé, elle commence à répondre avec sa voix naturelle, dans la langue appropriée, sans attendre que la synthèse complète soit terminée.

Les échanges courts doivent sembler immédiats. Les échanges complexes doivent rester fluides, et les conversations longues ne doivent provoquer ni perte d'information ni réponse prématurée.

La réussite sera mesurée par l'expérience réelle sur téléphone, et non par la seule rapidité d'un serveur ou d'un modèle.

## Conclusion et consigne technique finale

Je recommande de travailler dans cet ordre :

Oreille en streaming → cerveau anticipatif → voix progressive → réseau optimisé → tests complets → déploiement contrôlé.

Ce plan représente la cible technique à atteindre. Il ne signifie pas que ces optimisations ont déjà été effectuées sur notre installation RunPod.

Notre ambition est claire : BIA doit donner la sensation d'une vraie conversation humaine, avec une réactivité proche de Gemini Live, mais avec sa propre voix et une excellente compréhension du wolof urbain de Dakar.

C'est sur cette fiche que je baserais les décisions techniques et les comparaisons avant/après.
