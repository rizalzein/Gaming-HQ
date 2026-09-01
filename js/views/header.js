import { S, commit } from '../state.js';
import { setHTML, esc } from '../util/dom.js';
import { longDate } from '../util/format.js';
import { msUntilReset, fmtDuration, daysUntil } from '../util/date.js';
import { loginCount, enabledGames, isHolidayActive, autoHoliday } from '../domain.js';
import { remindersDue } from '../reminder.js';

export function renderHeader(){
  const { done, total } = loginCount();
  const chips = [
    `<span class="chip"><b>${esc(longDate())}</b></span>`,
    `<span class="chip ${total && done === total ? 'good' : ''}">Login hari ini: <b>${done}/${total}</b></span>`,
  ];

  const due = remindersDue();
  const reset = nextReset();
  if (reset) chips.push(`<span class="chip ${due.length ? 'warn' : ''}">Reset ${esc(reset)}</span>`);

  const ev = nextEvent();
  if (ev) chips.push(`<span class="chip warn">${esc(ev)}</span>`);

  if (isHolidayActive()) chips.push('<span class="chip warn">🌴 <b>Mode liburan</b></span>');

  setHTML('hud', chips.join(''));
  renderReminderBanner(due);
  renderHolidayBanner();
}

/**
 * Peringatan ini yang paling bisa diandalkan — ia selalu benar begitu aplikasi
 * dibuka. Notifikasi sistem hanya pelengkap, karena tidak bisa dijamin muncul
 * saat aplikasi tertutup.
 */
function renderReminderBanner(due){
  if (!due.length){
    setHTML('reminder-banner', '');
    return;
  }

  setHTML('reminder-banner', `
    <div class="reminder">
      <h3>⏰ RESET SEBENTAR LAGI</h3>
      <p><b>${due.length} game</b> belum diklaim — paling mendesak
         <b>${esc(fmtDuration(due[0].ms))}</b> lagi.</p>
      <ul>${due.map(d =>
        `<li>${esc(d.game.name)} — ${esc(fmtDuration(d.ms))}</li>`).join('')}</ul>
      <button type="button" class="btn ghost" data-act="nav:go" data-tab="beranda"
              style="margin-top:10px">Ke Login Harian</button>
    </div>`);
}

function nextReset(){
  const games = enabledGames();
  if (!games.length) return null;
  const soonest = games
    .map(g => ({ g, ms: msUntilReset(g.reset) }))
    .sort((a, b) => a.ms - b.ms)[0];
  return `${fmtDuration(soonest.ms)} lagi (${soonest.g.short})`;
}

function nextEvent(){
  const next = S.events
    .map(e => ({ e, d: daysUntil(e.date) }))
    .filter(x => x.d >= 0)
    .sort((a, b) => a.d - b.d)[0];
  if (!next || next.d > 7) return null;

  const name = next.e.name.length > 46 ? next.e.name.slice(0, 44) + '…' : next.e.name;
  const when = next.d === 0 ? 'HARI INI' : next.d === 1 ? 'BESOK' : `${next.d} hari lagi`;
  return `${name} — ${when}`;
}

function renderHolidayBanner(){
  const h = S.holiday;
  if (!isHolidayActive()){
    setHTML('holiday-banner', '');
    return;
  }
  setHTML('holiday-banner', `
    <div class="holiday">
      <h3>🌴 MODE LIBURAN AKTIF${h.label ? ' — ' + esc(h.label) : ''}</h3>
      <p>Target hari ini cuma jaga streak — <b>5 menit dari HP</b>, sisanya nikmati liburan.</p>
      <ul>${h.tips.map(t => `<li>${esc(t)}</li>`).join('')}</ul>
      <button type="button" class="btn ghost" data-act="holiday:toggle" style="margin-top:10px">
        Matikan mode liburan
      </button>
    </div>`);
}

export const actions = {
  'holiday:toggle'(){
    const next = !isHolidayActive();
    // Kalau hasilnya sama dengan mode otomatis, lepas override supaya ikut tanggal lagi.
    S.holiday.mode = (next === autoHoliday()) ? null : next;
    commit();
  },
};
