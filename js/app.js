import { store, LS } from './store.js';
import { esc, I, $, fmtDate, fmtDateShort, daysAgo, kgFmt, sessionColor, sessionLetter, FACES } from './util.js';
import { activeProgram, nextSession, workoutsSorted, workoutStats, streakWeeks, MAIN_LIFTS } from './logic.js';
import { go, toast, sheet, initTooltips, confirmSheet } from './ui.js';
import { renderWorkout, renderSummary, startWorkout, getActive, stopTimer } from './workout.js';
import { calendarHTML, bindCalendar, workoutDetailHTML, bindWorkoutDetail, weightSheet, weightChart, strengthBlock, bindLift, recordsHTML, installSheet } from './views.js';
import { renderCoach } from './coach.js';
import { keepAwake } from './ui.js';

const app = $('#app');
const ui = { cal: 0, lift: MAIN_LIFTS[0].slug };
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });
window.addEventListener('bg-error', (e) => toast(`Errore di salvataggio: ${e.detail}`, 'err'));
const standalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

// ------------------------------------------------------------ AVVIO
async function boot() {
  initTooltips();
  const params = new URLSearchParams(location.search);
  const demo = params.has('demo') || LS.get('bg_demo_mode', false) || !store.configured;
  if (params.has('demo')) LS.set('bg_demo_mode', true);
  const user = await store.init({ demo });
  if (user) { route(); store.refresh(); } else go('#/login');
  store.onChange(() => { if (!document.querySelector('.wk') && !document.querySelector('.editing')) route(); else syncPill(); });
  window.addEventListener('hashchange', route);
}

// ------------------------------------------------------------ ROUTER
function route() {
  const h = location.hash || '#/';
  document.body.classList.toggle('in-workout', h.startsWith('#/allenamento'));
  if (!h.startsWith('#/allenamento')) { keepAwake(false); }
  if (!store.user) { if (h !== '#/login') { go('#/login'); return; } return renderLogin(); }
  if (h === '#/login') { go('#/'); return; }
  if (!store.data.me) { app.innerHTML = `<div class="loading"><img class="load-bull" src="icons/bull.svg" alt=""><div class="logo-big">BAGGATS</div><p class="muted">Caricamento…</p></div>`; return; }
  if (store.data.me.role === 'coach') { if (h.startsWith('#/w/')) return shell(renderDetail, 'c-all'); return renderCoach(app, h, { shell, ui, historyListHTML, route }); }
  if (!store.data.athlete) return shell((el) => { el.innerHTML = '<main class="page"><p>Profilo non collegato al coach. Chiedi a Fede.</p></main>'; }, '');
  if (h.startsWith('#/allenamento')) { if (!getActive()) { go('#/'); return; } return renderWorkout(app); }
  if (h.startsWith('#/fatto/')) return renderSummary(app, h.split('/')[2]);
  if (h.startsWith('#/storico')) return shell(renderHistory, 'storico');
  if (h.startsWith('#/w/')) return shell(renderDetail, 'storico');
  if (h.startsWith('#/progressi')) return shell(renderProgress, 'progressi');
  return shell(renderHome, 'home');
}

// Cornice: testata + contenuto + barra in basso
export function shell(fn, tab) {
  const coach = store.data.me.role === 'coach';
  const tabs = coach
    ? [['#/', 'c-home', I.home, 'Gian'], ['#/c/allenamenti', 'c-all', I.list, 'Allenamenti'], ['#/c/grafici', 'c-graf', I.chart, 'Grafici'], ['#/c/scheda', 'c-scheda', I.edit, 'Scheda']]
    : [['#/', 'home', I.home, 'Oggi'], ['#/storico', 'storico', I.list, 'Storico'], ['#/progressi', 'progressi', I.chart, 'Progressi']];
  app.innerHTML = `${store.isDemo ? `<div class="demo-bar">MODALITÀ DEMO · dati di prova <button data-act="demo-reset">Azzera</button> <button data-act="demo-switch">Cambia ruolo</button></div>` : ''}
    <header class="top"><div class="brand"><img class="brand-bull" src="icons/bull-mini.svg" alt=""><span class="logo">BAGGATS<small>POWER TRAINING</small></span>${coach ? '<span class="role">COACH</span>' : ''}</div>
      <span id="sync"></span><button class="icon-btn" data-act="menu" aria-label="Menu">${I.user}</button></header>
    <div id="view"></div>
    <nav class="tabs">${tabs.map(([href, k, ic, l]) => `<a href="${href}" class="${k === tab ? 'on' : ''}">${ic}<span>${l}</span></a>`).join('')}</nav>`;
  const view = $('#view');
  fn(view);
  syncPill();
  app.querySelector('[data-act="menu"]').onclick = menu;
  app.querySelector('[data-act="demo-reset"]')?.addEventListener('click', async () => { if (await confirmSheet('Azzerare la demo?', 'Torna ai dati di prova iniziali.', 'Azzera')) { store.backend.reset(); await store.refresh(); toast('Demo azzerata'); } });
  app.querySelector('[data-act="demo-switch"]')?.addEventListener('click', async () => { await store.signOut(); go('#/login'); });
}

