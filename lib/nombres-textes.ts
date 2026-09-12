/* ── LES NOMBRES EN WOLOF, À RELIRE PAR LAMINE ──────────────────────────────

   Lamine, le 11 septembre 2026 : « sors-moi la liste que je t'ai remise hier,
   les chiffres, la liste de calcul. Je veux la corriger — de la même manière
   que pour les quarante mots. Ça aussi il faut l'enregistrer et le déposer
   dans la base. »

   D'OÙ VIENT CETTE LISTE. Pas de moi. Elle est produite par SON module,
   « BIA nombres en wolof pour intégration », qu'il m'a remis le 10 septembre
   et qui avait été retiré le soir même quand il a décidé que les nombres se
   diraient en français. Deux fois de suite mon wolof des nombres avait été
   faux — les milliers composés, puis l'argent en dërëm. On ne recommence pas :
   chaque ligne ci-dessous sort de ses règles, telles quelles.

   Le module fait aussi le chemin inverse — relire en chiffres ce qu'il a
   écrit en lettres. Les 206 nombres de contrôle repassent tous : ce qui est
   écrit ici se relit sans perte.

   ── CE QUE ÇA CHANGE, ET CE QUE ÇA NE CHANGE PAS ──────────────────────────

   Une fois ces textes enregistrés, SEULS CES NOMBRES-LÀ se diront en wolof.
   Un montant qui n'est pas dans la liste — 37 400, par exemple — continue de
   se dire en français, comme décidé le 10 septembre. Ce n'est pas un oubli :
   c'est ce qui évite qu'une somme jamais relue par personne soit lue à voix
   haute de travers. Une erreur sur un montant coûte de l'argent à quelqu'un.

   La liste couvre ce qui revient vraiment : compter jusqu'à vingt, les
   dizaines, les centaines, les prix ronds de Dakar, la TVA, et les quatre
   opérations vues en situation.                                            */

/* Même verrou que le répertoire, et pour la même raison : rien ne s'enregistre
   et rien ne se sert de mémoire tant que Lamine n'a pas écouté. Il est séparé
   de RELU exprès — les 42 phrases sont relues, ces nombres-ci ne le sont pas
   encore, et un seul verrou pour les deux enregistrerait les nombres sans
   qu'il les ait entendus. */
/* ── LES DOUZE CORRECTIONS DE LAMINE, LE 12 SEPTEMBRE 2026 ─────────────────

   Il a relu la fiche et renvoyé douze lignes. Les douze sont posées telles
   quelles ci-dessous — la dernière, « Fan wer », l'a été le soir même, quand
   il a répondu à la question que j'avais laissée ouverte à sa ligne.

   LES POURCENTAGES. « pour cent » était du français posé au milieu du wolof.
   Il écrit « ci téeméer bu nekk » — pour chaque centaine. C'est du wolof, et
   ça se dit.

   LES QUATRE OPÉRATIONS. Je les avais écrites en français à l'intérieur du
   wolof — « plus », « moins », « multiplié par », « divisé par », « égal ».
   Il a donné les vrais mots :

       yokaci       ajouter
       wangici      retirer
       fulko ak     multiplier par
       sédeléko ak  diviser par
       mu don       cela fait

   SA PONCTUATION EST GARDÉE TELLE QUELLE, points et majuscules compris. Ce
   n'est pas de la négligence de ma part : dans un calcul lu à voix haute, un
   point est une RESPIRATION — « fukk wangici. ñeent, Mu don. juróom-benn » se
   dit avec les pauses d'un maître qui compte au tableau. Je ne lisse pas ça
   sans qu'il l'ait entendu. La page /voix/nombres est là pour ça. */

export const RELU_NOMBRES = false;

export type Nombre = {
  /** Le nom du fichier son, et la clé de l'entrée. */
  cle: string;
  /** Ce qu'on voit à l'écran — le chiffre, lui, ne se traduit pas. */
  etiquette: string;
  /** Ce qui est dit, et enregistré mot pour mot. */
  wolof: string;
  /** Pour ranger la page : unités, dizaines, centaines, milliers, argent… */
  groupe: string;
};

