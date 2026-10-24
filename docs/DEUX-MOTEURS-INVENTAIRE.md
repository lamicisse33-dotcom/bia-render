# Khalam et Khalam Rapide : l'inventaire, 24 octobre 2026

Règle de Lamine, prioritaire sur tout : **Khalam Rapide est la MÊME BIA que
Khalam, pas une variante.** Ce document liste ce qui est aligné, ce qui vient
de l'être, et ce que Gemini ne peut physiquement pas faire.

`tests/deux-moteurs-egalite.test.mjs` tient cette liste honnête : il échoue si
un moteur lit une source que l'autre ne lit pas.

## Ce qui est désormais identique

| | Khalam | Khalam Rapide |
|---|---|---|
| socle de consigne | `SOCLE_BIA` | **le même objet**, importé |
| caractère | `CARACTERE_BIA` | le même |
| devoirs | sélection par pertinence | tous les validés à l'ouverture |
| lexique, mots corrigés | ✅ | ✅ |
| corrections exactes | ✅ | ✅ (300 paires) |
| instructions apprises | ✅ (maître) | ✅ (maître) |
| souvenirs | `retrouver` | `derniersSouvenirs`, **même personne** |
| fiches de connaissances | ✅ | ✅ |
| ce qu'elle sait de KHALAM | ✅ | ✅ |
| produits DD SKIN | ✅ + barrière | ✅ + **la même barrière** |
| vitrine | ✅ | ✅ |
| écriture des souvenirs | `garder` | `garder`, même fonction |
| correction du maître | `enregistrerPhraseMaitre` + `corrigerDevoir` | **les mêmes fonctions** |
| carte et chemin | balise `[[carte]]` | outil `montrer_le_chemin` |

Il n'y a plus de copie de texte entre les deux : le socle vit dans
`lib/socle-bia.ts` et le caractère dans `lib/conversation-groq.ts`. Une copie
tenue égale par une épreuve reste une copie — c'était le cas avant ce jour, et
le caractère avait déjà divergé.

## Ce que Gemini ne peut physiquement pas faire

Ce n'est ni un oubli ni une paresse : ce sont des différences de nature entre
un modèle qui rend du TEXTE que nous mettons en voix, et un modèle qui rend
directement de la VOIX.

1. **Les briques.** Khalam découpe la réponse en morceaux verrouillés,
   fabriqués pendant qu'il parle. Gemini Live rend l'audio lui-même, en
   continu : il n'y a pas de texte à découper avant la voix, donc pas de
   briques. Les réglages `briques_conversation` ne s'appliquent qu'à Khalam.

2. **La voix de Kha.** Khalam passe par Chatterbox sur notre GPU — la voix
   clonée, les prises validées, les sons enregistrés du répertoire, les
   corrections de prononciation. Khalam Rapide parle avec la voix de Google
   (`Kore`). **C'est la différence la plus audible, et elle ne se corrige pas
   par du code** : il faudrait que Gemini accepte une voix fournie, ce qu'il
   ne fait pas.

3. **Les balises d'écran.** `[[papier]]`, `[[appel]]`, `[[voir]]`,
   `[[regarde]]`, `[[emotion]]`, `[[micro]]` : Khalam les pose dans son texte
   et le téléphone les exécute. Gemini ne rend pas de texte à nous, il parle —
   une balise serait prononcée à voix haute. La carte fait exception parce
   qu'elle passe par un OUTIL, pas par une balise ; les autres gestes
   pourraient suivre le même chemin, un outil chacun, si Lamine les demande.

4. **Le répertoire gratuit et les réponses gardées.** Khalam sert certaines
   réponses sans appeler le modèle, avec un son déjà payé — zéro jeton, zéro
   attente. Khalam Rapide ne peut pas : la conversation est tenue par Google
   de bout en bout, on ne peut pas s'intercaler pour répondre à sa place.

5. **Le choix de leçon apprise (`[[replique:]]`).** Khalam demande au modèle
   de choisir une réplique de devoir par son identifiant, et sert le texte
   exact. Gemini reçoit les devoirs dans sa consigne et doit les reprendre de
   lui-même : on ne peut pas lui faire rendre un identifiant puis substituer
   le texte, puisqu'il parle directement.

6. **Les mesures fines du chemin.** `preparation_ms`, `modele_ms`,
   `voix_ms` : elles découpent un trajet que nous orchestrons. Pour Khalam
   Rapide il n'y a qu'un seul nombre possible, et il est mesuré :
   `khalam_rapide.fin_de_parole_au_premier_son`.

## Ce qui reste à faire, et qui est faisable

- Les gestes d'écran autres que la carte, un outil chacun (papier, appel,
  photo, vidéo). Faisable, pas demandé.
- `contexteMaitrises` (les leçons maîtrisées du maître) n'est pas encore
  envoyé à l'ouverture de la session rapide, seulement par l'outil
  `chercher_connaissances`.
- La correction par le maître est écrite ; **elle n'a pas encore été vérifiée
  de bout en bout sur son téléphone**, avec une vraie phrase et une vraie
  relecture Supabase.
