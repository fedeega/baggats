// Disegni schematici degli esercizi: omino di profilo, due pose che si alternano.
const W = 160, H = 120, FLOOR = 113;

const norm = ([x, y]) => { const l = Math.hypot(x, y) || 1; return [x / l, y / l]; };
const L = (pts, cls = 'lb') => `<polyline class="${cls}" points="${pts.map((p) => p.join(',')).join(' ')}"/>`;

function figure(p) {
  let s = '';
  if (p.K2) s += L([p.P, p.K2, p.F2], 'lb far');
  if (p.E2) s += L([p.S, p.E2, p.H2], 'lb far');
  s += L([p.S, p.P]);
  s += L([p.P, p.K, p.F]);
  if (!p.noFoot) { const d = p.dir ?? 1; s += L([p.F, [p.F[0] + 8 * d, p.F[1]]]); }
  s += L([p.S, p.E, p.H]);
  const hd = p.Hd || (() => { const n = norm([p.S[0] - p.P[0], p.S[1] - p.P[1]]); return [p.S[0] + n[0] * 12, p.S[1] + n[1] * 12]; })();
  s += `<circle class="hd" cx="${hd[0]}" cy="${hd[1]}" r="7.5"/>`;
  return s;
}

// ---- attrezzi
const bar = ([x, y]) => `<circle class="pl" cx="${x}" cy="${y}" r="10"/><circle class="plc" cx="${x}" cy="${y}" r="2.5"/>`;
const db = ([x, y]) => `<rect class="db" x="${x - 7}" y="${y - 4}" width="14" height="8" rx="3"/>`;
const bench = (x1, x2, y = 82) => `<line class="eq" x1="${x1}" y1="${y}" x2="${x2}" y2="${y}"/><line class="eq th" x1="${x1 + 6}" y1="${y}" x2="${x1 + 6}" y2="${FLOOR}"/><line class="eq th" x1="${x2 - 6}" y1="${y}" x2="${x2 - 6}" y2="${FLOOR}"/>`;
const line = (a, b, c = 'eq') => `<line class="${c}" x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}"/>`;
const floor = `<line class="fl" x1="6" y1="${FLOOR + 3}" x2="${W - 6}" y2="${FLOOR + 3}"/>`;
const pullbar = `<line class="eq" x1="40" y1="12" x2="120" y2="12"/><line class="eq th" x1="44" y1="12" x2="44" y2="${FLOOR}"/><line class="eq th" x1="116" y1="12" x2="116" y2="${FLOOR}"/>`;
const parallels = `<line class="eq" x1="62" y1="64" x2="104" y2="64"/><line class="eq th" x1="66" y1="64" x2="66" y2="${FLOOR}"/><line class="eq th" x1="100" y1="64" x2="100" y2="${FLOOR}"/>`;

const lying = (arm) => ({ S: [52, 74], P: [100, 74], K: [122, 60], F: [126, 106], ...arm });
const standing = (arm) => ({ S: [80, 34], P: [80, 70], K: [81, 92], F: [80, FLOOR], ...arm });
const bent = (arm) => ({ S: [106, 48], P: [70, 68], K: [78, 90], F: [72, FLOOR], ...arm });
const hang = (o = {}) => ({ S: [80, 48], P: [80, 84], K: [84, 100], F: [74, 110], dir: -1, E: [80, 31], H: [80, 14], ...o });
const plankTop = (o = {}) => ({ S: [114, 84], P: [72, 95], K: [50, 101], F: [28, 108], E: [115, 98], H: [116, FLOOR], dir: -1, ...o });

