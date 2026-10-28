# Bia — portraits nets et mains au repos, 28 octobre 2026

Avant cette correction : `8d6f9376562c9cc2e3d6ea6aa88720da58de8330`, conservé sur
`sauvegarde/bia-avant-portraits-hd-2026-10-28`.

La correction concerne uniquement les trois tenues optionnelles. Les portraits
historiques restent disponibles. Aucun changement à app/page.tsx, au micro,
à la latence, à la transcription, aux moteurs, au lexique ou aux apprentissages.

## Images et montage

17 portraits individuels produits avec l'outil image_gen intégré, à 1024 × 1536
pixels natifs, au lieu de personnages de 209 × 314 pixels découpés dans une
planche de 24. Pas d'agrandissement artificiel ni de promesse 4K.

Les sources, les variantes et les consignes de génération sont recensées dans
`public/personnages/tenues-hd-20261028/sources.json`. Le script de conditionnement
`outils/assembler-tenues-hd.mjs` découpe sans redimensionner et encode le repos et
les mains en WebP qualité 96, le visage en WebP sans perte.

Trois poses basses par tenue : mains jointes, léger déploiement, petit geste
ouvert. Neuf visages communs : repos, voyelles et sourire, clignement,
réflexion, compassion et surprise. Les 104 noms de l'animation historique restent
acceptés et sont regroupés dans ces expressions ; ce n'est pas une reconstitution
de 104 poses distinctes.

Le visage est indépendant des mains. Le haut du corps reste fixe. Suppression du
zoom respiratoire sur ces trois tenues uniquement, pour conserver un échantillonnage
stable et éviter l'effet de poupée. Début de parole : repos pendant au moins 2,5 s.
Un geste court est suivi d'au moins 5,5 s de repos. L'arrêt, l'onglet masqué, le
mouvement réduit et le changement de tenue annulent la séquence. Les anciens noms
comme salut, compter ou prière ne lèvent plus les bras en dehors de la parole.

## Vérification avant publication

- 8 tests réussis : définition réelle, compatibilité des expressions, délai avant
  geste, retour au repos, annulation des anciens rappels, décodage de toutes les
  images, reprise après erreur et séparation des réglages vocaux.
- TypeScript et compilation Next réussis.
- Montage des composants réels contrôlé dans le navigateur : trois tenues,
  lèvres, geste bas, réflexion avec mains jointes, début/fin de parole simulée.
- Le contrôle visuel utilise le banc local sans compte ni micro. Il ne constitue
  pas une mesure d'une conversation vocale authentifiée en production.

Pour restaurer l'apparence précédente, rétablir les trois fichiers
`lib/apparences-bia.ts`, `app/personnages/Personnages.tsx` et
`app/personnages/personnages.module.css` depuis la référence ci-dessus. Ne pas
réinitialiser toute la branche : des corrections ultérieures pourraient exister.
