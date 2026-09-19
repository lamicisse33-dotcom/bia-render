# Les 72 images de BIA — une par une, en pleine résolution

Écrit le 19 septembre 2026, troisième version. Lamine : « les planches de
24 dégradent la qualité de l'image, et l'image est très importante. Elle
doit être comme une vraie personne, où on peut voir carrément sa peau. »

C'est mécanique : ChatGPT génère une image d'environ 1 000 à 1 500 pixels
de large, puis l'agrandit. Sur une grille de 6 colonnes, chaque case n'a
que 200 à 250 pixels de vrai détail, affichés en 900 sur le téléphone. La
peau ne peut pas être nette ainsi.

Donc : **une image par case, 72 images carrées, chacune en pleine
résolution**. Les grilles (cases de 1 024 pixels au lieu de 620), c'est
Claude qui les assemble à réception, après avoir mesuré et aligné chaque
tête. Le code ne change pas : il lit les grilles en pourcentages.

Les trois grilles finales, dans `public/` :

- `bia-24.webp` — la bouche, le repos, les émotions, les rires (cases 1–24)
- `bia-gestes-24.webp` — le visage qui vit, six mouvements (cases 1–24)
- `bia-mains-24.webp` — les mains, six gestes (cases 1–24)

---

## Comment s'y prendre avec ChatGPT

1. **Une seule conversation** pour les 72 images. Ne pas changer de fil.
2. **Une seule image de référence** pour le personnage — l'actuel
   `bia-24.webp`, ou mieux : la toute première image générée dans cette
   série (case 1 de la planche 1), si elle est bonne. La joindre à chaque
   demande, ou rappeler « même personnage que la première image ».
3. **Coller le bloc « Règles communes » en tête de la conversation**, une
   fois ; puis demander les images une par une : « case 1 de la planche 1 :
   … », avec la ligne de description ci-dessous. Une image carrée par
   demande, à la plus grande taille que ChatGPT accepte.
4. **Enregistrer chaque image sous son numéro** : `1-01.png` … `1-24.png`,
   `2-01.png` … `2-24.png`, `3-01.png` … `3-24.png` (planche-case). Les
   déposer dans `Documents/GitHub/bia-render/planches-brutes/`.
5. Si une image est ratée, la redemander seule ; si le vêtement ou la
   coiffure dérive, le dire à ChatGPT en rejoignant la référence.

Ce n'est pas la peine de tout faire d'un coup : les 24 de la planche 1
d'abord (c'est celle qui parle), puis les mains, puis le visage qui vit.
Chaque planche se câble dès qu'elle est complète.

À réception, Claude mesure sur chaque image la position et la taille de la
tête, aligne le tout sur la même position, et assemble. Une image qui
s'écarte trop (vêtement, cadrage) est signalée avant d'être posée.

---

## Règles communes (à coller une fois, en tête de la conversation)

