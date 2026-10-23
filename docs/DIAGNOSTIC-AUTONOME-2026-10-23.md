# Les 3,3 secondes — ce qu'elles étaient, 23 octobre 2026

Suite de `DIAGNOSTIC-AUTONOME-2026-10-22.md`, qui finissait sur une dette :

> « Environ 3 289 ms après le modèle restent donc à tracer. »

Lu sur `https://app.khalam.app/api/etat`, version servie `f8878b0e5067`,
série du 23 octobre à 21:39–21:40 UTC. Six échanges HTTP réels, aucun
échec. Rien n'est déduit d'un calcul local : les nombres ci-dessous sortent
du champ public `diagnostic_latence_autonome`.

## 1. Le compte est bon, et il ne restait rien

`premier_audio_ms` est mesuré depuis le début de la reconnaissance. En
reprenant les trois durées que le même rapport publie — reconnaissance,
première phrase, voix — l'addition tombe juste, à la milliseconde :

| échange | ASR | 1ʳᵉ phrase | voix | somme | premier audio | **reste** |
|---|---|---|---|---|---|---|
| repas_fr 1 | 1 397 | 1 577 | 1 462 | 4 436 | 4 436 | **0** |
| repas_wo 1 | 1 123 | 1 180 | 1 630 | 3 933 | 3 933 | **0** |
| suite_wo 1 | 979 | 1 372 | 939 | 3 290 | 3 291 | **1** |
| suite_wo 2 | 816 | 1 494 | 2 090 | 4 400 | 4 400 | **0** |
| repas_wo 2 | 1 025 | 2 159 | 196 | 3 380 | 3 380 | **0** |
| repas_fr 2 | 939 | 1 511 | 2 997 | 5 447 | 5 447 | **0** |

Et côté serveur, `reponse_prete_ms` vaut exactement
`preparation_ms + modele_complet_ms` dans les six cas, à 7 ms près. Il n'y a
donc pas de trou de 3,3 s dans le chemin où le modèle répond librement.

## 2. La finalisation apprise prend 332 ms, pas 3 289

`reponses_apprises`, ajouté après le 22 octobre, mesure les briques que le
22 soupçonnait — la lecture des devoirs, la provenance, l'audio mémorisé :

```
repas_wo   choix 217 ms · devoirs 1 ms · provenance 1 ms · audio 115 ms · total 332 ms
suite_wo   choix  16 ms · rien en cache pour cette question
```

**L'hypothèse du 22 octobre est écartée** : à serveur chaud, aucune de ces
trois lectures ne coûte plus de 115 ms. Les 3 289 ms ne venaient pas de là.

## 3. Ce qui restait quand même hors de toute mesure

Et c'est le vrai défaut, celui que cette session répare.

Le 22 octobre, le délai a été vu **sur la sélection apprise**. Il existe deux
chemins pour ça dans `app/api/chat/route.ts` :

- celui où le **modèle** choisit (`[[replique:`) — chronométré depuis le 22 ;
- celui où la **sélection est déjà en cache** — le plus emprunté des deux, et
  il repartait **sans aucun chronomètre**.

Pire : le diagnostic autonome ne pouvait pas le voir. Il pose `forcer_calcul`,
dont le seul rôle est d'annuler cette lecture de cache pour mesurer des
calculs neufs. **Le chemin le plus rapide de BIA était donc aussi le seul que
personne ne mesurait**, et c'est exactement le profil d'une attente qui
revient sans qu'on sache d'où elle vient. C'est la RÈGLE 3 de
`AVANT-DE-DIRE-QUE-C-EST-BON.md`, prise par l'autre bout : un compteur
absent cache une faute aussi bien qu'un compteur aveuglé.

Trois corrections, toutes en lecture seule :

1. Le chemin appris servi depuis le cache publie maintenant `devoirs_ms`,
   `origine_ms` et `audio_memoire_ms`, comme celui du modèle. Les deux
   portent en plus un champ `chemin` (`choix_en_cache` / `choix_du_modele`),
   sans quoi on compare deux chemins sans savoir lequel on lit.
