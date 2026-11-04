// Parte allenatore: panoramica, allenamenti, grafici, editor della scheda
import { store, LS, uuid } from './store.js';
import { esc, I, fmtDateShort, fmtDate, daysAgo, kgFmt, restLabel, sessionColor, sessionLetter, FACES, today, num } from './util.js';
import { activeProgram, workoutsSorted, workoutStats, streakWeeks, weeklyVolume, restGaps, SKILLS, skillProgress, MAIN_LIFTS, strengthSeries, isLegs } from './logic.js';
import { lineChart, barChart, fmtDay } from './charts.js';
import { calendarHTML, bindCalendar, weightChart, strengthBlock, bindLift } from './views.js';
import { sheet, toast, go, confirmSheet } from './ui.js';
import { picSVG, PIC_KEYS } from './pics.js';
import { targetText, ytLink } from './workout.js';

let ctx;
export function renderCoach(app, h, c) {
  ctx = c;
  document.body.classList.toggle('editing', h.startsWith('#/c/scheda'));
  if (!store.data.athlete) return ctx.shell((el) => { el.innerHTML = `<main class="page"><h1 class="page-h">Quasi pronto</h1><div class="card"><p>Il tuo account è coach, ma non c'è ancora un atleta collegato.</p><p class="muted">Esegui il file <b>supabase/2_ruoli_e_scheda.sql</b> con le due email e poi premi “Aggiorna i dati” dal menu.</p></div></main>`; }, 'c-home');
  if (!store.data.programs.length) return ctx.shell(seedView, 'c-home');
  if (h.startsWith('#/c/allenamenti')) return ctx.shell(allView, 'c-all');
  if (h.startsWith('#/c/grafici')) return ctx.shell(chartsView, 'c-graf');
  if (h.startsWith('#/c/archivio')) return ctx.shell(archiveView, 'c-scheda');
  if (h.startsWith('#/c/scheda')) return ctx.shell(editorView, 'c-scheda');
  return ctx.shell(overview, 'c-home');
}

function seedView(el) {
  el.innerHTML = `<main class="page"><h1 class="page-h">Benvenuto coach</h1><div class="card">
    <p>Per partire carico nel database:</p><ul><li>la <b>scheda attuale</b> (Upper A, Gambe, Upper B, Upper C)</li><li>la <b>scheda precedente</b> e gli ultimi allenamenti della vecchia app, così i grafici partono da lì</li></ul>
    <button class="btn hero" id="seed">Carica la scheda iniziale</button></div></main>`;
  el.querySelector('#seed').onclick = async (e) => { e.target.disabled = true; await store.seedInitial(); toast('Scheda caricata 💪', 'ok'); go('#/'); };
}