function syncPill() {
  const el = $('#sync'); if (!el) return;
  const n = store.outbox ? (store.user ? store.outbox().length : 0) : 0;
  el.className = `sync ${n ? 'warn' : ''}`;
  el.textContent = n ? (navigator.onLine ? 'Invio…' : `Offline · ${n} da inviare`) : '';
}

function menu() {
  const me = store.data.me;
  sheet(`<h2>${esc(me.name || 'Profilo')}</h2><p class="muted">${esc(store.user.email || '')}</p>
    ${!standalone() ? `<button class="btn ghost full" data-m="install">${I.home} Metti l’app nella schermata Home</button>` : ''}
    <button class="btn ghost full" data-m="refresh">Aggiorna i dati</button>
    <button class="btn danger full" data-m="out">${I.out} Esci</button>`, {
    onMount: (el, close) => {
      el.querySelector('[data-m="install"]')?.addEventListener('click', () => { close(); installSheet(deferredInstall); });
      el.querySelector('[data-m="refresh"]').onclick = async () => { close(); await store.refresh(); toast('Dati aggiornati'); };
      el.querySelector('[data-m="out"]').onclick = async () => { close(); stopTimer(); await store.signOut(); go('#/login'); };
    },
  });
}

// ------------------------------------------------------------ LOGIN
function renderLogin() {
  const real = store.configured && !store.isDemo;
  app.innerHTML = `<main class="login">
    <img class="login-bull" src="icons/bull.svg" alt="">
    <div class="logo-big">BAGGATS</div>
    <div class="logo-sub"><i></i>POWER TRAINING<i></i></div>
    <p class="muted">Allenamento di Gian · coach Fede</p>
    ${real ? `<form id="lf" class="login-f">
      <input class="inp" type="email" name="email" placeholder="Email" autocomplete="username" required>
      <input class="inp" type="password" name="pw" placeholder="Password" autocomplete="current-password" required>
      <button class="btn hero" type="submit">ENTRA</button><p class="err" id="lerr"></p></form>
      <a class="link-btn center" href="?demo">Prova la demo</a>`
    : `<div class="login-f"><button class="btn hero" data-demo="athlete">Prova come Gian</button><button class="btn ghost full" data-demo="coach">Prova come Fede (coach)</button>
      <p class="muted small">${store.configured ? 'Modalità demo: i dati restano solo su questo telefono.' : 'App non ancora collegata al database (manca config.js): per ora gira in demo.'}</p>
      ${store.configured ? '<a class="link-btn center" href="./" data-exitdemo>Esci dalla demo</a>' : ''}</div>`}
  </main>`;
  const f = $('#lf');
  if (f) f.onsubmit = async (e) => {
    e.preventDefault(); const b = f.querySelector('button'); b.disabled = true; b.textContent = '…';
    try { await store.signIn(f.email.value.trim(), f.pw.value); go('#/'); } catch (err) { $('#lerr').textContent = err.message; } finally { b.disabled = false; b.textContent = 'ENTRA'; }
  };
  app.querySelectorAll('[data-demo]').forEach((b) => b.onclick = async () => { await store.signIn(b.dataset.demo); go('#/'); });
  app.querySelector('[data-exitdemo]')?.addEventListener('click', () => LS.del('bg_demo_mode'));
}

