# La bouche composée sur vidéo — essai arrêté

**29 octobre 2026. Verdict de Lamine, à l'oreille et à l'œil :**

> « La bouche composée sur vidéo n'est pas naturelle et ne colle pas.
> On arrête cette voie. »

Ce fichier existe pour que personne — moi compris — ne recommence dans six
semaines sans savoir ce qui a été essayé, ce qui a été mesuré, et ce que ça
a donné.

---

## Ce qui a été construit

Deux personnages, tous deux retirés de la liste le soir même.

**1. « Bia — visage local (essai) »** — sur le portrait HD du 28 octobre.
Fond fixe, huit bouches découpées de ce portrait, posées par-dessus et
choisies sur l'enveloppe sonore existante (tranches de 75 ms).

**2. « Bia satin bleu nuit — local »** — sur les six vidéos satin.
La prise vidéo en fond, sa bouche filmée entièrement recouverte par une
bouche composée suivant le son joué, positionnée image par image sur le
suivi des lèvres déjà présent dans le dépôt (`levres.json`).

Le code des deux reste en place, derrière `ESSAI_BOUCHE_COMPOSEE` dans
`lib/apparences-bia.ts`, à `false`. Le remettre à `true` les fait
réapparaître dans la liste sans rien d'autre à toucher. Un téléphone qui
avait gardé l'un des deux retombe sur « Bia animée — satin bleu nuit ».

---

## Ce qui a été mesuré

Mesures réelles, dans un navigateur à 375 px, avec un vrai `AudioContext`
et un vrai son décodé. Elles ne sont pas en cause dans le verdict : elles
étaient bonnes.

### Visage local HD

| | |
|---|---|
| formes de bouche employées | **8 sur 8** en une réponse de 2,6 s |
| décalage bouche–son | **11 à 15 ms** |
| cadence | 7,7 changements/s (échantillonneur à 25 Hz, écriture seulement au changement) |
| écart minimal entre deux bouches | 99 ms |
| poids téléchargé | 1 755 Ko |
| erreurs de page | 0 |

### Satin local

Le suivi `levres.json` porte en cinquième colonne **l'ouverture de la bouche
filmée**, image par image. L'atlas des bouches composées ne sait représenter
que jusqu'à **0,2502**. Au-delà, le trou filmé est plus grand que ce qu'on
pose dessus.

Sur la prise entière : **`rire` passe 37,8 % de ses images au-dessus du
plafond**, `joie` 10 %. Chaque prise ne jouait donc que sa fenêtre de 3,2 s
la plus calme, choisie sur l'ouverture **maximale** (une seule image grande
ouverte suffit à faire ressortir l'ancienne bouche) :

| prise | fenêtre | ouverture max |
|---|---|---|
| ecoute | 0,00 → 3,21 s | 0,014 |
| parole | 1,29 → 4,50 s | 0,120 |
| joie | 6,13 → 9,33 s | 0,236 |
| rire | 6,67 → 9,88 s | 0,206 |
| coeurs | 1,25 → 4,46 s | 0,078 |
| bisou | 2,17 → 5,38 s | 0,069 |

Recalculables par `node outils/passages-calmes.cjs`.

**La couverture tenait.** Trois images clés capturées pendant une vraie
phrase : au début, au milieu et à la fin, le canevas qui redessine la vidéo
puis pose la bouche était visible et pleinement opaque, l'âge du son à
0 ms, la vidéo dans sa fenêtre calme. L'ancienne bouche n'était pas à
l'écran.

---

## Pourquoi ça n'a pas marché quand même

Les chiffres étaient bons et le résultat ne l'était pas. C'est le point
important de ce fichier.

Une bouche qui tombe **au bon endroit au bon moment** n'est pas une bouche
qui **appartient au visage**. Ce qui manque ne se mesure pas avec les
instruments employés ici : la mâchoire ne descend pas avec la bouche, les
joues ne bougent pas, la lumière de la bouche rapportée n'est pas celle de
la prise, et sur la vidéo le reste du visage continue de parler sa propre
phrase pendant que les lèvres en disent une autre.

