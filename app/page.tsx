"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ATTENTES, SEUIL_MS, choisirAttente, texteAttente } from "@/lib/attente";
import { fichierDe, souffleDe } from "@/lib/sons";

type Message = { role: "bia" | "user"; text: string };
/* Les 24 cases de la planche, dans l'ordre du fichier.
   01-07 les bouches, 08-11 le repos, 12-20 les émotions, 21-24 les rires. */
const CASES = {
  bouche_fermee: 1, bouche_entr: 2, bouche_a: 3, bouche_A: 4,
  bouche_o: 5, bouche_ou: 6, bouche_i: 7,
  yeux_ouverts: 8, yeux_mi: 9, yeux_fermes: 10, regard_cote: 11,
  douce: 12, joie: 13, etonnement: 14, surprise: 15,
  ecoute: 16, concernee: 17, triste: 18, malice: 19, pensive: 20,
  rire: 21, rire_tete: 22, fourire: 23, rire_retenu: 24,
} as const;
type Face = keyof typeof CASES;

/* Ce que BIA renvoie → ce qu'on affiche. Les rires ne sont pas une image
   fixe : ils s'animent, d'où les suites plus bas. */
const EMOTION_VERS_FACE: Record<string, Face> = {
  neutre: "yeux_ouverts", douce: "douce", joie: "joie", rire: "rire",
  fourire: "fourire", etonnement: "etonnement", surprise: "surprise",
  ecoute: "ecoute", concernee: "concernee", triste: "triste",
  malice: "malice", pensive: "pensive",
};

/* Un rire ne tient pas sur une seule image. On enchaîne quelques cases pour
   que le visage bouge — c'est ce qui donne l'impression du vrai. */
const SUITES: Partial<Record<string, Array<[Face, number]>>> = {
  rire:    [["joie",320],["rire",620],["rire_tete",720],["rire",560],["joie",480]],
  fourire: [["rire",380],["rire_tete",700],["fourire",1100],["rire_tete",560],["joie",520]],
  surprise:[["etonnement",340],["surprise",1300],["etonnement",600]],
  malice:  [["douce",380],["malice",1600]],
  pensive: [["pensive",1500],["regard_cote",700]],
};
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: any) => void) | null;
};

const welcome = "Salaam! Man maa di BIA. Waxal ak man ci wolof walla ci français.";

const pause = (ms: number) => new Promise((fini) => setTimeout(fini, ms));

/* Chaque morceau de voix arrive avec du silence au début et à la fin. Mis
   bout à bout, ces silences s'additionnent et créent, entre deux phrases, un
   blanc assez long pour qu'on croie BIA arrivée au bout de sa réponse — et
   qu'on lui coupe la parole. On les rogne, en gardant 25 ms de marge : couper
   au ras rendrait l'attaque sèche. */
function sansSilence(ctx: AudioContext, brut: AudioBuffer): AudioBuffer {
  const donnees = brut.getChannelData(0);
  const SEUIL = 0.006;
  let fin = donnees.length;
  while (fin > 1 && Math.abs(donnees[fin - 1]) < SEUIL) fin -= 1;
  let debut = 0;
  while (debut < fin && Math.abs(donnees[debut]) < SEUIL) debut += 1;

  const marge = Math.round(brut.sampleRate * 0.025);
  debut = Math.max(0, debut - marge);
  fin = Math.min(donnees.length, fin + marge);
  const garde = fin - debut;
  if (garde < 1 || garde > donnees.length - marge) return brut;   // rien à gagner

  const coupe = ctx.createBuffer(brut.numberOfChannels, garde, brut.sampleRate);
  for (let c = 0; c < brut.numberOfChannels; c++) {
    coupe.copyToChannel(brut.getChannelData(c).slice(debut, fin), c);
  }
  return coupe;
}

function octetsDeBase64(b64: string) {
  const brut = atob(b64);
  const tableau = new Uint8Array(brut.length);
  for (let i = 0; i < brut.length; i++) tableau[i] = brut.charCodeAt(i);
  return tableau.buffer;
}

/* ── Quelle langue ? ───────────────────────────────────────────────────────
   Le navigateur n'a pas de voix wolof. Sans ce test, la retouche phonétique
   ci-dessous s'appliquait AUSSI au français : « communication » devenait
   « tchommounitchation ». On ne la déclenche donc que sur du wolof.        */
const motsFrancais = /\b(le|la|les|un|une|des|du|de|et|est|sont|pour|dans|avec|vous|nous|je|tu|il|elle|que|qui|ne|pas|sur|ce|cette|mais|plus|tout|faire|peut|comme|son|sa|ses|au|aux|par|en|si|bien|très|donc|alors|quand)\b/g;
const motsWolof = /\b(naa|nga|ngeen|ci|ak|bi|bu|la|lu|mooy|moo|dafa|dafay|ngir|waaw|déedéet|sama|yow|man|ñu|ñi|yi|te|walla|léegi|mën|bëgg|am|amul|lan|ban|def|dem|wax|jàng|jëf|nekk|jamm|noo|kañ|fu|nu)\b/g;

function estWolof(texte: string) {
  const t = texte.toLowerCase();
  if (/[ñŋë]/.test(t)) return true;
  const fr = (t.match(motsFrancais) || []).length;
  const wo = (t.match(motsWolof) || []).length;
  return wo >= fr;
}

