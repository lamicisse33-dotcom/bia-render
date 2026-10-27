# Trois tenues facultatives — 27 octobre 2026

Base avant ajout : `7131dbd88c4d3598a29c249e02c7ff624bdbef01`.
La mise à jour ajoute Vert et or, Wax bleu et ocre, Ivoire et bordeaux.
Les personnages et planches historiques sont conservés. Aucun changement de
moteur vocal, micro, anticipation, cerveau, lexique ou paramètre serveur.

Chaque tenue a deux planches de 24 cases : expressions et mains. Les sept
formes de bouche utilisent les états d'animation existants. Les mains bougent
à une cadence indépendante pendant `speaking`, avec fondu entre positions.
Les anciens noms de gestes sont tous mappés ; certaines transitions utilisent
la même pose et ne constituent pas de nouvelles images distinctes.

Le choix vit dans `bia-habillage-20261027`, séparé de `bia-persona` et des
réglages de voix. Une tenue n'est appliquée qu'après décodage des deux images.
En cas d'échec, le personnage précédent reste visible. « Bia actuelle »
retire cet habillage ; tous les anciens fichiers restent disponibles.

Validation : compilation de production, TypeScript, sept tests ciblés,
vérification navigateur des trois tenues dans un cadre de 375 × 667,
parole simulée avec lèvres et bras, mémorisation après rechargement, retour
au personnage existant. Le banc `tests/personnages-preview.tsx` monte les
vrais composants sans compte ni micro et n'est pas une route de production.
Ce contrôle visuel ne constitue pas une nouvelle mesure de latence vocale.

Retour arrière : revenir à l'apparence existante dans Moi → Changer de
personnage, ou annuler uniquement le commit d'ajout des trois tenues pour un
retour du code. Ne pas remettre tout le dépôt à cette base si d'autres
changements ont été publiés depuis.
