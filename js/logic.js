import { dayKey } from './util.js';

export const MAIN_LIFTS = [
  { slug: 'panca-piana-bilanciere', short: 'Panca' },
  { slug: 'military-press', short: 'Military' },
  { slug: 'squat-bilanciere', short: 'Squat' },
  { slug: 'stacco-da-terra-bilanciere', short: 'Stacco' },
];
export const SKILLS = [
  { name: 'Trazioni', stages: [['trazioni-negative', 'Negative'], ['trazioni-elastico', 'Con elastico'], ['trazioni', 'Libere'], ['trazioni-libere', 'Libere']] },
  { name: 'Dip', stages: [['dip-negative', 'Negative'], ['dip-elastico', 'Con elastico'], ['dip', 'Libere'], ['dip-libere', 'Libere']] },
];

export const activeProgram = (d) => d.programs.find((p) => p.active) || [...d.programs].sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))[0] || null;
export const workoutsSorted = (d) => [...d.workouts].filter((w) => w.started_at).sort((a, b) => a.started_at.localeCompare(b.started_at));
export const isLegs = (w) => w.session_key === 'G' || w.session_key === 'GC' || /gamb/i.test(w.session_name || '');

export function nextSession(d) {
  const p = activeProgram(d); if (!p) return null;
  const ss = p.data.sessions; if (!ss.length) return null;
  const last = workoutsSorted(d).filter((w) => w.program_id === p.id).pop();
  if (!last) return ss[0];
  const i = ss.findIndex((s) => s.key === last.session_key);
  return ss[(i + 1) % ss.length];
}

export function lastSetsFor(d, slug, excludeId = null) {
  const ws = workoutsSorted(d);
  for (let i = ws.length - 1; i >= 0; i--) {
    if (ws[i].id === excludeId) continue;
    const e = ws[i].exercises?.find((x) => x.slug === slug && x.sets?.length);
    if (e) return { sets: e.sets, date: ws[i].started_at };
  }
  return null;
}

const STEP = { bilanciere: 2.5, manubri: 2, macchina: 5 };
export function suggestion(ex, last) {
  if (!last || !ex.reps) return null;
  const sets = last.sets.filter((s) => s.reps != null);
  if (sets.length < (ex.sets || 1)) return null;
  const allDone = sets.every((s) => s.reps >= ex.reps);
  if (!allDone) return null;
  if (STEP[ex.load]) {
    const kgs = sets.map((s) => s.kg).filter((k) => k != null);
    if (!kgs.length) return null;
    const top = Math.max(...kgs);
    const step = STEP[ex.load];
    return { kg: top + step, text: `Ultima volta tutte fatte: prova ${String(top + step).replace('.', ',')} kg${ex.load === 'manubri' ? ' per manubrio' : ''}` };
  }
  if (ex.load === 'elastico') return { text: 'Ultima volta tutte fatte: prova un elastico più leggero' };
  if (ex.load === 'corpo') return { text: 'Ultima volta tutte fatte: prova a farne 1 in più' };
  return null;
}

export const e1rm = (kg, reps) => (kg && reps ? kg * (1 + Math.min(reps, 15) / 30) : 0);
export function bestSet(sets) {
  let best = null;
  for (const s of sets || []) {
    if (s.kg == null || !s.reps) continue;
    const v = e1rm(s.kg, s.reps);
    if (!best || v > best.e1rm) best = { kg: s.kg, reps: s.reps, e1rm: v };
  }
  return best;
}

// Record personali: per ogni esercizio, la serie con il massimale stimato più alto (o più ripetizioni a corpo libero)
export function records(d, excludeId = null) {
  const out = {};
  for (const w of workoutsSorted(d)) {
    if (w.id === excludeId) continue;
    for (const e of w.exercises || []) {
      const b = bestSet(e.sets);
      const cur = out[e.slug];
      if (b) {
        if (!cur || cur.type !== 'kg' || b.e1rm > cur.e1rm + 1e-9) out[e.slug] = { type: 'kg', slug: e.slug, name: e.name, ...b, date: w.started_at };
      } else {
        const reps = Math.max(0, ...(e.sets || []).map((s) => s.reps || 0));
        const secs = Math.max(0, ...(e.sets || []).map((s) => s.secs || 0));
        if (reps && (!cur || (cur.type === 'reps' && reps > cur.reps))) out[e.slug] = { type: 'reps', slug: e.slug, name: e.name, reps, date: w.started_at };
        else if (!reps && secs && (!cur || (cur.type === 'secs' && secs > cur.secs))) out[e.slug] = { type: 'secs', slug: e.slug, name: e.name, secs, date: w.started_at };
      }
    }
  }
  return out;
}