function phoneticWolof(text: string) {
  return text
    .replace(/khalam\.app/gi, "Khalam point app")
    .replace(/ñ/gi, "gn").replace(/ŋ/gi, "ng").replace(/x/gi, "kh")
    .replace(/c/gi, "tch").replace(/j/gi, "dj").replace(/ë/gi, "eu")
    .replace(/u/gi, "ou");
}



export default function Home() {
  const [history, setHistory] = useState<Message[]>([]);
  const [face, setFace] = useState<Face>("yeux_ouverts");
  const [mode, setMode] = useState<"ready" | "listening" | "thinking" | "speaking" | "error">("ready");
  const [clavier, setClavier] = useState(false);
  const [saisie, setSaisie] = useState("");
  const [legende, setLegende] = useState("");
  /* Quand la reponse ne vient pas du modele, on le dit a l ecran. Sans ce
     temoin, une panne du moteur ressemblait a une reponse ordinaire. */
  const [panne, setPanne] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [codeSaisi, setCodeSaisi] = useState("");
  const [codeErreur, setCodeErreur] = useState("");
  const [moteurs, setMoteurs] = useState<{ voix: string; ecoute: string } | null>(null);
  const [resume, setResume] = useState("");
  const [corrige, setCorrige] = useState<number | null>(null);
  const [correction, setCorrection] = useState("");
  const [avis, setAvis] = useState("");

  const recognitionRef = useRef<Recognition | null>(null);
  const mouthTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  const historyRef = useRef<Message[]>([]);
  const filRef = useRef<HTMLDivElement | null>(null);
  const champRef = useRef<HTMLInputElement | null>(null);
  const codeRef = useRef<string>("");
  const contexteRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const animationRef = useRef<number | null>(null);
  const enregistreurRef = useRef<MediaRecorder | null>(null);
  const moteursRef = useRef<{ voix: string; ecoute: string } | null>(null);
  const tourRef = useRef<object | null>(null);
  const resumeRef = useRef("");
  const resumeEnCours = useRef(false);
  const emotionRef = useRef("neutre");
  /* L attente parlee. Le jeton dit si la phrase en cours a encore lieu
     d etre : des que la reponse arrive, il change, et tout ce qui etait
     en route se tait. */
  const attenteRef = useRef<object | null>(null);
  const attenteCache = useRef<Map<string, ArrayBuffer>>(new Map());
  const dernierAttente = useRef<string | null>(null);
  const nomDemande = useRef(false);
  const toursRef = useRef(0);
  const cacheSons = useRef<Map<string, ArrayBuffer>>(new Map());
  const dernierSon = useRef<string | null>(null);

  historyRef.current = history;
  resumeRef.current = resume;
  codeRef.current = code || "";

  // Le code est gardé sur l'appareil : le testeur ne le retape pas à chaque fois.
  useEffect(() => {
    try {
      const g = localStorage.getItem("bia-code"); if (g) setCode(g);
      // BIA retrouve la conversation là où on l'a laissée, même après avoir
      // fermé l'onglet. Tout reste sur l'appareil : rien n'est envoyé ailleurs.
      const fil = localStorage.getItem("bia-fil");
      if (fil) setHistory(JSON.parse(fil) as Message[]);
      const notes = localStorage.getItem("bia-resume");
      if (notes) { setResume(notes); resumeRef.current = notes; }
    } catch {}
    fetch("/api/etat")
      .then((r) => r.json())
      .then((e) => { setMoteurs(e); moteursRef.current = e; })
      .catch(() => {});
  }, []);

  /* Quand elle a fini de parler, son visage garde l'émotion de ce qu'elle
     vient de dire, puis revient au repos. Certaines émotions s'animent au
     lieu de rester figées — un rire, ça bouge. */
  const stopMouth = useCallback((_answer = "") => {
    if (mouthTimer.current) clearInterval(mouthTimer.current);
    mouthTimer.current = null;
    setMode("ready");
    if (resetTimer.current) clearTimeout(resetTimer.current);

    const emo = emotionRef.current || "neutre";
    const suite = SUITES[emo];
    if (suite) {
      let t = 0;
      for (const [f, d] of suite) { setTimeout(() => setFace(f), t); t += d; }
      resetTimer.current = setTimeout(() => setFace("yeux_ouverts"), t + 1800);
    } else {
      setFace(EMOTION_VERS_FACE[emo] || "yeux_ouverts");
      resetTimer.current = setTimeout(() => setFace("yeux_ouverts"), 4200);
    }
  }, []);

  /* Bouche à l'aveugle : une forme toutes les 110 ms, sans rapport avec le
     son. Gardée uniquement pour la voix du navigateur, qui ne donne accès à
     aucun signal audio — impossible de la synchroniser. */
  const bouche = useCallback((actif: boolean, answer = "") => {
    if (actif) {
      setMode("speaking");
      const shapes: Face[] = ["bouche_a", "bouche_fermee", "bouche_o", "bouche_A", "bouche_entr"];
      let index = 0;
      if (mouthTimer.current) clearInterval(mouthTimer.current);
      mouthTimer.current = setInterval(() => setFace(shapes[index++ % shapes.length]), 110);
    } else {
      stopMouth(answer);
    }
  }, [stopMouth]);

  const contexte = useCallback(() => {
    if (!contexteRef.current) {
      const C = window.AudioContext || (window as any).webkitAudioContext;
      contexteRef.current = new C();
    }
    if (contexteRef.current.state === "suspended") void contexteRef.current.resume();
    return contexteRef.current;
  }, []);

  const couperSon = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = null;
    try { sourceRef.current?.stop(); } catch {}
    sourceRef.current = null;
  }, []);

  /* L'enveloppe du son : l'énergie moyenne par tranche de 45 ms. C'est elle
     qui dira à la bouche quand s'ouvrir, au lieu d'une minuterie aveugle. */
  /* Sept formes au lieu de trois. L'énergie du son donne l'ouverture ; on
     alterne ensuite entre les formes de même ouverture pour que la bouche ne
     répète pas indéfiniment la même image sur une voyelle tenue. */
  const formeBouche = (part: number, i: number): Face => {
    if (part < 0.05) return "bouche_fermee";
    if (part < 0.14) return "bouche_entr";
    if (part < 0.30) return i % 2 ? "bouche_o" : "bouche_entr";
    if (part < 0.48) return i % 3 === 0 ? "bouche_i" : i % 3 === 1 ? "bouche_a" : "bouche_ou";
    if (part < 0.72) return i % 2 ? "bouche_a" : "bouche_i";
    return i % 3 === 0 ? "bouche_a" : "bouche_A";
  };

  const enveloppeDe = (mémoire: AudioBuffer) => {
    const donnees = mémoire.getChannelData(0);
    const fenetre = Math.max(1, Math.floor(mémoire.sampleRate * 0.075));
    const valeurs: number[] = [];
    let pic = 0;
    for (let i = 0; i < donnees.length; i += fenetre) {
      const fin = Math.min(i + fenetre, donnees.length);
      let somme = 0;
      for (let j = i; j < fin; j++) somme += donnees[j] * donnees[j];
      const v = Math.sqrt(somme / (fin - i));
      if (v > pic) pic = v;
      valeurs.push(v);
    }
    return { valeurs, pic: pic || 1, pas: 0.075 };
  };

  /* Joue un morceau et fait suivre la bouche. Les seuils sont choisis pour
     que le silence ferme vraiment les lèvres : sinon elle mâche dans le vide
     entre deux phrases, et c'est ce qui se voyait le plus. */
  const jouerEtAnimer = useCallback((octets: ArrayBuffer) => new Promise<void>((fini) => {
    const ctx = contexte();
    ctx.decodeAudioData(octets.slice(0)).then((brut) => {
      const mémoire = sansSilence(ctx, brut);
      const { valeurs, pic, pas } = enveloppeDe(mémoire);
      const source = ctx.createBufferSource();
      source.buffer = mémoire;
      source.connect(ctx.destination);
      sourceRef.current = source;

      const depart = ctx.currentTime;
      let precedente: Face | null = null;
      /* Une bouche humaine ne change pas de forme dix fois par seconde. On
         impose un temps minimum entre deux images : sans lui, le visage
         papillonne et paraît nerveux — c'est ce que Lamine a vu. */
      const MINIMUM = 130; // millisecondes
      let dernierChangement = 0;
      const suivre = () => {
        if (sourceRef.current !== source) return;
        const ecoule = (ctx.currentTime - depart) * 1000;
        const i = Math.floor(ecoule / (pas * 1000));
        const part = i >= 0 && i < valeurs.length ? valeurs[i] / pic : 0;
        const forme = formeBouche(part, i);
        if (forme !== precedente && ecoule - dernierChangement >= MINIMUM) {
          precedente = forme;
          dernierChangement = ecoule;
          setFace(forme);
        }
        animationRef.current = requestAnimationFrame(suivre);
      };

      source.onended = () => {
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
        if (sourceRef.current === source) sourceRef.current = null;
        fini();
      };
      setMode("speaking");
      source.start();
      animationRef.current = requestAnimationFrame(suivre);
    }).catch(() => fini());
  }), [contexte]);

  /* La voix du navigateur : béquille, gardée pour le cas où Oolel ne répond
     pas. Elle ne sait pas dire le wolof, d'où la réécriture phonétique — et
     seulement pour le wolof, sinon le français ressort déformé. */
  const parlerAvecLeTelephone = useCallback((answer: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const voices = window.speechSynthesis.getVoices();
    const wolof = voices.find((v) => v.lang.toLowerCase().startsWith("wo"));
    const french =
      voices.find((v) => /^fr[-_](sn|fr)/i.test(v.lang)) ||
      voices.find((v) => v.lang.toLowerCase().startsWith("fr"));

    const enWolof = estWolof(answer);
    const utterance = new SpeechSynthesisUtterance(wolof || !enWolof ? answer : phoneticWolof(answer));
    if (wolof && enWolof) { utterance.voice = wolof; utterance.lang = wolof.lang; }
    else if (french) { utterance.voice = french; utterance.lang = french.lang; }
    else utterance.lang = "fr-FR";
    utterance.rate = enWolof ? 1.02 : 1.06;
    utterance.onstart = () => bouche(true);
    utterance.onend = () => bouche(false, answer);
    utterance.onerror = () => bouche(false, answer);
    window.speechSynthesis.speak(utterance);
  }, [bouche]);

  /* ── Les sons qui ne s'écrivent pas ───────────────────────────────────

     Un rire synthétisé n'est pas un rire. Ceux-ci sont de vrais
     enregistrements : on les joue tels quels, et le visage suit la suite
     d'images prévue pour ce son plutôt que l'ouverture de la bouche. */
  const jouerSonAvecVisages = useCallback((octets: ArrayBuffer, visages: Array<[string, number]>) =>
    new Promise<void>((fini) => {
      const ctx = contexte();
      ctx.decodeAudioData(octets.slice(0)).then((mémoire) => {
        const source = ctx.createBufferSource();
        source.buffer = mémoire;
        source.connect(ctx.destination);
        sourceRef.current = source;

        const minuteries: Array<ReturnType<typeof setTimeout>> = [];
        let t = 0;
        for (const [visage, duree] of visages) {
          minuteries.push(setTimeout(() => {
            if (sourceRef.current === source) setFace(visage as Face);
          }, t));
          t += duree;
        }

        source.onended = () => {
          for (const m of minuteries) clearTimeout(m);
          if (sourceRef.current === source) sourceRef.current = null;
          fini();
        };
        setMode("speaking");
        source.start();
      }).catch(() => fini());
    }), [contexte]);

  /* Le rire part AVANT la parole, pendant que la voix se synthétise : on
     couvre ainsi l'attente du premier morceau, et l'émotion arrive d'un
     coup au lieu d'être annoncée puis jouée. Si le fichier n'est pas encore
     déposé, on ne fait rien — le visage rit en silence, comme avant. */
  const jouerSouffle = useCallback(async (emotion: string) => {
    const souffle = souffleDe(emotion);
    if (!souffle) return;
    const fichier = fichierDe(souffle, dernierSon.current);
    let octets = cacheSons.current.get(fichier);
    if (!octets) {
      try {
        const r = await fetch(fichier);
        if (!r.ok) return;
        octets = await r.arrayBuffer();
        cacheSons.current.set(fichier, octets);
      } catch { return; }
    }
    dernierSon.current = fichier;
    await jouerSonAvecVisages(octets, souffle.visages);
  }, [jouerSonAvecVisages]);

  /* La vraie voix : Oolel Voices, la même que BIBA. Le serveur découpe la
     réponse — Soynade n'accepte que 500 caractères — et on va chercher le
     morceau suivant PENDANT que le précédent est lu, sinon un silence
     s'installe entre chaque phrase. */
  const speak = useCallback(async (answer: string, emotion?: string) => {
    window.speechSynthesis?.cancel();
    couperSon();
    if (!answer.trim()) return;

    if (moteursRef.current && moteursRef.current.voix === "navigateur") {
      if (emotion) await jouerSouffle(emotion);
      parlerAvecLeTelephone(answer);
      return;
    }

    const demander = async (partie: number) => {
      const r = await fetch("/api/voix", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({ texte: answer, partie }),
      });
      if (!r.ok) throw new Error("voix indisponible");
      return await r.json() as { parties: number; audio: string | null; type_mime?: string };
    };

    const enOctets = (b64: string) => {
      const brut = atob(b64);
      const tableau = new Uint8Array(brut.length);
      for (let i = 0; i < brut.length; i++) tableau[i] = brut.charCodeAt(i);
      return tableau.buffer;
    };

    try {
      // On lance la synthèse du premier morceau AVANT de rire : le rire
      // occupe exactement le temps qu'elle prend.
      const premier = demander(0);
      if (emotion) await jouerSouffle(emotion);
      let bloc = await premier;
      if (!bloc.audio) { parlerAvecLeTelephone(answer); return; }

      const jeton = {};
      tourRef.current = jeton;
      let suivant = bloc.parties > 1 ? demander(1) : null;

      for (let i = 0; i < bloc.parties; i++) {
        const attendu = suivant;                       // on prépare déjà le suivant
        suivant = i + 2 < bloc.parties ? demander(i + 2) : null;
        if (!bloc.audio) break;
        await jouerEtAnimer(enOctets(bloc.audio));
        if (tourRef.current !== jeton) return;         // une nouvelle réponse a pris la main
        if (!attendu) break;
        const prochain = await attendu;
        if (!prochain.audio) break;
        bloc = { ...bloc, audio: prochain.audio, type_mime: prochain.type_mime };
      }
      stopMouth(answer);
    } catch {
      parlerAvecLeTelephone(answer);
    }
  }, [couperSon, jouerEtAnimer, jouerSouffle, parlerAvecLeTelephone, stopMouth]);

  /* ── Ce qu'elle dit pendant qu'elle réfléchit ─────────────────────────

     Le premier passage synthétise la phrase ; on la garde ensuite en
     mémoire, si bien que les fois suivantes elle part instantanément. */
  const audioAttente = useCallback(async (texte: string) => {
    const garde = attenteCache.current.get(texte);
    if (garde) return garde;
    const r = await fetch("/api/voix", {
      method: "POST",
      headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
      body: JSON.stringify({ texte, partie: 0 }),
    });
    if (!r.ok) throw new Error("voix indisponible");
    const d = await r.json() as { audio: string | null };
    if (!d.audio) throw new Error("voix muette");
    const octets = octetsDeBase64(d.audio);
    attenteCache.current.set(texte, octets);
    return octets;
  }, []);

  /* Elle laisse passer SEUIL_MS avant d'ouvrir la bouche : si la réponse
     arrive avant, elle se tait, et rien n'aura retardé quoi que ce soit.
     Deux phrases au maximum par attente — une pour dire qu'elle a entendu,
     une seconde seulement si l'attente s'éternise. Trois seraient bavardes. */
  const direAttente = useCallback(async (langue: "wo" | "fr", jeton: object) => {
    const depart = Date.now();
    for (let dites = 0; dites < 2; dites++) {
      await pause(dites === 0 ? SEUIL_MS : 1800);
      if (attenteRef.current !== jeton) return;

      const choix = choisirAttente({
        attenteMs: Date.now() - depart,
        dernierId: dernierAttente.current,
        // Si elle a des notes sur la personne, elle connaît déjà son prénom.
        nomConnu: Boolean(resumeRef.current),
        nomDejaDemande: nomDemande.current,
        social: toursRef.current % 3 === 0,
      });
      if (!choix) return;

      const texte = texteAttente(choix, langue);
      let octets: ArrayBuffer;
      try { octets = await audioAttente(texte); } catch { return; }
      // La réponse a pu arriver pendant la synthèse : alors on se tait.
      if (attenteRef.current !== jeton) return;

      dernierAttente.current = choix.id;
      if (choix.quand === "nom") nomDemande.current = true;
      setFace(choix.visage as Face);
      setLegende(texte);
      await jouerEtAnimer(octets);
      if (attenteRef.current !== jeton) return;
      // Elle a fini sa phrase, la réponse n'est toujours pas là : elle
      // retourne réfléchir, et le visage reprend sa boucle.
      setMode("thinking");
    }
  }, [audioAttente, jouerEtAnimer]);

  const askBia = useCallback(async (question: string) => {
    const clean = question.trim();
    if (!clean || busyRef.current) return;
    busyRef.current = true;
    setSaisie("");
    setHistory((items) => [...items, { role: "user", text: clean }]);
    setMode("thinking");
    setFace("pensive");
    setLegende("");
    setPanne("");

    // Le temps où l'humain écoute est du temps gagné : elle meuble en parlant.
    const jeton = {};
    attenteRef.current = jeton;
    toursRef.current += 1;
    void direAttente(estWolof(clean) ? "wo" : "fr", jeton);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({ message: clean, history: historyRef.current.slice(-12), resume: resumeRef.current }),
      });
      const data = (await response.json()) as { reply: string; motif?: string; emotion?: string; source?: string };
      attenteRef.current = null;   // la vraie réponse a la parole
      if (response.status === 401) {
        // Code refusé : on renvoie le testeur à l'écran d'entrée avec le motif.
        try { localStorage.removeItem("bia-code"); } catch {}
        setCode(null);
        setCodeErreur(data.reply);
        setMode("ready"); setFace("yeux_ouverts");
        return;
      }
      if (!response.ok) throw new Error("BIA unavailable");
      emotionRef.current = data.emotion || "neutre";
      setPanne(data.source && data.source.startsWith("panne") ? data.source : "");
      setHistory((items) => [...items, { role: "bia", text: data.reply }]);
      setLegende(data.reply);
      // Le visage prend l'émotion tout de suite, avant même la voix : c'est
      // ce qui donne l'impression qu'elle réagit à ce qu'on lui a dit.
      const suite = SUITES[emotionRef.current];
      if (!suite) setFace(EMOTION_VERS_FACE[emotionRef.current] || "yeux_ouverts");
      speak(data.reply, emotionRef.current);
    } catch {
      emotionRef.current = "concernee";
      const fallback = "Jokkoo bi am na jafe-jafe. Jéemal beneen yoon.";
      setHistory((items) => [...items, { role: "bia", text: fallback }]);
      setLegende(fallback);
      setFace("concernee");
      setMode("error");
      speak(fallback);
    } finally {
      attenteRef.current = null;
      busyRef.current = false;
    }
  }, [speak, direAttente]);

  /* Pendant qu'elle réfléchit, le visage ne doit pas se figer.

     Une image fixe fait paraître l'attente deux fois plus longue : on ne sait
     plus si elle cherche ou si tout est bloqué. Un regard qui glisse, une
     paupière qui tombe, et la même attente devient supportable. La suite
     tourne en boucle jusqu'à ce que la réponse arrive. */
  useEffect(() => {
    if (mode !== "thinking") return;
    const suite: Array<[Face, number]> = [
      ["pensive", 900], ["regard_cote", 760], ["pensive", 820],
      ["yeux_mi", 150], ["yeux_fermes", 190], ["yeux_mi", 130],
      ["pensive", 1000], ["ecoute", 720], ["regard_cote", 640],
    ];
    let vivant = true;
    let i = 0;
    let minuterie: ReturnType<typeof setTimeout>;
    const avancer = () => {
      if (!vivant) return;
      const [visage, duree] = suite[i % suite.length];
      setFace(visage);
      i += 1;
      minuterie = setTimeout(avancer, duree);
    };
    avancer();
    return () => { vivant = false; clearTimeout(minuterie); };
  }, [mode]);

  /* On synthétise les phrases les plus courtes dès l'entrée du code, pendant
     que personne ne demande rien. La toute première attente est alors déjà
     instantanée ; les autres phrases se mettront en mémoire à leur premier
     usage. Une seule à la fois, pour ne pas encombrer la voix si BIA doit
     répondre pendant ce temps. */
  useEffect(() => {
    if (!code) return;
    let vivant = true;
    void (async () => {
      for (const a of ATTENTES.filter((x) => x.quand === "court")) {
        if (!vivant) return;
        try { await audioAttente(a.wo); } catch { return; }
      }
    })();
    return () => { vivant = false; };
  }, [code, audioAttente]);

  // Clignement des yeux au repos.
  useEffect(() => {
    /* Un clignement franc paraît mécanique. Trois images descendantes puis
       trois remontantes, et un regard qui glisse de temps en temps, suffisent
       à donner l'impression d'une présence plutôt que d'une photo. */
    const minuteries: Array<ReturnType<typeof setTimeout>> = [];
    const timer = setInterval(() => {
      if (mode !== "ready") return;
      const suite: Array<[Face, number]> = Math.random() < 0.22
        ? [["regard_cote", 1600], ["yeux_ouverts", 0]]
        : [["yeux_mi", 110], ["yeux_fermes", 150], ["yeux_mi", 110], ["yeux_ouverts", 0]];
      let t = 0;
      for (const [f, d] of suite) {
        minuteries.push(setTimeout(() => setFace(f), t));
        t += d;
      }
    }, 5600);
    return () => { clearInterval(timer); minuteries.forEach(clearTimeout); };
  }, [mode]);

  const arreterEnregistrement = useCallback(() => {
    const e = enregistreurRef.current;
    if (e && e.state !== "inactive") e.stop();
  }, []);

  /* Le micro de BIA se comporte comme celui de BIBA : une fois ouvert, il
     attend une voix aussi longtemps qu'il faut ; dès que quelqu'un a parlé,
     il se ferme deux secondes après le dernier son. Un second appui conclut
     tout de suite. */
  const ecouter = useCallback(async () => {
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      const enregistreur = new MediaRecorder(flux);
      const morceaux: Blob[] = [];
      enregistreurRef.current = enregistreur;

      const contexte = new AudioContext();
      const analyse = contexte.createAnalyser();
      analyse.fftSize = 512;
      contexte.createMediaStreamSource(flux).connect(analyse);
      const tampon = new Uint8Array(analyse.frequencyBinCount);
      let aParle = false;
      let dernierSon = 0;

      const veille = setInterval(() => {
        analyse.getByteTimeDomainData(tampon);
        let creux = 0;
        for (const v of tampon) creux = Math.max(creux, Math.abs(v - 128));
        if (creux > 8) { aParle = true; dernierSon = Date.now(); }
        else if (aParle && Date.now() - dernierSon > 2000) arreterEnregistrement();
      }, 120);

      enregistreur.ondataavailable = (e) => { if (e.data.size) morceaux.push(e.data); };
      enregistreur.onstop = async () => {
        clearInterval(veille);
        flux.getTracks().forEach((t) => t.stop());
        contexte.close().catch(() => {});
        enregistreurRef.current = null;
        if (!aParle || !morceaux.length) { setMode("ready"); return; }

        setMode("thinking");
        setFace("pensive");
        const forme = new FormData();
        forme.append("audio", new Blob(morceaux, { type: "audio/webm" }), "parole.webm");
        try {
          const r = await fetch("/api/ecouter", { method: "POST", headers: { "x-bia-code": codeRef.current }, body: forme });
          const d = await r.json() as { texte?: string };
          if (d.texte) void askBia(d.texte);
          else { setMode("ready"); setFace("yeux_ouverts"); }
        } catch { setMode("error"); }
      };

      enregistreur.start();
      setMode("listening");
      setFace("ecoute");
    } catch {
      setMode("error");
    }
  }, [arreterEnregistrement, askBia]);

  /* Repli quand aucun moteur d'écoute n'est branché : la reconnaissance du
     navigateur. Elle ne connaît pas le wolof — « wo-SN » n'existe nulle part
     — donc on lui donne le décodeur français, le plus proche à l'oreille. */
  useEffect(() => {
    if (moteurs && moteurs.ecoute !== "navigateur") return;
    const scope = window as typeof window & {
      SpeechRecognition?: new () => Recognition;
      webkitSpeechRecognition?: new () => Recognition;
    };
    const RecognitionClass = scope.SpeechRecognition || scope.webkitSpeechRecognition;
    if (!RecognitionClass) return;
    const recognition = new RecognitionClass();
    recognition.lang = "fr-FR";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onstart = () => { setMode("listening"); setFace("ecoute"); };
    recognition.onend = () => setMode((c) => (c === "listening" ? "ready" : c));
    recognition.onerror = () => setMode("error");
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results as ArrayLike<any>)
        .map((r: any) => r[0].transcript).join("");
      if (event.results[event.results.length - 1].isFinal) void askBia(transcript);
    };
    recognitionRef.current = recognition;
    return () => { recognition.stop(); recognitionRef.current = null; };
  }, [askBia, moteurs]);

  useEffect(() => () => {
    if (mouthTimer.current) clearInterval(mouthTimer.current);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    window.speechSynthesis?.cancel();
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    try { sourceRef.current?.stop(); } catch {}
    contexteRef.current?.close().catch(() => {});
  }, []);

  useEffect(() => {
    if (clavier) filRef.current?.scrollTo({ top: filRef.current.scrollHeight, behavior: "smooth" });
  }, [history, clavier]);

  /* Le fil est gardé sur l'appareil après chaque échange. Quand il dépasse
     trente messages, les plus anciens sont condensés en notes et retirés du
     fil : la conversation ne peut donc pas gonfler sans fin, et ce qui compte
     — le prénom, le métier, ce qui a été décidé — survit à l'oubli. */
  useEffect(() => {
    if (!history.length) return;
    try { localStorage.setItem("bia-fil", JSON.stringify(history.slice(-40))); } catch {}

    if (history.length <= 30 || resumeEnCours.current || !code) return;
    resumeEnCours.current = true;
    const aCondenser = history.slice(0, history.length - 16);
    fetch("/api/resumer", {
      method: "POST",
      headers: { "content-type": "application/json", "x-bia-code": code },
      body: JSON.stringify({ echanges: aCondenser, resume: resumeRef.current }),
    })
      .then((r) => r.json())
      .then((d: { resume?: string }) => {
        if (!d.resume) return;
        setResume(d.resume);
        setHistory((items) => items.slice(-16));
        try { localStorage.setItem("bia-resume", d.resume); } catch {}
      })
      .catch(() => {})
      .finally(() => { resumeEnCours.current = false; });
  }, [history, code]);

  /* BIA ne parle JAMAIS la première.

     Le mot d'accueil partait autrefois au premier appui sur le micro : elle
     se présentait avant qu'on lui ait rien dit, et cet appui-là ne lançait
     même pas l'écoute. On garde le mot d'accueil à l'écran — écrit, il
     accueille sans couper la parole — et le premier appui écoute, comme
     tous les suivants.

     Le geste sert quand même à quelque chose : il débloque le son du
     navigateur, qui refuse toute lecture audio avant une action de
     l'utilisateur. */

  /* Faire taire TOUT ce qui parle ou s'apprête à parler.

     Le micro coupait bien la réponse en cours, mais pas la phrase d'attente :
     elle finissait sa phrase par-dessus l'échange suivant, et les deux voix
     se chevauchaient. Les deux jetons doivent tomber ensemble. */
  const taire = useCallback(() => {
    window.speechSynthesis?.cancel();
    couperSon();
    tourRef.current = null;
    attenteRef.current = null;
  }, [couperSon]);

  function toggleMicrophone() {
    taire();
    contexte();   // débloque le son du navigateur, sans rien prononcer

    const parScribe = moteurs ? moteurs.ecoute !== "navigateur" : false;
    if (parScribe) {
      if (mode === "listening") { arreterEnregistrement(); return; }
      void ecouter();
      return;
    }
    if (!recognitionRef.current) { setMode("error"); return; }
    if (mode === "listening") { recognitionRef.current.stop(); return; }
    try { recognitionRef.current.start(); } catch { setMode("error"); }
  }

  function ouvrirClavier() {
    taire();
    contexte();
    setClavier(true);
    setTimeout(() => champRef.current?.focus(), 90);
  }

  const labels = {
    ready: "Parler à BIA",
    listening: "BIA vous écoute. Appuyer pour arrêter",
    thinking: "BIA réfléchit",
    speaking: "BIA répond",
    error: "Micro indisponible. Appuyer pour réessayer",
  };

  async function envoyerCorrection(index: number) {
    const bonne = correction.trim();
    if (!bonne) return;
    // La question qui a produit cette réponse : le message juste avant.
    const question = [...history].slice(0, index).reverse().find((m) => m.role === "user");
    if (!question) { setCorrige(null); return; }
    setAvis("");
    try {
      const r = await fetch("/api/corriger", {
        method: "POST",
        headers: { "content-type": "application/json", "x-bia-code": codeRef.current },
        body: JSON.stringify({
          source: question.text, proposee: history[index].text, corrigee: bonne,
          langue: estWolof(bonne) ? "wo" : "fr",
        }),
      });
      const d = await r.json() as { ok?: boolean; erreur?: string };
      setAvis(d.ok ? "Jërëjëf. BIA le retiendra." : (d.erreur || "La correction n'a pas été gardée."));
    } catch {
      setAvis("La correction n'a pas été gardée.");
    }
    setCorrection("");
    setCorrige(null);
  }

  function nouvelleConversation() {
    couperSon();
    window.speechSynthesis?.cancel();
    setHistory([]);
    setLegende("");
    try { localStorage.removeItem("bia-fil"); } catch {}
    // Les notes ne sont PAS effacées : c'est justement ce qui fait qu'elle se
    // souvient de la personne d'une conversation à l'autre.
  }

  function toutOublier() {
    nouvelleConversation();
    setResume("");
    resumeRef.current = "";
    try { localStorage.removeItem("bia-resume"); } catch {}
  }

  async function entrer() {
    const propre = codeSaisi.toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (propre.length < 6) { setCodeErreur("Code trop court."); return; }
    try { localStorage.setItem("bia-code", propre); } catch {}
    setCode(propre);
    setCodeSaisi("");
    setCodeErreur("");
  }

  if (!code) {
    return (
      <main className="bia-presence" data-mode="ready">
        <div className="portrait" aria-hidden="true"><div className="avatar" data-face="yeux_ouverts" /></div>
        <section className="porte">
          <p className="porte-titre">BIA</p>
          <p className="porte-texte">Duggal sa kod ngir waxtaan ak BIA.</p>
          <div className="saisie">
            <input
              value={codeSaisi}
              onChange={(e) => setCodeSaisi(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void entrer(); }}
              placeholder="KOD"
              aria-label="Code d'accès"
              autoCapitalize="characters"
              autoComplete="off"
              enterKeyHint="go"
            />
            <button type="button" onClick={() => void entrer()} disabled={!codeSaisi.trim()} aria-label="Entrer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2Z" /></svg>
            </button>
          </div>
          {codeErreur ? <p className="porte-erreur">{codeErreur}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="bia-presence" data-mode={mode} data-clavier={clavier ? "ouvert" : "ferme"}>
      <div className="portrait" aria-hidden="true">
        <div className="avatar" data-face={face} />
      </div>

      {legende && !clavier ? <p className="legende">{legende}</p> : null}
      {panne && !clavier ? <p className="panne">⚠ {panne}</p> : null}

      <div className="barre">
        <button className="clavier-ouvrir" type="button" onClick={ouvrirClavier} aria-label="Écrire à BIA">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 6h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1Zm2 3v2h2V9H5Zm4 0v2h2V9H9Zm4 0v2h2V9h-2Zm4 0v2h2V9h-2ZM5 13v2h2v-2H5Zm4 0v2h6v-2H9Zm8 0v2h2v-2h-2Z" />
          </svg>
        </button>

        <button className="microphone" type="button" onClick={toggleMicrophone} aria-label={labels[mode]}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 14.5a3.5 3.5 0 0 0 3.5-3.5V5a3.5 3.5 0 0 0-7 0v6a3.5 3.5 0 0 0 3.5 3.5Zm-6-4a1 1 0 0 1 2 0V11a4 4 0 0 0 8 0v-.5a1 1 0 1 1 2 0V11a6 6 0 0 1-5 5.92V19h3a1 1 0 1 1 0 2H8a1 1 0 1 1 0-2h3v-2.08A6 6 0 0 1 6 11v-.5Z" />
          </svg>
        </button>

        <span className="cale" aria-hidden="true" />
      </div>

      <section className="clavier" aria-hidden={!clavier}>
        <button className="clavier-fermer" type="button" onClick={() => setClavier(false)} aria-label="Replier le clavier">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 15.4 5.3 8.7l1.4-1.4 5.3 5.3 5.3-5.3 1.4 1.4Z" /></svg>
        </button>

        <div className="outils">
          <button type="button" onClick={nouvelleConversation}>Nouvelle conversation</button>
          {resume ? <button type="button" onClick={toutOublier}>Tout oublier</button> : null}
          {resume ? <span className="jauge" title="BIA garde des notes sur toi, sur cet appareil">se souvient de toi</span> : null}
        </div>

        <div className="fil scrollbar-thin" ref={filRef}>
          {history.length === 0 ? <p className="fil-vide">{welcome}</p> : null}
          {history.map((m, i) => (
            <div key={i} className={m.role === "bia" ? "ligne ligne-bia" : "ligne ligne-moi"}>
              <p className={m.role === "bia" ? "bulle bulle-bia" : "bulle bulle-moi"}>
                {m.text.split(/\n{2,}/).map((para, n) => (
                  <span className="para" key={n}>{para.trim()}</span>
                ))}
              </p>
              {m.role === "bia" && i > 0 ? (
                corrige === i ? (
                  <div className="corriger">
                    <input
                      value={correction}
                      onChange={(e) => setCorrection(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") void envoyerCorrection(i); }}
                      placeholder="Naka la war a wax ? Écris la bonne formulation…"
                      aria-label="La bonne formulation"
                      autoFocus
                    />
                    <button type="button" onClick={() => void envoyerCorrection(i)}>Garder</button>
                    <button type="button" className="annuler" onClick={() => { setCorrige(null); setCorrection(""); }}>Annuler</button>
                  </div>
                ) : (
                  <button className="mal-dit" type="button"
                    onClick={() => { setCorrige(i); setCorrection(""); setAvis(""); }}>
                    Mal dit
                  </button>
                )
              ) : null}
            </div>
          ))}
          {avis ? <p className="avis">{avis}</p> : null}
        </div>

        <div className="saisie">
          <input
            ref={champRef}
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void askBia(saisie); }}
            placeholder="Bindal ci wolof walla ci français…"
            aria-label="Écrire un message à BIA"
            enterKeyHint="send"
          />
          <button type="button" onClick={() => void askBia(saisie)} disabled={!saisie.trim()} aria-label="Envoyer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.4 20.4 21 12 3.4 3.6 3.4 10l12 2-12 2Z" /></svg>
          </button>
        </div>
      </section>

      <p className="sr-only" aria-live="polite">{labels[mode]}</p>
    </main>
  );
}
