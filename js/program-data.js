// Scheda iniziale e dati importati dalla scheda precedente.
// Viene caricata nel database dal pannello allenatore al primo avvio ("Carica scheda iniziale").

const ex = (slug, name, o = {}) => ({
  slug, name,
  sets: o.sets ?? 3,
  reps: o.reps ?? null,          // ripetizioni obiettivo (null se a tempo)
  secs: o.secs ?? null,          // secondi obiettivo per gli esercizi a tempo
  perSide: !!o.perSide,          // "per lato" / "per gamba"
  load: o.load ?? 'bilanciere',  // bilanciere | manubri | corpo | elastico | macchina
  tip: o.tip ?? '',
  points: o.points ?? [],
  pic: o.pic ?? slug,
  video: o.video ?? '',
  media: o.media ?? '',
  target_kg: o.target_kg ?? null,
});

export const INITIAL_PROGRAM = {
  name: 'Scheda Novembre 2026',
  data: {
    cooldown: 'Alla fine: 3 minuti di allungamenti leggeri.',
    warmups: {
      upper: {
        name: 'Riscaldamento Upper', minutes: 8, items: [
          { name: 'Cyclette', amount: "3'", secs: 180 },
          { name: 'Gatto-mucca', amount: '8' },
          { name: 'Dislocazioni con elastico', amount: '10' },
          { name: 'Band pull-apart', amount: '15' },
          { name: 'Appeso alla sbarra', amount: '30"', secs: 30 },
          { name: 'Primo esercizio leggero', amount: '2 serie' },
        ],
      },
      gambe: {
        name: 'Riscaldamento Gambe', minutes: 8, items: [
          { name: 'Tapis roulant in salita', amount: "3'", secs: 180 },
          { name: "Cerchi con l'anca a 4 zampe", amount: '5 per lato' },
          { name: 'Affondo con rotazione del busto', amount: '4 per lato' },
          { name: 'Squat profondo tenuto', amount: '30"', secs: 30 },
          { name: 'Ponte glutei', amount: '12' },
          { name: 'Squat leggero', amount: '2 serie' },
        ],
      },
    },
    sessions: [
      {
        key: 'A', name: 'Upper A · Panca', subtitle: 'Petto e schiena pesanti', minutes: 55, warmup: 'upper',
        blocks: [
          { type: 'single', rest: 150, items: [ex('panca-piana-bilanciere', 'Panca piana con bilanciere', { sets: 4, reps: 6, tip: 'Scapole strette, piedi a terra', points: ['Scapole strette e basse, piedi ben piantati a terra', 'Il bilanciere scende sul petto basso, gomiti a circa 45°', 'Spingi forte e in modo controllato, senza rimbalzare sul petto'] })] },
          { type: 'single', rest: 120, items: [ex('rematore-bilanciere', 'Rematore con bilanciere', { sets: 3, reps: 8, tip: 'Schiena dritta, tira verso la pancia', points: ['Busto inclinato a circa 45°, ginocchia morbide', 'Schiena dritta per tutta la serie', 'Tira il bilanciere verso l’ombelico portando i gomiti indietro'] })] },
          { type: 'superset', rest: 90, items: [
            ex('trazioni-negative', 'Trazioni negative', { sets: 3, reps: 3, load: 'corpo', pic: 'trazioni', tip: 'Sali con la panca, scendi in 5"', points: ['Sali con la panca o con un saltello fino al mento sopra la sbarra', 'Scendi lentissimo: almeno 5 secondi', 'Arriva fino a braccia tese, poi ricomincia'] }),
            ex('dip-negative', 'Dip negative', { sets: 3, reps: 3, load: 'corpo', pic: 'dip', tip: 'Parti in alto, scendi in 5"', points: ['Parti in alto a braccia tese, aiutandoti con i piedi', 'Scendi in 4–5 secondi finché il braccio è parallelo al pavimento', 'Risali con l’aiuto dei piedi'] }),
          ] },
          { type: 'single', rest: 90, items: [ex('panca-inclinata-manubri', 'Panca inclinata con manubri', { sets: 3, reps: 10, load: 'manubri', tip: 'Panca a 30°', points: ['Schienale a circa 30°', 'Gomiti a circa 45° dal busto', 'Scendi lento, spingi in alto senza far sbattere i manubri'] })] },
          { type: 'superset', rest: 90, items: [
            ex('curl-ez', 'Curl con bilanciere EZ', { sets: 2, reps: 12, tip: 'Gomiti fermi', points: ['Gomiti incollati ai fianchi', 'Sali senza slanciare con la schiena', 'Scendi lento fino a braccia quasi tese'] }),
            ex('french-press-ez', 'French press con EZ', { sets: 2, reps: 12, tip: 'Sdraiato, verso la fronte', points: ['Sdraiato sulla panca, braccia verso il soffitto', 'Piega solo i gomiti portando il bilanciere verso la fronte', 'Gomiti fermi, non aprirli'] }),
          ] },
        ],
      },
      {
        key: 'G', name: 'Gambe + Core', subtitle: "Forza sulle gambe, poi circuito per l'addome", minutes: 55, warmup: 'gambe',
        blocks: [
          { type: 'single', rest: 150, items: [ex('squat-bilanciere', 'Squat con bilanciere', { sets: 3, reps: 8, tip: 'Almeno a cosce parallele', points: ['Bilanciere sul trapezio, piedi larghezza spalle', 'Scendi almeno a cosce parallele, ginocchia in linea con le punte', 'Petto alto e schiena dritta, spingi con tutto il piede'] })] },
          { type: 'single', rest: 150, items: [ex('stacco-da-terra-bilanciere', 'Stacco da terra con bilanciere', { sets: 3, reps: 8, tip: 'Leggero, schiena dritta', points: ['Carico leggero: la tecnica viene prima', 'Schiena dritta, bilanciere attaccato alle gambe', 'Ogni ripetizione riparte da ferma a terra'] })] },
          { type: 'single', rest: 120, items: [ex('affondi-bulgari', 'Affondi bulgari con manubri', { sets: 2, reps: 10, perSide: true, load: 'manubri', tip: 'Piede dietro sulla panca', points: ['Piede dietro appoggiato sulla panca', 'Scendi in verticale, il ginocchio davanti resta sopra il piede', 'Fai tutte le ripetizioni con una gamba, poi cambia'] })] },
          { type: 'circuit', rest: 90, rounds: 3, items: [
            ex('mountain-climber', 'Mountain climber', { secs: 30, load: 'corpo', tip: 'Ritmo sostenuto, anca bassa', points: ['Posizione da piegamento, braccia tese', 'Porta le ginocchia al petto alternando, a ritmo', 'Anca bassa, non alzare il sedere'] }),
            ex('ab-roller', 'AB roller in ginocchio', { reps: 8, load: 'corpo', tip: 'Schiena ferma', points: ['In ginocchio sul tappetino, glutei stretti', 'Vai avanti solo finché la schiena bassa non cede', 'Torna indietro tirando con l’addome'] }),
            ex('ginocchia-petto-sbarra', 'Ginocchia al petto alla sbarra', { reps: 10, load: 'corpo', tip: 'Appeso, niente dondolio', points: ['Appeso alla sbarra a braccia tese', 'Porta le ginocchia verso il petto senza slancio', 'Scendi lento, senza dondolare'] }),
            ex('plank-laterale', 'Plank laterale', { secs: 30, perSide: true, load: 'corpo', tip: 'Anca alta', points: ['Appoggiato sull’avambraccio, gomito sotto la spalla', 'Corpo in linea, anca alta', '30 secondi per lato'] }),
          ] },
        ],
      },
      {
        key: 'B', name: 'Upper B · Spalle', subtitle: 'Spalle pesanti + trazioni e dip con aiuto', minutes: 50, warmup: 'upper',
        blocks: [
          { type: 'single', rest: 150, items: [ex('military-press', 'Military press con bilanciere', { sets: 4, reps: 6, tip: 'In piedi, pancia e glutei stretti', points: ['In piedi, prendi il bilanciere dal rack all’altezza delle spalle', 'Pancia e glutei stretti: non inarcare la schiena', 'Spingi in verticale e porta la testa "dentro" a fine spinta'] })] },
          { type: 'superset', rest: 120, items: [
            ex('trazioni-elastico', 'Trazioni con elastico', { sets: 3, reps: 6, load: 'elastico', pic: 'trazioni', tip: 'Elastico più leggero possibile', points: ['Elastico agganciato alla sbarra, sotto un piede o un ginocchio', 'Presa poco più larga delle spalle, petto verso la sbarra', 'Usa l’elastico più leggero con cui riesci a fare le ripetizioni'] }),
            ex('dip-elastico', 'Dip con elastico', { sets: 3, reps: 6, load: 'elastico', pic: 'dip', tip: 'Scendi finché il braccio è parallelo', points: ['Elastico tra le parallele sotto le ginocchia', 'Busto leggermente in avanti', 'Scendi fino a braccio parallelo, spalle lontane dalle orecchie'] }),
          ] },
          { type: 'superset', rest: 90, items: [
            ex('rematore-trx', 'Rematore al TRX', { sets: 3, reps: 12, load: 'corpo', tip: 'Corpo dritto come una tavola', points: ['Corpo dritto dalla testa ai piedi', 'Tira il petto verso le maniglie', 'Più sei inclinato, più è difficile'] }),
            ex('piegamenti', 'Piegamenti', { sets: 3, reps: 12, load: 'corpo', tip: 'Se sono troppi, fermati prima', points: ['Mani poco più larghe delle spalle', 'Corpo dritto, petto fino a un pugno da terra', 'Se non arrivi a 12, fermati quando ne avresti ancora 1–2'] }),
          ] },
          { type: 'superset', rest: 75, items: [
            ex('alzate-laterali', 'Alzate laterali con manubri', { sets: 2, reps: 15, load: 'manubri', tip: "Fino all'altezza delle spalle", points: ['Gomiti leggermente piegati', 'Sali fino all’altezza delle spalle, non oltre', 'Scendi lento'] }),
            ex('curl-martello', 'Curl a martello', { sets: 2, reps: 12, load: 'manubri', pic: 'curl', tip: 'Presa a martello', points: ['Palmi che si guardano', 'Gomiti fermi ai fianchi', 'Alterna le braccia o insieme, come preferisci'] }),
          ] },
        ],
      },
      {
        key: 'C', name: 'Upper C · Pompaggio', subtitle: 'Tutto a coppie', minutes: 55, warmup: 'upper',
        blocks: [
          { type: 'superset', rest: 90, items: [
            ex('tenuta-sbarra', 'Tenuta in alto alla sbarra', { sets: 3, secs: 15, load: 'corpo', pic: 'trazioni-alto', tip: 'Mento sopra la sbarra, resta lì', points: ['Sali dalla panca con il mento sopra la sbarra', 'Resta lì con i gomiti stretti', 'Quando non ce la fai più, scendi lento'] }),
            ex('tenuta-parallele', 'Tenuta alle parallele', { sets: 3, secs: 30, load: 'corpo', pic: 'dip-alto', tip: 'Braccia tese, spalle basse', points: ['Braccia tese sulle parallele', 'Spalle basse, lontane dalle orecchie', 'Corpo fermo'] }),
          ] },
          { type: 'superset', rest: 120, items: [
            ex('panca-inclinata-bilanciere', 'Panca inclinata con bilanciere', { sets: 3, reps: 10, tip: 'Panca a 30°', points: ['Schienale a circa 30°', 'Il bilanciere scende sulla parte alta del petto', 'Scendi in 2–3 secondi'] }),
            ex('rematore-petto-appoggiato', 'Rematore con manubri sulla panca inclinata', { sets: 3, reps: 12, load: 'manubri', tip: 'Petto appoggiato', points: ['Petto appoggiato sulla panca inclinata', 'Tira i gomiti indietro e stringi le scapole', 'Zero fatica per la schiena bassa'] }),
          ] },
          { type: 'superset', rest: 90, items: [
            ex('lento-manubri-seduto', 'Lento con manubri da seduto', { sets: 3, reps: 12, load: 'manubri', tip: 'Schiena appoggiata', points: ['Seduto con lo schienale quasi verticale', 'Spingi i manubri sopra la testa', 'Non farli sbattere in alto'] }),
            ex('pullover-manubrio', 'Pullover con manubrio', { sets: 3, reps: 12, load: 'manubri', tip: 'Braccia quasi tese', points: ['Sdraiato, un manubrio tenuto con due mani', 'Braccia quasi tese, scendi dietro la testa finché è comodo', 'Risali fino sopra il petto'] }),
          ] },
          { type: 'superset', rest: 90, items: [
            ex('curl-scott-ez', 'Curl alla panca Scott con EZ', { sets: 2, reps: 12, pic: 'curl-scott', tip: 'Braccio appoggiato', points: ['Braccio appoggiato sul cuscino della panca', 'Scendi quasi a braccio teso', 'Niente rimbalzi in basso'] }),
            ex('skull-crusher-ez', 'Skull crusher con EZ', { sets: 2, reps: 12, pic: 'french-press-ez', tip: 'Gomiti fermi', points: ['Sdraiato, bilanciere sopra il petto', 'Piega solo i gomiti, bilanciere verso la fronte', 'Gomiti fermi e stretti'] }),
          ] },
          { type: 'single', rest: 60, items: [ex('croci-posteriori', 'Croci per deltoidi posteriori con manubri', { sets: 2, reps: 15, load: 'manubri', tip: 'Busto piegato, braccia quasi tese', points: ['Busto piegato in avanti, schiena dritta', 'Apri le braccia quasi tese verso l’esterno', 'Senti lavorare la parte dietro delle spalle'] })] },
        ],
      },
    ],
  },
};

