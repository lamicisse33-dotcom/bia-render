# Garder les exemples de devoirs dans leur contexte

Après les comparaisons français puis wolof, Lamine conserve Sonnet. Il
signale une réponse hors contexte : discussion sur un repas au restaurant,
puis réponse « poisson et tomates », suivie d'un prix de devoir et d'une
question sur la signification de ces chiffres.

Le prix appris ne constitue pas le prix du repas et les chiffres de BIA
ne deviennent pas des données fournies par la personne. Le filtre des
répliques sélectionnées ne protégeait pas les autres chemins : contexte
brut des devoirs, mémoire commune et références du lexique.

Le correctif applique le même contrôle à ces références, y compris la copie
des devoirs dans la table de corrections. Les extraits gardent les paires
français-wolof exactes et leur provenance. Les sources Supabase, les devoirs,
les textes validés, les voix et leurs réglages ne sont pas modifiés. La
lecture explicite d'un devoir et les faits des fiches produits restent
accessibles. Une clarification sur « ces chiffres » nécessite des nombres
dans les propos de la personne ; une ancienne affirmation de BIA ne suffit
pas. Les montants écrits en lettres et les variantes FCFA/F sont couverts.

Une règle de contexte partagée avec les briques rappelle de répondre au
repas plutôt que réciter un exercice de vocabulaire ou de commerce. Aucun
second appel de validation n'est ajouté au chemin utilisateur.

Les tests reproduisent les passages par les répliques, la mémoire commune
et les devoirs bruts. Le compteur `contexte_appris.filtrage` ne publie aucun
texte privé. Deux rejeux écrits temporaires passent par la vraie route web,
Sonnet et la mémoire réelle, sans voix et sans écriture de conversation ou
de devoir. Le résultat est disponible dans `contexte_appris.controle` après
déploiement. Ces rejeux ne valident pas la transcription du microphone,
la lecture sur téléphone ni la qualité du wolof à l'oreille.

Référence antérieure : 3e344d911fa3e7fe00539d36010efc65b60c3392.
Les sauvegardes du 17 octobre et d'avant l'essai Haiku restent intactes.
