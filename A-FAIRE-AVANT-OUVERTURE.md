# À faire avant d'ouvrir BIA à tout le monde

**Décidé par Lamine le 28 octobre 2026 :** BIA est en **phase de test**, sur
invitation. Ce qui suit est volontairement laissé de côté pour l'instant — et
doit être traité **avant** que n'importe qui puisse entrer.

Ce fichier ne contient **aucun secret** : pas de clé, pas de code maître, pas
de mot de passe, aucune valeur de variable. Il décrit des chantiers, pas des
identifiants.

---

## 1. La page Confidentialité

**Pourquoi c'est en attente.** Le texte était écrit, mais il promettait des
choses que le produit ne fait pas encore (voir le point 2). Mieux vaut pas de
page qu'une page qui ment.

**Ce qu'il faudra y mettre, et qui est vrai aujourd'hui :**

| Ce qui est gardé | Où | Sous quelle forme |
|---|---|---|
| Numéro d'une demande de code, prénom, date, statut | table `khalam_demandes_code` | **en clair** |
| Liaison code ↔ numéro pour entrer | seau privé `bia-acces` | **empreintes signées** (le numéro n'est pas récupérable) |
| Ce qui a été dit, par qui, en quelle langue, quand | table `khalam_souvenirs` | **texte exact** |
| Corrections de wolof | table `khalam_lexique` | le mot, sans nom de personne ; partagé entre BIA, BIBA et l'Interprète |
| Rappels de médicaments | table `khalam_rappels` | — |
| Enregistrements de voix pour l'apprentissage | seau `corpus` + table `khalam_corpus` | **seulement avec le code maître** — un utilisateur ordinaire n'enregistre jamais sa voix |

**Gardé dans le téléphone seulement** (n'en sort pas) : le code, le numéro, le
profil choisi, le fil de la discussion écrite, l'apparence de BIA, la vitesse
de sa voix, l'historique de la conversation rapide.

**Pas gardé du tout :** la position (demandée à l'écran, jamais en silence,
et jetée après le trajet) ; les photos du téléphone (BIA ne voit que celle
qu'on lui envoie, au moment où on l'envoie).

**Il faudra aussi la relire après les points 2, 3 et 4** : chacun change une
phrase de cette page.

---

## 2. La vraie suppression (« Tout oublier » côté serveur)

**L'état d'aujourd'hui.** Le bouton « Tout oublier » dans « Moi » efface ce
qui est dans le téléphone : le fil et le résumé. **Les souvenirs rangés sur le
serveur ne sont pas touchés.**

**Ce qu'il faut construire :**

- une route qui supprime, pour une personne donnée, ses lignes de
  `khalam_souvenirs`, sa ligne de `khalam_demandes_code` et sa liaison dans
  `bia-acces` ;
- une confirmation à l'écran qui dit ce qui va disparaître — c'est
  irréversible ;
- et seulement **après** : la phrase « vous pouvez tout faire supprimer » dans
  la page Confidentialité.

**Tant que ce n'est pas fait,** la suppression se fait à la main dans Supabase.
Aucune page publique ne doit la promettre.

---

## 3. La phrase sur les prestataires d'IA hors du Sénégal

**Le fait, et il est important.** Depuis le 28 octobre 2026, Khalam Rapide est
le moteur unique. Sur ce chemin, **le son du microphone part chez le
fournisseur du moteur**, hébergé hors du Sénégal : ce n'est pas seulement le
texte, c'est la voix elle-même. Sur le chemin Khalam (aujourd'hui à l'arrêt),
l'audio allait vers un serveur GPU loué, lui aussi hors du Sénégal.

Le texte de la conversation part également chez le fournisseur du cerveau pour
fabriquer la réponse.

**Ce qu'il faut décider :**

- nommer ou non ces prestataires (Lamine a posé une règle : certains noms ne
  doivent pas apparaître à l'écran de BIA — reste à savoir si la règle vaut
  aussi pour une page Confidentialité, qui est un document, pas l'écran) ;
- où le dire : page Confidentialité, et sans doute un mot court au moment où
  quelqu'un ouvre le micro pour la première fois ;
- dans quels pays exactement, pour pouvoir le dire sans se tromper.

---

## 4. La durée des sauvegardes

**Aucune durée n'est fixée aujourd'hui.** Rien n'expire, rien n'est purgé :
les souvenirs, les demandes de code, les liaisons et les corrections restent
indéfiniment.

**Ce qu'il faut décider, poste par poste :**

| Poste | Combien de temps ? |
|---|---|
| `khalam_souvenirs` | c'est la mémoire de BIA — une durée courte la rendrait amnésique |
| `khalam_demandes_code` | une demande traitée depuis six mois sert-elle encore ? |
| `bia-acces` | tant que le code vit |
| `corpus` (audio d'apprentissage) | c'est un corpus de langue, il a vocation à durer |

Puis l'écrire dans la page Confidentialité, et construire la purge.

---

## 5. Avis juridique — loi sénégalaise sur les données personnelles

**À faire regarder par quelqu'un dont c'est le métier**, pas par moi : la loi
sénégalaise sur la protection des données personnelles (CDP — Commission de
protection des données personnelles).

**Les questions à poser :**

- faut-il déclarer le traitement à la CDP, et sous quelle forme ?
- le consentement par case à cocher, tel qu'il est sur la page, suffit-il ?
- quelles obligations quand les données partent hors du Sénégal (point 3) ?
- quelles mentions sont obligatoires, et où ?
- quel délai pour répondre à une demande de suppression ou d'accès ?

**À faire avant l'ouverture, pas après** : rouvrir un produit déjà ouvert pour
le mettre en conformité coûte plus cher que de le faire une fois.

---

## 6. Les limites d'essais, gardées dans Supabase

**L'état d'aujourd'hui.** Trois freins existent et vivent **en mémoire vive** :

- cinq refus par code et par numéro sur dix minutes, à la porte
  (`lib/acces-lien.ts`) ;
- cinq demandes de code par visiteur et par heure
  (`lib/demandes-code.ts`) ;
- trois demandes par numéro et par jour (même fichier).

**La faille, écrite dans les fichiers eux-mêmes :** ils repartent à zéro à
chaque redémarrage de Render. Ils freinent une main, pas une machine patiente
qui attendrait un redémarrage.

**Ce qu'il faut :** les ranger dans Supabase, avec une fenêtre glissante et une
purge des lignes trop vieilles. Et vérifier que ça ne ralentit pas la porte :
un aller-retour de plus à chaque entrée se sentirait.

---

## 7. Le secret du serveur, sauvegardé

**Ce qu'il tient.** `BIA_SECRET` signe les codes d'accès **et** les empreintes
de la liaison code ↔ numéro.

**Ce qui se passe s'il est perdu :** tous les codes émis deviennent invalides
d'un coup, et toutes les liaisons avec eux — personne ne peut plus entrer, et
les lignes du seau `bia-acces` deviennent illisibles, puisqu'on ne peut plus
recalculer les empreintes.

**Ce qui se passe s'il est volé :** on peut fabriquer des codes valides.

**À faire :** le garder ailleurs que dans Render, dans un endroit sûr et hors
ligne, et noter où. **Pas dans ce dépôt, qui est public.** Et décider qui, à
part Lamine, doit pouvoir le retrouver si quelque chose lui arrive.

---

## Ce qui est déjà en place, et qu'il ne faut pas refaire

- La porte à deux clés (numéro + code), vérifiée sur le serveur à trois
  endroits : l'entrée, chaque réponse payante, et l'ouverture du moteur.
- Le code lié au numéro à la première utilisation, par empreintes signées.
- La rubrique « Demander un code » avec sa case d'acceptation, son champ piège
  et ses freins.
- La table des demandes, fermée au public (RLS sans aucune règle), lisible par
  Lamine seul depuis `/demandes`.
- La mention « BIA est en phase de test : accès sur invitation » sur la page
  publique.