// ---------------- Scheda precedente (importata dal video dell'app che usava prima)
const oldEx = (slug, name, o = {}) => ex(slug, name, o);
export const OLD_PROGRAM = {
  name: 'Scheda precedente',
  started_on: '2026-05-01',
  ended_on: '2026-11-02',
  data: {
    cooldown: '', warmups: {},
    sessions: [
      { key: 'F', name: 'Full Body', subtitle: 'Scheda precedente', minutes: 55, warmup: null, blocks: [
        { type: 'single', rest: 90, items: [oldEx('squat-bilanciere', 'Squat con bilanciere', { reps: 10 })] },
        { type: 'single', rest: 60, items: [oldEx('piegamenti', 'Piegamenti', { sets: 1, reps: 20, load: 'corpo' })] },
        { type: 'single', rest: 90, items: [oldEx('alzata-frontale-disco', 'Alzata frontale disco', { reps: 10, load: 'manubri', pic: 'alzate-laterali' })] },
        { type: 'single', rest: 90, items: [oldEx('croci-inclinate-manubri', 'Croci petto inclinate con manubri', { reps: 10, load: 'manubri', pic: 'croci-manubri' })] },
        { type: 'single', rest: 90, items: [oldEx('skull-crusher-ez', 'Skull crusher con bilanciere', { reps: 10, pic: 'french-press-ez' })] },
        { type: 'single', rest: 90, items: [oldEx('rematore-manubrio', 'Rematore con manubrio', { reps: 10, load: 'manubri' })] },
        { type: 'single', rest: 90, items: [oldEx('curl-inclinato-manubri', 'Curl inclinato da seduto con manubri', { reps: 10, load: 'manubri', pic: 'curl' })] },
        { type: 'single', rest: 30, items: [oldEx('russian-twist', 'Russian twist con peso', { reps: 30, load: 'manubri', pic: 'ab-roller' })] },
        { type: 'single', rest: 30, items: [oldEx('plank', 'Plank', { sets: 1, secs: 45, load: 'corpo', pic: 'plank-laterale' })] },
      ] },
      { key: 'GC', name: 'Gambe + Cardio', subtitle: 'Scheda precedente', minutes: 60, warmup: null, blocks: [
        { type: 'single', rest: 90, items: [oldEx('squat-bilanciere', 'Squat con bilanciere', { reps: 10 })] },
        { type: 'single', rest: 90, items: [oldEx('leg-extension', 'Leg extension', { reps: 10, load: 'macchina' })] },
        { type: 'single', rest: 90, items: [oldEx('leg-curl', 'Leg curl in piedi', { reps: 10, load: 'macchina' })] },
        { type: 'single', rest: 90, items: [oldEx('stacco-rumeno-manubri', 'Stacco rumeno con manubri', { reps: 10, load: 'manubri', pic: 'stacco-da-terra-bilanciere' })] },
        { type: 'single', rest: 60, items: [oldEx('piegamenti', 'Piegamenti', { reps: 15, load: 'corpo' })] },
        { type: 'single', rest: 90, items: [oldEx('russian-twist', 'Russian twist con peso', { reps: 30, load: 'manubri', pic: 'ab-roller' })] },
        { type: 'single', rest: 90, items: [oldEx('leg-raise', 'Leg raise sdraiato', { reps: 20, load: 'corpo', pic: 'ginocchia-petto-sbarra' })] },
        { type: 'single', rest: 30, items: [oldEx('plank', 'Plank', { sets: 1, secs: 45, load: 'corpo', pic: 'plank-laterale' })] },
      ] },
      { key: 'T', name: 'Tirata', subtitle: 'Scheda precedente', minutes: 60, warmup: null, blocks: [
        { type: 'single', rest: 90, items: [oldEx('rematore-trx', 'Rematore invertito', { reps: 10, load: 'corpo' })] },
        { type: 'single', rest: 90, items: [oldEx('rematore-bilanciere', 'Rematore con bilanciere', { reps: 10 })] },
        { type: 'single', rest: 90, items: [oldEx('rematore-petto-appoggiato', 'Rematore con manubri, petto appoggiato', { reps: 10, load: 'manubri' })] },
        { type: 'single', rest: 90, items: [oldEx('curl-inclinato-manubri', 'Curl inclinato da seduto con manubri', { sets: 4, reps: 10, load: 'manubri', pic: 'curl' })] },
        { type: 'single', rest: 90, items: [oldEx('curl-ez', 'Curl con bilanciere EZ', { reps: 10 })] },
        { type: 'single', rest: 90, items: [oldEx('stacco-da-terra-bilanciere', 'Stacco da terra con bilanciere', { reps: 10 })] },
        { type: 'single', rest: 60, items: [oldEx('side-bend', 'Side bend con manubrio', { sets: 2, reps: 15, load: 'manubri', pic: 'alzate-laterali' })] },
      ] },
      { key: 'S', name: 'Spinta', subtitle: 'Scheda precedente', minutes: 60, warmup: null, blocks: [
        { type: 'single', rest: 60, items: [oldEx('piegamenti', 'Piegamenti', { sets: 1, reps: 20, load: 'corpo' })] },
        { type: 'single', rest: 90, items: [oldEx('panca-piana-bilanciere', 'Panca piana con bilanciere', { reps: 8 })] },
        { type: 'single', rest: 90, items: [oldEx('panca-inclinata-manubri', 'Panca inclinata con manubri', { sets: 4, reps: 10, load: 'manubri' })] },
        { type: 'single', rest: 90, items: [oldEx('jm-press', 'JM press con bilanciere', { reps: 10, pic: 'french-press-ez' })] },
        { type: 'single', rest: 90, items: [oldEx('estensione-tricipiti-bilanciere', 'Estensione tricipiti con bilanciere', { reps: 10, pic: 'french-press-ez' })] },
        { type: 'single', rest: 90, items: [oldEx('lento-manubri-seduto', 'Lento avanti con manubri', { reps: 10, load: 'manubri' })] },
        { type: 'single', rest: 90, items: [oldEx('alzate-laterali', 'Alzate laterali con manubri', { reps: 8, load: 'manubri' })] },
        { type: 'single', rest: 30, items: [oldEx('crunch', 'Crunch', { reps: 20, load: 'corpo', pic: 'ab-roller' })] },
      ] },
    ],
  },
};

