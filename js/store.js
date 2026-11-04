// Dati: Supabase (vero) o demo (solo nel browser), con cache e coda offline.
import { CONFIG } from './config.js';
import { INITIAL_PROGRAM, OLD_PROGRAM, OLD_WORKOUTS } from './program-data.js';

export const LS = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* pieno o bloccato */ } },
  del(k) { try { localStorage.removeItem(k); } catch { /* */ } },
};

export function uuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const isNetErr = (e) => !navigator.onLine || /fetch|network|load failed|timeout|jwt|refresh token/i.test(String(e?.message || e));
const clone = (x) => JSON.parse(JSON.stringify(x));

// ------------------------------------------------------------ SUPABASE
class SupabaseBackend {
  constructor() {
    this.sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'baggats-auth' },
    });
    this.demo = false;
  }
  async session() {
    const { data } = await this.sb.auth.getSession();
    return data.session ? { uid: data.session.user.id, email: data.session.user.email } : null;
  }
  async signIn(email, password) {
    const { data, error } = await this.sb.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message.includes('Invalid') ? 'Email o password sbagliate' : error.message);
    return { uid: data.user.id, email: data.user.email };
  }
  async signOut() { await this.sb.auth.signOut(); }
  async q(p) { const { data, error } = await p; if (error) throw error; return data; }
  async fetchAll(uid) {
    const me = await this.q(this.sb.from('profiles').select('*').eq('id', uid).single());
    let athlete = me;
    let coach = null;
    if (me.role === 'coach') {
      const list = await this.q(this.sb.from('profiles').select('*').eq('coach_id', uid).order('created_at'));
      athlete = list[0] || null;
    } else if (me.coach_id) {
      coach = await this.q(this.sb.from('profiles').select('*').eq('id', me.coach_id).maybeSingle());
    }
    if (!athlete) return { me, athlete: null, coach, programs: [], workouts: [], bodyweights: [], messages: [] };
    const a = athlete.id;
    const [programs, workouts, bodyweights, messages] = await Promise.all([
      this.q(this.sb.from('programs').select('*').eq('athlete_id', a).order('created_at')),
      this.q(this.sb.from('workouts').select('*').eq('athlete_id', a).order('started_at')),
      this.q(this.sb.from('bodyweights').select('*').eq('athlete_id', a).order('measured_on')),
      this.q(this.sb.from('messages').select('*').eq('athlete_id', a).order('created_at')),
    ]);
    return { me, athlete, coach, programs, workouts, bodyweights, messages };
  }
  async run(op) {
    const t = this.sb.from(op.table);
    if (op.kind === 'upsert') return this.q(t.upsert(op.row));
    if (op.kind === 'update') return this.q(t.update(op.patch).eq('id', op.id));
    if (op.kind === 'delete') return this.q(t.delete().eq('id', op.id));
    throw new Error('op sconosciuta');
  }
  async upload(file) {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const path = `esercizi/${uuid()}.${ext}`;
    const { error } = await this.sb.storage.from('media').upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return this.sb.storage.from('media').getPublicUrl(path).data.publicUrl;
  }
}

