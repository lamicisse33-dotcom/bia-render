# Sources de connaissances reconnectées à BIA

Les documents complets restent disponibles dans le catalogue. La sélection transmet des paragraphes ou des paires question-réponse entiers selon la question et le contexte, au lieu de couper systématiquement le début ou la fin d'un document. Aucun appel supplémentaire au modèle pour cette sélection.

| Source | Contenu | Transmission |
| --- | --- | --- |
| `data/khalam.md` | Studio, fondateurs, Équilibre, jeux et adresses, applications et codes, recherche wolof, contact | Catalogue de fiches et extraits pertinents |
| `data/produits.md` | DD SKIN, produits, fondatrices et coordonnées | Fiche produits dédiée et catalogue |
| `data/relations.md` | 70 situations, couple, famille, amitié, diaspora et règles générales | Catalogue et extraits pertinents ; règles de conduite présentes dans la consigne |
| `data/fiches-archives.json` | FAQ KHALAM pour Géwel ; 42 paires de présentation DD SKIN, partie 7, lignes 354–395 | Références datées, séparées des fiches actuelles |
| Supabase, stockage `lecons` | Anciennes leçons, déclencheurs et réponses français/wolof | Préchargement ; accès exact existant et catalogue de fiches |
| Supabase, devoirs validés | Dialogues et exercices mémorisés | Routage exact existant et champ dédié au cerveau |
| Supabase, instructions pédagogiques | Règles enseignées par le maître | Champ dédié, réservé au maître authentifié |
| Lexique commun et ancien lexique du traducteur | Corrections et équivalences validées | Transmission lexique existante, indépendante des fiches |
| `lib/repertoire-textes.ts`, `lib/base-textes.ts`, `lib/services-textes.ts`, `lib/blagues-textes.ts` | Textes vocaux, réactions, blagues et formulations déjà relues | Chemins audio existants et catalogue de références |
| `lib/vitrine.ts` et stockage vitrine | Sujets et médias disponibles | Champ dédié et commande `voir` avec une clé disponible |
| `lib/urgences.ts` | Ancienne fiche des secours | Transmission selon la demande ; aucune nouvelle coordonnée inventée |
| Prononciation et nombres | Règles et correspondances de voix | Chemin de préparation vocale existant |

## Provenance des archives

- `FAQ_Gewel_sur_Khalam.docx`, document de travail de septembre 2026 : `libfile_bd0d8c63c8208191a41465cd00733c29`.
- `Markdown collé(3).md`, partie 7, déposé le 29 septembre 2026 : `libfile_46ac7fe8bc208191a20821782d2718df`.

Les anciens documents de relecture de la base vocale sont représentés par les versions relues présentes dans le dépôt. Les fiches d'hébergement, les rapports de développement et les enregistrements de consentement ne sont pas des connaissances à faire réciter par BIA. Les annonces de projets et les durées relatives d'une archive restent datées ; elles ne prouvent pas la disponibilité actuelle ni une efficacité médicale.

## Vérification

`/api/etat` expose `fiches_connaissances` (familles, entrées, dernière sélection) et `connexion_fiches`. Le contrôle fixe `?verifier_fiches=1` relit les sources, récupère les anciennes leçons et construit les messages réellement destinés au cerveau. Il ne lance ni modèle ni voix et ne publie aucun texte privé. Un essai avec Claude reste distinct de cette vérification de connexion.
