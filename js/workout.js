// Allenamento guidato: riscaldamento, serie precompilate, timer di recupero, fine seduta.
import { store, LS, uuid } from './store.js';
import { esc, I, mmss, restLabel, kgFmt, num, FACES, FACE_LABELS, $, $$ } from './util.js';
import { activeProgram, lastSetsFor, suggestion, newRecords, workoutStats } from './logic.js';
import { picSVG } from './pics.js';
import { sheet, toast, go, confirmSheet, beep, unlockAudio, keepAwake } from './ui.js';

const KEY = () => `bg_active_${store.user.uid}`;
export const getActive = () => (store.user ? LS.get(KEY(), null) : null);
const saveActive = (a) => LS.set(KEY(), a);
export const clearActive = () => LS.del(KEY());

const WEIGHTED = ['bilanciere', 'manubri', 'macchina'];
const KG_STEP = { bilanciere: 2.5, manubri: 1, macchina: 2.5 };
export const ytLink = (ex) => ex.video || `https://www.youtube.com/results?search_query=${encodeURIComponent(`${ex.name} esecuzione corretta`)}`;
const isVideo = (u) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(u) || /^data:video/.test(u);

export function exerciseInfo(ex) {
  const media = ex.media ? (isVideo(ex.media) ? `<video class="media" src="${esc(ex.media)}" controls playsinline preload="metadata"></video>` : `<img class="media" src="${esc(ex.media)}" alt="">`) : '';
  sheet(`<div class="info">
    <div class="info-pic">${picSVG(ex.pic || ex.slug, 'big')}</div>
    ${media}
    <h2>${esc(ex.name)}</h2>
    <p class="target">${targetText(ex)}</p>
    <ul class="points">${(ex.points?.length ? ex.points : [ex.tip]).filter(Boolean).map((p) => `<li>${esc(p)}</li>`).join('')}</ul>
    <a class="btn yt" href="${esc(ytLink(ex))}" target="_blank" rel="noopener">${I.yt} Guarda il video</a>
  </div>`);
}

export function targetText(ex, block) {
  const side = ex.perSide ? ' per lato' : '';
  const amount = ex.secs ? `${ex.secs}"${side}` : `${ex.reps ?? '?'}${side}`;
  if (block?.type === 'circuit') return amount;
  return `${ex.sets} × ${amount}`;
}

// ---------- costruzione della sequenza di serie
export function buildSteps(plan) {
  const steps = [];
  plan.blocks.forEach((b, bi) => {
    const rounds = b.type === 'circuit' ? (b.rounds || 3) : Math.max(...b.items.map((i) => i.sets || 1));
    for (let r = 0; r < rounds; r++) {
      const its = b.items.map((it, ii) => ({ it, ii })).filter(({ it }) => b.type === 'circuit' || r < (it.sets || 1));
      its.forEach(({ ii }, k) => {
        const lastInRound = b.type === 'single' || k === its.length - 1;
        steps.push({ id: `b${bi}i${ii}s${r}`, bi, ii, s: r, rest: lastInRound ? b.rest : 0 });
      });
    }
  });
  if (steps.length) steps[steps.length - 1].rest = 0;
  return steps;
}

export function startWorkout(sessionKey) {
  const prog = activeProgram(store.data);
  const plan = JSON.parse(JSON.stringify(prog.data.sessions.find((s) => s.key === sessionKey)));
  const warm = plan.warmup && prog.data.warmups?.[plan.warmup];
  const values = {};
  for (const st of buildSteps(plan)) {
    const ex = plan.blocks[st.bi].items[st.ii];
    const last = lastSetsFor(store.data, ex.slug);
    const ls = last ? last.sets[st.s] || last.sets[last.sets.length - 1] : null;
    values[st.id] = {
      kg: WEIGHTED.includes(ex.load) ? (ex.target_kg ?? ls?.kg ?? null) : null,
      reps: ex.secs ? null : (ls?.reps ?? ex.reps ?? null),
      secs: ex.secs ? (ex.perSide ? ex.secs * 2 : ex.secs) : null,
      done: false, t: null,
    };
  }
  const a = {
    id: uuid(), program_id: prog.id, session_key: plan.key, session_name: plan.name, plan,
    warm: warm ? { name: warm.name, items: warm.items, done: warm.items.map(() => false), skipped: false } : null,
    cooldown: prog.data.cooldown || '', started_at: new Date().toISOString(), values, notes: {},
  };
  saveActive(a);
  go('#/allenamento');
}