// ------------------------------------------------------------ DEMO (nel browser)
const DEMO_COACH = '00000000-0000-4000-8000-00000000c0ac';
const DEMO_ATHLETE = '00000000-0000-4000-8000-0000000061a0';
class DemoBackend {
  constructor() { this.demo = true; this.db = LS.get('bg_demo_db', null) || this.seed(); }
  persist() { LS.set('bg_demo_db', this.db); }
  async session() { const s = LS.get('bg_demo_session', null); return s; }
  async signIn(role) {
    const s = role === 'coach' ? { uid: DEMO_COACH, email: 'fede@demo' } : { uid: DEMO_ATHLETE, email: 'gian@demo' };
    LS.set('bg_demo_session', s); return s;
  }
  async signOut() { LS.del('bg_demo_session'); }
  async fetchAll(uid) {
    const d = this.db;
    const me = d.profiles.find((p) => p.id === uid);
    const athlete = d.profiles.find((p) => p.id === DEMO_ATHLETE);
    const coach = d.profiles.find((p) => p.id === DEMO_COACH);
    return clone({ me, athlete, coach: me.role === 'athlete' ? coach : null, programs: d.programs, workouts: d.workouts, bodyweights: d.bodyweights, messages: d.messages });
  }
  async run(op) {
    const tbl = this.db[op.table];
    if (op.kind === 'upsert') {
      const rows = Array.isArray(op.row) ? op.row : [op.row];
      for (const row of rows) {
        const i = tbl.findIndex((r) => r.id === row.id);
        const now = new Date().toISOString();
        if (i >= 0) tbl[i] = { ...tbl[i], ...row, updated_at: now };
        else tbl.push({ created_at: now, updated_at: now, ...row });
      }
    } else if (op.kind === 'update') {
      const r = tbl.find((x) => x.id === op.id); if (r) Object.assign(r, op.patch, { updated_at: new Date().toISOString() });
    } else if (op.kind === 'delete') {
      this.db[op.table] = tbl.filter((r) => r.id !== op.id);
    }
    this.persist();
  }
  async upload(file) {
    return await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(file); });
  }
  reset() { LS.del('bg_demo_db'); this.db = this.seed(); }
  seed() {
    const now = new Date();
    const db = {
      profiles: [
        { id: DEMO_COACH, role: 'coach', name: 'Fede', coach_id: null },
        { id: DEMO_ATHLETE, role: 'athlete', name: 'Gian', coach_id: DEMO_COACH },
      ],
      programs: [], workouts: [], bodyweights: [], messages: [],
    };
    const seeded = buildSeed(DEMO_ATHLETE);
    db.programs.push(...seeded.programs);
    db.workouts.push(...seeded.workouts);
    // Storico finto realistico solo per la demo: 5 settimane di nuova scheda
    const prog = seeded.programs.find((p) => p.active);
    const start = new Date(now); start.setDate(start.getDate() - 35);
    prog.started_on = start.toISOString().slice(0, 10);
    const order = prog.data.sessions.map((s) => s.key);
    const dayOffsets = [0, 1, 3, 5];
    let k = 0;
    const base = { 'panca-piana-bilanciere': 52.5, 'rematore-bilanciere': 50, 'panca-inclinata-manubri': 22, 'curl-ez': 20, 'french-press-ez': 14,
      'military-press': 30, 'alzate-laterali': 8, 'curl-martello': 12, 'squat-bilanciere': 55, 'stacco-da-terra-bilanciere': 50,
      'affondi-bulgari': 10, 'panca-inclinata-bilanciere': 40, 'rematore-petto-appoggiato': 18, 'lento-manubri-seduto': 16,
      'pullover-manubrio': 16, 'curl-scott-ez': 16, 'skull-crusher-ez': 14, 'croci-posteriori': 6 };
    for (let w = 0; w < 5; w++) {
      for (const off of dayOffsets) {
        const day = new Date(start); day.setDate(start.getDate() + w * 7 + off);
        if (day > now) continue;
        if (w === 2 && off === 5) continue; // una seduta saltata
        const sess = prog.data.sessions[k % order.length]; k++;
        day.setHours(18, 10, 0, 0);
        const wk = { id: uuid(), athlete_id: DEMO_ATHLETE, program_id: prog.id, session_key: sess.key, session_name: sess.name,
          started_at: day.toISOString(), warmup_done: true, plan: sess, imported: false,
          fatigue: 2 + ((w + off) % 3), pain: w === 3 && off === 1, pain_where: w === 3 && off === 1 ? 'Spalla destra, poco' : '',
          note: w === 1 && off === 0 ? 'Panca bene, ultima serie dura' : '', exercises: [] };
        let t = day.getTime() + 9 * 60000;
        for (const b of sess.blocks) {
          const rounds = b.type === 'circuit' ? b.rounds : Math.max(...b.items.map((i) => i.sets));
          const exs = b.items.map((it) => ({ slug: it.slug, name: it.name, load: it.load, rest: b.rest, block: b.type, note: '', sets: [] }));
          for (let r = 0; r < rounds; r++) {
            b.items.forEach((it, j) => {
              if (b.type !== 'circuit' && r >= it.sets) return;
              t += (it.secs ? it.secs : 40) * 1000;
              const kg = it.load === 'bilanciere' || it.load === 'manubri' ? (base[it.slug] || 10) + Math.floor(w / 2) * (it.load === 'bilanciere' ? 2.5 : 2) : null;
              const reps = it.secs ? null : Math.max(1, (it.reps || 8) - (r === rounds - 1 && w % 2 === 0 ? 1 : 0) + (it.load === 'corpo' || it.load === 'elastico' ? Math.floor(w / 2) : 0));
              const last = j === b.items.length - 1 || b.type === 'single';
              exs[j].sets.push({ kg, reps, secs: it.secs || null, t: new Date(t).toISOString(), r: last ? b.rest : 0 });
              if (last) t += (b.rest + 10 + (w % 3) * 8) * 1000;
            });
          }
          wk.exercises.push(...exs);
        }
        wk.ended_at = new Date(t + 3 * 60000).toISOString();
        db.workouts.push(wk);
      }
    }
    for (let i = 0; i < 6; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i * 6);
      db.bodyweights.push({ id: uuid(), athlete_id: DEMO_ATHLETE, measured_on: d.toISOString().slice(0, 10), kg: [84.2, 83.9, 84.0, 83.5, 83.3, 83.0][i] });
    }
    db.messages.push({ id: uuid(), athlete_id: DEMO_ATHLETE, author_id: DEMO_COACH, workout_id: null, text: 'Grande papà, settimana prossima prova a salire di 2,5 sulla panca!', created_at: new Date(now - 86400000).toISOString(), read_at: null });
    LS.set('bg_demo_db', db);
    return db;
  }
}

