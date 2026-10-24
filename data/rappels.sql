-- ══════════════════════════════════════════════════════════════════════════
--  LES RAPPELS DE BIA — à coller UNE FOIS dans Supabase
--  (projet khalam-classement → SQL Editor → coller → Run)
-- ══════════════════════════════════════════════════════════════════════════
--
--  Lamine, le 24 octobre 2026 : « rappels de médicaments : création à la voix,
--  rappel qui sonne même BIA fermée, liste et suppression à la voix. Les
--  rappels restent privés à la personne, jamais dans la mémoire commune ni
--  visibles d'un autre. »
--
--  ── POURQUOI PAS DANS khalam_souvenirs ────────────────────────────────────
--
--  Parce qu'il a dit « jamais dans la mémoire commune ». Les souvenirs sont
--  lus, cherchés et injectés dans la consigne : un médicament y serait récité
--  à voix haute au détour d'une phrase. Une ordonnance n'est pas un souvenir
--  de conversation.
--
--  ── UNE LIGNE PAR PERSONNE, ET C'EST VOULU ────────────────────────────────
--
--  La clé primaire EST l'isolement : on ne peut pas lire les rappels d'un
--  autre sans écrire son identifiant, et le serveur n'écrit que celui de la
--  personne qui parle. Pas de requête « tous les rappels » qui pourrait
--  déborder par erreur — sauf l'horloge, qui en a besoin pour sonner et qui
--  ne rend jamais rien à un navigateur.
--
--  ── TANT QUE CE FICHIER N'EST PAS COLLÉ ───────────────────────────────────
--
--  BIA garde les rappels dans la mémoire vive du serveur : ils marchent tout
--  de suite, et ils disparaissent au prochain redémarrage de Render.
--  /api/etat → rappels.rangement dit lequel des deux est en service, pour
--  qu'on ne confonde jamais « ça marche » avec « c'est gardé ».
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists khalam_rappels (
  -- Table commune aux applications KHALAM, comme le lexique.
  application text        not null default 'bia',
  -- L'identifiant du PROFIL, pas de l'appareil. Un téléphone se prête.
  personne    text        not null,
  -- Le document complet de cette personne :
  --   { "rappels": [ { id, quoi, heures:["08:00"], cree, sonne:{} } ],
  --     "abonnements": [ { endpoint, cles:{p256dh,auth}, ajoute } ] }
  -- Du JSON et non des colonnes : la forme bouge encore, et une migration
  -- de colonnes sur une table que je ne peux pas atteindre d'ici coûterait
  -- un aller-retour par changement.
  document    jsonb       not null default '{}'::jsonb,
  maj         timestamptz not null default now(),
  primary key (application, personne)
);

-- ── PERSONNE NE LIT ÇA SANS LA CLÉ DE SERVICE ─────────────────────────────
-- Ce sont ses médicaments. On ferme la table : aucune règle n'est posée, donc
-- la clé publique n'y accède pas du tout. Seul le serveur, qui porte la clé
-- de service, lit et écrit — et il n'écrit jamais que la ligne de la personne
-- qui parle.
alter table khalam_rappels enable row level security;