// ---------- timer (recupero e serie a tempo)
const timer = { endAt: 0, total: 0, kind: '', label: '', onDone: null, iv: null, half: false, halfDone: false };

function timerTick() {
  const el = $('#rest'); if (!el) return;
  const left = (timer.endAt - Date.now()) / 1000;
  if (timer.kind && left <= 0) {
    const done = timer.onDone; const kind = timer.kind;
    stopTimer(false);
    beep(3);
    if (kind === 'rest') { el.className = 'rest go'; el.innerHTML = `<div class="rest-big">VAI!</div><div class="rest-sub">Prossima serie</div>`; setTimeout(() => { if (!timer.kind) el.className = 'rest'; }, 3500); }
    done && done();
    return;
  }
  if (!timer.kind) return;
  if (timer.half && !timer.halfDone && left <= timer.total / 2) { timer.halfDone = true; beep(1, 660); }
  el.querySelector('.rest-big').textContent = mmss(Math.ceil(left));
  el.querySelector('.rest-bar i').style.width = `${Math.max(0, Math.min(100, (left / timer.total) * 100))}%`;
  if (timer.half) el.querySelector('.rest-sub').textContent = left > timer.total / 2 ? `${timer.label} · primo lato` : `${timer.label} · cambia lato!`;
}

function startTimer(kind, secs, label, onDone, { half = false } = {}) {
  unlockAudio();
  Object.assign(timer, { kind, total: secs, endAt: Date.now() + secs * 1000, label, onDone, half, halfDone: false, setId: null });
  const el = $('#rest');
  el.className = `rest show ${kind}`;
  el.innerHTML = `<div class="rest-top"><span class="rest-k">${kind === 'rest' ? 'PAUSA' : 'VIA!'}</span><span class="rest-sub">${esc(label)}</span></div>
    <div class="rest-big">${mmss(secs)}</div><div class="rest-bar"><i></i></div>
    <div class="rest-btns">${kind === 'rest' ? `<button class="btn ghost" data-t="+30">+30"</button><button class="btn primary" data-t="skip">${I.skip} Salta</button>` : `<button class="btn primary" data-t="stop">${I.check} Fatto</button>`}</div>`;
  clearInterval(timer.iv); timer.iv = setInterval(timerTick, 250); timerTick();
}
function stopTimer(hide = true) {
  clearInterval(timer.iv); timer.iv = null; timer.kind = ''; timer.onDone = null;
  if (hide) { const el = $('#rest'); if (el) el.className = 'rest'; }
}
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') timerTick(); });