// Scheda iniziale + scheda precedente + allenamenti importati
export function buildSeed(athleteId) {
  const oldId = uuid();
  const newId = uuid();
  const today = new Date().toISOString().slice(0, 10);
  const programs = [
    { id: oldId, athlete_id: athleteId, name: OLD_PROGRAM.name, data: clone(OLD_PROGRAM.data), active: false, started_on: OLD_PROGRAM.started_on, ended_on: OLD_PROGRAM.ended_on, created_at: '2026-05-01T08:00:00Z', updated_at: '2026-05-01T08:00:00Z' },
    { id: newId, athlete_id: athleteId, name: INITIAL_PROGRAM.name, data: clone(INITIAL_PROGRAM.data), active: true, started_on: today, ended_on: null, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
  const workouts = OLD_WORKOUTS.map((w) => {
    const plan = OLD_PROGRAM.data.sessions.find((s) => s.key === w.session_key);
    return {
      id: uuid(), athlete_id: athleteId, program_id: oldId, session_key: w.session_key, session_name: w.session_name,
      started_at: `${w.date}T18:00:00Z`, ended_at: null, warmup_done: true, fatigue: null, pain: false, pain_where: '',
      note: 'Importato dalla app precedente', plan, imported: true,
      exercises: w.exercises.map(([slug, name, load, sets]) => ({ slug, name, load, rest: 90, block: 'single', note: '', sets })),
    };
  });
  return { programs, workouts };
}

// ------------------------------------------------------------ STORE
export const store = {
  backend: null,
  user: null,
  data: { me: null, athlete: null, coach: null, programs: [], workouts: [], bodyweights: [], messages: [] },
  listeners: new Set(),
  syncing: false,
  pending: 0,

  get configured() { return !/INCOLLA_QUI/.test(CONFIG.SUPABASE_URL) && !!CONFIG.SUPABASE_URL; },
  get isDemo() { return !!this.backend?.demo; },
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit() { this.listeners.forEach((fn) => fn()); },

  async init({ demo }) {
    this.backend = demo || !this.configured ? new DemoBackend() : new SupabaseBackend();
    this.user = await this.backend.session();
    if (this.user) this.loadCache();
    window.addEventListener('online', () => this.flush());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && this.user) this.refresh(); });
    return this.user;
  },
  async signIn(a, b) { this.user = await this.backend.signIn(a, b); await this.refresh(); return this.user; },
  async signOut() {
    await this.backend.signOut();
    if (this.user) { LS.del(`bg_cache_${this.user.uid}`); LS.del(`bg_outbox_${this.user.uid}`); }
    this.user = null;
    this.data = { me: null, athlete: null, coach: null, programs: [], workouts: [], bodyweights: [], messages: [] };
  },

  cacheKey() { return `bg_cache_${this.user.uid}`; },
  outKey() { return `bg_outbox_${this.user.uid}`; },
  loadCache() { const c = LS.get(this.cacheKey(), null); if (c) this.data = c; },
  saveCache() { LS.set(this.cacheKey(), this.data); },
  outbox() { return LS.get(this.outKey(), []); },

  async refresh() {
    if (!this.user) return;
    await this.flush();
    try {
      const fresh = await this.backend.fetchAll(this.user.uid);
      // le operazioni non ancora inviate restano applicate sopra i dati del server
      this.data = fresh;
      for (const op of this.outbox()) this.applyLocal(op);
      this.saveCache();
      this.emit();
    } catch (e) {
      if (!isNetErr(e)) console.error(e);
    }
  },

  applyLocal(op) {
    const list = this.data[op.table];
    if (!list) return;
    if (op.kind === 'upsert') {
      const rows = Array.isArray(op.row) ? op.row : [op.row];
      for (const row of rows) {
        const i = list.findIndex((r) => r.id === row.id);
        if (i >= 0) list[i] = { ...list[i], ...row }; else list.push({ created_at: new Date().toISOString(), ...row });
      }
    } else if (op.kind === 'update') {
      const r = list.find((x) => x.id === op.id); if (r) Object.assign(r, op.patch);
    } else if (op.kind === 'delete') {
      this.data[op.table] = list.filter((r) => r.id !== op.id);
    }
  },

  async mutate(op) {
    this.applyLocal(op);
    this.saveCache();
    const ob = this.outbox(); ob.push(op); LS.set(this.outKey(), ob);
    this.emit();
    await this.flush();
  },

  async flush() {
    if (!this.user || this.syncing) return;
    this.syncing = true;
    try {
      let ob = this.outbox();
      while (ob.length) {
        try { await this.backend.run(ob[0]); }
        catch (e) {
          if (isNetErr(e)) break;
          console.error('Operazione rifiutata', e, ob[0]);
          window.dispatchEvent(new CustomEvent('bg-error', { detail: e.message || String(e) }));
        }
        ob = ob.slice(1); LS.set(this.outKey(), ob);
      }
      this.pending = ob.length;
    } finally { this.syncing = false; this.emit(); }
  },

  // ----- azioni
  saveWorkout(w) { return this.mutate({ table: 'workouts', kind: 'upsert', row: w }); },
  deleteWorkout(id) { return this.mutate({ table: 'workouts', kind: 'delete', id }); },
  saveWeight(kg, date) {
    return this.mutate({ table: 'bodyweights', kind: 'upsert', row: { id: uuid(), athlete_id: this.data.athlete.id, measured_on: date, kg } });
  },
  deleteWeight(id) { return this.mutate({ table: 'bodyweights', kind: 'delete', id }); },
  sendMessage(text, workoutId = null) {
    return this.mutate({ table: 'messages', kind: 'upsert', row: { id: uuid(), athlete_id: this.data.athlete.id, author_id: this.user.uid, workout_id: workoutId, text, created_at: new Date().toISOString(), read_at: null } });
  },
  markRead(id) { return this.mutate({ table: 'messages', kind: 'update', id, patch: { read_at: new Date().toISOString() } }); },
  deleteMessage(id) { return this.mutate({ table: 'messages', kind: 'delete', id }); },
  saveProgram(p) { p.updated_at = new Date().toISOString(); return this.mutate({ table: 'programs', kind: 'upsert', row: p }); },
  async seedInitial() {
    const s = buildSeed(this.data.athlete.id);
    await this.mutate({ table: 'programs', kind: 'upsert', row: s.programs });
    await this.mutate({ table: 'workouts', kind: 'upsert', row: s.workouts });
    await this.refresh();
  },
  upload(file) { return this.backend.upload(file); },
};
