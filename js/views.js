// Pezzi condivisi tra atleta e allenatore
import { store } from './store.js';
import { esc, I, monthName, dayKey, fmtDate, fmtTime, kgFmt, restLabel, mmss, sessionColor, sessionLetter, FACES, FACE_LABELS, num, today, fmtDateShort } from './util.js';
import { workoutsByDay, workoutStats, restGaps, activeProgram, MAIN_LIFTS, records, strengthSeries, SKILLS, skillProgress } from './logic.js';
import { lineChart } from './charts.js';
import { sheet, toast, go, confirmSheet } from './ui.js';

// ---------- calendario con i pallini
export function calendarHTML(offset = 0, { compact = false } = {}) {
  const d = store.data;
  const now = new Date();
  const m = new Date(now.getFullYear(), now.getMonth() + offset, 1);
  const byDay = workoutsByDay(d);
  const first = (m.getDay() + 6) % 7;
  const days = new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate();
  const prog = activeProgram(d);
  const keys = prog ? prog.data.sessions.map((s) => s.key) : [];
  let cells = '';
  for (let i = 0; i < first; i++) cells += '<div class="cd empty"></div>';
  let count = 0;
  for (let n = 1; n <= days; n++) {
    const k = dayKey(new Date(m.getFullYear(), m.getMonth(), n));
    const ws = byDay[k] || [];
    count += ws.length;
    const isToday = k === today();
    const w = ws[0];
    const dot = w ? `<span class="dot" style="background:${sessionColor(w.session_key, keys.indexOf(w.session_key))}">${esc(sessionLetter(w.session_key))}</span>` : `<span class="num">${n}</span>`;
    cells += `<button class="cd ${isToday ? 'today' : ''} ${w ? 'has' : ''}" ${w ? `data-wid="${w.id}"` : 'disabled'} aria-label="${n}${w ? ' ' + esc(w.session_name) : ''}">${dot}</button>`;
  }
  const legend = prog ? prog.data.sessions.map((s, i) => `<span><i class="ldot" style="background:${sessionColor(s.key, i)}">${esc(sessionLetter(s.key))}</i>${esc(s.name.split('·')[0].trim())}</span>`).join('') : '';
  return `<div class="cal ${compact ? 'compact' : ''}">
    <div class="cal-h"><button class="icon-btn" data-cal="-1" aria-label="Mese prima">${I.back}</button>
      <div class="cal-t">${monthName(m.getMonth())} ${m.getFullYear()}<small>${count} allenament${count === 1 ? 'o' : 'i'}</small></div>
      <button class="icon-btn" data-cal="1" ${offset >= 0 ? 'disabled' : ''} aria-label="Mese dopo">${I.right}</button></div>
    <div class="cal-w">${['L', 'M', 'M', 'G', 'V', 'S', 'D'].map((x) => `<span>${x}</span>`).join('')}</div>
    <div class="cal-g">${cells}</div>
    <div class="cal-l">${legend}</div></div>`;
}
export function bindCalendar(el, state, rerender) {
  el.querySelectorAll('[data-cal]').forEach((b) => b.onclick = () => { state.cal = Math.min(0, (state.cal || 0) + +b.dataset.cal); rerender(); });
  el.querySelectorAll('[data-wid]').forEach((b) => b.onclick = () => go(`#/w/${b.dataset.wid}`));
}