// ---------- vista
let mounted = false;
export function renderWorkout(root) {
  const a = getActive();
  if (!a) { go('#/'); return; }
  mounted = true;
  keepAwake(true);
  const steps = buildSteps(a.plan);
  const cur = steps.find((s) => !a.values[s.id].done);
  const doneN = steps.filter((s) => a.values[s.id].done).length;
  const pct = Math.round((doneN / steps.length) * 100);

  let html = `<header class="wk-head">
    <button class="icon-btn" data-act="exit" aria-label="Indietro">${I.back}</button>
    <div class="wk-title"><div class="t">${esc(a.session_name)}</div><div class="s"><span id="elapsed">${mmss((Date.now() - new Date(a.started_at)) / 1000)}</span> · ${doneN}/${steps.length} serie</div></div>
    <button class="btn small primary" data-act="finish">Fine</button>
  </header>
  <div class="wk-progress"><i style="width:${pct}%"></i></div>
  <main class="wk">`;

  if (a.warm && !a.warm.skipped && !a.warm.done.every(Boolean)) {
    html += `<section class="card warm"><div class="block-h"><span class="tag">RISCALDAMENTO</span><span class="muted">8 minuti</span></div>
      ${a.warm.items.map((it, i) => `<div class="warm-row ${a.warm.done[i] ? 'done' : ''}">
        <button class="chk ${a.warm.done[i] ? 'on' : ''}" data-act="warm" data-i="${i}" aria-label="Fatto">${I.check}</button>
        <div class="warm-n">${esc(it.name)}</div>
        ${it.secs ? `<button class="btn small ghost" data-act="warmtimer" data-i="${i}">${I.play} ${esc(it.amount)}</button>` : `<div class="warm-a">${esc(it.amount)}</div>`}
      </div>`).join('')}
      <button class="btn ghost full" data-act="skipwarm">Salta riscaldamento</button></section>`;
  }

  a.plan.blocks.forEach((b, bi) => {
    const multi = b.items.length > 1;
    const head = b.type === 'circuit' ? `<div class="block-h"><span class="tag">CIRCUITO · ${b.rounds} GIRI</span><span class="muted">tutto di fila, poi pausa ${restLabel(b.rest)}</span></div>`
      : multi ? `<div class="block-h"><span class="tag">COPPIA</span><span class="muted">uno dopo l'altro, poi pausa ${restLabel(b.rest)}</span></div>` : '';
    html += `<section class="card block ${multi ? 'multi' : ''}">${head}`;
    b.items.forEach((ex, ii) => {
      const last = lastSetsFor(store.data, ex.slug);
      const sug = suggestion(ex, last);
      const mySteps = steps.filter((s) => s.bi === bi && s.ii === ii);
      const weighted = WEIGHTED.includes(ex.load);
      html += `<div class="ex">
        <div class="ex-h" data-act="info" data-bi="${bi}" data-ii="${ii}">
          <div class="ex-pic">${picSVG(ex.pic || ex.slug)}</div>
          <div class="ex-t"><div class="ex-n">${esc(ex.name)}</div>
            <div class="ex-m">${targetText(ex, b)}${b.type === 'single' ? ` · pausa ${restLabel(b.rest)}` : ''}</div>
            ${ex.tip ? `<div class="ex-tip">${esc(ex.tip)}</div>` : ''}</div>
          <span class="ex-i">${I.info}</span>
        </div>
        ${ex.target_kg != null ? `<div class="hint coach">${I.user} Obiettivo del coach: <b>${kgFmt(ex.target_kg)} kg</b></div>` : ''}
        ${sug ? `<div class="hint">${I.fire} ${esc(sug.text)} ${sug.kg ? `<button class="link-btn" data-act="usesug" data-bi="${bi}" data-ii="${ii}" data-kg="${sug.kg}">Usa</button>` : ''}</div>` : ''}
        <div class="sets">${mySteps.map((st) => setRow(a, st, ex, b, weighted, cur)).join('')}</div>
        <div class="ex-note">${a.notes[ex.slug] != null ? `<textarea data-note="${esc(ex.slug)}" rows="2" placeholder="Come è andata?">${esc(a.notes[ex.slug])}</textarea>` : `<button class="link-btn" data-act="note" data-slug="${esc(ex.slug)}">${I.note} Aggiungi nota</button>`}</div>
      </div>`;
    });
    html += '</section>';
  });

  html += `<section class="end">${a.cooldown ? `<p class="muted center">${esc(a.cooldown)}</p>` : ''}
    <button class="btn hero" data-act="finish">${I.check} TERMINA ALLENAMENTO</button>
    <button class="link-btn danger center" data-act="discard">Annulla e butta questo allenamento</button></section></main>`;

  root.innerHTML = html;
  bind(root);
  clearInterval(renderWorkout.iv);
  renderWorkout.iv = setInterval(() => { const e = $('#elapsed'); if (!e || !getActive()) { clearInterval(renderWorkout.iv); return; } e.textContent = mmss((Date.now() - new Date(getActive().started_at)) / 1000); }, 1000);
}

