/**
 * Pengingat sebelum reset harian.
 *
 * BATAS YANG PERLU DIKETAHUI: situs statis tidak bisa membangunkan dirinya
 * sendiri. Timer di halaman ikut mati begitu aplikasi ditutup, dan service
 * worker dihentikan sistem beberapa detik setelah idle. Jadi seluruh isi modul
 * ini hanya bekerja selama aplikasi terbuka.
 *
 * Untuk notifikasi yang tetap muncul saat aplikasi tertutup dan layar terkunci,
 * dibutuhkan Web Push dengan komponen server — tidak bisa dikerjakan dari sisi
 * klien saja. Jangan tambahkan penjadwalan di sini dengan harapan ia bertahan
 * di latar belakang; Notification Triggers dan Periodic Background Sync sama
 * sekali tidak bisa diandalkan untuk keperluan ini.
 */

import { S } from './state.js';
import { enabledGames, dailyLoginTask, isDone } from './domain.js';
import { msUntilReset, fmtDuration, dayKey } from './util/date.js';

/** Catatan "sudah diberitahu" sengaja device-local, tidak ikut sinkron. */
const NOTIF_KEY = 'gaming-hq:notif';

export const LEAD_CHOICES = [
  { v: 30,  l: '30 menit sebelum reset' },
  { v: 60,  l: '1 jam sebelum reset'    },
  { v: 120, l: '2 jam sebelum reset'    },
  { v: 180, l: '3 jam sebelum reset'    },
  { v: 360, l: '6 jam sebelum reset'    },
];

/**
 * Game aktif yang resetnya sudah masuk ambang pengingat tapi login hariannya
 * belum diklaim, diurutkan dari yang paling mendesak.
 */
export function remindersDue(now = new Date()){
  const { enabled, leadMinutes } = S.reminder;
  if (!enabled) return [];

  const ambang = leadMinutes * 60_000;
  return enabledGames()
    .map(game => ({ game, ms: msUntilReset(game.reset, now), task: dailyLoginTask(game) }))
    .filter(x => x.task && !isDone(x.task) && x.ms <= ambang)
    .sort((a, b) => a.ms - b.ms);
}

/* ---------------- Izin notifikasi ---------------- */

export const notifSupported  = () => typeof Notification !== 'undefined';
export const notifPermission = () => (notifSupported() ? Notification.permission : 'unsupported');

export async function requestNotif(){
  if (!notifSupported()) return 'unsupported';
  try { return await Notification.requestPermission(); }
  catch { return Notification.permission; }
}

/* ---------------- Penanda sudah diberitahu ---------------- */

function dibaca(){
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY)) || {}; }
  catch { return {}; }
}

function ditulis(data){
  try { localStorage.setItem(NOTIF_KEY, JSON.stringify(data)); } catch {}
}

/** Buang penanda yang lebih tua dari 3 hari agar tidak menumpuk selamanya. */
function bersihkan(data){
  const batas = Date.now() - 3 * 86_400_000;
  for (const [k, t] of Object.entries(data)) if (t < batas) delete data[k];
  return data;
}

/* ---------------- Pemicu notifikasi ---------------- */

async function tampilkan(judul, opsi){
  // Di Chrome Android konstruktor Notification melempar Illegal constructor,
  // jadi service worker yang harus menampilkannya kalau tersedia.
  try {
    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg?.showNotification) return reg.showNotification(judul, opsi);
  } catch {}
  try { new Notification(judul, opsi); } catch {}
}

/**
 * Kirim satu notifikasi per game per hari-game. Dipanggil dari denyut menit
 * di main.js, jadi aman dipanggil berulang — penanda mencegah pengulangan.
 */
export async function checkAndNotify(){
  if (notifPermission() !== 'granted') return 0;

  const data = bersihkan(dibaca());
  let dikirim = 0;

  for (const { game, ms } of remindersDue()){
    const kunci = `${game.id}@${dayKey(game.reset)}`;
    if (data[kunci]) continue;

    data[kunci] = Date.now();
    dikirim++;
    await tampilkan(`⏰ ${game.name}`, {
      body: `Reset ${fmtDuration(ms)} lagi — login harian belum diklaim.`,
      tag : kunci,                 // notifikasi lama untuk game yang sama ditimpa
      icon: 'assets/icon-192.png',
      badge: 'assets/icon-192.png',
    });
  }

  if (dikirim) ditulis(data);
  return dikirim;
}