export const NOMBRES: Nombre[] = [
  /* ── COMPTER JUSQU'À VINGT ─────────────────────────────────────────────
     Ce sont les briques : elles reviennent dans tout le reste de la liste. */
  { cle: "n-0", etiquette: "0", wolof: "tus", groupe: "unites" },
  { cle: "n-1", etiquette: "1", wolof: "benn", groupe: "unites" },
  { cle: "n-2", etiquette: "2", wolof: "ñaar", groupe: "unites" },
  { cle: "n-3", etiquette: "3", wolof: "ñett", groupe: "unites" },
  { cle: "n-4", etiquette: "4", wolof: "ñeent", groupe: "unites" },
  { cle: "n-5", etiquette: "5", wolof: "juróom", groupe: "unites" },
  { cle: "n-6", etiquette: "6", wolof: "juróom-benn", groupe: "unites" },
  { cle: "n-7", etiquette: "7", wolof: "juróom-ñaar", groupe: "unites" },
  { cle: "n-8", etiquette: "8", wolof: "juróom-ñett", groupe: "unites" },
  { cle: "n-9", etiquette: "9", wolof: "juróom-ñeent", groupe: "unites" },
  { cle: "n-10", etiquette: "10", wolof: "fukk", groupe: "unites" },
  { cle: "n-11", etiquette: "11", wolof: "fukk ak benn", groupe: "unites" },
  { cle: "n-12", etiquette: "12", wolof: "fukk ak ñaar", groupe: "unites" },
  { cle: "n-13", etiquette: "13", wolof: "fukk ak ñett", groupe: "unites" },
  { cle: "n-14", etiquette: "14", wolof: "fukk ak ñeent", groupe: "unites" },
  { cle: "n-15", etiquette: "15", wolof: "fukk ak juróom", groupe: "unites" },
  { cle: "n-16", etiquette: "16", wolof: "fukk ak juróom-benn", groupe: "unites" },
  { cle: "n-17", etiquette: "17", wolof: "fukk ak juróom-ñaar", groupe: "unites" },
  { cle: "n-18", etiquette: "18", wolof: "fukk ak juróom-ñett", groupe: "unites" },
  { cle: "n-19", etiquette: "19", wolof: "fukk ak juróom-ñeent", groupe: "unites" },
  { cle: "n-20", etiquette: "20", wolof: "ñaar-fukk", groupe: "unites" },

  /* ── LES DIZAINES ─────────────────────────────────────────────────────── */
  /* ── SA DOUZIÈME CORRECTION, POSÉE LE 12 SEPTEMBRE AU SOIR ────────────────

     J'avais laissé « ñett-fukk » et posé la question, en pensant qu'il avait
     confondu le nombre trente avec les trente jours d'un mois. Sa réponse :

       « 30 en wolof, si tu parles de nombre, chiffre 30 veut dire "Fan wer".
         Mais si tu parles d'argent, 30 F veut dire 6 dërëm en wolof,
         juróom-benn dërëm. »

     Il a répondu aux DEUX questions à la fois, et il a raison sur les deux :

       — le nombre trente est irrégulier, comme « onze » ne se dit pas
         « dix-un » en français. Ma série en fukk était une déduction de ma
         part, pas une observation ;

       — et la raison pour laquelle ça ne met aucun prix en danger, c'est que
         L'ARGENT NE DIT JAMAIS TRENTE : un montant se divise par cinq avant
         d'être prononcé, donc 30 F devient six dërëm. Mon inquiétude — « elle
         dira les jours du mois mille francs » — tombait toute seule.

     Reste un seul endroit où trente peut entrer dans un prix : 150 F, qui
     fait trente dërëm. Celui-là est marqué « en attente » dans
     lib/wolof-nombres.ts, et il attend son oreille. */
  { cle: "n-30", etiquette: "30", wolof: "Fan wer", groupe: "dizaines" },
  { cle: "n-40", etiquette: "40", wolof: "ñeent-fukk", groupe: "dizaines" },
  { cle: "n-50", etiquette: "50", wolof: "juróom-fukk", groupe: "dizaines" },
  { cle: "n-60", etiquette: "60", wolof: "juróom-benn-fukk", groupe: "dizaines" },
  { cle: "n-70", etiquette: "70", wolof: "juróom-ñaar-fukk", groupe: "dizaines" },
  { cle: "n-80", etiquette: "80", wolof: "juróom-ñett-fukk", groupe: "dizaines" },
  { cle: "n-90", etiquette: "90", wolof: "juróom-ñeent-fukk", groupe: "dizaines" },

  /* ── LES CENTAINES ────────────────────────────────────────────────────── */
  { cle: "n-100", etiquette: "100", wolof: "téeméer", groupe: "centaines" },
  { cle: "n-200", etiquette: "200", wolof: "ñaari téeméer", groupe: "centaines" },
  { cle: "n-300", etiquette: "300", wolof: "ñetti téeméer", groupe: "centaines" },
  { cle: "n-400", etiquette: "400", wolof: "ñeenti téeméer", groupe: "centaines" },
  { cle: "n-500", etiquette: "500", wolof: "juróomi téeméer", groupe: "centaines" },
  { cle: "n-600", etiquette: "600", wolof: "juróom-benni téeméer", groupe: "centaines" },
  { cle: "n-700", etiquette: "700", wolof: "juróom-ñaari téeméer", groupe: "centaines" },
  { cle: "n-800", etiquette: "800", wolof: "juróom-ñetti téeméer", groupe: "centaines" },
  { cle: "n-900", etiquette: "900", wolof: "juróom-ñeenti téeméer", groupe: "centaines" },

  /* ── LES MILLIERS ─────────────────────────────────────────────────────────
     C'est ici que ma version d'hier était fausse : j'écrivais 15 000
     « fukk ak juróomi junni », comme si le junni portait sur l'ensemble. Sa
     règle : chaque part garde son junni — « fukki junni ak juróomi junni ». */
  { cle: "n-1000", etiquette: "1 000", wolof: "junni", groupe: "milliers" },
  { cle: "n-2000", etiquette: "2 000", wolof: "ñaari junni", groupe: "milliers" },
  { cle: "n-5000", etiquette: "5 000", wolof: "juróomi junni", groupe: "milliers" },
  { cle: "n-10000", etiquette: "10 000", wolof: "fukki junni", groupe: "milliers" },
  { cle: "n-15000", etiquette: "15 000", wolof: "fukki junni ak juróomi junni", groupe: "milliers" },
  { cle: "n-20000", etiquette: "20 000", wolof: "ñaar-fukki junni", groupe: "milliers" },
  { cle: "n-25000", etiquette: "25 000", wolof: "ñaar-fukki junni ak juróomi junni", groupe: "milliers" },
  { cle: "n-50000", etiquette: "50 000", wolof: "juróom-fukki junni", groupe: "milliers" },
  { cle: "n-100000", etiquette: "100 000", wolof: "téeméeri junni", groupe: "milliers" },
  { cle: "n-500000", etiquette: "500 000", wolof: "juróomi téeméeri junni", groupe: "milliers" },
  { cle: "n-1000000", etiquette: "1 000 000", wolof: "benn million", groupe: "milliers" },

  /* ── L'ARGENT ─────────────────────────────────────────────────────────────
     Sa règle du 10 septembre : « le wolof ne compte pas l'argent en francs,
     il commence à cinq francs ». 1 dërëm = 5 F CFA. C'est l'endroit le plus
     dangereux de la liste — se tromper ici multiplie ou divise un prix par
     cinq. À relire avec la plus grande attention. */
  /* Sa ligne du 12 septembre au soir, et la plus petite de la liste : elle
     montre la règle à nu. Trente francs ne disent pas trente — ils disent
     six, parce qu'on divise par cinq avant de parler.

     UNE LETTRE ATTEND SON OREILLE. Il l'a écrite « juróom benn dërëm », sans
     le « i » de liaison. Ses neuf autres montants l'ont tous — « ñaari
     dërëm », « téeméeri dërëm » — alors j'ai suivi ses neuf lignes plutôt que
     sa frappe au téléphone. S'il entend qu'il faut dire « juróom-benn
     dërëm », c'est un caractère à enlever ici. */
  { cle: "f-30", etiquette: "30 F CFA", wolof: "juróom-benni dërëm", groupe: "argent" },
  { cle: "f-500", etiquette: "500 F CFA", wolof: "téeméeri dërëm", groupe: "argent" },
  { cle: "f-1000", etiquette: "1 000 F CFA", wolof: "ñaari téeméeri dërëm", groupe: "argent" },
  { cle: "f-2500", etiquette: "2 500 F CFA", wolof: "juróomi téeméeri dërëm", groupe: "argent" },
  { cle: "f-5000", etiquette: "5 000 F CFA", wolof: "junni dërëm", groupe: "argent" },
  { cle: "f-10000", etiquette: "10 000 F CFA", wolof: "ñaari junni dërëm", groupe: "argent" },
  { cle: "f-15000", etiquette: "15 000 F CFA", wolof: "ñetti junni dërëm", groupe: "argent" },
  { cle: "f-25000", etiquette: "25 000 F CFA", wolof: "juróomi junni dërëm", groupe: "argent" },
  { cle: "f-50000", etiquette: "50 000 F CFA", wolof: "fukki junni dërëm", groupe: "argent" },
  { cle: "f-100000", etiquette: "100 000 F CFA", wolof: "ñaar-fukki junni dërëm", groupe: "argent" },

  /* ── LES POURCENTAGES ─────────────────────────────────────────────────────
     18 % est là pour une raison précise : c'est la TVA, et elle apparaît sur
     chaque devis que BIA fabrique. */
  { cle: "p-5", etiquette: "5 %", wolof: "juróom  ci téeméer bu nekk", groupe: "pourcent" },
  { cle: "p-10", etiquette: "10 %", wolof: "fukk ci téeméer bu nekk", groupe: "pourcent" },
  { cle: "p-18", etiquette: "18 % (la TVA)", wolof: "fukk ak juróom-ñett ci téeméer bu nekk", groupe: "pourcent" },
  { cle: "p-20", etiquette: "20 %", wolof: "ñaar-fukk ci téeméer bu nekk", groupe: "pourcent" },
  { cle: "p-50", etiquette: "50 %", wolof: "juróom-fukk ci téeméer bu nekk", groupe: "pourcent" },
  { cle: "p-100", etiquette: "100 %", wolof: "téeméer ci téeméer bu nekk", groupe: "pourcent" },

  /* ── LES CALCULS ──────────────────────────────────────────────────────────
     Ce ne sont pas des réponses toutes faites : ce sont les MOTS QUI RELIENT
     — plus, moins, multiplié par, divisé par, égal — entendus en situation.
     C'est sur eux qu'il faut juger, pas sur le résultat. */
  { cle: "c-plus", etiquette: "2 + 3 = 5", wolof: "ñaar yokaci ñett, mu donn. juróom", groupe: "calcul" },
  { cle: "c-moins", etiquette: "10 − 4 = 6", wolof: "fukk wangici. ñeent, Mu don. juróom-benn", groupe: "calcul" },
  { cle: "c-fois", etiquette: "3 × 4 = 12", wolof: "ñett fulko Ak ñeent, Mu don, fukk ak ñaar", groupe: "calcul" },
  { cle: "c-divise", etiquette: "20 ÷ 5 = 4", wolof: "ñaar-fukk sédeléko ak juróom, Mu don ñeent", groupe: "calcul" },
  { cle: "c-argent", etiquette: "15 000 + 10 000 = 25 000 F", wolof: "ñetti junni dërëm yokaci ñaari junni dërëm, Mu don juróomi junni dërëm", groupe: "calcul" },
];

/** Les titres de la page, dans l'ordre où on les lit. */
export const GROUPES: Array<{ cle: string; titre: string; note: string }> = [
  { cle: "unites", titre: "Compter jusqu'à vingt", note: "Les briques : elles reviennent dans tout le reste." },
  { cle: "dizaines", titre: "Les dizaines", note: "" },
  { cle: "centaines", titre: "Les centaines", note: "" },
  { cle: "milliers", titre: "Les milliers", note: "Chaque part garde son junni — c'est ta règle, celle où je m'étais trompé." },
  { cle: "argent", titre: "L'argent", note: "1 dërëm = 5 F CFA. L'endroit le plus dangereux : une erreur ici multiplie un prix par cinq." },
  { cle: "pourcent", titre: "Les pourcentages", note: "18 %, c'est la TVA de chaque devis." },
  { cle: "calcul", titre: "Les calculs", note: "Juge les mots qui relient — plus, moins, égal — pas le résultat." },
];