function setRow(a, st, ex, b, weighted, cur) {
  const v = a.values[st.id];
  const isCur = cur && cur.id === st.id;
  const label = `<small>${b.type === 'circuit' ? 'giro' : 'serie'}</small><b>${st.s + 1}</b>`;
  const stepper = (field, val, step, unit) => `<div class="stp"><button class="stp-b" data-act="step" data-id="${st.id}" data-f="${field}" data-d="-${step}" aria-label="meno">${I.minus}</button>
    <input class="stp-v" data-id="${st.id}" data-f="${field}" inputmode="decimal" value="${val == null ? '' : String(val).replace('.', ',')}" placeholder="–"><span class="stp-u">${unit}</span>
    <button class="stp-b" data-act="step" data-id="${st.id}" data-f="${field}" data-d="${step}" aria-label="più">${I.plus}</button></div>`;
  let mid;
  if (v.done) {
    mid = `<div class="set-done">${weighted ? `<b>${kgFmt(v.kg)}</b> kg × ` : ''}${v.secs != null && v.reps == null ? `<b>${v.secs}"</b>` : `<b>${v.reps ?? '–'}</b> rip`}</div>`;
  } else if (ex.secs) {
    mid = `<button class="btn timer-btn" data-act="settimer" data-id="${st.id}">${I.play} ${ex.secs}"${ex.perSide ? ' + ' + ex.secs + '"' : ''}</button>`;
  } else {
    mid = `${weighted ? stepper('kg', v.kg, KG_STEP[ex.load], 'kg') : ''}${stepper('reps', v.reps, 1, 'rip')}`;
  }
  return `<div class="set ${v.done ? 'done' : ''} ${isCur ? 'cur' : ''}" id="row-${st.id}">
    <div class="set-l">${label}</div><div class="set-m">${mid}</div>
    <button class="chk big ${v.done ? 'on' : ''}" data-act="tick" data-id="${st.id}" aria-label="Serie fatta">${I.check}</button></div>`;
}

function bind(root) {
  root.onclick = async (e) => {
    const t = e.target.closest('[data-act]'); if (!t) return;
    unlockAudio();
    const a = getActive(); if (!a) return;
    const act = t.dataset.act;
    if (act === 'exit') { stopTimer(); go('#/'); }
    else if (act === 'info') { exerciseInfo(a.plan.blocks[+t.dataset.bi].items[+t.dataset.ii]); }
    else if (act === 'warm') { a.warm.done[+t.dataset.i] = !a.warm.done[+t.dataset.i]; saveActive(a); renderWorkout(root); }
    else if (act === 'skipwarm') { a.warm.skipped = true; saveActive(a); renderWorkout(root); }
    else if (act === 'warmtimer') {
      const i = +t.dataset.i; const it = a.warm.items[i];
      startTimer('set', it.secs, it.name, () => { const b = getActive(); b.warm.done[i] = true; saveActive(b); renderWorkout(root); });
    } else if (act === 'step') {
      const id = t.dataset.id; const f = t.dataset.f; const d = parseFloat(t.dataset.d);
      const v = a.values[id]; v[f] = Math.max(0, Math.round(((v[f] ?? 0) + d) * 100) / 100);
      saveActive(a); const inp = root.querySelector(`input.stp-v[data-id="${id}"][data-f="${f}"]`); if (inp) inp.value = String(v[f]).replace('.', ',');
    } else if (act === 'tick') { tick(root, t.dataset.id); }
    else if (act === 'settimer') {
      const id = t.dataset.id; const st = buildSteps(a.plan).find((s) => s.id === id);
      const ex = a.plan.blocks[st.bi].items[st.ii];
      const tot = ex.perSide ? ex.secs * 2 : ex.secs; const t0 = Date.now();
      startTimer('set', tot, ex.name, () => { const b = getActive(); if (b && !b.values[id].done) { b.values[id].secs = tot; saveActive(b); tick(root, id, true); } }, { half: !!ex.perSide });
      timer.setId = id; timer.t0 = t0;
    } else if (act === 'usesug') {
      const bi = +t.dataset.bi, ii = +t.dataset.ii, kg = parseFloat(t.dataset.kg);
      for (const st of buildSteps(a.plan)) if (st.bi === bi && st.ii === ii && !a.values[st.id].done) a.values[st.id].kg = kg;
      saveActive(a); renderWorkout(root); toast(`Carico impostato a ${kgFmt(kg)} kg`);
    } else if (act === 'note') { a.notes[t.dataset.slug] = ''; saveActive(a); renderWorkout(root); root.querySelector(`textarea[data-note="${t.dataset.slug}"]`)?.focus(); }
    else if (act === 'finish') { finishSheet(); }
    else if (act === 'discard') {
      if (await confirmSheet('Buttare l’allenamento?', 'Le serie fatte oggi non verranno salvate.', 'Butta', true)) { stopTimer(); clearActive(); keepAwake(false); go('#/'); }
    }
  };
  root.onchange = (e) => {
    const inp = e.target.closest('input.stp-v'); const a = getActive(); if (!a) return;
    if (inp) { a.values[inp.dataset.id][inp.dataset.f] = num(inp.value); saveActive(a); }
  };
  root.oninput = (e) => {
    const ta = e.target.closest('textarea[data-note]'); const a = getActive(); if (!a || !ta) return;
    a.notes[ta.dataset.note] = ta.value; saveActive(a);
  };
  const restEl = $('#rest');
  restEl.onclick = (e) => {
    const b = e.target.closest('[data-t]'); if (!b) return;
    if (b.dataset.t === '+30') { timer.endAt += 30000; timer.total += 30; timerTick(); }
    else if (b.dataset.t === 'skip') stopTimer();
    else if (b.dataset.t === 'stop') {
      const done = timer.onDone; const elapsed = Math.round((Date.now() - (timer.endAt - timer.total * 1000)) / 1000);
      const id = timer.setId; stopTimer();
      if (id) { const a = getActive(); if (a && !a.values[id].done) { a.values[id].secs = elapsed; saveActive(a); tick(root, id, true); } timer.setId = null; }
      else if (done) done();
    }
  };
}

