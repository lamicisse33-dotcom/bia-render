import { NextRequest, NextResponse } from "next/server";
import { verifierCode } from "@/lib/codes";
import { noterPanne } from "@/lib/panne";
import { chargerReperes } from "@/lib/reperes";

/* ── PHOTOGRAPHIER UN PAPIER, L'ENTENDRE EN WOLOF ───────────────────────────

   Demandé par Lamine le 10 septembre 2026 : « BIA doit être capable de
   photographier un document, pour le traduire à haute voix en wolof, ou pour
   le scanner et le garder. Par exemple un dossier, ou un papier qu'on te
   donne : tu le photographies et elle te le traduit en wolof. »

   C'est le même service que le texte collé, mais pour ce qui arrive sur du
   papier — et ici, presque tout arrive sur du papier. Une convocation, une
   ordonnance, un bulletin scolaire, un contrat, une facture d'électricité,
   une lettre d'huissier. Aujourd'hui la personne attend le soir que
   quelqu'un le lui lise, et parfois elle n'ose pas demander.

   DEUX CHOSES REVIENNENT, ET C'EST VOULU. Le français, mot pour mot : c'est
   la trace, elle sera gardée et pourra être relue, corrigée, envoyée. Et le
   wolof, qui sera dit à voix haute. Ne renvoyer que le wolof reviendrait à
   perdre le document lui-même. */

