# Les planches d'images à demander à ChatGPT

Écrit le 19 septembre 2026. Décision : trois planches en tout. La première,
`public/bia-24.webp`, existe déjà (visage, bouches, rires). Les deux suivantes
donnent à BIA de quoi bouger pendant qu'elle attend une réponse — c'est du temps
d'attente occupé, donc de la latence qu'on ne sent plus.

Ce fichier est le texte à coller tel quel dans ChatGPT, une planche à la fois.
Les images sont à déposer dans `public/` sous les noms indiqués ; le câblage
(cases, cycles, déclencheurs) se fait côté code à réception.

---

## Règles communes aux deux planches (à coller en tête de chaque demande)

> Même personnage que sur l'image de référence jointe (`bia-24.webp`) : même
> visage, même coiffure, mêmes vêtements, même lumière, même fond noir uni.
> Image finale : **3720 × 2480 pixels**, grille de **6 colonnes × 4 lignes**,
> soit 24 cases carrées de **620 × 620 pixels**, sans marge ni bordure entre
> les cases, numérotées de gauche à droite puis de haut en bas (1 à 24).
> **La tête doit être exactement à la même position et à la même taille que
> sur la planche de référence, dans chaque case.** Aucun texte, aucun numéro,
> aucun cadre dessiné. Chaque mouvement occupe 4 cases consécutives et forme
> une petite séquence : la première et la dernière case doivent être proches
> du visage au repos, pour que l'enchaînement avec les autres planches soit
> doux. Si une seule génération ne tient pas les 24 cases, faire un mouvement
> à la fois (4 images), toujours au même cadrage, et je les assemblerai.

---

## Deuxième planche — le visage qui vit : `public/bia-gestes-24.webp`

> **1–4 — Écoute attentive** : 1 regard posé sur la personne, bouche fermée ;
> 2 tête légèrement penchée à droite ; 3 sourcils qui se relèvent un peu, elle
> suit ; 4 retour au regard posé.
>
> **5–8 — Réflexion** : 5 regard qui monte vers le haut à gauche ; 6 yeux
> mi-clos, lèvres légèrement pincées ; 7 regard qui revient vers la personne ;
> 8 visage neutre, prêt à répondre.
>
> **9–12 — Le rire qui s'apaise** : 9 rire franc, tête un peu en arrière ;
> 10 rire qui retombe, bouche encore ouverte ; 11 sourire large, bouche
> fermée ; 12 sourire léger, visage serein. (C'est la descente qui manque
> aujourd'hui : elle passe du rire au visage calme d'un coup.)
>
> **13–16 — Compréhension** : 13 hochement de tête, menton qui descend ;
> 14 menton qui remonte, regard dans les yeux ; 15 petit sourire « je vois » ;
> 16 visage neutre attentif.
>
> **17–20 — Douceur / réconfort** : 17 sourire tendre ; 18 tête penchée,
> regard chaud ; 19 yeux mi-clos, bienveillants ; 20 sourire léger, visage
> apaisé.
>
> **21–24 — Compassion / sympathie** (quelqu'un lui confie une peine) :
> 21 visage concerné, sourcils légèrement relevés au centre, bouche fermée ;
> 22 hochement lent de la tête, regard dans les yeux ; 23 regard baissé un
> instant, lèvres serrées, comme si elle partageait le poids ; 24 retour vers
> un sourire de douceur, très léger, qui dit « je suis là ».

---

## Troisième planche — les mains : `public/bia-mains-24.webp`

> Ici les mains entrent dans le cadre, par le bas ou par le côté. **La tête ne
> bouge pas et ne recule pas** : même position, même taille que sur la planche
> de référence. Chaque geste en 4 images : la main qui monte, le geste tenu,
> une petite variation du geste tenu, la main qui redescend.
>
> **1–4 — Salutation** : la main droite se lève, paume ouverte vers l'avant à
> hauteur du visage, sourire de bienvenue ; petit signe de la main ; la main
> redescend.
>
> **5–8 — Au revoir** : la main levée fait un signe plus large, sourire
> chaleureux, léger penché de tête ; redescente.
>
> **9–12 — Main sur le cœur** : la main droite vient se poser à plat sur la
> poitrine, regard direct, sourire sincère (merci, je suis là, je te le
> promets) ; tenue avec les yeux qui se ferment un instant ; la main redescend.
>
> **13–16 — Main sur la bouche, étonnement** : la main monte vers la bouche,
> yeux grands ouverts, sourcils hauts, l'étonnement heureux (« vraiment ? ») ;
> tenue ; la main s'écarte et le visage revient vers le sourire.
>
> **17–20 — Main sur la bouche, gros mot** : la main couvre la bouche, les
> yeux s'arrondissent, les sourcils se froncent légèrement — le choc et la
> réprobation douce, pas la colère ; tenue avec un petit mouvement de tête de
> gauche à droite (« non, non ») ; la main redescend, le visage garde une
> réserve.
>
> **21–24 — Paume ouverte, « doucement »** : la main s'ouvre vers l'avant à
> mi-hauteur, paume visible, comme pour apaiser ou demander un instant ;
> tenue ; redescente.

---

## Ce que chaque cycle fera dans l'application (côté code, à réception)

| Moment | Cycle joué |
|---|---|
| Elle écoute (micro ouvert) | Écoute attentive, en boucle lente |
| Elle attend la réponse (`thinking`) | Réflexion, puis Écoute, puis Paume ouverte si l'attente dépasse 4 s |
| Début de conversation, « bonjour » reconnu | Salutation |
| Fin de conversation, au revoir reconnu | Au revoir |
| Elle rassure, ou reçoit un merci | Main sur le cœur |
| Émotion `surprise` / `etonnement` | Main sur la bouche, étonnement |
| Gros mot reconnu (liste à fournir par Lamine — wolof et français) | Main sur la bouche, gros mot |
| Émotion `rire` / `fourire` qui se termine | Le rire qui s'apaise, à la place de l'atterrissage actuel |
| Émotion `concernee` / `triste` | Compassion |
| Après une réponse, retour au calme | Douceur, puis Compréhension |

Le moteur qui alterne repos et gestes pendant l'attente existe déjà
(`app/page.tsx`, effet `mode === "thinking"`) ; il n'a pour l'instant que les
cases de la première planche. Le fondu entre deux images (`visageAvant`) existe
aussi depuis le 19 septembre. Les nouvelles cases s'y branchent.
