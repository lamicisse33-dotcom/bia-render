# Bia — cadrage en pied, 29 octobre 2026

Lamine confirme que Bia répond de nouveau, puis demande des plans montrant
l'ensemble du corps, des rapprochements pendant la parole et un retour au
cadrage normal. Aucun réglage du cerveau ou du microphone n'est modifié.

Référence avant modification : `0f0b1ce41ab4ba86ef8922d11f7a4e21d4af4716`.
Avatar initial conservé : `e15f387a-20ae-4dd4-986d-601fb748ec07`.
Nouvelle référence : `public/personnages/bia-en-pied-20261029.webp`.
Création par l'outil imagegen à partir de la référence approuvée : extension
en pied, même femme adulte, tresses, bijoux, tenue sénégalaise satin bleu
nuit, mains basses, fond noir. La génération cherche à préserver l'identité ;
elle ne garantit pas une identité pixel à pixel avec l'original.

Le serveur recherche une variante nommée `Bia en pied — 2026-10-29`. Elle
utilise `imageProcessing: none` pour éviter l'optimisation en portrait serré.
Elle est créée une seule fois si absente, seulement jusqu'au 31 octobre,
sans modifier le personnage initial, sans lancer de conversation payante.
Les redémarrages retrouvent la variante existante. Seul l'état READY active
la nouvelle source pour les prochaines sessions. Un échec garde l'ancienne.
Diagnostic : `/api/avatar-runway`, champ `cadrage`.

La vidéo conserve ses proportions. Pendant la parole, le plan commence large,
se rapproche après 3,5 s, puis alterne toutes les 8,5 s. L'arrêt ramène le
plan large en 1,8 s. Les préférences de mouvement réduit désactivent le zoom.
Les limites de la zone portrait et la barre du microphone restent identiques.

Les tests de transport et de préparation de variante passent, ainsi que la
compilation de production. L'état READY du fournisseur ne prouve pas à lui
seul la qualité d'une conversation vidéo sur iPhone : le cadrage animé réel
reste à vérifier sur ce flux après publication.
