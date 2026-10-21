# BIA — état préservé avant optimisation de latence, 21 octobre 2026

Demande du propriétaire : préserver les acquis actuels avant de réduire la
latence. Application de référence : https://app.khalam.app.

Commit : `032d02362a72bb9880ac15a5259a5f2ac4a6bb66`.
Arbre : `dcb0c52ab654f400b74bb7e18cad8e240887b0a6`.
Branche distante créée et relue :
`sauvegarde/bia-avant-latence-2026-10-21`.
Déploiement Render observé : `dep-dbc34abm8hqs73bd7thg`, statut `live`.
Version effectivement lue sur `/api/etat` : `032d02362a72`.

Restauration du code vérifiée dans un worktree détaché : 591 fichiers,
591 empreintes SHA-256 identiques au manifeste JSON adjacent, aucune
modification locale. Le point validé du 17 octobre reste conservé aussi.

Cette version inclut les corrections mémorisées prioritaires, le rejet des
boucles de transcription, la réécoute, la veille native et les symboles muets.
Conserver les briques silencieuses dans l'ordre, l'attente de fin de parole,
la protection contre les reprises et « papa » seulement à l'ouverture.

Le manifeste note les réglages publics constatés : cerveau Anthropic,
`claude-sonnet-5-5`, oreille `local_wolof`, fin de parole de 400 ms.
Il ne contient aucun secret, conversation privée ou audio.
Il sauvegarde le code et les configurations versionnées, pas les données
Supabase, poids GPU, secrets Render ou données privées du navigateur.
Ces dépendances ne sont pas modifiées par cette optimisation.

En cas de régression : comparer la version et les réglages réellement servis,
reconstituer une branche depuis ce commit, vérifier l'arbre et le manifeste,
exécuter les tests puis publier avec la procédure autorisée. Aucun reset forcé
de `main`. Vérifier ensuite `/api/etat` et une vraie conversation avant de
déclarer la restauration fonctionnelle complète.
