# La vitrine — comment déposer une photo ou une vidéo

Pour que BIA puisse montrer quelque chose, tu déposes un fichier. C'est tout :
pas de code à pousser, pas de déploiement, pas de table à remplir.

## Une fois, au début

Dans Supabase, projet **khalam-classement** → **Storage** → **New bucket**

- Nom : `vitrine`
- **Public bucket : oui.** C'est le seul réglage qui compte. Sans lui, les
  images ne s'affichent pas.

Rien à ajouter sur Render : BIA se sert des mêmes clés Supabase que le lexique.

## Ensuite, à chaque fois

Un **dossier = un sujet**. Un **fichier = une image ou une vidéo**.

```
vitrine/
  dd-skin/
    1 savon noir.webp
    2 savon visage.webp
    3 lotion.webp
    presentation.mp4
    presentation.webp      ← l'image qu'on voit avant d'appuyer sur lecture
```

- Le **nom du dossier** est la clé que BIA emploie : `dd-skin`.
- Le **nom du fichier** devient le nom affiché : `2 savon visage.webp` s'affiche
  « Savon visage ». Le chiffre du début sert à ranger, il ne s'affiche pas.
- Une image qui porte **le même nom qu'une vidéo** devient son image d'attente,
  et ne s'affiche pas deux fois.
- Formats : `jpg` `png` `webp` `avif` pour les images, `mp4` `webm` `mov` pour
  les vidéos.

Une photo déposée apparaît dans BIA **au bout de cinq minutes au plus**.

## Le poids des fichiers

Supabase donne 5 Go de transfert par mois sur l'offre gratuite. Une photo bien
compressée fait 150 Ko ; une vidéo de trente secondes fait 3 à 5 Mo.

**Compte en vidéos, pas en photos** : mille personnes qui regardent une vidéo de
4 Mo, c'est 4 Go — presque tout le mois. Les photos, elles, ne se voient pas
passer. Garde les vidéos courtes, et à 720p.

## Ce que BIA fait, et ce qu'elle ne fait pas

Elle montre **seulement si on lui parle déjà du sujet**, ou si on lui demande à
voir. Une image par réponse. Elle n'amène jamais le sujet elle-même, et elle ne
place jamais une image dans une conversation qui parle d'autre chose.

C'est la même règle que pour les cosmétiques, et pour la même raison : une
assistante qui sort une photo de savon pendant qu'on lui parle de son divorce
n'est plus une assistante.