function tick(root, id, fromTimer = false) {
  // leggo gli input non ancora "change"
  const a = getActive();
  root.querySelectorAll(`input.stp-v[data-id="${id}"]`).forEach((inp) => { a.values[id][inp.dataset.f] = num(inp.value); });
  const v = a.values[id];
  const steps = buildSteps(a.plan);
  const st = steps.find((s) => s.id === id);
  if (v.done) { v.done = false; v.t = null; saveActive(a); stopTimer(); renderWorkout(root); return; }
  v.done = true; v.t = new Date().toISOString(); v.r = st.rest;
  if (fromTimer) timer.setId = null;
  saveActive(a);
  // propago il carico alle serie successive dello stesso esercizio se erano uguali alla precedente
  const same = steps.filter((s) => s.bi === st.bi && s.ii === st.ii && s.s > st.s);
  for (const s2 of same) { const v2 = a.values[s2.id]; if (!v2.done && v.kg != null && v2.kg == null) v2.kg = v.kg; }
  saveActive(a);
  renderWorkout(root);
  const allDone = steps.every((s) => a.values[s.id].done);
  if (st.rest && !allDone) {
    const ex = a.plan.blocks[st.bi].items[st.ii];
    const nxt = steps.find((s) => !a.values[s.id].done);
    const nex = nxt ? a.plan.blocks[nxt.bi].items[nxt.ii] : null;
    startTimer('rest', st.rest, nex ? `poi: ${nex.name}` : ex.name);
  }
  if (allDone) { toast('Tutte le serie fatte! Premi Termina 💪', 'ok'); }
  const curEl = root.querySelector('.set.cur');
  if (curEl) { const r = curEl.getBoundingClientRect(); if (r.top < 90 || r.bottom > window.innerHeight - 200) curEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
}

function finishSheet() {
  const a = getActive();
  const steps = buildSteps(a.plan);
  const doneN = steps.filter((s) => a.values[s.id].done).length;
  let fatigue = null, pain = null;
  sheet(`<h2>Com'è andata?</h2>
    <p class="muted">${doneN} serie su ${steps.length} fatte.</p>
    <div class="lbl">Fatica</div>
    <div class="faces">${FACES.map((f, i) => `<button class="face" data-f="${i + 1}"><span>${f}</span><small>${FACE_LABELS[i]}</small></button>`).join('')}</div>
    <div class="lbl">Dolori?</div>
    <div class="seg"><button data-p="0">No</button><button data-p="1">Sì</button></div>
    <div class="pain-box" hidden>
      <div class="chips">${['Spalle', 'Gomiti', 'Polsi', 'Schiena', 'Ginocchia', 'Anche', 'Altro'].map((c) => `<button class="chip" data-c="${c}">${c}</button>`).join('')}</div>
      <input class="inp" id="painTxt" placeholder="Dove e quanto? (facoltativo)">
    </div>
    <div class="lbl">Note (facoltative)</div>
    <textarea class="inp" id="wkNote" rows="3" placeholder="Sensazioni, energia, cosa vuoi dire a Fede…"></textarea>
    <button class="btn hero" id="saveWk">Salva allenamento</button>`, {
    onMount: (el, close) => {
      el.querySelectorAll('.face').forEach((b) => b.onclick = () => { fatigue = +b.dataset.f; el.querySelectorAll('.face').forEach((x) => x.classList.toggle('on', x === b)); });
      el.querySelectorAll('.seg button').forEach((b) => b.onclick = () => { pain = b.dataset.p === '1'; el.querySelectorAll('.seg button').forEach((x) => x.classList.toggle('on', x === b)); el.querySelector('.pain-box').hidden = !pain; });
      el.querySelectorAll('.chip').forEach((b) => b.onclick = () => b.classList.toggle('on'));
      el.querySelector('#saveWk').onclick = async () => {
        if (!fatigue) { toast('Tocca una faccina per la fatica'); return; }
        const where = [...el.querySelectorAll('.chip.on')].map((x) => x.dataset.c).join(', ');
        const txt = el.querySelector('#painTxt').value.trim();
        const w = buildWorkoutRow(a, { fatigue, pain: !!pain, pain_where: pain ? [where, txt].filter(Boolean).join(' · ') : '', note: el.querySelector('#wkNote').value.trim() });
        const recs = newRecords(store.data, w);
        stopTimer(); keepAwake(false);
        await store.saveWorkout(w);
        clearActive();
        close();
        LS.set('bg_last_summary', { id: w.id, recs });
        go(`#/fatto/${w.id}`);
      };
    },
  });
}

function buildWorkoutRow(a, extra) {
  const steps = buildSteps(a.plan);
  const exercises = [];
  a.plan.blocks.forEach((b, bi) => b.items.forEach((ex, ii) => {
    const sets = steps.filter((s) => s.bi === bi && s.ii === ii && a.values[s.id].done)
      .map((s) => { const v = a.values[s.id]; return { kg: v.kg, reps: v.reps, secs: ex.secs ? v.secs : null, t: v.t, r: v.r || 0 }; });
    if (sets.length || a.notes[ex.slug]) exercises.push({ slug: ex.slug, name: ex.name, load: ex.load, rest: b.rest, block: b.type, note: a.notes[ex.slug] || '', sets });
  }));
  return {
    id: a.id, athlete_id: store.data.athlete.id, program_id: a.program_id, session_key: a.session_key, session_name: a.session_name,
    started_at: a.started_at, ended_at: new Date().toISOString(), warmup_done: !!a.warm && a.warm.done.every(Boolean),
    plan: a.plan, exercises, imported: false, ...extra,
  };
}

export function renderSummary(root, id) {
  const w = store.data.workouts.find((x) => x.id === id);
  if (!w) { go('#/'); return; }
  const sum = LS.get('bg_last_summary', null);
  const recs = sum && sum.id === id ? sum.recs : [];
  const st = workoutStats(w);
  root.innerHTML = `<main class="page center-page">
    <div class="done-badge">${I.check}</div>
    <h1 class="big-h">FATTO!</h1>
    <p class="muted">${esc(w.session_name)}</p>
    <div class="tiles">
      <div class="tile"><b>${st.mins ?? '–'}'</b><span>durata</span></div>
      <div class="tile"><b>${st.sets}</b><span>serie</span></div>
      <div class="tile"><b>${st.vol.toLocaleString('it-IT')}</b><span>kg sollevati</span></div>
    </div>
    ${recs.length ? `<section class="card recs-new"><h2>${I.trophy} Nuovi record!</h2>${recs.map((r) => `<div class="rec-row"><span>${esc(r.name)}</span><b>${esc(r.text)}</b></div>`).join('')}</section>` : ''}
    <button class="btn hero" onclick="location.hash='#/'">Torna alla home</button>
  </main>`;
}
export const isMounted = () => mounted;
export { stopTimer };
