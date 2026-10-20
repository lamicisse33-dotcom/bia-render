import Link from "next/link";

export const metadata = { title: "BIA — Essai des nouvelles oreilles" };

const moteurs = [
  { id: "moonshine", nom: "Moonshine", detail: "Oreille légère adaptée au corpus wolof." },
  { id: "zipformer", nom: "Zipformer / Sherpa", detail: "Oreille avec reconnaissance en continu." },
];

export default function EssaiOreilles() {
  return (
    <main lang="fr" style={{ minHeight: "100dvh", overflowY: "auto", background: "#f5f3ec", color: "#183b32", padding: "48px 24px", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link href="/" style={{ color: "#226b51" }}>← Revenir à BIA</Link>
        <p style={{ marginTop: 36, letterSpacing: ".12em", fontSize: 13 }}>ESPACE D’ESSAI</p>
        <h1 style={{ fontSize: "clamp(30px, 6vw, 48px)", lineHeight: 1.1, margin: "14px 0 24px" }}>Essayer les nouvelles oreilles</h1>
        <p style={{ fontSize: 19, lineHeight: 1.6 }}>Choisissez un moteur et faites transcrire le même enregistrement pour comparer les résultats.</p>
        <p style={{ lineHeight: 1.7 }}>Ces essais s’ouvrent sur le Mac qui possède les modèles. Ouvrez d’abord <strong>Lancer-essai-oreilles.command</strong> dans le dossier de l’entraînement si le service local n’est pas déjà lancé.</p>
        <div style={{ display: "grid", gap: 18, margin: "30px 0" }}>
          {moteurs.map(m => (
            <a key={m.id} href={`http://127.0.0.1:8794/?modele=${m.id}`} target="_blank" rel="noreferrer" style={{ display: "block", padding: 26, border: "1px solid #becdc1", borderRadius: 18, color: "inherit", background: "#fff", textDecoration: "none" }}>
              <h2 style={{ margin: "0 0 10px", fontSize: 24 }}>{m.nom}</h2>
              <p style={{ margin: "0 0 18px", lineHeight: 1.5 }}>{m.detail}</p>
              <span style={{ color: "#226b51", fontWeight: 700 }}>Ouvrir l’essai sur ce Mac ↗</span>
            </a>
          ))}
        </div>
        <p style={{ lineHeight: 1.7 }}>L’espace local indique si l’export et le transfert sont terminés. Aucun moteur n’est activé automatiquement pour vos conversations. L’oreille, la voix et les réglages actuels de BIA restent en place.</p>
      </div>
    </main>
  );
}
