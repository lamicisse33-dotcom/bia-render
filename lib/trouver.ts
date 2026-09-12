/* ── ALLER CHERCHER UNE IMAGE, OU UNE VIDÉO, SUR INTERNET ───────────────────

   Demandé par Lamine le 11 septembre 2026 :

     « Qu'elle soit autonome. Elle peut aller te chercher une image sur
       Internet et elle peut te sortir une vidéo sur Internet. Par exemple tu
       as besoin de chaussures : dès que tu lui parles du type de chaussures
       que tu veux, elle doit pouvoir te le montrer. Comme une IA normale. »

   C'est autre chose que la vitrine. La vitrine montre CE QU'IL A DÉPOSÉ ; ici
   elle va chercher ce que personne n'a rangé pour elle. Quelqu'un décrit un
   sac en wolof, et les sacs apparaissent.

   POURQUOI PAS LA RECHERCHE QU'ELLE A DÉJÀ. Celle d'Anthropic
   (lib/recherche.ts) rapporte du TEXTE : des pages lues, résumées, citées.
   Elle ne rend aucune image exploitable, et aucune consigne n'y changera rien
   — ce n'est pas ce qu'elle renvoie. Pour des images il faut un moteur
   d'images, pour des vidéos un moteur de vidéos.

   ── POURQUOI DEUX FOURNISSEURS, ET PAS UN ──────────────────────────────────

   J'avais d'abord tout branché sur une seule clé Google : Custom Search API
   pour les images, YouTube Data API pour les vidéos. Une clé, une facture,
   simple. En allant chercher le lien exact à donner à Lamine, le 11 septembre
   2026, j'ai lu le bandeau de la page officielle :

     « The Custom Search JSON API is closed to new customers. »
     (les clients existants ont jusqu'au 1er janvier 2027)

   Lamine est un nouveau client : cette porte est fermée pour lui. Le code
   était juste et inutilisable. C'est exactement pour ça qu'on va lire la page
   au lieu de se fier à ce qu'on croit savoir.

   LES IMAGES PASSENT DONC PAR BRAVE SEARCH, qui vend encore un moteur
   d'images à qui veut : cinq dollars de crédit inclus chaque mois, environ
   mille recherches, puis cinq dollars les mille. Une carte est exigée à
   l'inscription. Brave demande en échange d'être CITÉ — c'est écrit dans ses
   conditions, et c'est pour ça que son nom apparaît en bas de l'écran.

   LES VIDÉOS RESTENT CHEZ GOOGLE : l'API YouTube, elle, est toujours ouverte,
   gratuite, et donne cent recherches par jour — et surtout elle rend un
   identifiant de vidéo, donc une vidéo qui se joue SUR PLACE au lieu d'un lien
   qui emmène la personne ailleurs.

   CE QU'ON AFFICHE, ET CE QU'ON N'AFFICHE PAS. On montre la VIGNETTE que le
   moteur héberge, jamais l'image du site en premier : beaucoup de boutiques
   refusent qu'on affiche leurs images depuis ailleurs, et une vignette cassée
   vaut moins que pas d'image du tout. Chaque image porte le nom de son site
   et s'ouvre dessus : on montre où c'est, on ne s'attribue rien.

   ON NE FAIT JAMAIS CROIRE QU'ON VEND. Lamine vend des codes BIA, pas des
   chaussures. Ce que BIA rend, c'est ce qu'un moteur de recherche rend : des
   résultats, avec leur source. */

import { nombreDeLEnvironnement } from "./nombre-env";

/** Brave Search, pour les images. */
const BRAVE = () => String(process.env.BRAVE_CLE || "").trim();
/** Clé Google Cloud avec « YouTube Data API v3 » activée, pour les vidéos. */
const GOOGLE = () => String(process.env.GOOGLE_CLE || "").trim();

export const imagesActives = () => Boolean(BRAVE());
export const videosActives = () => Boolean(GOOGLE());