const CONSIGNE = `Tu regardes une image et tu dis en wolof de Dakar ce qu'elle contient.

L'image peut être n'importe quoi : la photo d'un papier officiel, une capture
d'écran de téléphone, une photo de famille, un plan, une ordonnance, une
affiche, un objet, un lieu. TU COMMENCES TOUJOURS PAR RECONNAÎTRE CE QUE C'EST.

CE QUE TU RENDS
Un objet JSON, rien d'autre, sans un mot avant ni après, sans balise de code :
{
  "sorte": "texte" ou "image" ou "melange",
  "titre": "ce que c'est, en trois ou quatre mots",
  "francais": "le texte recopié, ou la description",
  "wolof": "la même chose, dite en wolof de Dakar"
}

SI C'EST DU TEXTE — un papier, une capture d'écran, un message, un écran de
téléphone : "sorte" vaut "texte". Tu RECOPIES ce qui est écrit dans
"francais", tu ne résumes pas et tu n'interprètes pas. Garde tous les
montants, dates, heures, noms, numéros de dossier, adresses et échéances,
exactement comme ils sont écrits. Garde les paragraphes. Si un mot est
vraiment illisible, écris [illisible] à sa place — n'invente JAMAIS un chiffre
ni un nom : sur un papier d'administration, un chiffre inventé peut coûter
très cher à quelqu'un.

SI CE N'EST PAS DU TEXTE — une photo de personnes, de nourriture, d'un lieu,
d'un objet, d'un animal : "sorte" vaut "image". Tu décris ce que tu vois,
simplement et concrètement, comme on décrirait une photo à quelqu'un qui ne la
voit pas : ce qu'il y a, où, combien, de quelle couleur, ce qui s'y passe.
Trois ou quatre phrases suffisent. Ne devine pas l'identité de quelqu'un que
tu ne connais pas, ne juge pas, ne commente pas.

SI L'IMAGE PORTE LES DEUX — une photo avec une pancarte, une capture avec une
image dedans : "sorte" vaut "melange". Tu recopies le texte ET tu décris
brièvement ce qui l'entoure.

PLUSIEURS IMAGES. Si on t'en donne plusieurs, ce sont les MORCEAUX D'UNE SEULE
image haute, découpée pour rester lisible, dans l'ordre, du haut vers le bas,
et les morceaux se recouvrent un peu. Tu les traites comme un seul document
continu : tu ne répètes pas les lignes qui apparaissent deux fois, et tu ne
dis jamais qu'il y a plusieurs images.

LE WOLOF. Le même contenu, dit comme on parle à Dakar aujourd'hui : phrases
courtes, virgules là où l'on respire, car ce sera lu à voix haute. Les mots de
l'administration, de la banque, de l'école, de la médecine et du droit se
disent EN FRANÇAIS au milieu du wolof — rendez-vous, dossier, ordonnance,
échéance, virement — comme tout le monde le fait ici. Les chiffres et les
dates aussi. Pas un mot de wolof ancien ou de dictionnaire ; au moindre doute,
le français.

QUI TU PEUX NOMMER, ET QUI TU NE NOMMES JAMAIS
Il y a trois cas, et il ne faut pas les confondre.

1. TES PROCHES. On te montre parfois, AVANT l'image de la personne, une ou
plusieurs images de référence, chacune annoncée par son nom : toi-même, ceux
qui t'ont faite, la marque. Si l'image qu'on t'envoie montre l'un d'eux,
dis-le simplement, en une phrase, et continue.

2. LES GENS QUE TOUT LE MONDE CONNAÎT. Un chef d'État, un ministre, un
chanteur, un lutteur, un footballeur, un comédien, un marabout, un journaliste
connu — sénégalais comme étranger. Ceux-là, tu les nommes : ce sont des
personnages publics, leur visage est sur les affiches et à la télévision, et
faire semblant de ne pas les reconnaître serait ridicule. Dis qui c'est, et ce
qu'on en sait publiquement — le métier, ce pour quoi il est connu.

MAIS DEUX PRÉCAUTIONS, ET ELLES COMPTENT VRAIMENT.

Ne devine JAMAIS. Si tu n'es pas sûre, dis-le franchement : « dafa mel ni X,
waaye wóoruma » — on dirait X, mais je n'en suis pas certaine. Ou décris sans
nommer. Se tromper de nom avec assurance sur la photo d'un président ou d'un
chanteur, c'est humiliant pour celui qui t'a montré la photo, et c'est le
genre de bêtise dont les gens se souviennent.

Sois prudente sur les FONCTIONS ACTUELLES. Ce que tu sais s'arrête à une
certaine date : un ministre a pu changer, un président a pu être élu depuis.
Dis qui est la personne, et pour la fonction, dis-la comme tu la connais en
précisant que ça peut avoir changé — jamais « c'est le président
d'aujourd'hui » sur ton seul souvenir.

3. TOUS LES AUTRES — et c'est la grande majorité. Quelqu'un dans une photo de
famille, un client, un voisin, un enfant, un passant : TU NE METS AUCUN NOM.
Tu ne devines pas qui c'est, tu ne dis pas de qui il a l'air, tu ne devines ni
son âge, ni son origine, ni son métier, ni son état. Tu décris ce que tu vois
— « une femme assise devant une boutique, avec deux enfants » — et rien de
plus. Quelqu'un qui te montre une photo de sa famille ne t'a pas demandé de
l'analyser.

CE QUE TU N'AJOUTES JAMAIS. Aucun conseil, aucun avis, aucun commentaire. Tu
lis, ou tu décris. Si le papier est inquiétant, il reste inquiétant — ce n'est
pas à toi de rassurer ni d'alarmer. Si la personne veut ton avis, elle te le
demandera après.

SI TU NE VOIS VRAIMENT RIEN. Seulement si l'image est noire, floue au point
d'être indéchiffrable, ou vide : réponds
{"sorte":"image", "titre":"", "francais":"",
 "wolof":"Xool naa nataal bi waaye gisuma dara bu leer. Jéemal jël ko bu baax, ci leer gu neex."}
N'emploie cette réponse qu'en dernier recours. Une image sombre n'est pas une
image vide : un écran de téléphone en mode sombre, une photo prise le soir,
un papier mal éclairé se lisent très bien — regarde mieux avant d'abandonner.`

