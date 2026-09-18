# Où en est BIA avant le test de Didi

*Relevé le 19 septembre 2026 à 00 h 27 (heure de Dakar), sur le serveur en
ligne, avant que Didi emprunte les clés Anthropic et Soynade de BIA pour
ses essais. Lamine n'utilise pas BIA pendant ce test : tout ce qui bougera
sur ces deux comptes sera de Didi.*

## Ce que le serveur disait

| | |
|---|---|
| version en ligne | `b7bc519` (le commit `9aa00df` n'est pas encore poussé) |
| modèle | claude-sonnet-5 |
| voix | Soynade, crédit présent |
| dépense depuis le dernier redémarrage (18 h 47 UTC) | **0 $** — aucun tour, aucune écoute, aucune panne |
| répertoire | 84 réponses enregistrées, actif |
| souvenirs | 2 274 |
| lexique | 232 entrées |
| vidéos | moteur branché, 0 recherche aujourd'hui |

Les compteurs de BIA vivent en mémoire et repartent à zéro au réveil du
serveur : **ils ne peuvent pas servir de témoin pour ce test**. Le témoin,
ce sont les deux soldes.

## Les deux chiffres à relever à la main — avant, puis après

| | avant (à noter) | après (à noter) | différence = Didi |
|---|---|---|---|
| solde Anthropic (console → Billing) | ______ $ | ______ $ | |
| solde Soynade (console.soynade.ai/billing) | ______ $ | ______ $ | |

Ce sont les seuls chiffres qui diront ce que Didi a coûté. Ils ne sont
lisibles que par Lamine, dans ses consoles ; ils ne passent jamais par ici.

## Ce qui ne bouge pas, quoi qu'il arrive

- La mémoire de BIA (Supabase : lexique, souvenirs, corpus, seau
  `repertoire`) : Didi n'a pas la clé Supabase, et ne doit pas l'avoir.
- Le code maître de BIA : reste à BIA.
- Le dépôt `bia-render` : rien de Didi n'y entre.

## Après le test

1. Retirer les deux clés de Render côté Didi.
2. Au moindre doute sur ce que le code de Didi en a fait (un journal, une
   page de diagnostic qui les affiche), régénérer les deux clés dans les
   consoles et les recoller chez BIA — deux minutes.
3. Reprendre BIA là où elle en est : dix commits du 19 septembre à
   éprouver dans sa bouche (`coupures`, `guet`, le transport de la voix,
   `fil_en_cache`, `attente_des_morceaux`).