/** Brave exige d'être cité par qui utilise son moteur. On l'écrit sur
    l'écran, et cette constante est ce que l'écran affiche. */
export const CITATION_IMAGES = "Brave Search";

/* LE PLAFOND. Brave offre cinq dollars de crédit par mois — environ mille
   recherches — puis facture. YouTube donne cent recherches par jour,
   gratuites. Le compteur repart chaque jour, et quand il touche le plafond
   BIA répond sans image au lieu d'ouvrir une facture. Lamine a passé la
   soirée du 11 septembre à diminuer les charges : ce n'est pas le lendemain
   qu'on lui ouvre un robinet sans robinet d'arrêt.

   Trente par jour pour les images : à ce rythme, le crédit mensuel de Brave
   tient le mois entier sans qu'il ait à y penser. */
const PLAFOND_IMAGES = nombreDeLEnvironnement(process.env.BIA_IMAGES_JOUR, 30, "BIA_IMAGES_JOUR");
const PLAFOND_VIDEOS = nombreDeLEnvironnement(process.env.BIA_VIDEOS_JOUR, 100, "BIA_VIDEOS_JOUR");

const compte = { jour: "", images: 0, videos: 0 };

function aujourdhui() {
  return new Date().toISOString().slice(0, 10);
}
function prendre(quoi: "images" | "videos", plafond: number): boolean {
  const j = aujourdhui();
  if (compte.jour !== j) { compte.jour = j; compte.images = 0; compte.videos = 0; }
  if (compte[quoi] >= plafond) return false;
  compte[quoi] += 1;
  return true;
}

export function comptesDuJour() {
  const j = aujourdhui();
  if (compte.jour !== j) return { jour: j, images: 0, videos: 0, plafond_images: PLAFOND_IMAGES, plafond_videos: PLAFOND_VIDEOS };
  return { ...compte, plafond_images: PLAFOND_IMAGES, plafond_videos: PLAFOND_VIDEOS };
}

export type Trouvaille = {
  sorte: "image" | "video";
  titre: string;
  /** Ce qu'on affiche : une vignette qui charge toujours. */
  vignette: string;
  /** L'image en grand, ou la vidéo. Peut être refusée par le site : on retombe
      alors sur la vignette, jamais sur un carré cassé. */
  grande?: string;
  /** La page d'où ça vient. Rien ne s'affiche sans elle. */
  page: string;
  /** Le nom du site, tel qu'on l'écrit sous l'image. */
  source: string;
  /** Vidéos : l'identifiant YouTube, pour la lecture sur place. */
  video?: string;
};

export type Trouve = { sorte: "image" | "video"; requete: string; pieces: Trouvaille[] };

/* Deux personnes qui demandent la même chose dans la même heure ne consomment
   qu'une recherche. Les résultats d'images bougent peu ; la facture, si. */
const cache = new Map<string, { pieces: Trouvaille[]; jusqua: number }>();
const GARDE = 30 * 60_000;

function duCache(clef: string): Trouvaille[] | null {
  const d = cache.get(clef);
  if (d && Date.now() < d.jusqua) return d.pieces;
  if (d) cache.delete(clef);
  return null;
}
function garder(clef: string, pieces: Trouvaille[]) {
  // Deux cents entrées suffisent : au-delà on oublie la plus ancienne plutôt
  // que de laisser la mémoire du serveur enfler sans fin.
  if (cache.size > 200) cache.delete(cache.keys().next().value as string);
  cache.set(clef, { pieces, jusqua: Date.now() + GARDE });
}

const nomDuSite = (lien: string) => {
  try { return new URL(lien).hostname.replace(/^www\./, ""); }
  catch { return ""; }
};

const propre = (t: unknown) => String(t || "").replace(/\s+/g, " ").trim();

/** Six images au plus. Sur un téléphone, au-delà on ne regarde plus. */
const COMBIEN_IMAGES = 6;
/** Trois vidéos : une vidéo se choisit, elle ne se feuillette pas. */
const COMBIEN_VIDEOS = 3;