export function newRecords(d, w) {
  const before = records(d, w.id);
  const res = [];
  for (const e of w.exercises || []) {
    const prev = before[e.slug];
    const b = bestSet(e.sets);
    if (b) { if (prev && prev.type === 'kg' && b.e1rm > prev.e1rm + 1e-9 && b.kg >= prev.kg) res.push({ name: e.name, text: `${fmt(b.kg)} kg × ${b.reps}` }); }
    else {
      const reps = Math.max(0, ...(e.sets || []).map((s) => s.reps || 0));
      if (prev && prev.type === 'reps' && reps > prev.reps) res.push({ name: e.name, text: `${reps} ripetizioni` });
    }
  }
  return res;
}
const fmt = (v) => String(+v.toFixed(2)).replace('.', ',');

export function workoutStats(w) {
  const sets = (w.exercises || []).flatMap((e) => e.sets || []);
  const vol = sets.reduce((a, s) => a + (s.kg && s.reps ? s.kg * s.reps : 0), 0);
  const mins = w.started_at && w.ended_at ? Math.round((new Date(w.ended_at) - new Date(w.started_at)) / 60000) : null;
  return { sets: sets.length, vol: Math.round(vol), mins };
}

// Tempo tra una serie e la successiva quando era prevista una pausa (pausa reale + esecuzione)
export const WORK_EST = 40;
export function restGaps(w) {
  const flat = [];
  for (const e of w.exercises || []) for (const s of e.sets || []) if (s.t) flat.push({ e, s, t: +new Date(s.t) });
  flat.sort((a, b) => a.t - b.t);
  const gaps = [];
  for (let i = 0; i < flat.length - 1; i++) {
    const r = flat[i].s.r;
    if (!r) continue;
    const next = flat[i + 1];
    const gap = (next.t - flat[i].t) / 1000;
    const work = next.s.secs || WORK_EST;
    gaps.push({ slug: flat[i].e.slug, planned: r, gap, rest: Math.max(0, gap - work), at: flat[i].s.t });
  }
  return gaps;
}

export function weekStart(d) { const x = new Date(d); const day = (x.getDay() + 6) % 7; x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - day); return x; }

export function weeklyVolume(d, weeks = 10) {
  const start = weekStart(new Date()); start.setDate(start.getDate() - 7 * (weeks - 1));
  const out = [];
  for (let i = 0; i < weeks; i++) { const ws = new Date(start); ws.setDate(start.getDate() + 7 * i); out.push({ start: ws, upper: 0, legs: 0, count: 0 }); }
  for (const w of workoutsSorted(d)) {
    const ws = +weekStart(w.started_at);
    const slot = out.find((o) => +o.start === ws); if (!slot) continue;
    const v = workoutStats(w).vol; slot.count++;
    if (isLegs(w)) slot.legs += v; else slot.upper += v;
  }
  return out;
}

export function strengthSeries(d, slug) {
  const pts = [];
  for (const w of workoutsSorted(d)) {
    const e = (w.exercises || []).find((x) => x.slug === slug); if (!e) continue;
    const b = bestSet(e.sets); if (!b) continue;
    pts.push({ x: new Date(w.started_at), y: Math.round(b.e1rm * 10) / 10, best: b, imported: w.imported });
  }
  return pts;
}

export function skillProgress(d, skill) {
  const slugs = skill.stages.map((s) => s[0]);
  const pts = [];
  let current = null;
  for (const w of workoutsSorted(d)) {
    const e = (w.exercises || []).find((x) => slugs.includes(x.slug)); if (!e) continue;
    const stage = skill.stages.find((s) => s[0] === e.slug)[1];
    const reps = (e.sets || []).reduce((a, s) => a + (s.reps || 0), 0);
    const best = Math.max(0, ...(e.sets || []).map((s) => s.reps || 0));
    const idx = skill.stages.findIndex((s) => s[0] === e.slug);
    pts.push({ x: new Date(w.started_at), y: reps, stage, best, nsets: e.sets.length });
    if (!current || idx > current.idx || (idx === current.idx && best >= current.best)) current = { stage, best, idx, date: w.started_at, sets: e.sets };
  }
  return { pts, current };
}

export function streakWeeks(d) {
  const set = new Set(workoutsSorted(d).map((w) => +weekStart(w.started_at)));
  let n = 0; const ws = weekStart(new Date());
  if (!set.has(+ws)) ws.setDate(ws.getDate() - 7);
  while (set.has(+ws)) { n++; ws.setDate(ws.getDate() - 7); }
  return n;
}

export const workoutsByDay = (d) => {
  const m = {};
  for (const w of workoutsSorted(d)) { const k = dayKey(w.started_at); (m[k] = m[k] || []).push(w); }
  return m;
};