// Allenamenti registrati nell'app precedente (ultimi valori visibili nel video).
const s = (kgReps) => kgReps.map(([kg, reps]) => ({ kg, reps, secs: null, t: null }));
const r = (n, kg, reps) => Array.from({ length: n }, () => [kg, reps]);
const t = (secs) => [{ kg: null, reps: null, secs, t: null }];
export const OLD_WORKOUTS = [
  { session_key: 'S', session_name: 'Spinta', date: '2026-07-29', exercises: [
    ['piegamenti', 'Piegamenti', 'corpo', s([[null, 20]])],
    ['panca-piana-bilanciere', 'Panca piana con bilanciere', 'bilanciere', s([[40, 10], [60, 8], [60, 8]])],
    ['panca-inclinata-manubri', 'Panca inclinata con manubri', 'manubri', s([[20, 10], [28, 10], [28, 10], [28, 10]])],
    ['jm-press', 'JM press con bilanciere', 'bilanciere', s([[10, 10], [14, 10], [14, 10]])],
    ['estensione-tricipiti-bilanciere', 'Estensione tricipiti con bilanciere', 'bilanciere', s(r(3, 14, 10))],
    ['lento-manubri-seduto', 'Lento avanti con manubri', 'manubri', s([[20, 10], [28, 8], [28, 10]])],
    ['alzate-laterali', 'Alzate laterali con manubri', 'manubri', s(r(3, 20, 8))],
    ['crunch', 'Crunch', 'corpo', s(r(3, null, 20))],
  ] },
  { session_key: 'GC', session_name: 'Gambe + Cardio', date: '2026-08-03', exercises: [
    ['squat-bilanciere', 'Squat con bilanciere', 'bilanciere', s(r(3, 60, 10))],
    ['leg-extension', 'Leg extension', 'macchina', s(r(3, 25, 10))],
    ['leg-curl', 'Leg curl in piedi', 'macchina', s(r(3, 10, 10))],
    ['stacco-rumeno-manubri', 'Stacco rumeno con manubri', 'manubri', s(r(3, 60, 10))],
    ['piegamenti', 'Piegamenti', 'corpo', s([[null, 20], [null, 15], [null, 10]])],
    ['russian-twist', 'Russian twist con peso', 'manubri', s(r(3, 10, 30))],
    ['leg-raise', 'Leg raise sdraiato', 'corpo', s(r(3, null, 20))],
    ['plank', 'Plank', 'corpo', t(45)],
  ] },
  { session_key: 'F', session_name: 'Full Body', date: '2026-08-10', exercises: [
    ['squat-bilanciere', 'Squat con bilanciere', 'bilanciere', s(r(3, 60, 10))],
    ['piegamenti', 'Piegamenti', 'corpo', s([[null, 20]])],
    ['alzata-frontale-disco', 'Alzata frontale disco', 'manubri', s(r(3, 10, 10))],
    ['croci-inclinate-manubri', 'Croci petto inclinate con manubri', 'manubri', s(r(3, 20, 10))],
    ['skull-crusher-ez', 'Skull crusher con bilanciere', 'bilanciere', s(r(3, 14, 10))],
    ['rematore-manubrio', 'Rematore con manubrio', 'manubri', s(r(3, 24, 10))],
    ['curl-inclinato-manubri', 'Curl inclinato da seduto con manubri', 'manubri', s(r(3, 20, 10))],
    ['russian-twist', 'Russian twist con peso', 'manubri', s(r(3, 10, 30))],
    ['plank', 'Plank', 'corpo', t(46)],
  ] },
  { session_key: 'T', session_name: 'Tirata', date: '2026-08-11', exercises: [
    ['rematore-trx', 'Rematore invertito', 'corpo', s([[null, 10], [null, 9], [null, 8]])],
    ['rematore-bilanciere', 'Rematore con bilanciere', 'bilanciere', s(r(3, 60, 10))],
    ['rematore-petto-appoggiato', 'Rematore con manubri, petto appoggiato', 'manubri', s(r(3, 28, 10))],
    ['curl-inclinato-manubri', 'Curl inclinato da seduto con manubri', 'manubri', s([[28, 10], [28, 10], [28, 8], [28, 8]])],
    ['curl-ez', 'Curl con bilanciere EZ', 'bilanciere', s(r(3, 24, 10))],
    ['stacco-da-terra-bilanciere', 'Stacco da terra con bilanciere', 'bilanciere', s(r(3, 60, 10))],
    ['side-bend', 'Side bend con manubrio', 'manubri', s(r(2, 20, 15))],
  ] },
];
