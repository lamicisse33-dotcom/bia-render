# Avant le profil audio 400 ms / 100 ms

Demande explicite de Lamine : reprendre les réglages de rapidité observés
dans le code public de Toftal, notamment 400 ms de silence, blocs de 100 ms
et lecture des portions audio dès leur arrivée.

Référence préalable exacte : `31af16cacf89cb8fe2b139220b153db539575964`.
Branche conservée : `sauvegarde/avant-audio-400ms-20261020`.
Le point validé `f9bf26e9963353cca8a0db8fc1f49468b0956e70` reste conservé.
Ces références restaurent le code ; elles ne remplacent pas les sauvegardes
des poids, données Supabase et configurations externes.

## Changements ciblés

- Fin de parole fixe à 400 ms, y compris pendant une reprise ; l'ancien
  compteur des coupures reste observable mais ne rallonge plus le réglage.
- Capture PCM et morceaux MediaRecorder à 100 ms. Plafond de morceaux
  adapté pour conserver deux minutes de parole et une marge de vidage,
  sans augmenter le plafond de 20 Mo ni supprimer le repli complet.
- Texte des briques toujours verrouillé et ordonné. Les portions audio
  validées sont livrées progressivement, avant la fin de synthèse.
- Contrôle de la voix, du numéro, de l'empreinte et de la fin complète.
  Un flux interrompu après démarrage ne rejoue pas automatiquement son
  début. Les annulations réveillent les lecteurs bloqués.
- Les prises exactes validées gardent leur priorité. Un flux incomplet
  n'est jamais enregistré comme une prise complète validée.

ASR, fournisseur du modèle, voix sélectionnée, prononciations, leçons,
mémoire, actions et pod de production ne sont pas modifiés.
Le transport progressif est HTTP NDJSON avec les routes BIA existantes ;
le WebSocket privé de Toftal et sa configuration serveur ne sont pas copiés.

## Vérification

Tests comportementaux : borne 399/400 ms dans la fonction de capture réelle,
reprise, 100 ms PCM à 44,1/48 kHz, deux minutes sans perte, ordre, annulation,
rejet des empreintes incohérentes et absence de rejeu après un flux interrompu.
Le test Chromium est synthétique : capture d'un son contrôlé et lecture de
WAV sur une réponse HTTP retardée. Il ne valide ni micro physique, ni qualité
wolof, ni délai d'une vraie conversation avec les fournisseurs de production.

Après publication, lire `reglages_rapidite`, `micro_capture`,
`protection_parole`, `briques_conversation` et les réglages de moteurs dans
`/api/etat`. Une configuration publiée n'est pas une écoute humaine validée.

## Retour

Créer une branche de restauration depuis la référence préalable, comparer
les changements et republier avec la procédure existante. Ne pas forcer
`main`, ne pas modifier la branche de sauvegarde, ne pas toucher au pod GPU.