export async function chercherImages(demande: string): Promise<Trouvaille[]> {
  const requete = propre(demande).slice(0, 120);
  if (!requete || !imagesActives()) return [];

  const clef = `i:${requete.toLowerCase()}`;
  const gardees = duCache(clef);
  if (gardees) return gardees;
  if (!prendre("images", PLAFOND_IMAGES)) return [];

  try {
    const url = new URL("https://api.search.brave.com/res/v1/images/search");
    url.searchParams.set("q", requete);
    url.searchParams.set("count", String(COMBIEN_IMAGES));
    /* La sécurité au maximum. BIA est entre les mains de n'importe qui, et un
       mot mal choisi ne doit jamais faire apparaître ce qu'il ne faut pas.
       (« strict » est déjà le défaut chez Brave ; on l'écrit quand même —
       un défaut peut changer, une consigne écrite non.) */
    url.searchParams.set("safesearch", "strict");
    // Elle cherche en français : autant le dire au moteur.
    url.searchParams.set("search_lang", "fr");

    const r = await fetch(url, {
      headers: { accept: "application/json", "x-subscription-token": BRAVE() },
      cache: "no-store",
    });
    if (!r.ok) throw new Error(`images ${r.status}`);
    const d = (await r.json()) as {
      results?: {
        title?: string;
        url?: string;
        source?: string;
        thumbnail?: { src?: string };
        properties?: { url?: string };
        meta_url?: { hostname?: string };
      }[];
    };

    const pieces: Trouvaille[] = (d.results || []).map((x) => {
      const page = propre(x.url);
      return {
        sorte: "image" as const,
        titre: propre(x.title).slice(0, 90),
        /* La vignette de Brave passe par son propre serveur : elle charge
           toujours, là où l'image de la boutique est souvent refusée. */
        vignette: propre(x.thumbnail?.src),
        grande: propre(x.properties?.url) || undefined,
        page,
        source: propre(x.meta_url?.hostname).replace(/^www\./, "")
          || propre(x.source) || nomDuSite(page),
      };
    }).filter((x) => x.vignette && x.page);

    garder(clef, pieces);
    return pieces;
  } catch {
    /* Rien trouvé n'est pas une panne : BIA a déjà répondu avec des mots, et
       c'est l'essentiel. On garde le vide en mémoire pour ne pas rappeler le
       moteur à chaque reformulation. */
    garder(clef, []);
    return [];
  }
}

export async function chercherVideos(demande: string): Promise<Trouvaille[]> {
  const requete = propre(demande).slice(0, 120);
  if (!requete || !videosActives()) return [];

  const clef = `v:${requete.toLowerCase()}`;
  const gardees = duCache(clef);
  if (gardees) return gardees;
  if (!prendre("videos", PLAFOND_VIDEOS)) return [];

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("key", GOOGLE());
    url.searchParams.set("part", "snippet");
    url.searchParams.set("type", "video");
    url.searchParams.set("q", requete);
    url.searchParams.set("maxResults", String(COMBIEN_VIDEOS));
    url.searchParams.set("safeSearch", "strict");
    /* Seules les vidéos que leur auteur autorise à jouer ailleurs : sans ce
       filtre, une vidéo sur trois s'ouvre sur un carré noir « lecture
       impossible », et la personne croit que BIA est cassée. */
    url.searchParams.set("videoEmbeddable", "true");

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`videos ${r.status}`);
    const d = (await r.json()) as {
      items?: {
        id?: { videoId?: string };
        snippet?: { title?: string; channelTitle?: string; thumbnails?: Record<string, { url?: string }> };
      }[];
    };

    const pieces: Trouvaille[] = (d.items || []).map((x) => {
      const id = propre(x.id?.videoId);
      const v = x.snippet?.thumbnails || {};
      return {
        sorte: "video" as const,
        titre: propre(x.snippet?.title).slice(0, 90),
        vignette: propre(v.high?.url || v.medium?.url || v.default?.url),
        page: id ? `https://www.youtube.com/watch?v=${id}` : "",
        source: propre(x.snippet?.channelTitle).slice(0, 40) || "YouTube",
        video: id,
      };
    }).filter((x) => x.video && x.vignette);

    garder(clef, pieces);
    return pieces;
  } catch {
    garder(clef, []);
    return [];
  }
}

