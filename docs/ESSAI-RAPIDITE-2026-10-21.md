# Essai de la chaîne vocale — 21 octobre 2026

Lamine demande de tester Haiku 5.5 et les optimisations ensemble sur la
vraie chaîne. Les changements sont limités aux adresses d'essai du maître.

## Comparaison et retour

- `/` : conversation habituelle, modèle et réglages du serveur.
- `/?essai-rapidite=sonnet` : référence Sonnet 5.5.
- `/?essai-rapidite=haiku` : Haiku 5.5 pour la réponse et les briques.
- `/?essai-rapidite=haiku-optimise` : Haiku avec préchargement des données
  pendant l'ASR, premier segment continu à 2,5 secondes et première phrase
  demandée à 6–10 mots. Les citations et formulations apprises restent entières.
- `/essai-rapidite` : accès aux trois modes et mesures navigateur.

Les lecteurs habituels chargent corrections, instructions, index des devoirs
et catalogue des enregistrements en parallèle de l'ASR. Leurs contrôles de
version et délais de cache restent en place. Ce préchargement ne génère
aucun son et n'écrit ni leçon ni mémoire. La bibliothèque contient déjà
3 995 audios prêts sur le relevé antérieur : le catalogue existant est
réutilisé, aucune régénération massive n'est lancée.

Le microphone garde sa fermeture après 400 ms de silence et sa durée
maximale. Le découpage plus précoce concerne le travail silencieux ; il
n'autorise aucune lecture pendant que la personne parle. Les échantillons
PCM restent tous transmis, dans l'ordre. La voix, ses poids et sa vitesse
ne changent pas. Les protections de lecture et les corrections validées
continuent de s'appliquer.

Le choix du modèle est borné et validé par le code maître côté serveur,
jamais par une valeur JSON non vérifiée. Une session de briques conserve
son profil et refuse une continuation sous un autre profil. Les fonctions
spécialisées de correction et de sélection de leçons gardent leur parcours
habituel ; la comparaison concerne le cerveau de réponse et ses briques.

## Mesure

Le commit de mesure précède les changements de comportement. Les anciens
compteurs sont conservés. `essai_rapidite` expose des groupes séparés, les
modèles effectivement demandés, le nombre de tours avec reprise et les
médianes avec/sans reprise. Les briques remontent aussi leur premier son.
Les reprises peuvent conserver les anciennes bornes : ne pas interpréter
leur case démarrage comme un coût de décodage audio pur. Aucun temps vécu
n'est effacé pour faire baisser une médiane.

Un contrôle temporaire, borné à six rejeux par processus et au 21 octobre,
fait reconnaître le même enregistrement synthétique puis transmet **cette
transcription** à la vraie route de conversation en mode diagnostic, avant
de fabriquer le premier audio. Ordre Sonnet/Haiku/optimisé puis inverse.
Les textes et les audios ne sont pas publiés et les diagnostics n'écrivent
ni corpus ni souvenir. Le résultat `controle_http` distingue les échecs,
la réutilisation audio et les transcriptions identiques. Il ne mesure ni
la capture du téléphone ni sa sortie audio, et ne teste pas le découpage
pendant une longue intervention. Le test utilisateur reste nécessaire.

## Sauvegarde

Le code antérieur `73c4a5f662650fb2c136219480e0369ccbf0f0b6` est conservé
sur `sauvegarde/bia-avant-haiku-2026-10-21-73c4a5f`. La version applicative
servie avant cet essai est `1154a56f1978` ; les commits suivants portaient
sur la documentation. Le point validé du 17 octobre reste également intact.
Quitter l'adresse d'essai rend immédiatement les réglages habituels ; aucune
variable Render de sélection globale du modèle n'est remplacée.

## Validation

Les épreuves contrôlent l'autorisation, la sélection bornée, l'isolation des
sessions, la conservation de tous les échantillons, la préparation non
bloquante et les groupes de mesure. Les contrôles existants de conversation,
reprise, micro, lecture et corrections restent exigés avant fusion.
Vérifier ensuite le déploiement `live`, la version réellement servie et les
résultats du contrôle HTTP. Une compilation seule ne valide pas la qualité
du wolof ou la latence ressentie sur le téléphone.

## État à la fin de la préparation locale

304 tests réussis, compilation de production réussie. Les tests de lecture
Chromium ne sont pas encore exécutés : le binaire navigateur nécessaire
n'est pas installé dans cet environnement ; ils restent exigés dans la CI.
La comparaison des fournisseurs en ligne et le test sur téléphone restent
à effectuer après publication. Aucun gain mesuré de cette nouvelle version
n'est annoncé à ce stade.

L'envoi de la branche a été rejeté par le contrôle automatique avant
publication. Vérification GitHub : le dépôt cible est public, le compte
connecté dispose des droits administrateur, et la branche d'essai n'est pas
présente à distance. Le consentement explicite à publier ces modifications
sur ce dépôt public est attendu. La version de production est inchangée.

Le propriétaire a ensuite répondu « OUI » à la demande explicite de publier
ces modifications sur le dépôt public et de les déployer pour son essai.
Cette autorisation couvre la publication de cette branche et le déploiement
des trois modes ; aucune nouvelle sélection globale du cerveau n'est demandée.

## Première publication et contrôle en ligne

PR 89 fusionnée, version 161a34e1b913, déploiement Render
dep-dbcgud3m8hqs738ri240 confirmé live. Les cinq contrôles GitHub
sont réussis, dont les trois épreuves Chromium de lecture audio. La page
/essai-rapidite et son lien vers la vraie conversation sont vérifiés.

Premier rejeu HTTP : quatre chaînes ont reçu un premier audio. Deux autres
ont rendu une réponse complète sans événement de texte progressif ; le
diagnostic les marquait à tort comme incomplètes. Le lecteur réel de BIA
sait déjà traiter ce cas. Le contrôle est corrigé pour consommer exactement
l'audio joint quand il existe, sinon fabriquer la voix de la réponse complète.
Deux nouveaux tests reproduisent ces deux chemins. Cette correction ne
change aucun réglage ni parcours de conversation. Les mesures sur le
téléphone restent nécessaires ; aucun gain global n'est encore annoncé.
