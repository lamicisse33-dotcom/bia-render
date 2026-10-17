# Diagnostic des reprises pendant la réflexion — 17 octobre 2026

Version observée : `ea932a004076886f4cd16b5234c0c3f677c9199a`, app.khalam.app.
Source : relevé réel de `/api/etat` effectué après la demande de 23:33 UTC,
et exécution isolée des fonctions de cette même version. Heure de Dakar = UTC.
La branche distante `reference/bia-validee-2026-10-17` conserve exactement
la version validée par Lamine. Le commit fournit le point de retour complet.
Les fichiers de ce diagnostic sont sur une branche séparée. Aucun code de
production, seuil micro, moteur, voix, instruction ou file de briques modifié.

## Ce qui est acquis et mesuré

- À 23:28:11, une brique est prête au départ ; début audio à 12 ms après
  fermeture du micro. À 23:29:08, même situation, 8 ms. Ces chiffres excluent
  le silence de fin de parole ; ils ne signifient pas 8–12 ms après le dernier mot.
- 24 départs mesurés : 13 prêts, 6 en fabrication, 5 sans préparation.
- Dernier échange avec première brique mesurée à 23:30 : 3 344 ms après
  fermeture, 5 683 ms après la dernière parole détectée ; brique encore en
  fabrication au départ. Le fonctionnement n'est donc pas uniformément instantané.
- Les enregistrements visibles ont un analyseur actif et non plat. Rien dans
  ce relevé ne démontre une panne matérielle de microphone.

## Là où les reprises coûtent du temps

1. **Allongement adaptatif du silence.** Dans `finDeSaParole`, une reprise
   classée « recoller » incrémente `coupesTropTotRef`. `silenceQuiSuffit`
   ajoute 300 ms par reprise, avec plafond à 3 000 ms. La valeur persiste
   dans la conversation et se réinitialise à l'ouverture manuelle suivante.
   Relevé : 2 039–2 040 ms avant, puis 2 340 et 2 640 ms. Sept reprises
   classées « recoller » au total, sur l'ensemble des conversations du relevé.
   La hausse observée est cohérente avec ce mécanisme ; les compteurs ne
   permettent pas de rattacher chaque hausse à une interruption individuelle.
   C'est une protection contre les coupures précoces, pas une saturation du modèle.

2. **Un autre traitement pour les reprises.** Le guetteur poste des morceaux
   WebM toutes les 400 ms, mais ne les transcrit pas progressivement. Après
   le silence confirmé, `motsDuGuetteur` ajoute une attente de 250 ms, attend
   les envois en cours, puis appelle `/api/ecouter/apercu`. Cette route
   transcrit tout le préfixe reçu depuis l'armement, sans le consommer.
   Si la personne reparle pendant la reconnaissance, le résultat est écarté
   par `revisionParole` et une nouvelle reconnaissance peut repartir sur
   un enregistrement plus long. La reproduction exécute la vraie fonction :
   deux reconnaissances, la première sans ouvrir le passage à la voix.
   Cette protection évite de parler par-dessus l'utilisateur ; le travail
   cumulé et l'attente après ses derniers mots méritent une optimisation dédiée.

3. **Le parcours anticipé est exclu quand des mots rattrapés attendent.**
   `exclusionAnticipation` renvoie `reprise` et `commencerBriques` vérifie
   également l'absence de `motsRattrapesRef`. Huit exclusions réelles pour ce
   motif. Une phrase rattrapée peut donc revenir au parcours transcription,
   modèle, puis voix, au lieu de profiter des briques pendant la parole.
   Une reprise précoce classée « recoller » relance directement `askBia` ;
   une reprise tardive garde la réponse prête et dépose la nouvelle phrase
   pour ensuite. Il ne faut pas les confondre.

4. **La voix est effectivement retenue.** 26 retenues et 10 attentes annulées.
   Dernière retenue : 11 283 ms à 23:32:37. Sur la brique 2 du tour de
   23:28:11 : audio demandé à 8 834 ms, démarré à 13 328 ms, soit 4 494 ms.
   La fabrication avait déjà terminé : ce délai se situe après préparation.
   Sur le tour suivant : 3 434 ms entre demande et démarrage de la brique 1.
   Ces durées peuvent inclure la parole réelle, le silence protecteur et la
   transcription du guetteur ; elles ne constituent pas des secondes toutes
   inutilement perdues. Les compteurs actuels ne séparent pas ces composantes.

5. **L'annulation serveur reste à instrumenter.** L'aperçu expire côté
   navigateur après 6 s, mais `transcrire` ne reçoit aucun signal de cette
   requête. L'oreille locale utilise son propre délai de 12 s. Une requête
   périmée peut donc continuer. Ce chemin ne passe pas par `gpuAnticipation`,
   contrairement à l'ASR progressif. Une concurrence inutile est possible ;
   aucune mesure disponible ne prouve sa durée ni une saturation GPU réelle.

## Reproduction et conservation

`node diagnostics/reprises-reflexion.mjs` : fonctions de production chargées
localement, avec transcription simulée. Résultats : reprise pendant ASR
implique 2 reconnaissances ; réponse tardive prête conservée, aucun nouvel
appel modèle ; exclusion `reprise` ; seuils longs 2 000, 2 300, 2 600, 2 900,
3 000 ms ; aperçus successifs contenant 10 puis 15 morceaux (les 10 premiers
sont inclus de nouveau). Ce test ne mesure ni réseau, ni microphone physique.

Le fichier de mesures joint ne contient ni transcription, ni audio, ni clé.
Le manifeste conserve les empreintes des chemins concernés et le commit
complet. Il s'agit d'un point de référence reproductible, pas d'une règle
GitHub de protection de branche ni d'une garantie contre toute modification future.

## Suite ciblée, sans refonte du fonctionnement validé

Avant toute modification du comportement, mesurer par reprise : identifiant
de tour, dernier signal vocal, silence confirmé, attente des envois, début et
fin ASR, volume/durée cumulés, résultat périmé, décision recoller/ensuite,
temps retenu après la dernière parole et après la réponse prête. Aucun texte
utilisateur nécessaire. Ces mesures permettront de cibler le surcoût exact.

Priorité d'amélioration : traiter les nouveaux mots de reprise progressivement
et conserver les briques prêtes, avec gestion explicite des demandes d'arrêt.
Ne pas simplement supprimer l'exclusion `reprise` : les mots rattrapés doivent
rester dans le contexte et l'ordre, sans double réponse. Ne pas diminuer les
seuils pour masquer ce délai : cela risquerait de couper la parole à nouveau.
Ne pas jeter les premiers octets WebM : les morceaux suivants dépendent de
l'en-tête du conteneur. Ne pas annoncer la résolution des reprises avant une
mesure navigateur réelle permettant de séparer parole et traitement résiduel.

Conclusion : le ralentissement des reprises est plausible et plusieurs
mécanismes sont confirmés. Le relevé ne démontre pas que le modèle devient
progressivement plus lent. Aucun correctif de production publié à l'issue
de ce diagnostic ; la version validée reste en service.
