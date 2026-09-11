import { lexiqueConfig } from "./lexique";

/* ── CE QU'ELLE PEUT MONTRER ────────────────────────────────────────────────

   Demandé par Lamine le 11 septembre 2026 : « je veux qu'elle puisse montrer
   des contenus, j'ai vidéo ou photo ».

   BIA parle. Mais il y a des choses qu'on ne dit pas : la couleur d'un savon,
   la taille d'un flacon, le geste d'une application sur la peau. Trois phrases
   bien tournées ne remplacent pas une photo, et quelqu'un qui hésite à
   appeler un numéro appelle quand il a vu.

   OÙ VIVENT LES IMAGES, ET POURQUOI PAS DANS LE DÉPÔT. Lamine a choisi
   Supabase, et il a eu raison : une photo déposée depuis son téléphone
   apparaît dans BIA sans que personne ne pousse une ligne de code. Si DD SKIN
   sort un produit un samedi soir, le produit est dans BIA le samedi soir. Le
   dépôt, lui, aurait demandé un commit, un push, et un déploiement — donc moi,
   donc jamais le samedi soir.

   IL N'Y A RIEN À ADMINISTRER. Pas de table, pas de SQL, pas de formulaire :
   la structure, c'est le rangement des fichiers.

       vitrine/
         dd-skin/
           1 savon noir.webp
           2 savon visage.webp
           3 lotion.webp
           presentation.mp4
           presentation.webp      ← l'image d'attente de la vidéo

   Un dossier = un sujet. Le nom du fichier devient le nom affiché : les
   chiffres du début servent à ranger et ne s'affichent pas. Une image qui
   porte le même nom qu'une vidéo ne s'affiche pas non plus : elle devient son
   image d'attente — ce qu'on voit avant d'appuyer sur lecture.

   LA VIDÉO NE SE CHARGE JAMAIS TOUTE SEULE. À Dakar, le forfait se compte, et
   une vidéo qui démarre sans qu'on l'ait demandé, c'est de l'argent pris dans
   la poche de quelqu'un. On montre l'image d'attente ; la vidéo part au
   doigt, pas avant.

   ET LA RÈGLE DE LAMINE TIENT TOUJOURS : « son cœur ne doit pas être ce
   business ». Ce fichier ne fait que tenir le catalogue. Ce qui décide du
   moment où une image apparaît est écrit dans la consigne, à côté de la
   barrière qui enferme déjà les cosmétiques : on ne montre que ce dont on
   parle déjà, et jamais de soi-même. */

const BUCKET = process.env.SUPABASE_BUCKET_VITRINE || "vitrine";

/* Cinq minutes. Assez pour qu'une photo déposée pendant une démonstration
   apparaisse avant la fin de la démonstration ; assez long pour que cent
   conversations d'affilée ne réveillent pas Supabase cent fois. */
const GARDE = 5 * 60_000;

export type Piece = {
  cle: string;
  sorte: "photo" | "video";
  nom: string;
  url: string;
  /** Vidéos seulement : ce qu'on voit avant d'appuyer. */
  attente?: string;
};

export type Sujet = { cle: string; nom: string; pieces: Piece[] };

const PHOTO = /\.(jpe?g|png|webp|gif|avif)$/i;
const VIDEO = /\.(mp4|webm|mov|m4v)$/i;

export const vitrineActive = () => Boolean(lexiqueConfig.url && lexiqueConfig.cle);

/** « 2 savon-noir.webp » → « Savon noir ». Le rangement ne se lit pas. */
function joli(nom: string): string {
  const sans = nom.replace(/\.[a-z0-9]+$/i, "");
  const propre = sans
    .replace(/^\d+[\s._-]+/, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!propre) return sans;
  return propre.charAt(0).toUpperCase() + propre.slice(1);
}

