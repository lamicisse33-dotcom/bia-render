-- ══════════════════════════════════════════════════════════════════════════
--  LA MÉMOIRE DE BIA — à coller UNE FOIS dans Supabase
--  (projet khalam-classement → SQL Editor → coller → Run)
-- ══════════════════════════════════════════════════════════════════════════
--
--  Lamine, le 15 septembre 2026 : « il faut que BIA ait une mémoire, une
--  vraie mémoire. Une mémoire avec beaucoup de persistance qui va lui
--  permettre de se rappeler de tout ce qu'on lui a dit il y a quelques jours,
--  il y a une semaine, il y a un mois. »
--
--  Jusqu'ici, sa mémoire vivait dans le navigateur de son téléphone : les
--  douze derniers échanges et un résumé. Changement d'appareil, données du
--  site vidées, ou simplement iOS qui fait le ménage dans une application
--  installée qu'on n'a pas ouverte depuis trois semaines — et elle l'oubliait
--  entièrement. Ce qui est ici ne s'efface pas.
--
--  ── POURQUOI UNE COLONNE « SONNE » ────────────────────────────────────────
--
--  Parce qu'une recherche ordinaire ne retrouverait RIEN dans un mois de
--  wolof transcrit à l'oreille. Le moteur d'écoute écrit « keur » un jour,
--  « ker » le lendemain, pour le même mot. On range donc, à côté du texte
--  exact, sa forme SONNÉE — voir sonne() dans lib/normaliser.ts — et c'est
--  sur elle qu'on cherche. Le texte rendu, lui, reste celui qu'il a dit.
--
--  ── CE QUI EST GARDÉ, ET CE QUI NE L'EST PAS ──────────────────────────────
--
--  Gardé : ce qu'il dit, ce qu'elle répond, la date, la langue, la personne.
--  Pas gardé : aucune clé, aucun code, aucun jeton. Rien de tout ça ne passe
--  par ici.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists khalam_souvenirs (
  id           bigserial primary key,
  -- La table est commune aux applications KHALAM, comme le lexique : ce
  -- champ dit laquelle a parlé, pour que BIA ne lise pas les souvenirs de
  -- l'Interprète.
  application  text        not null default 'bia',
  -- À QUI elle parlait. C'est l'identifiant du profil, pas l'appareil : un
  -- téléphone se prête, une personne non.
  personne     text        not null,
  quand        timestamptz not null default now(),
  -- « personne » ou « bia ». Sans ça, elle prendrait ses propres phrases
  -- pour des souvenirs de ce qu'on lui a dit.
  qui          text        not null check (qui in ('personne', 'bia')),
  -- Ce qui a été dit, MOT POUR MOT. C'est ce qu'elle citera.
  texte        text        not null,
  langue       text,
  -- La forme sonnée, sur laquelle on cherche. Voir plus haut.
  sonne        text        not null default ''
);

-- Pour relire les derniers échanges d'une personne, dans l'ordre.
create index if not exists souvenirs_personne_quand
  on khalam_souvenirs (application, personne, quand desc);

-- Pour la recherche. « simple » et non « french » : le texte est mêlé de
-- wolof et de français, et il est déjà passé par sonne() — un analyseur
-- français couperait les mots wolof n'importe comment.
create index if not exists souvenirs_recherche
  on khalam_souvenirs using gin (to_tsvector('simple', sonne));

-- ── PERSONNE NE LIT ÇA SANS LA CLÉ DE SERVICE ─────────────────────────────
-- Ce sont ses conversations. On ferme la table : aucune règle n'est posée,
-- donc la clé publique n'y accède pas du tout. Seul le serveur, qui porte la
-- clé de service, peut lire et écrire.
alter table khalam_souvenirs enable row level security;

-- ══════════════════════════════════════════════════════════════════════════
--  LA RECHERCHE
--
--  Classée par pertinence, puis par date. On ne rend que quelques passages :
--  elle ne se souvient pas de tout EN MÊME TEMPS, elle retrouve ce que la
--  question appelle. Un mois de bavardage dans une consigne la noierait et
--  coûterait une fortune en jetons.
--
--  p_mots est une suite de mots déjà nettoyés par sonne() — donc uniquement
--  des lettres, des chiffres et des barres « | ». Rien d'autre ne peut y
--  entrer, et c'est ce qui rend to_tsquery sûr ici.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function chercher_souvenirs(
  p_application text,
  p_personne    text,
  p_mots        text,
  p_combien     int default 6
)
returns table (id bigint, quand timestamptz, qui text, texte text, score real)
language sql
stable
as $$
  select s.id, s.quand, s.qui, s.texte,
         ts_rank(to_tsvector('simple', s.sonne), to_tsquery('simple', p_mots)) as score
  from khalam_souvenirs s
  where s.application = p_application
    and s.personne = p_personne
    and to_tsvector('simple', s.sonne) @@ to_tsquery('simple', p_mots)
  order by score desc, s.quand desc
  limit greatest(1, least(p_combien, 20));
$$;