2. Le diagnostic autonome ajoute `chemin_appris_http` : les mêmes
   transcriptions wolof renvoyées **sans** `forcer_calcul`, par la vraie
   route. Il publie `reponse_http_complete_ms`, `nomme_ms` et
   **`sans_nom_ms`** — ce qui reste après soustraction de tout ce que le
   serveur a su nommer. C'est ce champ-là qu'il faudra lire si l'attente
   revient ; il n'y a plus à la deviner.
3. Les trois dernières attentes anonymes de la fenêtre de préparation sont
   nommées dans `preparation_detaillee` : `salutation`, `relations`,
   `repertoire_correction`.

## 4. Les lectures Supabase « en série » étaient déjà parallèles

Demande du jour : paralléliser les lectures Supabase en série de
`app/api/chat/route.ts`. Mesure avant de toucher — `preparation_detaillee`,
60 relevés servis en ligne :

| lecture | min | médiane | max |
|---|---|---|---|
| choix | 91 | 117 | 517 |
| devoirs | 22 | 38 | 495 |
| souvenirs | 213 | 229 | 303 |
| instructions | 3 | 38 | 192 |
| fiches | 36 | 91 | 117 |
| vitrine | 4 | 26 | 39 |
| mots_corriges | 3 | 26 | 39 |
| exemples | 3 | 4 | 86 |
| correction_exacte | 1 | 1 | 2 |
| khalam / produits | 0 | 1 | 1 |

Ce que ça dit, et pourquoi **aucun `Promise.all` n'a été ajouté** :

- `khalam`, `produits`, `vitrine`, `devoirs`, `instructions`, `maitrises`,
  `fiches`, `choix` partent déjà ensemble dans un seul `Promise.all`
  (`contexteEnCours`), et `souvenirs` encore avant (`laMemoire`). Deux
  `await` qui suivent deux promesses lancées ensemble coûtent le **maximum**
  des deux, pas leur somme.
- `correction_exacte`, `exemples` et `mots_corriges` passent tous par
  `toutes()` dans `lib/lexique.ts`, qui dédoublonne sa requête et garde son
  résultat 60 s : **une seule lecture réseau pour les trois**. Mesurées à
  1 ms et 4 ms, ce ne sont plus des lectures mais des calculs sur un tableau
  déjà en mémoire. Les mettre en parallèle ne gagnerait rien.
