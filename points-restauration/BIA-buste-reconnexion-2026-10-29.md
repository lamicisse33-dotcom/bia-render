# Bia — conserver le buste lors des coupures

Référence avant correction : 7e85996267b62055f054be73ddea7b472c5cb900.
Les mesures en ligne ont enregistré erreur_client à 06:32:01 et 06:37:21 Dakar. Le client fermait la session sur erreur de lecture ou déconnexion sans reconnexion automatique, puis PortraitRunway réaffichait immédiatement le personnage debout.

La reconnexion est désormais automatique uniquement pendant une conversation active, avec cinq nouvelles tentatives au maximum et attente progressive. Une fermeture explicite annule la reprise ; une fermeture ancienne ne peut relancer une session plus récente. Le renouvellement périodique utilise la même reprise. La dernière vraie image reçue du buste reste affichée pendant la coupure, sans prétendre animer les lèvres pendant l'absence de flux. Les vidéos et les autres personnages restent conservés.

Ajout de mesures distinctes session_deconnectee, reconnexion et attente_fin_depassee pour préciser le déclencheur lors du prochain incident. Le cerveau, la voix, la détection de fin de parole et les données ne changent pas. Les tests simulent déconnexion, notification de fin absente, fermeture utilisateur et fournisseur indisponible. Une publication ne prouve pas à elle seule l'absence de nouvelle coupure sur iPhone.
