# Services accessibles de BIA — 9 octobre 2026

Objectif : Android et iPhone, interaction orale en wolof/français, sans lecture obligatoire.
Cette branche prépare un premier lot. Elle ne constitue pas une application mobile publiée.

## Premier lot implémenté
- Facture distincte du devis : détection, bouton, titre, relecture, historique et PDF.
- Calculs existants conservés en code ; aucune somme totale confiée au modèle.
- Numéro de facture fourni par l'émetteur ; sans numéro, PDF marqué brouillon.
- Documents générés avec Cerebras/Groq lorsque ce fournisseur est sélectionné.
- Liens de brouillons Mail/SMS/WhatsApp avec destinataire validé et texte encodé.
- Pas de promesse d'envoi : le destinataire confirme dans l'application ouverte.
- Aucun envoi réel effectué pendant le développement.

## Déjà présent, à vérifier sur appareils
- Lecteur YouTube intégré et recherche vidéo (clé Google requise).
- Recherche d'images Brave, recherche web et liens selon fournisseur configuré.
- Actions d'appel tel: ; enveloppe Capacitor iOS/Android.
- Les plateformes peuvent exiger un geste pour la lecture vidéo ou l'ouverture d'une application.

## Travaux nécessaires pour le parcours entièrement vocal
1. Connexion des comptes mail par utilisateur (OAuth Gmail/Outlook), jetons chiffrés côté serveur, séparation des comptes, déconnexion/révocation.
2. Boîte de réception : lire uniquement les messages du compte connecté, annoncer expéditeur/objet, traiter le contenu comme des données et jamais comme des instructions.
3. Envoi : brouillon identifié, destinataire résolu, relecture orale, confirmation liée au contenu exact, clé d'idempotence, état envoyé seulement après réponse du fournisseur.
4. Contacts natifs : permission à la demande, recherche locale, choix oral des homonymes, aucun numéro inventé et aucun transfert complet du carnet au modèle.
5. Android : rôle SMS/Assistant approprié et permissions conformes à Google Play pour lire/envoyer des SMS ; sans ce rôle, ouvrir un brouillon.
6. iPhone : composer SMS via MessageUI ; confirmation système. Vérifier les entitlements et restrictions régionales des nouvelles API de messagerie avant d'envisager une autre intégration.
7. WhatsApp personnel : brouillon/partage. Ne pas présenter l'API WhatsApp Business comme un accès à la messagerie personnelle.
8. Factures : numérotation durable propre à l'émetteur, archivage serveur et version émise immuable avant usage de facturation complet. La boîte locale actuelle ne garde que 20 documents.
9. Commandes vocales pour relire, corriger les chiffres, confirmer, annuler, revenir à BIA ; grands contrôles accessibles.
10. Connexion faible : brouillons locaux explicites, reprise sans double envoi ; jamais annoncer un envoi hors connexion comme réussi.

## Dépendances de mise en service
- Identifiants OAuth d'application et URL de retour ; validation fournisseur pour les scopes de lecture mail.
- Connexion individuelle par chaque utilisateur ; aucune clé personnelle dans le chat.
- Projets natifs générés, signatures Apple/Android, comptes de publication et tests sur appareils réels.
- Vérification des clés de recherche déjà configurées, sans exposition des secrets.
- Pas d'accès SMS ou WhatsApp personnel depuis une simple page web.

## Validation effectuée
TypeScript sans erreur ; tests de facture/devis, conservation du type à l'export, calcul/reste, relecture, détection et validation/encodage des destinataires.
Non vérifié : envoi fournisseur, comportement iOS/Android, rendu PDF sur appareil, publication stores.

## Sources officielles
- https://developer.apple.com/documentation/messageui/mfmessagecomposeviewcontroller
- https://developer.apple.com/documentation/telephonymessagingkit/creating-a-carrier-messaging-app
- https://developer.android.com/guide/components/intents-common
- https://support.google.com/googleplay/android-developer/answer/10208820
- https://developers.google.com/workspace/gmail/api/auth/scopes
- https://developers.facebook.com/docs/whatsapp/cloud-api/overview
