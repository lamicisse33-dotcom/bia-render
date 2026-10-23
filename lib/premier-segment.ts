/* ── LE PREMIER SEGMENT, ET POURQUOI IL DÉCIDE DE TOUT ─────────────────────

   Mesuré le 23 octobre 2026 sur quatre tours Khalam réels, dans
   micro_capture.derniers : 702, 767, 1151 et 2686 ms de parole. Le premier
   segment d'écoute progressive partait après 4 000 ms de tampon — jamais
   atteint par une phrase ordinaire.

   L'anticipation n'était donc pas « en panne » : elle était HORS DE PORTÉE.
   Le seul segment partait sur les 400 ms de silence de fin de parole, sa
   transcription revenait après la fermeture de la capture, et le producteur
   de briques n'avait jamais vu un caractère. D'où, dans /api/etat :
   ecoute 6 segments réussis, et pourtant sessions 0, preparations 0,
   departs.sans_preparation 4. Voir tests/eligibilite-anticipation.test.mjs,
   qui rejoue ces quatre durées et nomme la porte.

   1 500 ms de PAROLE — le seuil déjà éprouvé par le profil d'essai
   `sonnet-segment-1500` — la remet à portée dès qu'on parle plus d'une
   seconde et demie. Les segments SUIVANTS gardent leur durée : c'est le
   premier qui décide si l'anticipation existe, les autres la poursuivent.

   CE QUE ÇA COÛTE, et ce n'est pas rien : une transcription de plus par tour
   de plus de 1,5 s de parole. En dessous il n'y a rien à anticiper, et le
   chemin ordinaire est déjà le plus rapide.

   MODULE SANS AUCUN IMPORT, exprès. Les épreuves qui chargent
   lib/ecoute-progressive.ts rendent souvent le même module factice pour
   toutes ses dépendances ; une constante prise ailleurs y arrivait
   `undefined`, le seuil devenait NaN, et plus aucun segment ne partait — en
   silence. Un seuil faux doit être impossible, pas rattrapé. */
export const PREMIER_SEGMENT_MS = 1500;
