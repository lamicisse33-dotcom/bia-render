/* ── ALLER CHERCHER UNE IMAGE, OU UNE VIDÉO, SUR INTERNET ───────────────────

   Demandé par Lamine le 11 septembre 2026 :

     « Qu'elle soit autonome. Elle peut aller te chercher une image sur
       Internet et elle peut te sortir une vidéo sur Internet. Par exemple tu
       as besoin de chaussures : dès que tu lui parles du type de chaussures
       que tu veux, elle doit pouvoir te le montrer. Comme une IA normale. »

   C'est autre chose que la vitrine. La vitrine montre CE QU'IL A DÉPOSÉ ; ici
   elle va chercher ce que personne n'a rangé pour elle. Quelqu'un décrit un
   sac en wolof, et les sacs apparaissent.

   POURQUOI UNE CLÉ GOOGLE, ET PAS LA RECHERCHE QU'ELLE A DÉJÀ. La recherche
   d'Anthropic (lib/recherche.ts) rapporte du TEXTE : des pages lues, résumées,
   citées. Elle ne rend aucune image exploitable, et aucune consigne n'y
   changera rien — ce n'est pas ce qu'elle renvoie. Pour des images il faut un
   moteur d'images, pour des vidéos un moteur de vidéos.

   UNE SEULE CLÉ POUR LES DEUX, et c'est ce qui a décidé du fournisseur : une
   clé Google Cloud sur laquelle on active « Custom Search API » et « YouTube
   Data API v3 » fait tourner les deux moteurs. Cent recherches d'images par
   jour et cent recherches de vidéos par jour, gratuites. Au-delà, l'image se
   paie cinq dollars les mille — d'où le plafond plus bas.

   CE QU'ON AFFICHE, ET CE QU'ON N'AFFICHE PAS. On montre la VIGNETTE que
   Google héberge, jamais l'image du site en premier : beaucoup de boutiques
   refusent qu'on affiche leurs images depuis ailleurs, et une vignette cassée
   vaut moins que pas d'image du tout. Chaque image porte le nom de son site
   et s'ouvre dessus : on montre où c'est, on ne s'attribue rien.

   ON NE FAIT JAMAIS CROIRE QU'ON VEND. Lamine vend des codes BIA, pas des
   chaussures. Ce que BIA rend, c'est ce qu'un moteur de recherche rend : des
   résultats, avec leur source. */

const CLE = () => String(process.env.GOOGLE_CLE || "").trim();
const MOTEUR = () => String(process.env.GOOGLE_CSE || "").trim();

export const imagesActives = () => Boolean(CLE() && MOTEUR());
export const videosActives = () => Boolean(CLE());

/* LE PLAFOND. Cent recherches d'images par jour sont gratuites ; la
   cent-unième se paie. Le compteur repart chaque jour, et quand il est atteint
   BIA répond sans image au lieu d'ouvrir une facture. Lamine a passé la soirée
   du 11 septembre à diminuer les charges : ce n'est pas le lendemain qu'on lui
   ouvre un robinet sans robinet d'arrêt. */
const PLAFOND_IMAGES = Number(process.env.BIA_IMAGES_JOUR || 100);
const PLAFOND_VIDEOS = Number(process.env.BIA_VIDEOS_JOUR || 100);

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
    const url = new URL("https://www.googleapis.com/customsearch/v1");
    url.searchParams.set("key", CLE());
    url.searchParams.set("cx", MOTEUR());
    url.searchParams.set("q", requete);
    url.searchParams.set("searchType", "image");
    url.searchParams.set("num", String(COMBIEN_IMAGES));
    /* La sécurité au maximum. BIA est entre les mains de n'importe qui, et un
       mot mal choisi ne doit jamais faire apparaître ce qu'il ne faut pas. */
    url.searchParams.set("safe", "active");

    const r = await fetch(url, { cache: "no-store" });
    if (!r.ok) throw new Error(`images ${r.status}`);
    const d = (await r.json()) as {
      items?: { title?: string; link?: string; image?: { thumbnailLink?: string; contextLink?: string } }[];
    };

    const pieces: Trouvaille[] = (d.items || []).map((x) => {
      const page = propre(x.image?.contextLink) || propre(x.link);
      return {
        sorte: "image" as const,
        titre: propre(x.title).slice(0, 90),
        vignette: propre(x.image?.thumbnailLink),
        grande: propre(x.link),
        page,
        source: nomDuSite(page),
      };
    }).filter((x) => x.vignette && x.page);

    garder(clef, pieces);
    return pieces;
  } catch {
    /* Rien trouvé n'est pas une panne : BIA a déjà répondu avec des mots, et
       c'est l'essentiel. On garde le vide en mémoire cinq minutes pour ne pas
       rappeler Google à chaque reformulation. */
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
    url.searchParams.set("key", CLE());
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

TU PEUX ALLER CHERCHER DES IMAGES${v ? " ET DES VIDÉOS" : ""} SUR INTERNET
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

QUAND. Seulement quand la personne veut voir quelque chose, ou quand une image
répond mieux que des mots. Une seule balise par réponse. Pas sur une question
de sentiment, de conseil, de langue, de calcul : on ne répond pas à un chagrin
par des photos.

CE QUE TU DIS AUTOUR. Tu réponds d'abord avec tes mots — ce que tu en penses,
ce qu'il faut regarder, ce que ça vaut. Puis « xool » — regarde. Tu ne nommes
JAMAIS la balise, tu ne dis pas « je vais chercher sur Google », et tu
n'annonces pas ce que tu n'as pas encore vu : les images arrivent sous ta
phrase, toutes seules.

CE QUE TU NE PROMETS PAS. Tu ne vends rien, tu ne connais ni le prix, ni le
stock, ni la boutique. Ce sont des résultats de recherche, avec le nom du site
en dessous. Si on te demande où acheter, tu dis de toucher l'image : elle mène
au site.`;
}