> Photo réaliste d'une jeune femme, la même sur toutes les images (image
> de référence jointe) : même visage, mêmes longues tresses fines, mêmes
> petites boucles d'oreilles créoles, même fin collier, **même débardeur
> noir à fines bretelles**, mêmes proportions. Peau nette et vivante, avec
> son grain naturel — pas de lissage, pas de flou, pas de rendu
> « illustration ». Lumière douce de face, comme dans un studio, fond noir
> uni. Elle est assise, buste droit, face à la caméra, comme quelqu'un qui
> parle à une personne en face.
>
> **Chaque image est carrée, à la plus grande taille possible**, et cadrée
> EXACTEMENT de la même façon :
> - le sommet de la coiffure à **18 %** de la hauteur (il reste du noir
>   au-dessus de la tête ; la tête n'est jamais coupée) ;
> - le visage large de **38 %** de la largeur de l'image, centré ;
> - les deux épaules dans le cadre, le haut du débardeur visible, le corps
>   coupé par le bas de l'image ;
> - les tresses tombent des deux côtés jusqu'au bas.
>
> D'une image à l'autre, la tête ne grossit pas, ne recule pas, ne se
> déplace pas : seuls le visage, le regard et éventuellement une main
> changent. Aucun texte, aucun cadre, aucun filigrane.

Ensuite, chaque demande tient en une ligne : « Planche 1, case 3 : bouche
ouverte moyenne, un “a” — tout le reste identique à la case 1. »

---

## Planche 1 — `bia-24.webp` : la bouche, le repos, les émotions, les rires

> **1–7 — Les formes de bouche** (pour faire parler le visage : ces sept
> cases sont IDENTIQUES en tout — yeux, sourcils, tête, regard droit devant,
> expression neutre et calme — SAUF la bouche) :
> 1 bouche fermée, lèvres jointes ; 2 bouche entrouverte, lèvres à peine
> écartées ; 3 bouche ouverte moyenne, un « a » ; 4 bouche grande ouverte,
> un « A » ; 5 lèvres arrondies, un « o » ; 6 lèvres avancées et serrées, un
> « ou » ; 7 lèvres étirées sur les côtés, dents visibles, un « i ».
>
> **8–11 — Le repos** (bouche fermée, expression calme) : 8 yeux ouverts,
> regard droit devant, très léger sourire ; 9 yeux mi-clos ; 10 yeux fermés,
> détendus ; 11 regard qui glisse vers le côté, tête droite.
>
> **12–20 — Les émotions** : 12 douceur, sourire tendre, bouche fermée ;
> 13 joie, grand sourire, dents visibles ; 14 étonnement, sourcils levés,
> bouche entrouverte ; 15 surprise, yeux ronds, bouche ouverte ; 16 écoute,
> tête légèrement penchée, regard attentif ; 17 concernée, sourcils un peu
> froncés, bouche fermée, inquiétude douce ; 18 triste, regard baissé,
> coins de la bouche vers le bas ; 19 malice, sourire en coin, un sourcil
> levé ; 20 pensive, regard vers le haut, lèvres pincées.
>
> **21–24 — Les rires** : 21 rire franc, bouche ouverte, yeux plissés ;
> 22 rire la tête renversée en arrière ; 23 fou rire, une main devant la
> bouche, yeux fermés ; 24 rire retenu, bouche fermée, yeux plissés,
> épaules un peu remontées.

---

## Planche 2 — `bia-gestes-24.webp` : le visage qui vit

> **1–4 — Écoute attentive** : 1 regard posé sur la personne, bouche fermée ;
> 2 tête légèrement penchée à droite ; 3 sourcils qui se relèvent un peu,
> elle suit ; 4 retour au regard posé.
>
> **5–8 — Réflexion** : 5 regard qui monte vers le haut à gauche ; 6 yeux
> mi-clos, lèvres légèrement pincées ; 7 regard qui revient vers la
> personne ; 8 visage neutre, prêt à répondre.
>
> **9–12 — Le rire qui s'apaise** : 9 rire franc, tête un peu en arrière ;
> 10 rire qui retombe, bouche encore ouverte ; 11 sourire large, bouche
> fermée ; 12 sourire léger, visage serein.
>
> **13–16 — Compréhension** : 13 hochement de tête, menton qui descend ;
> 14 menton qui remonte, regard dans les yeux ; 15 petit sourire « je
> vois » ; 16 visage neutre attentif.
>
> **17–20 — Douceur / réconfort** : 17 sourire tendre ; 18 tête penchée,
> regard chaud ; 19 yeux mi-clos, bienveillants ; 20 sourire léger, visage
> apaisé.
>
> **21–24 — Compassion / sympathie** (quelqu'un lui confie une peine) :
> 21 visage concerné, sourcils légèrement relevés au centre, bouche fermée ;
> 22 hochement lent de la tête, regard dans les yeux ; 23 regard baissé un
> instant, lèvres serrées, comme si elle partageait le poids ; 24 retour
> vers un sourire de douceur, très léger, qui dit « je suis là ».

---

## Planche 3 — `bia-mains-24.webp` : les mains

> Ici une main entre dans le cadre, par le bas ou par le côté. **La tête ne
> bouge pas et ne recule pas** : même position, même taille que sur toutes
> les autres images. Chaque geste en 4 images : la main qui monte, le geste
> tenu, une petite variation du geste tenu, la main qui redescend.
>
> **1–4 — Salutation** : 1 la main droite commence à se lever, encore en bas
> du cadre ; 2 paume ouverte vers l'avant à hauteur du visage, sourire de
> bienvenue ; 3 la même, petit signe de la main ; 4 la main redescend, le
> sourire reste.
>
> **5–8 — Au revoir** : 5 la main se lève ; 6 signe de la main plus large,
> sourire chaleureux, léger penché de tête ; 7 la même, doigts un peu
> repliés ; 8 la main redescend.
>
> **9–12 — Main sur le cœur** : 9 la main droite monte vers la poitrine ;
> 10 posée à plat sur le cœur, regard direct, sourire sincère ; 11 la même,
> yeux fermés un instant ; 12 la main redescend.
>
> **13–16 — Main sur la bouche, étonnement** : 13 la main monte vers la
> bouche ; 14 main devant la bouche, yeux grands ouverts, sourcils hauts,
> l'étonnement heureux ; 15 la même, un peu penchée ; 16 la main s'écarte,
> le visage revient vers le sourire.
>
> **17–20 — Main sur la bouche, gros mot** : 17 la main monte ; 18 la main
> couvre la bouche, yeux ronds, sourcils légèrement froncés — le choc et la
> réprobation douce, pas la colère ; 19 la même, tête un peu tournée
> (« non, non ») ; 20 la main redescend, le visage garde une réserve.
>
> **21–24 — Paume ouverte, « doucement »** : 21 la main monte ; 22 paume
> ouverte vers l'avant à mi-hauteur, comme pour apaiser ou demander un
> instant ; 23 la même, doigts légèrement écartés ; 24 la main redescend.

---

## Ce que chaque cycle fait dans l'application (déjà câblé)

| Moment | Ce qu'elle fait |
|---|---|
| Elle attend la réponse | Réflexion, Écoute, et la paume ouverte au-delà de 4 s — dès la première seconde |
| Après « salut », « bonsoir », « ça va » (répertoire) | Salutation |
| Après « merci », « pardon », « de rien » | Main sur le cœur |
| Après « au revoir », « bonne nuit », « à demain » | Au revoir |
| Après « attends » | Paume ouverte |
| Réponse du modèle : étonnement / surprise | Main sur la bouche, étonnement |
| Réponse du modèle : concernée / triste | Compassion |
| Réponse du modèle : douce | Douceur |
| Réponse du modèle : écoute | Compréhension |
| Après un rire | Le rire qui s'apaise |
| Gros mot dans ce que dit la personne | Main sur la bouche, tout de suite (liste `GROS_MOTS` à remplir par Lamine) |

Les mains ne bougent qu'une fois la bouche fermée : pendant la voix, les
formes de bouche (planche 1, cases 1–7) prennent tout le visage.
