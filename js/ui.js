import { $, esc, I } from './util.js';

export function go(hash) { if (location.hash === hash) window.dispatchEvent(new HashChangeEvent('hashchange')); else location.hash = hash; }

let toastTimer;
export function toast(msg, kind = '') {
  const el = $('#toast');
  el.className = `toast show ${kind}`; el.textContent = msg;
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { el.className = 'toast'; }, 2600);
}

// Foglio dal basso. content: html; onMount(el) per collegare gli eventi. Ritorna close().
export function sheet(content, { onMount, onClose, cls = '' } = {}) {
  const root = $('#sheets');
  const wrap = document.createElement('div');
  wrap.className = 'sheet-wrap';
  wrap.innerHTML = `<div class="sheet-bg" data-close></div><div class="sheet ${cls}" role="dialog" aria-modal="true"><button class="sheet-x" data-close aria-label="Chiudi">${I.close}</button>${content}</div>`;
  root.appendChild(wrap);
  requestAnimationFrame(() => wrap.classList.add('open'));
  const close = () => {
    wrap.classList.remove('open');
    setTimeout(() => wrap.remove(), 220);
    onClose && onClose();
  };
  wrap.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) close(); });
  onMount && onMount(wrap.querySelector('.sheet'), close);
  return close;
}

export function confirmSheet(title, text, okLabel = 'Conferma', danger = false) {
  return new Promise((res) => {
    let done = false;
    const close = sheet(`<h2>${esc(title)}</h2>${text ? `<p class="muted">${esc(text)}</p>` : ''}
      <div class="row-btns"><button class="btn ghost" data-no>Annulla</button><button class="btn ${danger ? 'danger' : 'primary'}" data-ok>${esc(okLabel)}</button></div>`, {
      onMount: (el, c) => {
        el.querySelector('[data-ok]').onclick = () => { done = true; res(true); c(); };
        el.querySelector('[data-no]').onclick = () => { c(); };
      },
      onClose: () => { if (!done) res(false); },
    });
    return close;
  });
}

// Tooltip per i grafici (tocco o mouse su [data-tip])
export function initTooltips() {
  const tip = $('#tip');
  const show = (t, x, y) => {
    tip.textContent = t; tip.classList.add('show');
    const r = tip.getBoundingClientRect();
    tip.style.left = `${Math.min(window.innerWidth - r.width - 8, Math.max(8, x - r.width / 2))}px`;
    tip.style.top = `${Math.max(8, y - r.height - 14)}px`;
  };
  const hide = () => tip.classList.remove('show');
  document.addEventListener('pointerover', (e) => { const t = e.target.closest?.('[data-tip]'); if (t && e.pointerType === 'mouse') { const b = t.getBoundingClientRect(); show(t.dataset.tip, b.left + b.width / 2, b.top); } });
  document.addEventListener('pointerout', (e) => { if (e.pointerType === 'mouse' && e.target.closest?.('[data-tip]')) hide(); });
  document.addEventListener('pointerdown', (e) => {
    const t = e.target.closest?.('[data-tip]');
    if (t) { const b = t.getBoundingClientRect(); show(t.dataset.tip, b.left + b.width / 2, b.top); } else hide();
  });
  window.addEventListener('scroll', hide, { passive: true });
}

// Suoni e vibrazione
let actx = null;
export function unlockAudio() {
  try {
    if (!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch { /* */ }
}
export function beep(times = 3, freq = 880) {
  try {
    unlockAudio(); if (!actx) return;
    for (let i = 0; i < times; i++) {
      const o = actx.createOscillator(); const g = actx.createGain();
      o.type = 'square'; o.frequency.value = i === times - 1 ? freq * 1.5 : freq;
      const t0 = actx.currentTime + i * 0.32;
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i === times - 1 ? 0.5 : 0.2));
      o.connect(g).connect(actx.destination); o.start(t0); o.stop(t0 + 0.55);
    }
  } catch { /* */ }
  try { navigator.vibrate && navigator.vibrate([300, 120, 300, 120, 500]); } catch { /* */ }
}

let wakeLock = null;
export async function keepAwake(on) {
  try {
    if (on && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      if (!wakeLock) { wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', () => { wakeLock = null; }); }
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch { /* non supportato */ }
}