// ------------------------------------------------------------ HOME ATLETA
function renderHome(el) {
  const d = store.data;
  const prog = activeProgram(d);
  const active = getActive();
  const nxt = nextSession(d);
  const unread = d.messages.filter((m) => !m.read_at && m.author_id !== store.user.uid);
  const seenKey = `bg_prog_seen_${store.user.uid}`;
  const seen = LS.get(seenKey, null);
  if (prog && !seen) LS.set(seenKey, prog.updated_at);
  const updated = prog && seen && prog.updated_at > seen;
  const bw = [...d.bodyweights].sort((a, b) => a.measured_on.localeCompare(b.measured_on));
  const lastBw = bw[bw.length - 1];
  const ws = workoutsSorted(d); const lastW = ws[ws.length - 1];
  const streak = streakWeeks(d);

  let h = '<main class="page">';
  h += `<h1 class="hello">Ciao ${esc(d.me.name || 'Gian')} 💪</h1>`;
  if (!standalone() && !LS.get('bg_install_dismissed', false)) h += `<div class="banner install">${I.home}<span>Metti Baggats nella schermata Home</span><button class="link-btn" data-a="install">Come</button><button class="icon-btn" data-a="noinstall" aria-label="Chiudi">${I.close}</button></div>`;
  if (updated) h += `<div class="banner hot">${I.fire}<span><b>Fede ha aggiornato la scheda!</b></span><button class="btn small primary" data-a="seenprog">Ok</button></div>`;
  for (const m of unread.filter((x) => !x.workout_id).slice(-2)) h += `<div class="card msg"><div class="msg-h">${I.msg} Messaggio di ${esc(d.coach?.name || 'Fede')} <small>${fmtDateShort(m.created_at)}</small></div><p>${esc(m.text)}</p><button class="btn small ghost" data-read="${m.id}">Letto 👍</button></div>`;
  const cm = unread.filter((x) => x.workout_id);
  if (cm.length) h += `<button class="card msg link" data-go="#/w/${cm[cm.length - 1].workout_id}"><div class="msg-h">${I.msg} ${cm.length === 1 ? 'Fede ha commentato un tuo allenamento' : `Fede ha commentato ${cm.length} allenamenti`}</div><p>${esc(cm[cm.length - 1].text)}</p></button>`;

  if (!prog) h += '<div class="card"><p>Fede non ha ancora caricato la scheda.</p></div>';
  else if (active) {
    h += `<section class="hero-card"><div class="hero-k">IN CORSO</div><div class="hero-n">${esc(active.session_name)}</div>
      <button class="btn hero" data-go="#/allenamento">${I.play} RIPRENDI</button></section>`;
  } else if (nxt) {
    h += `<section class="hero-card" style="--sc:${sessionColor(nxt.key)}"><div class="hero-k">OGGI TOCCA A</div><div class="hero-n">${esc(nxt.name)}</div>
      <div class="hero-s">${esc(nxt.subtitle || '')} · circa ${nxt.minutes || 55} min</div>
      <button class="btn hero" data-a="start" data-k="${nxt.key}">${I.play} INIZIA</button>
      <button class="link-btn center" data-a="other">Fai un altro allenamento</button></section>`;
  }
  h += `<section class="card">${calendarHTML(ui.cal)}
    <div class="cal-foot">${lastW ? `Ultimo: <b>${daysAgo(lastW.started_at)}</b>` : 'Nessun allenamento ancora'}${streak > 1 ? ` · ${I.fire} <b>${streak} settimane</b> di fila` : ''}</div></section>`;
  h += `<section class="card"><div class="card-h"><h2>${I.scale} Peso</h2><button class="btn small primary" data-a="weight">Pesati</button></div>
    ${lastBw ? `<div class="big-num">${kgFmt(lastBw.kg)} <small>kg · ${daysAgo(lastBw.measured_on)}</small></div>` : ''}
    ${weightChart({ height: 150 })}</section>`;
  h += `<section class="card"><div class="card-h"><h2>${I.trophy} I tuoi record</h2><a class="link-btn" href="#/progressi">Vedi tutto</a></div>${recordsHTML()}</section>`;
  h += '</main>';
  el.innerHTML = h;

  bindCalendar(el, ui, route);
  el.onclick = async (e) => {
    const t = e.target.closest('[data-a],[data-go],[data-read]'); if (!t) return;
    if (t.dataset.go) return go(t.dataset.go);
    if (t.dataset.read) { await store.markRead(t.dataset.read); return; }
    const a = t.dataset.a;
    if (a === 'start') startWorkout(t.dataset.k);
    else if (a === 'other') chooseSession();
    else if (a === 'weight') weightSheet();
    else if (a === 'seenprog') { LS.set(seenKey, prog.updated_at); route(); }
    else if (a === 'install') installSheet(deferredInstall);
    else if (a === 'noinstall') { LS.set('bg_install_dismissed', true); route(); }
  };
}

