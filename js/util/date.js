/**
 * Semua perhitungan periode memakai "hari game": hari berganti pada jam reset
 * di timezone server game, bukan tengah malam waktu perangkat.
 *
 * reset = { tz: <menit dari UTC>, hour: <jam reset di waktu server> }
 * Contoh server Asia HoYoverse: { tz: 480, hour: 4 }  →  03:00 WIB.
 */

const MS_HOUR = 3_600_000;
const MS_DAY  = 86_400_000;

/** Geser timestamp sehingga field UTC-nya mewakili waktu-game dikurangi jam reset. */
function shift(date, reset){
  return new Date(date.getTime() + reset.tz * 60_000 - reset.hour * MS_HOUR);
}

export function dayKey(reset, date = new Date()){
  return shift(date, reset).toISOString().slice(0, 10);
}

/** Kunci minggu = tanggal Senin dari minggu-game berjalan. */
export function weekKey(reset, date = new Date()){
  const d = shift(date, reset);
  const dow = (d.getUTCDay() + 6) % 7;         // 0 = Senin
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export function monthKey(reset, date = new Date()){
  return dayKey(reset, date).slice(0, 7);
}

/** Kunci periode bertanda, dipakai sebagai key di state.progress. */
export function periodKey(cadence, reset, date = new Date()){
  if (cadence === 'weekly')  return 'w:' + weekKey(reset, date);
  if (cadence === 'monthly') return 'm:' + monthKey(reset, date);
  return 'd:' + dayKey(reset, date);
}

/** Milidetik menuju reset harian berikutnya. */
export function msUntilReset(reset, date = new Date()){
  const d = shift(date, reset);
  const next = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1);
  return next - d.getTime();
}

export function fmtDuration(ms){
  const mins = Math.max(0, Math.round(ms / 60_000));
  const h = Math.floor(mins / 60);
  return h > 0 ? `${h}j ${mins % 60}m` : `${mins}m`;
}

/** Geser sebuah dayKey sebanyak n hari (n boleh negatif). */
export function addDays(key, n){
  const d = new Date(key + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** Tanggal kalender perangkat — dipakai untuk deadline event, bukan hari-game. */
export function localDayKey(date = new Date()){
  const p = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

export function daysUntil(dateStr){
  const today = new Date(localDayKey() + 'T00:00:00');
  const target = new Date(dateStr + 'T00:00:00');
  return Math.round((target - today) / MS_DAY);
}