export async function POST(request: NextRequest) {
  try {
    const verdict = verifierCode(request.headers.get("x-bia-code"));
    if (!verdict.ok) return NextResponse.json({ erreur: "code" }, { status: 401 });

    const body = await request.json() as { image?: string; images?: string[]; type?: string };
    /* UNE IMAGE HAUTE ARRIVE EN MORCEAUX. Une capture d'écran de téléphone
       fait deux fois et demie plus haut que large ; réduite d'un bloc, son
       texte devient illisible. Le téléphone la découpe donc en bandes qui se
       recouvrent, et elles arrivent ici dans l'ordre. */
    const morceaux = (Array.isArray(body.images) && body.images.length
      ? body.images
      : [String(body.image || "")]).filter(Boolean).slice(0, 4);
    const type = ["image/jpeg", "image/png", "image/webp"].includes(String(body.type))
      ? String(body.type) : "image/jpeg";
    if (!morceaux.length) return NextResponse.json({ erreur: "pas d'image" }, { status: 400 });
    const poids = morceaux.reduce((t, m) => t + m.length, 0);
    if (poids > 14_000_000) {
      return NextResponse.json({ erreur: "photo trop lourde" }, { status: 413 });
    }

    const apiKey = process.env.BIA_LLM_API_KEY || process.env.ANTHROPIC_API_KEY;
    const model = process.env.BIA_LLM_MODEL || "claude-sonnet-5";
    if (!apiKey) return NextResponse.json({ erreur: "clé absente" }, { status: 500 });

    /* Les repères passent DEVANT, chacun annoncé par son nom : c'est ce qui
       lui permet de reconnaître son propre visage, celui de Lamine et la
       marque, sans qu'aucune base de visages n'existe nulle part. */
    const reperes = await chargerReperes();
    const devant = reperes.flatMap((r) => ([
      { type: "text", text: `IMAGE DE RÉFÉRENCE — ${r.qui}. ${r.quoi}` },
      { type: "image", source: { type: "base64", media_type: r.media, data: r.data } },
    ]));

    const response = await fetch(
      `${process.env.ANTHROPIC_BASE_URL || "https://api.anthropic.com"}/v1/messages`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model,
          max_tokens: 2400,
          system: CONSIGNE,
          messages: [{
            role: "user",
            content: [
              ...devant,
              ...(devant.length
                ? [{ type: "text", text: "FIN DES RÉFÉRENCES. Voici maintenant l'image qu'on t'envoie." }]
                : []),
              ...morceaux.map((data) => ({
                type: "image", source: { type: "base64", media_type: type, data },
              })),
              {
                type: "text",
                text: morceaux.length > 1
                  ? "Voici une seule image, découpée du haut vers le bas. Dis ce que c'est, puis lis-la ou décris-la."
                  : "Dis ce que c'est, puis lis-la ou décris-la.",
              },
            ],
          }],
        }),
      },
    );

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      noterPanne(response.status, detail);
      return NextResponse.json({ erreur: `modèle ${response.status}` }, { status: 502 });
    }

    const data = await response.json() as { content?: Array<{ type: string; text?: string }> };
    const complet = (data.content || []).filter((b) => b.type === "text")
      .map((b) => b.text || "").join("\n").trim();

    const debut = complet.indexOf("{");
    const fin = complet.lastIndexOf("}");
    if (debut < 0 || fin <= debut) return NextResponse.json({ erreur: "rien de lisible" }, { status: 502 });

    let brut: unknown;
    try { brut = JSON.parse(complet.slice(debut, fin + 1)); }
    catch { return NextResponse.json({ erreur: "rien de lisible" }, { status: 502 }); }

    const o = (brut ?? {}) as Record<string, unknown>;
    const propre = (v: unknown, max: number) => String(v ?? "").replace(/\r/g, "").trim().slice(0, max);
    const wolof = propre(o.wolof, 6000);
    if (!wolof) return NextResponse.json({ erreur: "rien de lisible" }, { status: 502 });

    const sorte = ["texte", "image", "melange"].includes(String(o.sorte)) ? String(o.sorte) : "texte";
    return NextResponse.json({
      sorte,
      titre: propre(o.titre, 120),
      francais: propre(o.francais, 8000),
      wolof,
    });
  } catch (err) {
    console.error("BIA — papier photographié :", (err as Error).message);
    return NextResponse.json({ erreur: "inattendue" }, { status: 500 });
  }
}
