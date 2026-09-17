# Avant de dire à Lamine que c'est bon

*Écrit le 18 septembre 2026 au soir, après une journée où j'ai cassé trois
choses et où c'est lui qui les a trouvées, en parlant à BIA.*

Ce fichier n'est pas une leçon de morale. C'est la liste de mes fautes de ce
jour-là, chiffrées, et la règle que chacune impose. Il est écrit pour
moi-même dans une prochaine session, qui ne se souviendra de rien.

Lamine, ce soir-là : « tu fais exprès de casser des choses ». Non. Mais le
résultat pour lui est le même, et c'est le résultat qui compte.

---

## La faute qui revient : je livre, puis je mesure

Les trois de la journée, dans l'ordre :

**1. Les « mmm » de réflexion.** J'avais écrit sur ma propre fiche
« tenu une à deux secondes ». J'ai découpé des morceaux de **0,89 s** et je
les ai branchés. Une heure plus tard : « c'est pas bien fait, c'est trop
court. » Je n'avais pas relu ma propre consigne.

**2. Les cent mots wolof, refusés pendant six jours.** J'envoyais les
keyterms en JSON dans un seul champ ; l'API mesurait la longueur de ce champ
— huit cents signes — et refusait tout. Le compteur le disait depuis le
premier soir :

```
mots_donnes           100
repli_sans_les_mots    55   ← sur 55. Cent pour cent d'échec.
reprises_ratees        36   ← sur 36.
dernier_refus   « All keywords must be less than 50 characters »
```

**J'ai écrit ce compteur moi-même, et je ne l'ai jamais lu.**

**3. La langue imposée à l'oreille.** Posée à 20 h, retirée à 21 h 20, parce
qu'il a essayé et que BIA ne comprenait plus rien.

```
ecoutes               12
imposees              12   ← toutes
langues_entendues     {}   ← plus rien n'était mesuré
imposees_sans_texte    0   ← ma garde n'a jamais servi
```

Et la même semaine, sur sa facture : **36 000 jetons envoyés au modèle pour
114 reçus.** J'avais ajouté un bloc à sa consigne chaque fois qu'il demandait
quelque chose, pendant une semaine, sans jamais peser la pile.

---

## RÈGLE 1 — Ce qui touche l'oreille, le micro ou la voix se mesure AVANT de dire que c'est bon

Le reste, je peux le vérifier moi-même : une épreuve, une compilation, un
compteur. Pas ça. **Ces trois-là se mesurent dans sa bouche et dans ses
oreilles**, et je n'en ai ni l'une ni l'autre.

Donc, pour ces trois-là :

- je dis ce que le changement doit produire **en chiffres**, avant ;
- je nomme le champ de `/api/etat` qui le dira ;
- et **je lis ce champ moi-même sur le serveur en ligne** avant d'écrire que
  ça marche. `https://app.khalam.app/api/etat` est public, exprès.

Écrire « c'est réparé » sans avoir lu ce champ est la faute de cette journée,
commise trois fois.

## RÈGLE 2 — Une épreuve qui lit du code ne prouve rien du monde extérieur

Deux fois dans la même journée, une épreuve est passée pendant que la chose
était cassée à cent pour cent :

- le matin, elle **exigeait** `JSON.stringify(mots)` — la faute elle-même ;
- le soir, elle validait `unEssai(…, null, …)`, motif qui existait encore
  ailleurs dans le fichier, dans une garde que je venais d'ajouter.

**Un motif de texte prouve qu'une chaîne existe, jamais qu'elle est à la
bonne place, et jamais qu'un service extérieur l'accepte.**

Donc : chaque motif est ancré à **sa position** dans la suite des appels, pas
à sa présence dans le fichier. Et pour tout ce qui sort de la machine —
ElevenLabs, Soynade, Anthropic, Supabase — l'épreuve ne suffit pas : il faut
un appel réel, et son verdict lisible dans `/api/etat`.

## RÈGLE 3 — Ne jamais aveugler un compteur dans le commit qui pourrait en avoir besoin

Le soir du 18, j'ai restreint `langues_entendues` aux seules écoutes laissées
libres — pour garder le compteur « honnête ». Il n'y en avait plus aucune.
**Le compteur qui aurait montré ma faute affichait `{}`, à cause de ma
faute.**

Un compteur se restreint dans un commit séparé, jamais dans celui qui change
le comportement qu'il mesure.

## RÈGLE 4 — Une garde sur une absence se vérifie contre la valeur de départ

J'avais écrit « on n'impose la langue que si on la sait », en supposant
qu'elle serait vide au premier tour. Elle ne l'est jamais :

```ts
const langueDuFil = useRef<"wo" | "fr">("wo");
```

**Avant d'écrire une garde sur « si c'est vide », aller lire ce que c'est
quand personne n'a rien mis.** Trente secondes de lecture auraient évité la
soirée.

Et le corollaire : **un filet doit être posé sous le défaut réel.** Je
guettais le texte vide ; le texte n'était pas vide, il était faux. Un filet
sous le mauvais trou ne rattrape rien.

## RÈGLE 5 — Deux de ses décisions qui s'annulent, ça se dit le jour même

Le 9, le 12 et le 15 septembre, il a demandé trois fois de pouvoir couper BIA
à la voix. Je l'ai construit en entier. Le 12 au soir, il a demandé de cacher
le point orange ; je l'ai fait en lâchant le micro entre les tours — **ce qui
tuait le premier**, puisque sans micro ouvert le guetteur n'écoute rien.

Ses deux demandes étaient bonnes. Elles étaient incompatibles. **C'était mon
travail de le dire au moment où j'ai posé la seconde**, pas six jours plus
tard quand il le sent au téléphone.

Quand une nouvelle demande contredit une décision déjà écrite dans le code,
je le dis dans le même message, avec la date de l'ancienne — et c'est lui qui
tranche.

## RÈGLE 6 — La vitesse qu'il me demande n'est pas la permission d'aller vite sur son oreille

Il me dit que je suis trop lent, et il a raison sur beaucoup de choses. Mais
« plus vite » veut dire moins de bavardage et moins d'allers-retours, pas
moins de vérification sur le seul chemin où une erreur lui coûte une soirée
et une facture.

Aller vite sur la mesure, lentement sur le déploiement.

---

## Ce qui reste à construire, et qui rendrait la RÈGLE 1 automatique

Une page d'essai pour l'oreille, sur le modèle de celle de la voix qui existe
déjà dans `/vitesse` (« lancer l'essai », cinq appels à Soynade, le résultat
gardé avec sa date).

Un bouton, un vrai appel à ElevenLabs avec les cent mots, et le verdict
affiché : le champ accepté ou refusé, le motif, la langue reconnue, le temps.
**Six jours de wolof deviné auraient été vus en une seconde.**

C'est la seule façon de sortir de la boucle « je livre, il découvre ».
