import { readFile } from "node:fs/promises";
import path from "node:path";

/* ── CEUX QU'ELLE DOIT RECONNAÎTRE ──────────────────────────────────────────

   Demandé par Lamine le 10 septembre 2026 : « il faut qu'elle puisse
   reconnaître les images — son image à elle, mon image à moi, et celle de
   KHALAM ».

   COMMENT ÇA MARCHE, ET POURQUOI AINSI. Aucun modèle ne sait de lui-même à
   quoi ressemble BIA ni à quoi ressemble Lamine. La seule façon honnête de le
   lui apprendre est de LUI MONTRER : quelques images de référence partent
   avec chaque image qu'on lui envoie, nommées une à une, et elle compare. Pas
   de reconnaissance faciale, pas de base de visages : une comparaison, comme
   celle qu'on ferait en tendant deux photos côte à côte.

   LA LIMITE, ET ELLE COMPTE. Elle ne reconnaît QUE ce qui est ici — c'est-à-
   dire elle-même, Lamine, et la marque. Elle ne met de nom sur le visage de
   personne d'autre, et cette règle est écrite dans sa consigne. Une assistante
   qui se met à identifier les gens sur les photos qu'on lui montre est une
   assistante dont on se méfie, et elle aurait raison.

   POUR EN AJOUTER UN : poser le fichier dans public/reperes/ et l'ajouter à
   la liste ci-dessous. Une référence absente est simplement ignorée — rien ne
   casse tant que le fichier n'est pas là. Garde-les PETITES, autour de 350
   pixels : elles partent à chaque image envoyée, et une référence lourde
   coûterait à chaque fois. */

export type Repere = {
  /** Le fichier, dans public/reperes/. */
  fichier: string;
  /** Comment elle doit l'appeler quand elle le reconnaît. */
  qui: string;
  /** Ce qu'elle doit savoir, et ce qu'elle doit en dire. */
  quoi: string;
};

export const REPERES: Repere[] = [
  {
    fichier: "bia.jpg",
    qui: "BIA — c'est-à-dire TOI",
    quoi: "C'est ton propre visage. Si on te montre cette personne, dis "
      + "simplement que c'est toi, avec le sourire — « man laa », c'est moi. "
      + "Ne fais pas semblant de ne pas te reconnaître, et n'en fais pas non "
      + "plus toute une histoire.",
  },
  {
    fichier: "lamine.jpg",
    qui: "Lamine, celui qui t'a créée",
    quoi: "C'est Lamine, de KHALAM : c'est lui qui t'a faite. Si on te le "
      + "montre, dis que c'est lui, sans en dire plus sur sa vie que ce qu'on "
      + "t'a raconté dans la conversation.",
  },
  {
    fichier: "kha.jpg",
    qui: "Kha",
    quoi: "C'est Kha, de KHALAM — la marque porte son nom autant que celui de "
      + "Lamine, et c'est sa voix à elle que tu entends quand tu ris. Si on te "
      + "la montre, dis que c'est Kha. On l'appelle Kha, jamais autrement : "
      + "n'emploie aucun autre nom, même si tu crois le connaître. Et n'en dis "
      + "pas plus sur sa vie que ce qu'on t'a raconté dans la conversation.",
  },
  {
    fichier: "khalam.png",
    qui: "le logo de KHALAM",
    quoi: "C'est la marque de la maison qui t'a faite : le xalam — l'instrument "
      + "à cordes — dessiné en bleu, avec le mot KHALAM en dessous. Si on te le "
      + "montre, seul ou sur une affiche, une carte ou un écran de jeu, dis que "
      + "c'est KHALAM. Le signe bleu à lui seul suffit à la reconnaître.",
  },
];

type Charge = { qui: string; quoi: string; media: string; data: string };

/* Les fichiers sont lus une fois et gardés en mémoire : ils ne changent qu'au
   déploiement, et les relire à chaque image ajouterait un accès disque à un
   moment où la personne attend déjà. */
let cache: Charge[] | null = null;

const typeDe = (fichier: string) =>
  fichier.endsWith(".png") ? "image/png"
    : fichier.endsWith(".webp") ? "image/webp"
      : "image/jpeg";

export async function chargerReperes(): Promise<Charge[]> {
  if (cache) return cache;
  const dossier = path.join(process.cwd(), "public", "reperes");
  const charges: Charge[] = [];
  for (const r of REPERES) {
    try {
      const octets = await readFile(path.join(dossier, r.fichier));
      // Une référence trop lourde coûterait à chaque envoi : on l'écarte
      // plutôt que de la faire payer en silence.
      if (octets.length > 400_000) {
        console.error(`BIA — repère ignoré, trop lourd : ${r.fichier}`);
        continue;
      }
      charges.push({
        qui: r.qui,
        quoi: r.quoi,
        media: typeDe(r.fichier),
        data: octets.toString("base64"),
      });
    } catch {
      // Le fichier n'est pas là : ce n'est pas une erreur, c'est un repère
      // qu'on n'a pas encore.
    }
  }
  cache = charges;
  return charges;
}
