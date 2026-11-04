export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];
export const monthName = (m) => MESI[m];
export const dayKey = (d) => { const x = new Date(d); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
export const today = () => dayKey(new Date());
export const fmtDate = (d) => { const x = new Date(d); return `${GIORNI[x.getDay()]} ${x.getDate()} ${MESI[x.getMonth()]}`; };
export const fmtDateShort = (d) => { const x = new Date(d); return `${x.getDate()} ${MESI[x.getMonth()].slice(0, 3)}`; };
export const fmtTime = (d) => { const x = new Date(d); return `${String(x.getHours()).padStart(2, '0')}:${String(x.getMinutes()).padStart(2, '0')}`; };
export const daysAgo = (d) => {
  const a = new Date(dayKey(new Date())); const b = new Date(dayKey(d));
  const n = Math.round((a - b) / 86400000);
  return n === 0 ? 'oggi' : n === 1 ? 'ieri' : `${n} giorni fa`;
};
export const mmss = (s) => { s = Math.max(0, Math.round(s)); const m = Math.floor(s / 60); const r = s % 60; return `${m}:${String(r).padStart(2, '0')}`; };
export const restLabel = (s) => (s >= 60 ? (s % 60 ? `${Math.floor(s / 60)}'${String(s % 60).padStart(2, '0')}"` : `${s / 60}'`) : `${s}"`);
export const kgFmt = (v) => (v == null || v === '' ? '–' : `${String(+(+v).toFixed(2)).replace('.', ',')}`);
export const num = (v) => { if (v === '' || v == null) return null; const n = parseFloat(String(v).replace(',', '.')); return Number.isFinite(n) ? n : null; };

export const SESSION_COLORS = { A: 'var(--s-a)', G: 'var(--s-g)', B: 'var(--s-b)', C: 'var(--s-c)' };
export const sessionColor = (key, i = 0) => SESSION_COLORS[key] || ['var(--s-a)', 'var(--s-g)', 'var(--s-b)', 'var(--s-c)'][i % 4];
export const sessionLetter = (key) => (key === 'G' ? 'G' : (key || '?').slice(0, 1));

const ic = (d, extra = '') => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true" ${extra}>${d}</svg>`;
export const I = {
  home: ic('<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'),
  list: ic('<path d="M8 6h13M8 12h13M8 18h13"/><circle cx="3.5" cy="6" r="1.2"/><circle cx="3.5" cy="12" r="1.2"/><circle cx="3.5" cy="18" r="1.2"/>'),
  chart: ic('<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>'),
  edit: ic('<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M14 6l4 4"/>'),
  play: ic('<path d="M7 4l13 8-13 8z" fill="currentColor"/>'),
  check: ic('<path d="M4 12.5l5 5L20 6.5"/>'),
  plus: ic('<path d="M12 5v14M5 12h14"/>'),
  minus: ic('<path d="M5 12h14"/>'),
  info: ic('<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>'),
  close: ic('<path d="M6 6l12 12M18 6L6 18"/>'),
  scale: ic('<rect x="3" y="4" width="18" height="16" rx="4"/><path d="M8.5 10a4 4 0 0 1 7 0l-3.5 2"/>'),
  msg: ic('<path d="M4 5h16v11H9l-5 4z"/>'),
  out: ic('<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>'),
  back: ic('<path d="M15 5l-7 7 7 7"/>'),
  right: ic('<path d="M9 5l7 7-7 7"/>'),
  up: ic('<path d="M6 15l6-6 6 6"/>'),
  down: ic('<path d="M6 9l6 6 6-6"/>'),
  trash: ic('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  yt: ic('<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="M10 9.5l5 2.5-5 2.5z" fill="currentColor"/>'),
  note: ic('<path d="M5 3h10l4 4v14H5z"/><path d="M9 12h6M9 16h4"/>'),
  fire: ic('<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-6 2 1 3 2 3-4z"/>'),
  trophy: ic('<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4v1a4 4 0 0 0 4 4M16 6h4v1a4 4 0 0 1-4 4M12 13v4M8 20h8M10 17h4v3h-4z"/>'),
  clock: ic('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  link: ic('<path d="M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1"/>'),
  upload: ic('<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>'),
  copy: ic('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4h12"/>'),
  user: ic('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  alert: ic('<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>'),
  skip: ic('<path d="M5 5l9 7-9 7zM18 5v14"/>'),
};

export const FACES = ['😌', '🙂', '😐', '😓', '🥵'];
export const FACE_LABELS = ['Facile', 'Bene', 'Giusto', 'Duro', 'Durissimo'];
