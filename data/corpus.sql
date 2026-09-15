-- ══════════════════════════════════════════════════════════════════════════
--  LE CORPUS DE SA VOIX — à coller UNE FOIS dans Supabase
--  (projet khalam-classement → SQL Editor → coller → Run)
-- ══════════════════════════════════════════════════════════════════════════
--
--  Lamine, le 15 septembre 2026 : « comment obtenir cette reconnaissance
--  vocale dont tu parles ? » — puis « oui » à la question de garder sa voix.
--
--  POURQUOI CETTE TABLE EXISTE. Pour entraîner une oreille, il faut des
--  PAIRES : le son, et les mots qu'il contient. Jusqu'ici BIA transcrivait
--  puis jetait le son. Le meilleur modèle wolof ouvert d'aujourd'hui est
--  arrivé à 17 % d'erreur avec 57 heures de wolof ; c'est deux mois de ses
--  conversations. Ce qui n'est pas gardé aujourd'hui est perdu pour toujours.
--
--  CE QUI EST GARDÉ : sa voix à lui, sur le compte maître, et rien d'autre.
--  Pas les testeurs, pas ceux qui empruntent son téléphone — garder la voix
--  de quelqu'un le concerne, lui, et ça se demande.
--
--  L'audio lui-même va dans un seau PRIVÉ nommé « corpus », que le serveur
--  crée tout seul à la première voix. Cette table ne garde que le chemin et
--  les mots.
-- ══════════════════════════════════════════════════════════════════════════

create table if not exists khalam_corpus (
  id          bigserial primary key,
  -- L'identifiant qu'on rend au téléphone, pour qu'il puisse venir accrocher
  -- le texte vérifié à cet extrait-là quand il appuie sur le bouton bleu.
  cle         text        not null unique,
  -- Où l'audio se trouve dans le seau.
  chemin      text        not null,
  application text        not null default 'bia',
  quand       timestamptz not null default now(),
  -- CE QUE L'OREILLE A CRU ENTENDRE. Pas forcément juste : c'est tout le
  -- sujet. Le 12 septembre, sur douze écoutes, elle a reconnu le wolof zéro
  -- fois.
  entendu     text,
  -- CE DONT ON EST SÛR. Vide au départ ; rempli quand il valide au bouton
  -- bleu, c'est-à-dire quand il vient d'entendre BIA répéter et qu'il dit
  -- que c'est juste. Une ligne avec « verifie » rempli est une donnée
  -- d'entraînement ; sans lui, ce n'est qu'un son.
  verifie     text,
  langue      text,
  -- « apprentissage » quand il articule exprès pour enseigner : ce sont les
  -- extraits les plus propres du lot, et on voudra les retrouver.
  contexte    text,
  octets      integer     not null default 0,
  type_audio  text
);

create index if not exists corpus_quand on khalam_corpus (application, quand desc);
-- Pour sortir d'un coup tout ce qui est prêt à entraîner.
create index if not exists corpus_verifie on khalam_corpus (application)
  where verifie is not null;

-- ── C'EST SA VOIX. PERSONNE D'AUTRE NE LA LIT ─────────────────────────────
-- Aucune règle n'est posée : la clé publique n'accède pas du tout à cette
-- table. Seul le serveur, qui porte la clé de service, peut lire et écrire.
alter table khalam_corpus enable row level security;

-- ══════════════════════════════════════════════════════════════════════════
--  COMBIEN D'HEURES IL A DÉJÀ, ET COMBIEN SONT PRÊTES
--
--  Le chiffre qu'on regardera chaque semaine : 57 heures suffisaient pour
--  arriver à 17 % d'erreur. Celui-ci dit où il en est.
-- ══════════════════════════════════════════════════════════════════════════
create or replace function etat_du_corpus(p_application text default 'bia')
returns table (extraits bigint, verifies bigint, octets bigint, premier timestamptz, dernier timestamptz)
language sql
stable
as $$
  select count(*)                                  as extraits,
         count(*) filter (where verifie is not null) as verifies,
         coalesce(sum(octets), 0)                  as octets,
         min(quand)                                as premier,
         max(quand)                                as dernier
  from khalam_corpus
  where application = p_application;
$$;