// ------------------------------------------------------------ PANORAMICA
function overview(el) {
  const d = store.data; const a = d.athlete;
  const ws = workoutsSorted(d).filter((w) => !w.imported);
  const now = new Date();
  const month = ws.filter((w) => { const x = new Date(w.started_at); return x.getMonth() === now.getMonth() && x.getFullYear() === now.getFullYear(); }).length;
  const last = ws[ws.length - 1];
  const bw = [...d.bodyweights].sort((x, y) => x.measured_on.localeCompare(y.measured_on));
  const lbw = bw[bw.length - 1];
  const bw30 = bw.find((b) => new Date(b.measured_on) >= new Date(Date.now() - 30 * 86400000));
  const delta = lbw && bw30 && bw30 !== lbw ? Math.round((lbw.kg - bw30.kg) * 10) / 10 : null;
  const seen = LS.get(`bg_coach_seen_${store.user.uid}`, '');
  const fresh = ws.filter((w) => (w.created_at || w.started_at) > seen).reverse();
  const recentPain = ws.filter((w) => w.pain && new Date(w.started_at) > new Date(Date.now() - 21 * 86400000)).reverse();
  const msgs = d.messages.filter((m) => !m.workout_id).slice(-5).reverse();

  el.innerHTML = `<main class="page"><h1 class="hello">${esc(a.name || 'Gian')}</h1>
    <div class="tiles four">
      <div class="tile"><b>${month}</b><span>questo mese</span></div>
      <div class="tile"><b>${streakWeeks(d)}</b><span>settimane di fila</span></div>
      <div class="tile"><b>${last ? daysAgo(last.started_at) : '–'}</b><span>ultimo</span></div>
      <div class="tile"><b>${lbw ? kgFmt(lbw.kg) : '–'}</b><span>kg${delta != null ? ` (${delta > 0 ? '+' : ''}${kgFmt(delta)} in 30gg)` : ''}</span></div>
    </div>
    ${recentPain.length ? `<section class="card alert-card"><h2>${I.alert} Dolori segnalati</h2>${recentPain.map((w) => `<a class="hist" href="#/w/${w.id}"><span class="hist-t"><b>${esc(w.pain_where || 'Dolore')}</b><small>${esc(w.session_name)} · ${fmtDate(w.started_at)}</small></span>${I.right}</a>`).join('')}</section>` : ''}
    <section class="card"><div class="card-h"><h2>Nuovi allenamenti</h2>${fresh.length ? `<button class="link-btn" id="seenAll">Segna visti</button>` : ''}</div>
      ${fresh.length ? fresh.slice(0, 5).map((w) => { const st = workoutStats(w); return `<a class="hist" href="#/w/${w.id}"><span class="sdot" style="background:${sessionColor(w.session_key)}">${esc(sessionLetter(w.session_key))}</span><span class="hist-t"><b>${esc(w.session_name)}</b><em class="new">NUOVO</em><small>${fmtDate(w.started_at)} · ${st.mins ?? '–'}' · ${w.fatigue ? FACES[w.fatigue - 1] : ''}${w.note ? ' · 📝' : ''}</small></span>${I.right}</a>`; }).join('') : '<p class="muted">Niente di nuovo dall’ultima volta.</p>'}
    </section>
    <section class="card">${calendarHTML(ctx.ui.cal)}</section>
    <section class="card"><h2>${I.msg} Scrivi a ${esc(a.name || 'Gian')}</h2>
      <textarea class="inp" id="msgTxt" rows="3" placeholder="Lo vede appena apre l’app"></textarea>
      <button class="btn primary full" id="msgSend">Invia messaggio</button>
      ${msgs.map((m) => `<div class="cmt"><div>${esc(m.text)}</div><small>${fmtDateShort(m.created_at)} · ${m.author_id === store.user.uid ? (m.read_at ? '✓ letto' : 'non ancora letto') : 'da Gian'} <button class="link-btn danger" data-del="${m.id}">elimina</button></small></div>`).join('')}
    </section></main>`;
  bindCalendar(el, ctx.ui, ctx.route);
  el.querySelector('#seenAll')?.addEventListener('click', () => { LS.set(`bg_coach_seen_${store.user.uid}`, new Date().toISOString()); ctx.route(); });
  el.querySelector('#msgSend').onclick = async () => { const t = el.querySelector('#msgTxt').value.trim(); if (!t) return; await store.sendMessage(t); toast('Messaggio inviato'); };
  el.querySelectorAll('[data-del]').forEach((b) => b.onclick = async () => { await store.deleteMessage(b.dataset.del); });
}

function allView(el) {
  el.innerHTML = `<main class="page"><h1 class="page-h">Allenamenti</h1>${ctx.historyListHTML({ coach: true })}</main>`;
}

// ------------------------------------------------------------ GRAFICI
function chartsView(el) {
  const d = store.data;
  const ws = workoutsSorted(d);
  const real = ws.filter((w) => !w.imported);
  const recent = real.slice(-16);
  // esercizi con carichi, per il menu "altro esercizio"
  const exNames = {};
  for (const w of ws) for (const e of w.exercises || []) if ((e.sets || []).some((s) => s.kg)) exNames[e.slug] = e.name;
  const others = Object.entries(exNames).filter(([s]) => !MAIN_LIFTS.some((l) => l.slug === s)).sort((a, b) => a[1].localeCompare(b[1]));

  const wv = weeklyVolume(d, 10);
  const volBars = wv.map((w) => ({ label: fmtDay(w.start), values: [w.upper, w.legs], tip: `Settimana del ${fmtDay(w.start)}: upper ${w.upper.toLocaleString('it-IT')} kg · gambe ${w.legs.toLocaleString('it-IT')} kg · ${w.count} allenamenti` }));

  const fatBars = recent.filter((w) => w.fatigue).map((w) => ({ label: fmtDay(new Date(w.started_at)), values: [w.fatigue], flag: w.pain ? '!' : '', tip: `${fmtDay(new Date(w.started_at))} · ${w.session_name}: fatica ${w.fatigue}/5${w.pain ? ' · dolore: ' + (w.pain_where || 'sì') : ''}` }));
  const durBars = recent.map((w) => { const st = workoutStats(w); return { label: fmtDay(new Date(w.started_at)), values: [st.mins || 0], mark: w.plan?.minutes || null, tip: `${w.session_name}: ${st.mins ?? '–'} min (previsti ${w.plan?.minutes ?? '–'})` }; }).filter((b) => b.values[0]);
  const restPts = [], planPts = [];
  for (const w of recent) {
    const g = restGaps(w); if (!g.length) continue;
    const avg = g.reduce((a, x) => a + x.rest, 0) / g.length; const pl = g.reduce((a, x) => a + x.planned, 0) / g.length;
    const x = new Date(w.started_at);
    restPts.push({ x, y: Math.round(avg), tip: `${fmtDay(x)} · ${w.session_name}: pausa media ≈ ${restLabel(Math.round(avg / 5) * 5)} (prevista ${restLabel(Math.round(pl / 5) * 5)})` });
    planPts.push({ x, y: Math.round(pl), tip: `Prevista: ${restLabel(Math.round(pl / 5) * 5)}` });
  }
  const skills = SKILLS.map((sk) => {
    const p = skillProgress(d, sk);
    return `<div class="skill"><div class="card-h"><h3>${sk.name}</h3><span class="pill">${p.current ? esc(p.current.stage) : '–'}</span></div>
      ${lineChart({ series: [{ name: sk.name, color: 'var(--series-1)', points: p.pts.map((q) => ({ ...q, tip: `${fmtDay(q.x)} · ${q.stage}: ${q.y} rip totali (migliore serie ${q.best})` })) }], height: 140, unit: ' rip', zeroBased: true, emptyMsg: 'Ancora nessuna serie' })}</div>`;
  }).join('');

  el.innerHTML = `<main class="page"><h1 class="page-h">Grafici</h1>
    <section class="card"><h2>Forza</h2>${strengthBlock(ctx.ui)}
      ${others.length ? `<select class="inp" id="otherEx"><option value="">Altro esercizio…</option>${others.map(([s, n]) => `<option value="${s}" ${ctx.ui.lift === s ? 'selected' : ''}>${esc(n)}</option>`).join('')}</select>` : ''}
      <p class="muted small">Massimale stimato dalla serie migliore di ogni allenamento (formula di Epley). Tocca un punto per i dettagli.</p></section>
    <section class="card">${calendarHTML(ctx.ui.cal)}</section>
    <section class="card"><h2>Volume settimanale</h2><div class="chart-cap">kg sollevati (kg × ripetizioni)</div>
      ${barChart({ bars: volBars, series: [{ name: 'Upper', color: 'var(--series-1)' }, { name: 'Gambe', color: 'var(--series-2)' }] })}</section>
    <section class="card"><h2>Trazioni e dip</h2><p class="muted small">Ripetizioni totali per allenamento. Il livello passa da negative → elastico → libere.</p>${skills}</section>
    <section class="card"><h2>Peso corporeo</h2>${weightChart()}</section>
    <section class="card"><h2>Fatica</h2><div class="chart-cap">1 = facile · 5 = durissimo · <b>!</b> = dolore segnalato</div>
      ${barChart({ bars: fatBars, series: [{ name: 'Fatica', color: 'var(--series-1)' }], ticks: [0, 1, 2, 3, 4, 5], emptyMsg: 'Nessuna sensazione registrata' })}</section>
    <section class="card"><h2>Durata degli allenamenti</h2><div class="chart-cap">minuti reali · trattino = previsti</div>
      ${barChart({ bars: durBars, series: [{ name: 'Durata', color: 'var(--series-1)' }], emptyMsg: 'Ancora nessun allenamento con orari' })}</section>
    <section class="card"><h2>Recuperi</h2><div class="chart-cap">pausa media reale vs prevista (secondi)</div>
      ${lineChart({ series: [{ name: 'Reale (stima)', color: 'var(--series-1)', points: restPts }, { name: 'Prevista', color: 'var(--series-2)', points: planPts, dots: false }], zeroBased: true, unit: '"', emptyMsg: 'Ancora nessun dato sui recuperi' })}
      <p class="muted small">Stima: tempo tra una spunta e la successiva meno circa 40" di esecuzione.</p></section>
  </main>`;
  bindLift(el, ctx.ui, ctx.route);
  bindCalendar(el, ctx.ui, ctx.route);
  el.querySelector('#otherEx')?.addEventListener('change', (e) => { if (e.target.value) { ctx.ui.lift = e.target.value; ctx.route(); } });
}

// ------------------------------------------------------------ EDITOR SCHEDA
const DKEY = () => `bg_draft_${store.user.uid}`;
let edit = { si: 0 };
const slugify = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const LOADS = [['bilanciere', 'Bilanciere'], ['manubri', 'Manubri (kg per manubrio)'], ['corpo', 'Corpo libero'], ['elastico', 'Elastico'], ['macchina', 'Macchina']];
const blockName = { single: 'Esercizio', superset: 'Coppia', circuit: 'Circuito' };

function getDraft() {
  const prog = activeProgram(store.data);
  let dr = LS.get(DKEY(), null);
  if (!dr || dr.id !== prog.id) dr = { id: prog.id, base: prog.updated_at, name: prog.name, data: JSON.parse(JSON.stringify(prog.data)), dirty: false };
  return dr;
}
const putDraft = (dr) => { dr.dirty = true; LS.set(DKEY(), dr); };

function editorView(el) {
  const prog = activeProgram(store.data);
  const dr = getDraft();
  const ss = dr.data.sessions;
  edit.si = Math.min(edit.si, ss.length - 1);
  const s = ss[edit.si];
  const knownChange = dr.dirty && dr.base !== prog.updated_at;
  let h = `<main class="page editing-page"><div class="card-h"><h1 class="page-h">Scheda</h1><a class="link-btn" href="#/c/archivio">Archivio</a></div>
    ${knownChange ? '<div class="banner hot">La scheda è cambiata da un altro dispositivo. Se salvi, sovrascrivi.</div>' : ''}
    <label class="lbl">Nome della scheda</label><input class="inp" id="pName" value="${esc(dr.name)}">
    <div class="chips scroll sess-tabs">${ss.map((x, i) => `<button class="chip ${i === edit.si ? 'on' : ''}" data-si="${i}"><i class="ldot" style="background:${sessionColor(x.key, i)}">${esc(sessionLetter(x.key))}</i>${esc(x.name)}</button>`).join('')}<button class="chip add" data-a="addSess">${I.plus} Seduta</button></div>`;
  if (s) {
    h += `<section class="card"><div class="grid2">
      <div><label class="lbl">Nome seduta</label><input class="inp" data-sf="name" value="${esc(s.name)}"></div>
      <div><label class="lbl">Sottotitolo</label><input class="inp" data-sf="subtitle" value="${esc(s.subtitle || '')}"></div>
      <div><label class="lbl">Minuti previsti</label><input class="inp" data-sf="minutes" inputmode="numeric" value="${s.minutes || ''}"></div>
      <div><label class="lbl">Riscaldamento</label><select class="inp" data-sf="warmup"><option value="">Nessuno</option>${Object.entries(dr.data.warmups || {}).map(([k, w]) => `<option value="${k}" ${s.warmup === k ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}</select></div></div>
      <div class="row-btns"><button class="btn small ghost" data-a="sessUp">${I.up} Sposta prima</button><button class="btn small ghost" data-a="sessDown">${I.down} Sposta dopo</button><button class="btn small danger" data-a="sessDel">${I.trash} Elimina seduta</button></div></section>`;
    s.blocks.forEach((b, bi) => {
      h += `<section class="card blk"><div class="blk-h"><span class="tag">${blockName[b.type]}</span>
        <label class="mini">pausa <input class="inp sm" data-bf="rest" data-bi="${bi}" inputmode="numeric" value="${b.rest}">s</label>
        ${b.type === 'circuit' ? `<label class="mini">giri <input class="inp sm" data-bf="rounds" data-bi="${bi}" inputmode="numeric" value="${b.rounds || 3}"></label>` : ''}
        <span class="sp"></span><button class="icon-btn" data-a="bUp" data-bi="${bi}" aria-label="Su">${I.up}</button><button class="icon-btn" data-a="bDown" data-bi="${bi}" aria-label="Giù">${I.down}</button><button class="icon-btn" data-a="bDel" data-bi="${bi}" aria-label="Elimina">${I.trash}</button></div>
        ${b.items.map((ex, ii) => `<button class="ed-ex" data-a="exEdit" data-bi="${bi}" data-ii="${ii}"><span class="ex-pic sm">${picSVG(ex.pic || ex.slug)}</span><span class="ed-t"><b>${esc(ex.name)}</b><small>${targetText(ex, b)}${ex.target_kg != null ? ` · obiettivo ${kgFmt(ex.target_kg)} kg` : ''}${ex.media ? ' · 📷' : ''}</small></span>${I.edit}</button>`).join('')}
        <button class="link-btn" data-a="exAdd" data-bi="${bi}">${I.plus} Aggiungi esercizio ${b.type === 'single' ? '(diventa coppia)' : 'qui'}</button></section>`;
    });
    h += `<div class="row-btns wrap"><button class="btn ghost" data-a="addBlock" data-t="single">${I.plus} Esercizio</button><button class="btn ghost" data-a="addBlock" data-t="superset">${I.plus} Coppia</button><button class="btn ghost" data-a="addBlock" data-t="circuit">${I.plus} Circuito</button></div>`;
  }
  h += `<section class="card"><h2>Riscaldamenti</h2>${Object.entries(dr.data.warmups || {}).map(([k, w]) => `<div class="wu"><input class="inp" data-wn="${k}" value="${esc(w.name)}">
      ${w.items.map((it, i) => `<div class="wu-r"><input class="inp" data-wk="${k}" data-wi="${i}" data-wf="name" value="${esc(it.name)}"><input class="inp sm2" data-wk="${k}" data-wi="${i}" data-wf="amount" value="${esc(it.amount)}" placeholder="10 o 30&quot;"><button class="icon-btn" data-a="wuDel" data-k="${k}" data-i="${i}" aria-label="Elimina">${I.trash}</button></div>`).join('')}
      <button class="link-btn" data-a="wuAdd" data-k="${k}">${I.plus} Aggiungi</button></div>`).join('')}
    <label class="lbl">Defaticamento</label><input class="inp" id="cool" value="${esc(dr.data.cooldown || '')}"></section>
    <div class="save-bar"><button class="btn ghost" data-a="discard" ${dr.dirty ? '' : 'disabled'}>Annulla</button><button class="btn primary" data-a="save" ${dr.dirty ? '' : 'disabled'}>Salva modifiche</button></div>
    <button class="link-btn center" data-a="saveNew">Salva come nuova scheda (archivia quella attuale)</button>
    </main>`;
  el.innerHTML = h;
  bindEditor(el, dr);
}

function bindEditor(el, dr) {
  const re = () => ctx.route();
  const S = () => dr.data.sessions[edit.si];
  el.oninput = (e) => {
    const t = e.target;
    if (t.id === 'pName') dr.name = t.value;
    else if (t.id === 'cool') dr.data.cooldown = t.value;
    else if (t.dataset.sf) { const v = t.dataset.sf === 'minutes' ? (num(t.value) || null) : t.value; S()[t.dataset.sf] = v; }
    else if (t.dataset.bf) { S().blocks[+t.dataset.bi][t.dataset.bf] = num(t.value) || 0; }
    else if (t.dataset.wn) dr.data.warmups[t.dataset.wn].name = t.value;
    else if (t.dataset.wk) { const it = dr.data.warmups[t.dataset.wk].items[+t.dataset.wi]; it[t.dataset.wf] = t.value; if (t.dataset.wf === 'amount') { const m = /^(\d+)\s*(['"’”]|min|s)/.exec(t.value.trim()); it.secs = m ? (/['’]|min/.test(m[2]) ? +m[1] * 60 : +m[1]) : undefined; } }
    else return;
    putDraft(dr); markDirty(el);
  };
  el.onchange = (e) => { if (e.target.dataset.sf === 'warmup') { S().warmup = e.target.value || null; putDraft(dr); markDirty(el); } };
  el.onclick = async (e) => {
    const t = e.target.closest('[data-a],[data-si]'); if (!t) return;
    if (t.dataset.si != null && !t.dataset.a) { edit.si = +t.dataset.si; return re(); }
    const a = t.dataset.a; const bi = +t.dataset.bi; const ss = dr.data.sessions;
    const mv = (arr, i, d) => { const j = i + d; if (j < 0 || j >= arr.length) return false; [arr[i], arr[j]] = [arr[j], arr[i]]; return true; };
    if (a === 'addSess') { const used = new Set(ss.map((x) => x.key)); const key = 'DEFHIJKLMNOPQRSTUVWXYZ'.split('').find((k) => !used.has(k)); ss.push({ key, name: `Seduta ${key}`, subtitle: '', minutes: 55, warmup: 'upper', blocks: [] }); edit.si = ss.length - 1; }
    else if (a === 'sessUp') { if (mv(ss, edit.si, -1)) edit.si--; }
    else if (a === 'sessDown') { if (mv(ss, edit.si, 1)) edit.si++; }
    else if (a === 'sessDel') { if (!(await confirmSheet('Eliminare la seduta?', S().name, 'Elimina', true))) return; ss.splice(edit.si, 1); edit.si = 0; }
    else if (a === 'bUp') mv(S().blocks, bi, -1);
    else if (a === 'bDown') mv(S().blocks, bi, 1);
    else if (a === 'bDel') { if (!(await confirmSheet('Eliminare questo blocco?', S().blocks[bi].items.map((x) => x.name).join(' + '), 'Elimina', true))) return; S().blocks.splice(bi, 1); }
    else if (a === 'addBlock') { const type = t.dataset.t; const b = { type, rest: type === 'single' ? 120 : 90, items: [], ...(type === 'circuit' ? { rounds: 3 } : {}) }; S().blocks.push(b); putDraft(dr); return exSheet(dr, S().blocks.length - 1, null, true); }
    else if (a === 'exAdd') return exSheet(dr, bi, null);
    else if (a === 'exEdit') return exSheet(dr, bi, +t.dataset.ii);
    else if (a === 'wuAdd') dr.data.warmups[t.dataset.k].items.push({ name: 'Nuovo', amount: '10' });
    else if (a === 'wuDel') dr.data.warmups[t.dataset.k].items.splice(+t.dataset.i, 1);
    else if (a === 'discard') { if (!(await confirmSheet('Annullare le modifiche?', 'Torni alla scheda salvata.', 'Annulla modifiche', true))) return; LS.del(DKEY()); return re(); }
    else if (a === 'save') return saveDraft(dr, false);
    else if (a === 'saveNew') return saveDraft(dr, true);
    else return;
    putDraft(dr); re();
  };
}
function markDirty(el) { el.querySelectorAll('[data-a="save"],[data-a="discard"]').forEach((b) => b.disabled = false); }

async function saveDraft(dr, asNew) {
  const bad = dr.data.sessions.find((s) => !s.blocks.length || s.blocks.some((b) => !b.items.length));
  if (bad) { toast(`"${bad.name}" ha un blocco vuoto: aggiungi un esercizio o eliminalo`, 'err'); return; }
  const prog = activeProgram(store.data);
  if (asNew) {
    if (!(await confirmSheet('Nuova scheda?', 'La scheda attuale va in archivio e Gian riceve questa. Lo storico e i grafici restano.', 'Salva come nuova'))) return;
    await store.saveProgram({ ...prog, active: false, ended_on: today() });
    await store.saveProgram({ id: uuid(), athlete_id: store.data.athlete.id, name: dr.name, data: dr.data, active: true, started_on: today(), ended_on: null, created_at: new Date().toISOString() });
  } else {
    await store.saveProgram({ ...prog, name: dr.name, data: dr.data });
  }
  LS.del(DKEY());
  toast('Scheda salvata: Gian la vede subito 💪', 'ok');
  ctx.route();
}

function knownExercises() {
  const m = new Map();
  for (const p of store.data.programs) for (const s of p.data.sessions) for (const b of s.blocks) for (const it of b.items) if (!m.has(it.slug)) m.set(it.slug, it);
  for (const w of store.data.workouts) for (const e of w.exercises || []) if (!m.has(e.slug)) m.set(e.slug, { slug: e.slug, name: e.name, load: e.load });
  return m;
}

function exSheet(dr, bi, ii, newBlock = false) {
  const S = dr.data.sessions[edit.si];
  const b = S.blocks[bi];
  const isNew = ii == null;
  const ex = isNew ? { slug: '', name: '', sets: 3, reps: 10, secs: null, perSide: false, load: 'bilanciere', tip: '', points: [], pic: '', video: '', media: '', target_kg: null } : JSON.parse(JSON.stringify(b.items[ii]));
  const known = knownExercises();
  const timed = ex.secs != null;
  const close = sheet(`<h2>${isNew ? 'Nuovo esercizio' : 'Modifica esercizio'}</h2>
    <label class="lbl">Nome</label><input class="inp" id="eName" list="knownEx" value="${esc(ex.name)}" placeholder="Scrivi o scegli dall’elenco">
    <datalist id="knownEx">${[...known.values()].map((k) => `<option value="${esc(k.name)}">`).join('')}</datalist>
    <p class="muted small">Se scegli un nome già usato, i grafici continuano con lo storico di quell’esercizio.</p>
    <div class="grid2">
      ${b.type === 'circuit' ? '' : `<div><label class="lbl">Serie</label><input class="inp" id="eSets" inputmode="numeric" value="${ex.sets ?? 3}"></div>`}
      <div><label class="lbl">Tipo</label><select class="inp" id="eTimed"><option value="0" ${!timed ? 'selected' : ''}>Ripetizioni</option><option value="1" ${timed ? 'selected' : ''}>A tempo (secondi)</option></select></div>
      <div><label class="lbl" id="eAmtL">${timed ? 'Secondi' : 'Ripetizioni'}</label><input class="inp" id="eAmt" inputmode="numeric" value="${timed ? ex.secs : ex.reps ?? ''}"></div>
      <div><label class="lbl">Attrezzo</label><select class="inp" id="eLoad">${LOADS.map(([k, l]) => `<option value="${k}" ${ex.load === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
      <div><label class="lbl">Carico obiettivo (kg)</label><input class="inp" id="eTarget" inputmode="decimal" value="${ex.target_kg ?? ''}" placeholder="Lo sceglie Gian"></div>
      <div class="chk-l"><label><input type="checkbox" id="eSide" ${ex.perSide ? 'checked' : ''}> Per lato / per gamba</label></div>
    </div>
    <label class="lbl">Consiglio breve (si vede sotto il nome)</label><input class="inp" id="eTip" value="${esc(ex.tip)}" maxlength="60">
    <label class="lbl">Spiegazione (un punto per riga)</label><textarea class="inp" id="ePts" rows="3">${esc((ex.points || []).join('\n'))}</textarea>
    <label class="lbl">Link video YouTube</label><input class="inp" id="eVid" value="${esc(ex.video)}" placeholder="Vuoto = ricerca automatica su YouTube">
    <label class="lbl">Disegno</label><div class="pic-pick" id="ePics">${['', ...PIC_KEYS].map((k) => `<button class="pp ${(ex.pic || ex.slug) === k || (!k && !ex.pic) ? '' : ''} ${ex.pic === k ? 'on' : ''}" data-pic="${k}">${k ? picSVG(k) : '<span>auto</span>'}</button>`).join('')}</div>
    <label class="lbl">Foto o video tuo (facoltativo)</label>
    <div class="media-row">${ex.media ? `<span class="muted small">Caricato ✓</span><button class="link-btn danger" id="eMediaDel">Rimuovi</button>` : ''}<label class="btn small ghost">${I.upload} Carica<input type="file" id="eFile" accept="image/*,video/*" hidden></label></div>
    <div class="row-btns">${!isNew ? `<button class="btn danger" id="eDel">${I.trash}</button>` : ''}<button class="btn primary grow" id="eSave">Salva esercizio</button></div>`, {
    onClose: () => { if (newBlock && !b.items.length) { S.blocks.splice(bi, 1); putDraft(dr); ctx.route(); } },
    onMount: (el, close) => {
      el.querySelector('#eTimed').onchange = (e) => { el.querySelector('#eAmtL').textContent = e.target.value === '1' ? 'Secondi' : 'Ripetizioni'; };
      el.querySelector('#eName').onchange = (e) => {
        const k = [...known.values()].find((x) => x.name.toLowerCase() === e.target.value.trim().toLowerCase());
        if (k && isNew) { Object.assign(ex, JSON.parse(JSON.stringify({ ...k, target_kg: null }))); el.querySelector('#eLoad').value = k.load || 'bilanciere'; el.querySelector('#eTip').value = k.tip || ''; el.querySelector('#ePts').value = (k.points || []).join('\n'); }
      };
      el.querySelectorAll('[data-pic]').forEach((p) => p.onclick = () => { ex.pic = p.dataset.pic; el.querySelectorAll('[data-pic]').forEach((x) => x.classList.toggle('on', x === p)); });
      el.querySelector('#eFile').onchange = async (e) => {
        const f = e.target.files[0]; if (!f) return;
        if (f.size > 45 * 1024 * 1024) { toast('File troppo grande (max 45 MB)'); return; }
        toast('Caricamento…');
        try { ex.media = await store.upload(f); toast('Caricato ✓', 'ok'); el.querySelector('.media-row').insertAdjacentHTML('afterbegin', '<span class="muted small">Caricato ✓</span>'); }
        catch (err) { toast(`Errore: ${err.message || err}`, 'err'); }
      };
      el.querySelector('#eMediaDel')?.addEventListener('click', () => { ex.media = ''; el.querySelector('.media-row span')?.remove(); el.querySelector('#eMediaDel').remove(); });
      el.querySelector('#eDel')?.addEventListener('click', () => {
        b.items.splice(ii, 1);
        if (!b.items.length) S.blocks.splice(bi, 1); else if (b.items.length === 1 && b.type === 'superset') b.type = 'single';
        putDraft(dr); close(); ctx.route();
      });
      el.querySelector('#eSave').onclick = () => {
        const name = el.querySelector('#eName').value.trim(); if (!name) { toast('Scrivi il nome'); return; }
        const k = [...known.values()].find((x) => x.name.toLowerCase() === name.toLowerCase());
        ex.name = name;
        if (!ex.slug || (isNew && !k)) ex.slug = k ? k.slug : slugify(name) || `es-${Date.now()}`;
        if (isNew && k) ex.slug = k.slug;
        const timedNow = el.querySelector('#eTimed').value === '1';
        const amt = num(el.querySelector('#eAmt').value);
        ex.secs = timedNow ? amt || 30 : null; ex.reps = timedNow ? null : amt || 10;
        if (b.type !== 'circuit') ex.sets = Math.max(1, num(el.querySelector('#eSets').value) || 3);
        ex.load = el.querySelector('#eLoad').value;
        ex.target_kg = num(el.querySelector('#eTarget').value);
        ex.perSide = el.querySelector('#eSide').checked;
        ex.tip = el.querySelector('#eTip').value.trim();
        ex.points = el.querySelector('#ePts').value.split('\n').map((x) => x.trim()).filter(Boolean);
        ex.video = el.querySelector('#eVid').value.trim();
        if (isNew) { b.items.push(ex); if (b.type === 'single' && b.items.length > 1) b.type = 'superset'; } else b.items[ii] = ex;
        newBlock = false; putDraft(dr); close(); ctx.route();
      };
    },
  });
  return close;
}

// ------------------------------------------------------------ ARCHIVIO
function archiveView(el) {
  const ps = [...store.data.programs].sort((a, b) => (b.started_on || '').localeCompare(a.started_on || ''));
  el.innerHTML = `<main class="page"><button class="back" onclick="location.hash='#/c/scheda'">${I.back} Scheda</button><h1 class="page-h">Archivio schede</h1>
    ${ps.map((p) => `<section class="card"><div class="card-h"><h2>${esc(p.name)}</h2>${p.active ? '<span class="pill on">ATTIVA</span>' : `<button class="btn small ghost" data-act="${p.id}">Rendi attiva</button>`}</div>
      <p class="muted small">${p.started_on ? `dal ${fmtDateShort(p.started_on)}` : ''}${p.ended_on ? ` al ${fmtDateShort(p.ended_on)}` : ''} · ${store.data.workouts.filter((w) => w.program_id === p.id).length} allenamenti</p>
      ${p.data.sessions.map((s) => `<details><summary><b>${esc(s.name)}</b></summary><ul class="arch">${s.blocks.flatMap((b) => b.items.map((it) => `<li>${esc(it.name)} <span class="muted">${targetText(it, b)}</span></li>`)).join('')}</ul></details>`).join('')}</section>`).join('')}</main>`;
  el.querySelectorAll('[data-act]').forEach((b) => b.onclick = async () => {
    if (!(await confirmSheet('Rendere attiva questa scheda?', 'Quella attiva ora va in archivio.', 'Rendi attiva'))) return;
    const cur = activeProgram(store.data);
    if (cur) await store.saveProgram({ ...cur, active: false, ended_on: today() });
    const p = store.data.programs.find((x) => x.id === b.dataset.act);
    await store.saveProgram({ ...p, active: true, ended_on: null, started_on: today() });
    LS.del(DKEY()); toast('Fatto'); go('#/c/scheda');
  });
}
