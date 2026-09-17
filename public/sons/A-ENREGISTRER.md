# Les sons que Kha doit enregistrer

*Le 18 septembre 2026. À lire à voix haute pendant la prise — c'est fait pour ça.*

---

## Une seule prise, d'un trait

Tout dans **un seul fichier**. Deux secondes de silence entre chaque son :
c'est ce qui permet de découper proprement après.

Pièce silencieuse. Pas de ventilateur, pas de rue, pas de télévision.
**Même micro et même distance que la prise du 9 septembre** — sinon on
entendra deux personnes dans la même bouche.

---

## Les quatre sons, trois fois chacun

### 1. L'étonnement — « **oh !** »

Court, vrai, surpris. Celui qui échappe quand on apprend quelque chose.

**Trois fois**, un peu différemment à chaque fois : un « oh » étonné, un « oh »
impressionné, un « oh » qui découvre.

> Ces deux-là servent **deux** émotions à la fois : l'étonnement et la
> surprise. C'est le seul son qui manque et qui est déjà branché : les
> fichiers déposés, ça marche le jour même.

### 2. La réflexion — « **mmm…** »

Bouche fermée, tenu **une à deux secondes**, comme quand on cherche sa réponse.
Pas un « mmm » d'approbation : un « mmm » qui pense.

**Trois fois.**

> **C'est le plus important des quatre.** BIA met environ trois secondes à
> réfléchir, et pendant ces trois secondes elle ne fait rien. Ce « mmm » part
> dès que Lamine finit de parler et couvre l'attente. C'est exactement le trou
> qu'il ressent comme de la lenteur depuis le début.

### 3. La compassion — « **mmh** »

Doux, descendant, désolé. Celui qu'on fait quand quelqu'un raconte un malheur.

**Trois fois.**

### 4. L'écoute — « **mm** »

Très court, montant. Celui qu'on fait pendant que l'autre parle, pour dire
« je t'écoute, continue ».

**Trois fois.**

---

## La règle qui compte le plus

**Pas de mots. Que des sons.**

Un « ah bon ? » enferme BIA en français. Un « mmm » marche en wolof comme en
français, et elle s'en sert dans les deux langues sans qu'on ait à choisir.

---

## Et si Kha a cinq minutes de plus

**Deux vrais rires francs et courts**, une à deux secondes, enregistrés pour
eux seuls.

Ce n'est pas urgent. Aujourd'hui, `rire-2` et `rire-3` sont taillés dans les
deux grands rires du 9 septembre : ils partagent donc leur matière avec les
`fourire`. Ça ne s'entend presque pas, mais deux rires à eux seuls seraient
meilleurs.

---

## Ensuite

Le fichier va dans :

```
~/Documents/GitHub/bia-render/public/sons/brut/
```

Crée le dossier `brut`. N'importe quel nom, `.wav` ou `.m4a`. Puis dis-le à
Claude : il découpe, met tous les extraits à la même crête — sinon elle
s'étonne fort et compatit tout bas —, les nomme, les branche dans le code,
écrit l'épreuve et prépare le commit.

---

## Déposé le 17 septembre 2026 — la prise « VOIX. DIDI »

Kha a enregistré les quatre sons d'un trait, en cinq parties bien séparées.

| Fichier | Vient de | Durée |
|---|---|---|
| `reflexion-1.mp3` | partie 1, premier « mmm » | 0,89 s |
| `reflexion-2.mp3` | partie 1, deuxième | 0,94 s |
| `reflexion-3.mp3` | partie 1, troisième | 0,89 s |

Tous ramenés à la même crête : elle ne réfléchit pas fort puis tout bas.

**Ce qui reste à découper de cette même prise** — les sons sont là, il ne
manque que la décision de Lamine sur ce qu'on en fait :

- **partie 3** — la compassion. Confirmée par lui : « c'est le O de
  compassion ». L'émotion `concernee` n'a pas encore de souffle déclaré.
- **partie 4** — l'écoute. L'émotion `ecoute` non plus.
- **partie 5** — des rires de plus, en supplément de ceux du 9 septembre.

**Et ce qui manque encore : les « oh ! » d'étonnement.** La partie 2 ne
contient qu'un seul bloc de quatre secondes, sans coupure interne — impossible
d'en tirer des exclamations courtes. Un « oh ! » d'étonnement fait moins d'une
seconde. Trois, brefs et bien séparés, et `oh-1.mp3` / `oh-2.mp3` seront
remplis : ils sont déjà branchés dans le code et servent DEUX émotions,
l'étonnement et la surprise.

## Ce qui est déjà déposé, et qu'il ne faut pas refaire

| | |
|---|---|
| `rire-1`, `rire-2`, `rire-3` | le rire franc, court |
| `fourire-1`, `fourire-2` | le grand rire, 4,2 s et 5,2 s |
| `rire-retenu-1` à `-4` | le petit rire dans la gorge, complice |

La source d'origine est sur le Bureau, dossier **« voi didi »**,
`rirrr de bia.wav` et `peutit rirr.wav`. **Ne pas les supprimer** : c'est la
matière de toute redécoupe.