function chooseSession() {
  const prog = activeProgram(store.data);
  sheet(`<h2>Quale allenamento?</h2>${prog.data.sessions.map((s, i) => `<button class="sess-pick" data-k="${s.key}" style="--sc:${sessionColor(s.key, i)}"><span class="sdot" style="background:${sessionColor(s.key, i)}">${esc(sessionLetter(s.key))}</span><span><b>${esc(s.name)}</b><small>${esc(s.subtitle || '')}</small></span>${I.right}</button>`).join('')}`, {
    onMount: (el, close) => el.querySelectorAll('[data-k]').forEach((b) => b.onclick = () => { close(); startWorkout(b.dataset.k); }),
  });
}

// ------------------------------------------------------------ STORICO
export function historyListHTML({ coach } = {}) {
  const ws = workoutsSorted(store.data).reverse();
  if (!ws.length) return '<p class="muted center">Nessun allenamento ancora.</p>';
  const seen = coach ? LS.get(`bg_coach_seen_${store.user.uid}`, '') : '';
  let html = ''; let month = '';
  for (const w of ws) {
    const m = new Date(w.started_at).toLocaleDateString('it-IT', { month: 'long', year: 'numeric' });
    if (m !== month) { html += `<div class="month-h">${m}</div>`; month = m; }
    const st = workoutStats(w);
    const cmts = store.data.messages.filter((x) => x.workout_id === w.id).length;
    const isNew = coach && !w.imported && (w.created_at || w.started_at) > seen;
    html += `<a class="hist" href="#/w/${w.id}"><span class="sdot" style="background:${sessionColor(w.session_key)}">${esc(sessionLetter(w.session_key))}</span>
      <span class="hist-t"><b>${esc(w.session_name)}</b>${isNew ? '<em class="new">NUOVO</em>' : ''}<small>${fmtDate(w.started_at)}${st.mins ? ` · ${st.mins}'` : ''} · ${st.sets} serie</small></span>
      <span class="hist-r">${w.fatigue ? FACES[w.fatigue - 1] : ''}${w.pain ? `<i class="pain-i">${I.alert}</i>` : ''}${cmts ? `<i class="cm-i">${I.msg}</i>` : ''}</span></a>`;
  }
  return html;
}
function renderHistory(el) { el.innerHTML = `<main class="page"><h1 class="page-h">Storico</h1>${historyListHTML()}</main>`; }

function renderDetail(el) {
  const id = location.hash.split('/')[2];
  const w = store.data.workouts.find((x) => x.id === id);
  const coach = store.data.me.role === 'coach';
  if (!w) { el.innerHTML = '<main class="page"><p>Allenamento non trovato.</p></main>'; return; }
  el.innerHTML = `<main class="page"><button class="back" onclick="history.back()">${I.back} Indietro</button>${workoutDetailHTML(w, { coach })}</main>`;
  bindWorkoutDetail(el, w, route);
}

// ------------------------------------------------------------ PROGRESSI ATLETA
function renderProgress(el) {
  el.innerHTML = `<main class="page"><h1 class="page-h">Progressi</h1>
    <section class="card"><h2>${I.trophy} Record personali</h2>${recordsHTML()}</section>
    <section class="card"><h2>${I.chart} Forza</h2>${strengthBlock(ui)}</section>
    <section class="card"><div class="card-h"><h2>${I.scale} Peso</h2><button class="btn small primary" data-a="weight">Pesati</button></div>${weightChart()}</section>
    <section class="card">${calendarHTML(ui.cal)}</section></main>`;
  bindLift(el, ui, route);
  bindCalendar(el, ui, route);
  el.querySelector('[data-a="weight"]').onclick = weightSheet;
}

// ------------------------------------------------------------ SERVICE WORKER
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
boot();
