# Khalam V2 dans BIA web

Option explicite `piper-web` dans Moi, et page `/voix/secours`. Le moteur
principal reste Khalam Voice. Aucun basculement automatique ni changement
du cerveau de conversation.

Modèle : export installé sur l’iPhone du 10 octobre, SHA-256
`ba5b18ad39938813cfedbc88aff8aab21b9d8181a6b2d15372fe1adeb80ef528`,
77 058 148 octets. Provenance : artifact DYDY 11661357903, run 38027286080,
manifest export_verified. Le manifeste indique epoch 65, val_mel 0.3675916.
Voix féminine 1, noise_scale 0.35 et noise_w 0.4, identiques au réglage
installé par `select_khalam_v2_female.py`. Aucun réentraînement.

ONNX Runtime Web 1.23.2, WASM dans un worker séparé, un thread pour Safari
sans imposer COOP/COEP à l’application. Les ressources du runtime sont
copiées à chaque build depuis la dépendance épinglée. Le modèle est conservé
dans le bucket Supabase privé existant, préfixe `modeles/khalam-v2`, en dix
parties vérifiées par SHA-256, servies uniquement aux utilisateurs BIA.
Le navigateur vérifie aussi le modèle complet avant de le garder en cache.
Le service worker conserve ce cache lors de son activation.

Les phrases sont encodées en NFD, comme sur iPhone, sans passer par eSpeak.
Un caractère inconnu provoque une erreur explicite, jamais une suppression
silencieuse. Découpage aux mots/ponctuation, jamais en plein mot.
Le choix du secours désactive les anciens sons d’attente d’une autre voix.
Les requêtes de synthèse restent locales ; Supabase sert seulement le modèle.

Validation : `node tests/piper-web.test.mjs`, test natif existant et build.
Essai réel de l’export dans le runtime WASM à un thread, environnement Node :
initialisation 1255 ms ; phrase française 953 ms, 3.73 s de son ; phrase
wolof 944 ms, 3.75 s de son. Cela ne mesure ni un téléphone ni la qualité
auditive humaine. Les premières utilisations téléchargent aussi le runtime.

Mesures publiques `/api/etat.piper_web` : préparations, générations,
derniere_generation_ms, lectures_navigateur, dernier_premier_son_ms, erreurs.
La mesure de lecture correspond à la programmation Web Audio, pas à une
validation humaine de la prononciation. L’arrêt du tour annule le worker en
vol et les demandes en attente ; le modèle en cache permet sa reprise.

Installation vérifiée en production le 12 octobre 2026 : les dix parties
ont été écrites puis téléchargées à nouveau avec vérification de chacune
contre son SHA-256, soit 77 058 148 octets. Les fichiers du modèle ne sont
pas dans Git. Endpoint d'installation temporaire supprimé après vérification.

Version web initiale servie : 05d8f13a3d1f, CI 38263327612 réussie.
Page `/voix/secours` ouverte et contrôlée visuellement dans le navigateur.
Le navigateur de contrôle n'a pas de session BIA authentifiée : aucune
lecture Web Audio n'y a été prétendue. Les compteurs en production étaient
encore à zéro avant utilisation par le propriétaire. La mesure WASM ci-dessus
est une synthèse réelle en Node, pas un essai de lecture dans Safari.