// ---------- dettaglio allenamento
export function workoutDetailHTML(w, { coach }) {
  const st = workoutStats(w);
  const gaps = restGaps(w);
  const comments = store.data.messages.filter((m) => m.workout_id === w.id);
  const gapFor = (s) => gaps.find((g) => g.at === s.t);
  const faces = w.fatigue ? `<span class="face-s">${FACES[w.fatigue - 1]} ${FACE_LABELS[w.fatigue - 1]}</span>` : '';
  let html = `<div class="detail-h">
    <span class="sdot" style="background:${sessionColor(w.session_key)}">${esc(sessionLetter(w.session_key))}</span>
    <div><h1>${esc(w.session_name)}</h1><div class="muted">${fmtDate(w.started_at)}${w.imported ? '' : ` · ore ${fmtTime(w.started_at)}`}</div></div></div>
    <div class="tiles">
      <div class="tile"><b>${st.mins != null ? st.mins + "'" : '–'}</b><span>durata</span></div>
      <div class="tile"><b>${st.sets}</b><span>serie</span></div>
      <div class="tile"><b>${st.vol.toLocaleString('it-IT')}</b><span>kg totali</span></div>
    </div>
    ${w.imported ? '<p class="muted small">Importato dall’app che usava prima: solo i valori, senza orari.</p>' : ''}
    ${faces || w.pain || w.note ? `<section class="card feel">
      ${faces ? `<div class="feel-r"><span class="lbl">Fatica</span>${faces}</div>` : ''}
      ${w.pain ? `<div class="feel-r pain">${I.alert}<span><b>Dolori:</b> ${esc(w.pain_where || 'sì')}</span></div>` : ''}
      ${w.note ? `<div class="feel-n">“${esc(w.note)}”</div>` : ''}</section>` : ''}`;
  for (const e of w.exercises || []) {
    const planned = coach ? e.rest : null;
    html += `<section class="card ex-log"><div class="ex-log-h">${esc(e.name)}</div>
      <table class="sets-t">${e.sets.map((s, i) => {
        const g = coach ? gapFor(s) : null;
        const val = s.kg != null ? `<b>${kgFmt(s.kg)}</b> kg × <b>${s.reps ?? '–'}</b>` : s.reps != null ? `<b>${s.reps}</b> rip` : s.secs != null ? `<b>${s.secs}"</b>` : '–';
        const gTxt = g ? `<span class="gap ${g.rest > g.planned * 1.4 + 20 ? 'long' : g.rest < g.planned * 0.6 ? 'short' : ''}">pausa ≈ ${restLabel(Math.round(g.rest / 5) * 5)}<small> / ${restLabel(g.planned)}</small></span>` : '';
        return `<tr><td class="n">${i + 1}</td><td>${val}</td><td class="r">${gTxt}</td></tr>`;
      }).join('')}</table>
      ${e.note ? `<div class="feel-n">“${esc(e.note)}”</div>` : ''}</section>`;
  }
  if (coach && gaps.length) html += '<p class="muted small">Pausa ≈ tempo tra una serie e l’altra meno 40" di esecuzione. Accanto, la pausa prevista.</p>';
  html += `<section class="card"><h2>${I.msg} Commenti di Fede</h2>
    ${comments.length ? comments.map((m) => `<div class="cmt"><div>${esc(m.text)}</div><small>${fmtDateShort(m.created_at)}${coach ? ` · ${m.read_at ? 'letto' : 'non ancora letto'} <button class="link-btn danger" data-delmsg="${m.id}">elimina</button>` : ''}</small></div>`).join('') : `<p class="muted">${coach ? 'Lascia un commento a Gian su questo allenamento.' : 'Nessun commento per ora.'}</p>`}
    ${coach ? `<textarea class="inp" id="cmtTxt" rows="2" placeholder="Es. Bravo, la prossima sali di 2,5"></textarea><button class="btn primary full" id="cmtSend">Invia commento</button>` : ''}</section>`;
  if (coach) html += `<button class="link-btn danger center" id="delWk">Elimina questo allenamento</button>`;
  return html;
}
export function bindWorkoutDetail(el, w, rerender) {
  el.querySelector('#cmtSend')?.addEventListener('click', async () => {
    const t = el.querySelector('#cmtTxt').value.trim(); if (!t) return;
    await store.sendMessage(t, w.id); toast('Commento inviato'); rerender();
  });
  el.querySelectorAll('[data-delmsg]').forEach((b) => b.onclick = async () => { await store.deleteMessage(b.dataset.delmsg); rerender(); });
  el.querySelector('#delWk')?.addEventListener('click', async () => {
    if (await confirmSheet('Eliminare l’allenamento?', 'Sparisce anche dai grafici. Non si torna indietro.', 'Elimina', true)) { await store.deleteWorkout(w.id); go('#/c/allenamenti'); }
  });
  // segno come letti i commenti quando li apre Gian
  if (store.data.me?.role === 'athlete') for (const m of store.data.messages) if (m.workout_id === w.id && !m.read_at) store.markRead(m.id);
}

// ---------- peso
export function weightSheet() {
  const bw = [...store.data.bodyweights].sort((a, b) => a.measured_on.localeCompare(b.measured_on));
  let kg = bw.length ? +bw[bw.length - 1].kg : 84;
  sheet(`<h2>${I.scale} Peso di oggi</h2>
    <div class="big-stp"><button class="stp-b" data-d="-0.1">${I.minus}</button><input id="wKg" class="big-v" inputmode="decimal" value="${String(kg.toFixed(1)).replace('.', ',')}"><span class="unit">kg</span><button class="stp-b" data-d="0.1">${I.plus}</button></div>
    <label class="lbl">Data</label><input type="date" class="inp" id="wDate" value="${today()}" max="${today()}">
    <button class="btn hero" id="wSave">Salva</button>
    ${bw.length ? `<div class="lbl">Ultime pesate</div><div class="w-list">${bw.slice(-5).reverse().map((b) => `<div class="w-row"><span>${fmtDateShort(b.measured_on)}</span><b>${kgFmt(b.kg)} kg</b><button class="icon-btn" data-delw="${b.id}" aria-label="Elimina">${I.trash}</button></div>`).join('')}</div>` : ''}`, {
    onMount: (el, close) => {
      const inp = el.querySelector('#wKg');
      el.querySelectorAll('[data-d]').forEach((b) => b.onclick = () => { kg = Math.round(((num(inp.value) ?? kg) + +b.dataset.d) * 10) / 10; inp.value = String(kg.toFixed(1)).replace('.', ','); });
      el.querySelector('#wSave').onclick = async () => {
        const v = num(inp.value); if (!v || v < 30 || v > 250) { toast('Peso non valido'); return; }
        await store.saveWeight(Math.round(v * 10) / 10, el.querySelector('#wDate').value || today()); close(); toast('Peso salvato 👍', 'ok');
      };
      el.querySelectorAll('[data-delw]').forEach((b) => b.onclick = async () => { await store.deleteWeight(b.dataset.delw); close(); toast('Pesata eliminata'); });
    },
  });
}

export function weightChart({ height = 170, avg = true } = {}) {
  const bw = [...store.data.bodyweights].sort((a, b) => a.measured_on.localeCompare(b.measured_on));
  const pts = bw.map((b) => ({ x: new Date(b.measured_on + 'T12:00:00'), y: +b.kg, tip: `${fmtDateShort(b.measured_on)}: ${kgFmt(b.kg)} kg` }));
  const series = [{ name: 'Pesate', color: 'var(--series-1)', points: pts, line: !avg || pts.length < 4, hollow: avg && pts.length >= 4 }];
  if (avg && pts.length >= 4) {
    const m = pts.map((p, i) => { const win = pts.slice(Math.max(0, i - 3), i + 1); const y = win.reduce((a, q) => a + q.y, 0) / win.length; return { x: p.x, y: Math.round(y * 10) / 10, tip: `Media: ${kgFmt(Math.round(y * 10) / 10)} kg` }; });
    series.push({ name: 'Media ultime 4', color: 'var(--series-2)', points: m, dots: false });
  }
  return lineChart({ series, height, unit: ' kg', emptyMsg: 'Nessuna pesata ancora: premi “Pesati”' });
}

// ---------- forza
export function strengthBlock(state, { height = 190 } = {}) {
  const d = store.data;
  const recs = records(d);
  const sel = state.lift || MAIN_LIFTS[0].slug;
  const pts = strengthSeries(d, sel).map((p) => ({ ...p, tip: `${fmtDateShort(p.x)}: ${kgFmt(p.best.kg)} kg × ${p.best.reps} → massimale ≈ ${kgFmt(Math.round(p.y))} kg${p.imported ? ' (app precedente)' : ''}` }));
  const r = recs[sel];
  return `<div class="chips scroll">${MAIN_LIFTS.map((l) => `<button class="chip ${l.slug === sel ? 'on' : ''}" data-lift="${l.slug}">${l.short}</button>`).join('')}</div>
    <div class="chart-cap">Massimale stimato (kg) · ${r ? `record: <b>${kgFmt(r.kg)} kg × ${r.reps}</b>` : 'nessun dato'}</div>
    ${lineChart({ series: [{ name: 'Massimale stimato', color: 'var(--series-1)', points: pts }], height, unit: ' kg', emptyMsg: 'Ancora nessuna serie registrata per questo esercizio' })}`;
}
export function bindLift(el, state, rerender) { el.querySelectorAll('[data-lift]').forEach((b) => b.onclick = () => { state.lift = b.dataset.lift; rerender(); }); }

export function recordsHTML() {
  const recs = records(store.data);
  const rows = MAIN_LIFTS.map((l) => { const r = recs[l.slug]; return `<div class="rec-row"><span>${l.short}</span><b>${r ? `${kgFmt(r.kg)} kg × ${r.reps}` : '–'}</b></div>`; });
  for (const sk of SKILLS) {
    const p = skillProgress(store.data, sk).current;
    rows.push(`<div class="rec-row"><span>${sk.name}</span><b>${p ? `${esc(p.stage)} · ${p.best} rip` : '–'}</b></div>`);
  }
  return rows.join('');
}

export function installSheet(deferred) {
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  sheet(`<h2>Mettila nella schermata Home</h2>
    ${deferred ? '<button class="btn hero" id="doInstall">Installa Baggats</button>' : ''}
    <div class="steps-i">${ios ? `
      <p><b>iPhone</b> (con Safari):</p><ol><li>Tocca il tasto <b>Condividi</b> (quadrato con la freccia in su)</li><li>Scorri e tocca <b>Aggiungi alla schermata Home</b></li><li>Tocca <b>Aggiungi</b></li></ol>` : `
      <p><b>Android</b> (con Chrome):</p><ol><li>Tocca i <b>tre puntini</b> in alto a destra</li><li>Tocca <b>Installa app</b> o <b>Aggiungi a schermata Home</b></li><li>Conferma</li></ol>`}
      <p class="muted">Poi aprila sempre dall’icona: si apre a schermo intero come un’app.</p></div>`, {
    onMount: (el, close) => { el.querySelector('#doInstall')?.addEventListener('click', async () => { deferred.prompt(); await deferred.userChoice; close(); }); },
  });
}