// Ogni voce: [scena fissa, posa 1, posa 2, extra posa 1, extra posa 2]
const P = {
  'panca-piana-bilanciere': [bench(28, 124), lying({ E: [50, 90], H: [62, 62] }), lying({ E: [54, 52], H: [54, 30] }), (p) => bar(p.H), (p) => bar(p.H)],
  'panca-piana-manubri': [bench(28, 124), lying({ E: [44, 88], H: [56, 64] }), lying({ E: [54, 52], H: [54, 30] }), (p) => db(p.H), (p) => db(p.H)],
  'croci-manubri': [bench(28, 124), lying({ E: [44, 82], H: [36, 94] }), lying({ E: [54, 52], H: [54, 30] }), (p) => db(p.H), (p) => db(p.H)],
  'french-press-ez': [bench(28, 124), lying({ E: [56, 46], H: [40, 58] }), lying({ E: [55, 50], H: [54, 28] }), (p) => bar(p.H), (p) => bar(p.H)],
  'pullover-manubrio': [bench(28, 124), lying({ E: [34, 66], H: [16, 72] }), lying({ E: [53, 52], H: [54, 32] }), (p) => db(p.H), (p) => db(p.H)],
  'panca-inclinata-manubri': [line([70, 92], [106, 92]) + line([74, 92], [44, 48]) + line([76, 92], [76, FLOOR], 'eq th') + line([100, 92], [100, FLOOR], 'eq th'),
    { S: [56, 54], P: [80, 86], K: [108, 80], F: [112, FLOOR], E: [46, 74], H: [66, 56] }, { S: [56, 54], P: [80, 86], K: [108, 80], F: [112, FLOOR], E: [62, 34], H: [64, 16] }, (p) => db(p.H), (p) => db(p.H)],
  'military-press': [floor, standing({ E: [84, 52], H: [92, 34] }), standing({ E: [84, 18], H: [83, 4] }), (p) => bar(p.H), (p) => bar(p.H)],
  'lento-manubri-seduto': [line([66, 88], [100, 88]) + line([70, 88], [70, 38]) + line([72, 88], [72, FLOOR], 'eq th') + line([96, 88], [96, FLOOR], 'eq th'),
    { S: [78, 46], P: [78, 82], K: [104, 82], F: [104, FLOOR], E: [92, 58], H: [94, 42] }, { S: [78, 46], P: [78, 82], K: [104, 82], F: [104, FLOOR], E: [88, 26], H: [86, 10] }, (p) => db(p.H), (p) => db(p.H)],
  'rematore-bilanciere': [floor, bent({ E: [108, 70], H: [108, 92] }), bent({ E: [86, 60], H: [98, 74] }), (p) => bar(p.H), (p) => bar(p.H)],
  'rematore-manubrio': [bench(96, 150, 78), bent({ S: [110, 54], E: [104, 74], H: [104, 94], E2: [128, 66], H2: [132, 78] }), bent({ S: [110, 54], E: [88, 62], H: [96, 78], E2: [128, 66], H2: [132, 78] }), (p) => db(p.H), (p) => db(p.H)],
  'rematore-petto-appoggiato': [line([54, 94], [100, 62]) + line([60, 92], [60, FLOOR], 'eq th') + line([96, 66], [96, FLOOR], 'eq th'),
    { S: [96, 54], P: [58, 80], K: [48, 96], F: [42, FLOOR], E: [100, 76], H: [100, 98] }, { S: [96, 54], P: [58, 80], K: [48, 96], F: [42, FLOOR], E: [78, 58], H: [90, 76] }, (p) => db(p.H), (p) => db(p.H)],
  'trazioni': [pullbar, hang(), hang({ S: [80, 30], P: [80, 66], K: [84, 82], F: [74, 94], E: [68, 34], H: [80, 14], Hd: [86, 4] })],
  'trazioni-alto': [pullbar, hang({ S: [80, 30], P: [80, 66], K: [84, 82], F: [74, 94], E: [68, 34], H: [80, 14], Hd: [86, 4] }), hang({ S: [80, 31], P: [80, 67], K: [84, 83], F: [74, 95], E: [68, 35], H: [80, 14], Hd: [86, 5] })],
  'dip': [parallels, { S: [84, 36], P: [80, 72], K: [88, 88], F: [76, 98], dir: -1, E: [84, 50], H: [84, 64] }, { S: [88, 54], P: [80, 88], K: [90, 102], F: [78, 110], dir: -1, E: [66, 56], H: [84, 64] }],
  'dip-alto': [parallels, { S: [84, 36], P: [80, 72], K: [88, 88], F: [76, 98], dir: -1, E: [84, 50], H: [84, 64] }, { S: [84, 37], P: [80, 73], K: [88, 89], F: [76, 99], dir: -1, E: [84, 51], H: [84, 64] }],
  'curl': [floor, standing({ E: [82, 54], H: [84, 74] }), standing({ E: [82, 54], H: [94, 38] }), (p) => db(p.H), (p) => db(p.H)],
  'curl-ez': [floor, standing({ E: [82, 54], H: [86, 74] }), standing({ E: [82, 54], H: [96, 38] }), (p) => bar(p.H), (p) => bar(p.H)],
  'curl-scott': [line([86, 52], [112, 74]) + line([104, 74], [104, FLOOR], 'eq th') + line([58, 86], [84, 86]),
    { S: [76, 44], P: [70, 82], K: [96, 84], F: [96, FLOOR], E: [100, 64], H: [118, 84] }, { S: [76, 44], P: [70, 82], K: [96, 84], F: [96, FLOOR], E: [100, 64], H: [94, 40] }, (p) => bar(p.H), (p) => bar(p.H)],
  'alzate-laterali': 'front',
  'croci-posteriori': [floor, bent({ E: [108, 72], H: [110, 92] }), bent({ E: [104, 54], H: [102, 34] }), (p) => db(p.H), (p) => db(p.H)],
  'rematore-trx': [floor + '<circle class="eq" cx="136" cy="6" r="3"/>',
    { S: [104, 56], P: [70, 84], K: [55, 98], F: [40, FLOOR], E: [114, 48], H: [122, 40] }, { S: [104, 44], P: [72, 78], K: [56, 96], F: [40, FLOOR], E: [94, 50], H: [112, 38] },
    (p) => line(p.H, [136, 6], 'st'), (p) => line(p.H, [136, 6], 'st')],
  'piegamenti': [floor, plankTop(), plankTop({ S: [112, 100], P: [70, 104], K: [48, 107], E: [100, 92], H: [116, FLOOR] })],
  'mountain-climber': [floor, plankTop({ K2: [50, 101], F2: [28, 108] }), plankTop({ K: [96, 92], F: [80, 104], K2: [50, 101], F2: [28, 108] })],
  'ab-roller': [floor, { S: [86, 62], P: [56, 82], K: [50, FLOOR - 2], F: [26, FLOOR - 2], dir: -1, E: [96, 84], H: [100, 104] }, { S: [114, 90], P: [76, 96], K: [50, FLOOR - 2], F: [26, FLOOR - 2], dir: -1, E: [128, 98], H: [138, 104] },
    (p) => `<circle class="pl" cx="${p.H[0]}" cy="${FLOOR - 6}" r="7"/>`, (p) => `<circle class="pl" cx="${p.H[0]}" cy="${FLOOR - 6}" r="7"/>`],
  'ginocchia-petto-sbarra': [pullbar, hang({ K: [80, 100], F: [80, 112], dir: 1 }), hang({ K: [98, 74], F: [92, 94], dir: 1 })],
  'plank-laterale': [floor, { S: [116, 78], P: [74, 94], K: [52, 101], F: [28, 108], dir: -1, E: [118, 110], H: [134, 110] }, { S: [116, 78], P: [74, 98], K: [52, 103], F: [28, 108], dir: -1, E: [118, 110], H: [134, 110] }],
  'squat-bilanciere': [floor, { S: [82, 32], P: [80, 68], K: [84, 90], F: [80, FLOOR], E: [68, 42], H: [80, 32] }, { S: [84, 52], P: [56, 86], K: [98, 84], F: [84, FLOOR], E: [70, 62], H: [82, 52] },
    (p) => bar([p.S[0] - 11, p.S[1] + 1]), (p) => bar([p.S[0] - 11, p.S[1] + 1])],
  'stacco-da-terra-bilanciere': [floor, standing({ E: [83, 52], H: [86, 70] }), { S: [102, 52], P: [62, 78], K: [88, 88], F: [80, FLOOR], E: [102, 76], H: [100, 98] },
    (p) => bar(p.H), (p) => bar([p.H[0], FLOOR - 10])],
  'affondi-bulgari': [bench(18, 52, 80) + floor,
    { S: [82, 28], P: [80, 64], K: [98, 86], F: [100, FLOOR], K2: [62, 86], F2: [40, 78], E: [84, 46], H: [84, 64] },
    { S: [80, 48], P: [76, 84], K: [102, 86], F: [100, FLOOR], K2: [66, 108], F2: [40, 78], E: [82, 66], H: [82, 84] }, (p) => db(p.H), (p) => db(p.H)],
  'leg-extension': [`<rect class="eq" x="56" y="80" width="42" height="8" rx="3"/>` + line([58, 80], [58, 40]) + line([78, 88], [78, FLOOR], 'eq th'),
    { S: [66, 44], P: [70, 78], K: [96, 78], F: [98, 108], E: [74, 62], H: [82, 80] }, { S: [66, 44], P: [70, 78], K: [96, 78], F: [126, 72], E: [74, 62], H: [82, 80] }],
  'leg-curl': [floor, standing({ E: [82, 54], H: [86, 72], K2: [80, 92], F2: [80, FLOOR] }), standing({ E: [82, 54], H: [86, 72], K: [80, 92], F: [62, 82], dir: -1, K2: [80, 92], F2: [80, FLOOR] })],
};