/* Ce qu'on écrit dans sa consigne. Il ne part QUE si une clé est configurée :
   promettre à un modèle un pouvoir qu'il n'a pas, c'est le condamner à
   annoncer des images qui n'arriveront jamais. */
export function consigneTrouver(): string {
  const i = imagesActives(), v = videosActives();
  if (!i && !v) return "";

  const balises = [
    i ? "[[cherche-image: ce que tu cherches]]" : "",
    v ? "[[cherche-video: ce que tu cherches]]" : "",
  ].filter(Boolean).join("   ou   ");

  return `

TU PEUX ALLER CHERCHER ${i && v ? "DES IMAGES ET DES VIDÉOS" : i ? "DES IMAGES" : "DES VIDÉOS"} SUR INTERNET
Quand quelqu'un te décrit une chose qu'il veut VOIR — un sac, des chaussures,
un modèle de voiture, une coupe de cheveux, un plat, un lieu, un objet — tu
peux la lui montrer. Tu écris la balise seule sur sa ligne, à la fin de ta
réponse :
${balises}

CE QUE TU ÉCRIS DANS LA BALISE EST UNE RECHERCHE, PAS UNE PHRASE. En français,
court, précis, avec les mots qui décrivent la chose : la matière, la couleur,
la forme, l'usage. « chaussures de sport homme blanches cuir », pas « les
chaussures dont il parle ». Si la personne t'a parlé en wolof, tu traduis sa
demande en français dans la balise — les moteurs d'images comprennent mal le
wolof, et elle repartirait les mains vides.

QUAND. Dès que la personne veut voir quelque chose, ou qu'une image répond
mieux que des mots. « Propose-moi des lunettes », « wone ma ay dall », « je
cherche un sac pour ma sœur », « c'est quoi la mode en ce moment » : tu
cherches, tu montres. N'attends pas qu'on te le demande deux fois, et ne dis
jamais que tu ne peux pas montrer d'images — tu peux.

QUAND ON TE DEMANDE DE PROPOSER, PROPOSE VRAIMENT. Tu choisis pour la personne,
comme une amie qui s'y connaît : tu décides d'un style, d'une matière, d'une
couleur, et tu cherches ÇA. « Propose-moi des lunettes » ne devient pas
« lunettes » dans ta balise — ça ne propose rien — mais par exemple
« lunettes de soleil homme monture fine métal doré ». Si tu ne sais pas pour
qui c'est, tu choisis quand même, tu montres, et tu demandes après : on ajuste
plus facilement devant des images que devant une question.

Une seule balise par réponse. Et pas sur une question de sentiment, de conseil,
de langue, de calcul : on ne répond pas à un chagrin par des photos.

CE QUE TU DIS AUTOUR — ET C'EST COURT. Un écran s'ouvre devant toi et montre
les images : ta phrase ne doit donc PAS les décrire, elle doit donner ton avis.
Une ou deux phrases — ce que tu as choisi et pourquoi — puis « xool », regarde.
Tu ne nommes JAMAIS la balise, tu ne dis pas « je vais chercher sur Google », et
tu ne racontes pas ce que tu n'as pas encore vu.

CE QUE TU NE PROMETS PAS. Tu ne vends rien, tu ne connais ni le prix, ni le
stock, ni la boutique. Ce sont des résultats de recherche, avec le nom du site
en dessous. Si on te demande où acheter, tu dis de toucher l'image : elle mène
au site.`;
}