/** Ce que le modèle écrit dans sa balise : sans accent, sans espace. */
export function cleDe(nom: string): string {
  return nom
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const socle = (nom: string) => nom.replace(/\.[a-z0-9]+$/i, "").toLowerCase();

const adresse = (dossier: string, fichier: string) =>
  `${lexiqueConfig.url}/storage/v1/object/public/${BUCKET}`
  + `/${encodeURIComponent(dossier)}/${encodeURIComponent(fichier)}`;

type Entree = { name: string; id: string | null };

/* Supabase distingue un dossier d'un fichier par une seule chose : un dossier
   n'a pas d'identifiant. */
async function lister(prefixe: string): Promise<Entree[]> {
  const r = await fetch(`${lexiqueConfig.url}/storage/v1/object/list/${BUCKET}`, {
    method: "POST",
    headers: {
      apikey: lexiqueConfig.cle,
      Authorization: `Bearer ${lexiqueConfig.cle}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      prefix: prefixe,
      limit: 100,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    }),
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`vitrine ${r.status}`);
  const liste = (await r.json()) as Entree[];
  return Array.isArray(liste) ? liste : [];
}

let cache: { sujets: Sujet[]; jusqua: number } | null = null;

export async function vitrine(): Promise<Sujet[]> {
  if (cache && Date.now() < cache.jusqua) return cache.sujets;
  if (!vitrineActive()) return [];

  try {
    const dossiers = (await lister(""))
      .filter((x) => x.id === null && x.name && !x.name.startsWith("."))
      .slice(0, 30);

    const sujets: Sujet[] = [];
    for (const d of dossiers) {
      const fichiers = (await lister(d.name)).filter((f) => f.id && !f.name.startsWith("."));

      /* Une image qui porte le nom d'une vidéo est son affiche, pas une
         image de plus : sans ça, on verrait deux fois la même chose. */
      const videos = new Set(fichiers.filter((f) => VIDEO.test(f.name)).map((f) => socle(f.name)));
      const affiches = new Map<string, string>();
      for (const f of fichiers) {
        if (PHOTO.test(f.name) && videos.has(socle(f.name))) {
          affiches.set(socle(f.name), adresse(d.name, f.name));
        }
      }

      const pieces: Piece[] = [];
      for (const f of fichiers) {
        const estVideo = VIDEO.test(f.name);
        const estPhoto = PHOTO.test(f.name);
        if (!estVideo && !estPhoto) continue;
        if (estPhoto && videos.has(socle(f.name))) continue;
        const nom = joli(f.name);
        pieces.push({
          cle: cleDe(socle(f.name)),
          sorte: estVideo ? "video" : "photo",
          nom,
          url: adresse(d.name, f.name),
          ...(estVideo && affiches.has(socle(f.name)) ? { attente: affiches.get(socle(f.name)) } : {}),
        });
      }

      if (pieces.length) sujets.push({ cle: cleDe(d.name), nom: joli(d.name), pieces });
    }

    cache = { sujets, jusqua: Date.now() + GARDE };
    return sujets;
  } catch {
    /* UNE VITRINE MUETTE N'EST PAS UNE PANNE. Supabase peut être en panne,
       le seau peut ne pas exister encore : BIA répond alors exactement comme
       avant, sans image et sans s'excuser de rien. On garde ce qu'on avait,
       et on réessaie dans une minute plutôt qu'à chaque question. */
    cache = { sujets: cache?.sujets || [], jusqua: Date.now() + 60_000 };
    return cache.sujets;
  }
}

/** Ce qu'on écrit dans sa consigne : court, sinon ça pèse à chaque question. */
export async function catalogue(): Promise<string> {
  const sujets = await vitrine();
  if (!sujets.length) return "";
  return sujets.map((s) => {
    const photos = s.pieces.filter((p) => p.sorte === "photo").length;
    const videos = s.pieces.filter((p) => p.sorte === "video").length;
    const compte = [
      photos ? `${photos} photo${photos > 1 ? "s" : ""}` : "",
      videos ? `${videos} vidéo${videos > 1 ? "s" : ""}` : "",
    ].filter(Boolean).join(", ");
    return `- ${s.cle} — ${s.nom} (${compte})`;
  }).join("\n");
}

/** Retrouve un sujet, ou une seule pièce quand la balise dit « sujet/pièce ». */
export async function montrer(brut: string): Promise<Sujet | null> {
  const propre = String(brut || "").toLowerCase().replace(/[^a-z0-9/_-]/g, "").slice(0, 80);
  if (!propre) return null;
  const [dossier, piece] = propre.split("/");
  const sujets = await vitrine();
  const sujet = sujets.find((s) => s.cle === dossier);
  if (!sujet) return null;
  if (!piece) return sujet;
  const une = sujet.pieces.find((p) => p.cle === piece);
  return une ? { ...sujet, pieces: [une] } : sujet;
}
