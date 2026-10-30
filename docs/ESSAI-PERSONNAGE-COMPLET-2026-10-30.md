# Bia — essai avec quatre images complètes

Demande : abandonner le collage des lèvres refusé par Lamine et animer le personnage entier avec ses formes de bouche intégrées.

Page /essai-personnage-complet. L'ancien lien /essai-bouches redirige vers ce nouvel essai. Aucun changement de la conversation, du micro, des moteurs, de Runway ou du choix des personnages dans Bia.

Source : planche générée de quatre images complètes de Bia, tenue satin bleu nuit, tête jusqu'aux cuisses. Chaque état contient tout le visage et le corps : aucune petite bouche ajoutée par-dessus la vidéo. L'image entière est fondue vers la suivante. Un recalage du corps mesuré sur les pixels de la tenue décale les panneaux droits de 23 pixels et les panneaux du bas de 2 pixels avant recentrage. Les opacités de composition sont normalisées pour éviter l'assombrissement d'un fondu sur fond noir.

Contrôles : lecture du son public voix-bia.wav, arrêt, ouverture A/E ou O/OU selon le volume, quatre états manuels et retour automatique. L'analyse audio utilise une minuterie courte ; les fondus utilisent le compositeur CSS, sans canvas plein écran. La bouche revient au repos à l'arrêt.

Limites : quatre images de 512×768, même pose fixe ; ce n'est pas encore la reproduction des gestes des six vidéos. La forme de bouche suit le volume et un choix A/O, pas les phonèmes. Le visage, la tenue et les mains générés peuvent encore varier entre états. Ce prototype sert à juger ces écarts avant toute intégration dans Bia. Ne pas annoncer une équivalence à l'animation Runway ni une synchronisation articulatoire exacte.

## Yeux ouverts

Lamine juge la version précédente « pas mal » et demande d'ouvrir les yeux. La référence c7f4d721a440c338b77adb2c948bdda8651afb12 est conservée. Une variante complète atlas-yeux-ouverts.png corrige les paupières sur les quatre poses ; l'ancien atlas n'est pas écrasé. Les dimensions 1024×1536 et les décalages de recalage (23 pixels entre colonnes, 2 pixels entre lignes) ont été vérifiés inchangés. Seule l'adresse de l'image chargée par la page est modifiée ; aucun paramètre audio ou comportement de conversation changé.