- Il reste **une** lecture vraiment en série avant le groupe :
  `choix_cache` (`dialoguerAvecDevoirs(…,{cacheSeulement:true})`). La
  remonter au-dessus du groupe ferait travailler `choix` (jusqu'à 517 ms)
  et `fiches` sur des tours qui repartent aussitôt par le répertoire, une
  salutation ou le cache lui-même — c'est-à-dire **ralentir le chemin le plus
  rapide pour accélérer l'autre**, sur une machine Render partagée. Ça se
  décide sur un chiffre de trafic réel, pas sur une intuition : `choix_cache`
  est déjà chronométré, et ses relevés de production trancheront.

Le temps non expliqué de la fenêtre de préparation (`preparation_ms` va de
299 à 930 ms alors que les lectures nommées en expliquent au plus ~520) n'est
donc pas de l'attente réseau en série : c'est l'assemblage de la consigne,
du calcul. C'est le prochain endroit à regarder — avec les trois noms
ajoutés ci-dessus, il se lit maintenant par soustraction.

## Ce qui n'est pas mesuré ici

Ni le silence de fin de parole, ni le réseau du téléphone, ni le haut-parleur.
Aucun gain avant/après n'est déduit de cette série. Et aucune de ces durées ne
dit ce que Lamine entend : pour l'oreille, la voix et le micro, la RÈGLE 1
tient — ça se mesure dans sa bouche et dans ses oreilles.

---

# Addendum du 23 octobre au soir : la mesure elle-même était fausse

## La rafale

Premier relevé réel de `khalam_rapide` après la mise en ligne de `e2827ea` :
médiane 1 411 ms sur 31 mesures. Les horodatages disent autre chose.

```
22:27:57.251   3185      ← tour réel (connexion froide)
22:28:05.681   1532      ← tour réel
22:28:16.806   1411      ← tour réel
22:28:26.249     31  ┐
22:28:26.307    319  │   NEUF mesures en 393 ms.
22:28:26.330    476  │   Ce n'est pas neuf tours :
22:28:26.399    642  ├── c'est UNE réponse, et ses
22:28:26.467    878  │   morceaux audio successifs.
22:28:26.528   1398  │
22:28:26.565   1732  │
22:28:26.607   1995  │
22:28:26.642   2324  ┘
```

**La faute, `lib/gemini-live-client.ts`** : `premiere` était remis à vrai par
toute trame au-dessus du seuil de bruit — donc par la voix de BIA que le micro
entend au haut-parleur. Chaque morceau suivant déclenchait une mesure, et ce
qu'elle mesurait n'était plus une attente mais la **profondeur de la file de
lecture** : le terme d'avance de planification grandit à mesure que les
morceaux s'empilent. D'où les valeurs qui montent de 31 à 2 324.

Et `premiere` valait vrai **dès la construction**, avec `finParole` posé à la
connexion : le tout premier morceau partait donc comme une mesure, en comptant
le temps depuis la connexion et non depuis une fin de parole.

**Mon garde-fou serveur ne rattrapait rien.** Il bornait les valeurs
impossibles ; les neuf étaient toutes dans les bornes. `mesures_refusees`
affichait 0 pendant que la médiane était fausse. C'est la RÈGLE 4 mot pour
mot : « un filet doit être posé sous le défaut réel ».

## Les seuls chiffres qui valaient quelque chose

**3 185 ms au premier tour (connexion froide), puis 1 532 et 1 411 ms.** Soit
**environ 1,4 à 1,5 s** de la fin de parole au premier son en régime établi.
La médiane publiée tombait près de la vérité par hasard, ce qui est
exactement pourquoi il ne fallait pas s'y fier.

## Les deux filets, au bon trou

1. **Navigateur** : la mesure ne s'arme que sur une parole entendue *pendant
   qu'elle se tait* (`nodes.size`, plus 300 ms de marge pour la queue
   d'écho), et le premier morceau de sa réponse la referme. `finParole` reste
   mis à jour par toutes les trames : c'est la veille des 90 s, qui doit
   compter l'activité et non les tours.
2. **Serveur** : le navigateur numérote ses tours (`session` + rang), et un
   tour déjà vu est refusé et compté dans `tours_en_double_refuses`. Un seuil
   de temps n'aurait pas marché : Khalam Rapide étant ouverte à tous, deux
   personnes peuvent légitimement mesurer dans la même seconde.

Ce qui n'est **plus** mesuré, exprès : le tour où on lui coupe la parole.
Quatre tours justes valent mieux que trente faux, et la limite publique le dit.

## Le bouton : tranché par le réseau

Lamine : « en Khalam Rapide j'entends Chatterbox. » Deux hypothèses — étiquettes
inversées, ou resté sur Khalam. Les routes réellement appelées, mode par mode,
dans Chromium sur un serveur de production :

| mode affiché | routes appelées au clic sur le micro |
|---|---|
| **Khalam Rapide** | `/api/gemini-live/session` — et **ni** `/api/chatterbox-test` **ni** `/api/ecouter` |
| **Khalam** | `/api/ecouter/morceau` — et **aucune** session rapide, zéro WebSocket |

**Les étiquettes ne sont pas inversées.** Et les compteurs le confirment :
`basculements` disait `vers_khalam: 1`, `vers_rapide: 0`. Lamine avait basculé
une fois vers Khalam et n'était pas revenu — il entendait Chatterbox parce
qu'il était sur Khalam.

La vraie faute était d'affichage : le bouton nomme la **destination**
(« Basculer vers Khalam »), et avec deux chemins qui parlent de la même voix et
sous le même visage, cette étiquette se lit aussi bien comme un état. Le nom du
chemin **courant** est donc écrit en permanence au-dessus du micro, et il est
dans l'étiquette du bouton du micro pour qui écoute l'écran. Posé en absolu :
le micro ne bouge pas d'un pixel, sa place est une habitude du pouce.

---

# Addendum 2 : la porte qui refusait l'anticipation

Priorité du 23 octobre au soir : l'anticipation ne se déclenche jamais, et
`sans_preparation: 4` alors que l'écoute progressive réussit 6 fois sur 6.
Trouvé **par la mesure**, pas par la lecture.

## Ce que disaient les compteurs

```
anticipation_conversation.ecoute   segments 6, segments_reussis 6
anticipation_conversation          preparations 0, pretes 0, servies 0
briques_conversation               sessions 0, preparees 0, lectures 0
briques_conversation.departs       sans_preparation 4
micro_capture.derniers  parole_ms  1151   702   2686   767
```

`sessions: 0` est la clé : **le téléphone n'a jamais rien demandé au serveur.**
Les sept portes du serveur n'avaient donc rien refusé — elles n'avaient rien
vu. Lire le serveur d'abord faisait conclure à tort que tout allait bien.

## La porte, nommée et éprouvée

`tests/eligibilite-anticipation.test.mjs` rejoue les quatre durées de parole
mesurées, avec la capture réelle (100 ms de PCM, 1 s de pré-micro, 400 ms
d'endpoint) et une ASR à 900 ms. Résultat, sur 702, 767 et 1151 ms :

| porte | ce qu'elle dit |
|---|---|
| `premier_segment_hors_portee` | la phrase n'atteint jamais le seuil du premier segment |
| `transcription_apres_fermeture` | le seul segment part sur le silence de fin de parole ; sa transcription revient **après** la fermeture de la capture |
| `jamais_de_texte` (`signes_max: 0`) | le producteur de briques n'a **jamais vu un caractère** |
| `demandes: 0` | aucune requête ne part — CQFD |

**Le seuil de 35 signes n'a même pas été consulté.** Ni les sept portes du
serveur. La porte était la première de la chaîne : le premier segment partait
après **4 000 ms de tampon**, jamais atteint par une phrase ordinaire.
L'anticipation n'était pas en panne — elle était **hors de portée**.

## La correction

`lib/premier-segment.ts` : le premier segment part après **1 500 ms de
PAROLE** (le seuil déjà éprouvé par le profil d'essai `sonnet-segment-1500`),
avec la compensation du pré-micro désormais appliquée dans tous les cas — sans
elle, un premier clip pourrait n'être que du silence, et une ASR générative
invente des mots sur du silence. Les segments **suivants** gardent leur durée.

Module sans aucun import, exprès : les épreuves qui chargent
`lib/ecoute-progressive.ts` rendent souvent le même module factice pour toutes
ses dépendances, et une constante prise ailleurs y arrivait `undefined` — le
seuil devenait `NaN` et plus aucun segment ne partait, en silence. C'est
arrivé pendant cette session, et c'est ce qui a fait tomber deux épreuves.
Un seuil faux doit être impossible, pas rattrapé.

Mesuré sur 2 686 ms de parole : un segment part **pendant** qu'il parle, sa
transcription arrive avant la fermeture, et la demande de préparation part
vraiment.

## Ce que ça coûte, et ce que ça ne donnera pas

**Une transcription de plus par tour de plus de 1,5 s de parole.** C'est le
prix de l'anticipation.

Et une limite à dire avant de mesurer : **trois des quatre tours de Lamine
étaient sous 1,2 s de parole.** Sous 1,5 s il n'y a rien à anticiper — le
chemin ordinaire est déjà le plus rapide. Le gain ne portera donc que sur les
phrases plus longues, et il ne faut pas attendre que la médiane des 5,2 s
tombe d'un coup.

## Le lever suivant, non pris

Sur une phrase courte, la transcription finale est connue ~900 ms après la
coupure du micro, et le chemin ordinaire enchaîne alors modèle (870–1 800 ms)
puis voix (1 450–1 700 ms). Les briques pourraient prendre le relais là, mais
`commencer()` exige qu'une brique soit déjà prête — décision datée et
explicite : « ASR alone is not a prepared response. Starting a new brick after
speech ended can add an entire rejected model call before ordinary chat
starts. » Je ne la retourne pas sans mesure et sans l'accord de Lamine.

## Les portes, désormais toutes nommées

Champ public `eligibilite_anticipation` : `porte_qui_refuse`,
`cote_telephone`, `cote_serveur`, `tours_sans_aucun_texte`, et les vingt
derniers tours. Le téléphone passe devant dans le classement — s'il n'a
jamais demandé, un refus du serveur n'est pas la cause.

Noms de conditions et comptes seulement. La longueur du texte est publiée
parce qu'elle **est** la condition ; aucune transcription, aucun texte, aucun
code. Une porte inventée par un client bricolé n'entre pas.

---

# Addendum 3 : le premier segment à 1,5 s, mesuré — et l'essai suivant

Quatre nouveaux tours Khalam de Lamine, 23:36–23:37, sur `354bba1ddbf4`.

## Le chemin Khalam, avant / après

Comparé à durées comparables (tours répondus par le modèle, le salut
préenregistré écarté) :

| médiane | avant (4 s) | après (1,5 s) | écart |
|---|---|---|---|
| **fin de parole → premier son** | 5 443 ms | **4 322 ms** | **−1 121 ms** |
| la transcription | 2 008 ms | **877 ms** | **−1 131 ms** |
| le modèle | 1 357 ms | 1 372 ms | ≈ 0 |
| la fabrication de la voix | 1 311 ms | 1 086 ms | −225 |
| silence avant la coupure du micro | 446 ms | 420 ms | −26 |

**Le gain est entièrement sur la transcription, et c'est exactement ce que la
correction visait.** L'attente finale d'ASR est passée de 2 000 à **748 ms**
(`ecoute.dernier_reste_ms`), avec 9 segments au lieu de 6 et 2 interventions
achevées. Le modèle et la voix n'ont pas bougé — rien n'est attribué à autre
chose qu'à ce qui a changé.

Les quatre tours : **1 327** (salut préenregistré), **4 322**, **3 929**,
**5 454 ms**. Médiane des quatre : 4 126 ms.

## Mais l'anticipation ne prépare toujours rien

```
porte_qui_refuse            jamais_de_texte   (7 tours sur 8 déclarés)
anticipation_conversation   preparations 0, pretes 0, servies 0
departs                     sans_preparation 4, en_fabrication 1
```

Sur les 8 tours déclarés, **6 n'ont produit aucun segment** : la parole
détectée était de 300 à 838 ms — très en dessous des 1 500 ms. Deux tours ont
eu 2 segments ; l'un a atteint **36 signes**, donc au-dessus du seuil, et il
a réellement fabriqué une brique (`sessions 1, preparees 1, lectures 1`).

**Et cette unique lecture par briques a mis 7 780 ms jusqu'au premier son** —
nettement plus lent que les 4 322 ms du chemin ordinaire. Elle n'entre pas
dans la médiane de `tours` (le tour n'a pas les deux bornes). À ce stade, les
briques ne sont donc pas démontrées plus rapides : c'est une observation, sur
un seul cas.

## L'essai demandé, et ses trois garde-fous

Démarrage des briques sur la transcription finale. Ce que ça retourne est une
décision datée de `commencer()` : « ASR alone is not a prepared response.
Starting a new brick after speech ended can add an entire rejected model call
before ordinary chat starts. » Le risque est nommé depuis l'origine.

1. **Réversible sans déploiement.** `BIA_BRIQUES_FINALES=non` dans Render, et
   la page revient au comportement d'avant au prochain chargement. Le réglage
   est publié dans `briques_conversation.briques_sur_transcription_finale` ;
   absent ou illisible vaut **non** — un essai ne s'active pas par défaut sur
   une inconnue. Éprouvé : interrupteur fermé, aucune lecture ouverte, aucune
   requête.
2. **L'attente de fin de parole pour la lecture n'est pas touchée.**
   `finirAttente` reste dans le rappel `jouer`, qui ne s'exécute que si une
   brique arrive vraiment. Une lecture ouverte à vide ne prononce rien et
   n'avance aucune lecture. Éprouvé : `jouer()` fait échouer l'épreuve si elle
   est appelée alors que le serveur ne rend rien.
3. **Mesuré avant/après.** `departs.sur_transcription_finale` sépare le pari de
   `sans_preparation` — mélangés, l'essai serait invisible. `replis` et
   `chaines` disent ce qu'il coûte quand la brique ne vient pas.
   `premier_son_median_ms` donne la médiane des premiers sons par briques, à
   comparer à `tours.reponse_du_modele.vecu_ms`.

## Ce qu'il faut lire pour trancher

Si `replis` grimpe avec `departs.sur_transcription_finale` et que
`premier_son_median_ms` reste au-dessus de `tours.reponse_du_modele.vecu_ms`,
l'essai coûte plus qu'il ne rend, et l'interrupteur se ferme. Aucun gain n'est
annoncé d'avance.