{
  const inc = P['panca-inclinata-manubri'];
  P['panca-inclinata-bilanciere'] = [inc[0], { ...inc[1], H: [70, 54] }, inc[2], (p) => bar(p.H), (p) => bar(p.H)];
}
const ALIAS = {
  'skull-crusher-ez': 'french-press-ez', 'curl-martello': 'curl', 'curl-scott-ez': 'curl-scott',
  'trazioni-negative': 'trazioni', 'trazioni-elastico': 'trazioni', 'tenuta-sbarra': 'trazioni-alto',
  'dip-negative': 'dip', 'dip-elastico': 'dip', 'tenuta-parallele': 'dip-alto', 'squat': 'squat-bilanciere',
};

function front(up) {
  const arms = up
    ? `${L([[70, 40], [52, 44], [38, 42]])}${L([[90, 40], [108, 44], [122, 42]])}${db([38, 42])}${db([122, 42])}`
    : `${L([[70, 40], [66, 58], [64, 76]])}${L([[90, 40], [94, 58], [96, 76]])}${db([64, 78])}${db([96, 78])}`;
  return `${L([[70, 40], [90, 40]])}${L([[80, 40], [80, 76]])}${L([[72, 76], [88, 76]])}${L([[72, 76], [70, 112]])}${L([[88, 76], [90, 112]])}<circle class="hd" cx="80" cy="27" r="7.5"/>${arms}`;
}

export function hasPic(key) { return !!P[ALIAS[key] || key]; }
export const PIC_KEYS = Object.keys(P);

export function picSVG(key, cls = '') {
  const d = P[ALIAS[key] || key];
  if (!d) {
    return `<svg class="pic ${cls}" viewBox="0 0 ${W} ${H}" aria-hidden="true"><g class="still"><rect class="db" x="44" y="54" width="72" height="12" rx="4"/><rect class="db" x="36" y="42" width="14" height="36" rx="4"/><rect class="db" x="110" y="42" width="14" height="36" rx="4"/></g></svg>`;
  }
  let a, b;
  if (d === 'front') { a = floor + front(false); b = floor + front(true); }
  else {
    const [scene, p1, p2, x1, x2] = d;
    a = scene + figure(p1) + (x1 ? x1(p1) : '');
    b = scene + figure(p2) + (x2 ? x2(p2) : '');
  }
  return `<svg class="pic ${cls}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Disegno dell'esercizio"><g class="f1">${a}</g><g class="f2">${b}</g></svg>`;
}