**Une leçon, pour la prochaine fois :** aucune des mesures prises ici
n'aurait pu prédire ce verdict. « Huit formes sur huit » et « 11 ms » sont
des mesures justes qui décrivent une chose qui ne va pas. La seule épreuve
qui comptait était un homme qui regarde son téléphone et qui dit non.

---

## Un défaut réparé en route, et qui reste réparé

Lamine : « la bouche composée dépasse légèrement de la mâchoire ».

La cause n'était pas le fondu mais la **forme du masque**. Un masque
rectangulaire emporte le contour de la mâchoire de la tuile dont il est
découpé — et ce contour descend quand la bouche s'ouvre. Collé sur un
portrait dont la mâchoire est ailleurs, il fait une double arête.

Le masque est devenu un **ovale serré sur les lèvres** (rayons 76 × 33,
fondu de 13 px) qui s'arrête avant le menton et avant les joues : plus
aucun contour ne voyage avec la bouche. Voir `outils/couper-bouches.cjs`.

---

## Ce qui n'a jamais été touché

« Bia animée — satin bleu nuit » et « Bia bleu nuit — synchronisée
(crédits Runway) » n'ont pas changé d'un octet pendant tout l'essai. La
liste des personnages est, après retrait, **identique à celle du matin** —
vérifié en comparant les deux listes dans la même page.

Rien n'a été fabriqué et rien n'a été dépensé : les six vidéos satin, le
suivi des lèvres et l'atlas des bouches existaient déjà dans le dépôt.

---

## Et les six vidéos comme GESTES hors parole ? — mesuré, et non

Demandé le même soir : garder les six prises pour les **gestes hors
parole** (écoute quand elle écoute ; joie, rire, cœurs, bisou quand
l'émotion l'appelle et qu'elle ne parle pas), sans jamais toucher à leur
bouche, Runway gardant le visage pendant la parole. Avec cette condition :

> « Vérifie que la transition Runway ↔ vidéo de geste ne saute pas ;
> si elle saute, n'en fais rien et dis-le. »

**Elle saute.** Mesuré à 375 × 812 px, sans ouvrir aucune session Runway
(donc sans dépenser un crédit) : `node outils/mesurer-cadres.cjs`.

Les deux personnages ne vivent pas dans la même boîte.

| | boîte | l'image dedans (rapport 2/3) |
|---|---|---|
| vidéos satin | `.cadre` — 360 × 540 à (7,5 ; 110) | 360 × 540 |
| Runway | `.cadreRunway` — 375 × 760 à (0 ; 0) | 375 × 562,5 à (0 ; 98,8) |

**Écart : 15 px de large (+ 4,2 %), 22,5 px de haut, et un décalage de
11,2 px vers le haut et 7,5 px vers la gauche.** Sur un écran de 375 px,
le personnage grandit et se déplace d'un coup à chaque bascule.

Rien n'a donc été fait de cette fonction.

**À savoir, parce que ce n'est pas hypothétique :** ce saut existe DÉJÀ en
production. `PortraitRunway` affiche `PortraitSatin` tant que le flux
Runway n'est pas prêt, puis bascule — donc l'image saute au début de
chaque session Runway, aujourd'hui, sans rien de ce chantier.

**Ce qu'il faudrait pour que ça ne saute plus** — c'est une décision de
Lamine, pas la mienne, parce que ça change le cadrage du personnage
Runway qu'il m'a demandé de ne pas toucher : donner à `.cadreRunway` la
même boîte que `.cadre` (`width: min(96cqw, 64cqh, 1024px)` et
`aspect-ratio: 2 / 3`). Les deux images tomberaient alors exactement au
même endroit, et la bascule deviendrait invisible.
