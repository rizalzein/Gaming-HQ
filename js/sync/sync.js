/**
 * Sinkronisasi lintas perangkat lewat Supabase.
 *
 * Prinsipnya offline-first: localStorage tetap sumber kebenaran lokal, dan
 * sinkronisasi adalah lapisan opsional di atasnya. Aplikasi berfungsi penuh
 * tanpa login, tanpa jaringan, dan tanpa Supabase dikonfigurasi sama sekali.
 *
 * Model data: satu baris per pengguna berisi seluruh state sebagai JSON.
 * Pilihan sadar — untuk pemakaian pribadi di dua-tiga perangkat, ini jauh lebih
 * sederhana daripada memecah tiap entitas jadi tabel, dan tidak perlu merge
 * per-field. Konsekuensinya perubahan bersamaan tidak bisa digabung otomatis,
 * jadi konflik dideteksi dan ditanyakan, bukan diselesaikan diam-diam.
 */

import { S, replaceState, subscribe } from '../state.js';
import { isConfigured } from './credentials.js';
import { getClient, cleanAuthUrl } from './client.js';

const META_KEY  = 'markas-gacha:sync';
const TABLE     = 'app_state';
const PUSH_DELAY = 4000;

/**
 * SMTP bawaan Supabase hanya mengizinkan beberapa email per jam, dan tiap
 * percobaan yang ditolak ikut memperpanjang jedanya. Tanpa penahan di sisi UI,
 * klik beruntun membakar kuota itu dalam hitungan detik.
 */
const OTP_COOLDOWN_MS = 60_000;

/** state: 'off' | 'signedout' | 'idle' | 'working' | 'ok' | 'error' | 'conflict' */
let status = { state: 'off', message: '' };
let session = null;
let applyingRemote = false;
let pushTimer = null;
let pendingConflict = null;

const listeners = [];
export function onSyncChange(fn){ listeners.push(fn); }
function emit(){ for (const fn of listeners) fn(); }

function setStatus(state, message = ''){
  status = { state, message };
  emit();
}

export const getStatus  = () => status;
export const getSession = () => session;
export const getMeta    = () => meta();
export const getConflict = () => pendingConflict;

/* ---------------- Metadata lokal ---------------- */

function meta(){
  try { return JSON.parse(localStorage.getItem(META_KEY)) || {}; }
  catch { return {}; }
}

function setMeta(patch){
  try { localStorage.setItem(META_KEY, JSON.stringify({ ...meta(), ...patch })); }
  catch (e){ console.warn('Gagal menyimpan metadata sync:', e); }
}

function deviceLabel(){
  const existing = meta().device;
  if (existing) return existing;
  const ua = navigator.userAgent;
  const guess = /Android/i.test(ua) ? 'Android'
              : /iPhone|iPad/i.test(ua) ? 'iOS'
              : /Windows/i.test(ua) ? 'Windows'
              : /Mac/i.test(ua) ? 'Mac'
              : 'Perangkat';
  const label = `${guess}-${Math.random().toString(36).slice(2, 6)}`;
  setMeta({ device: label });
  return label;
}

/* ---------------- Bootstrap ---------------- */

export async function init(){
  if (!isConfigured()){
    setStatus('off');
    return;
  }

  setStatus('working', 'Menghubungkan…');
  try {
    const supabase = await getClient();

    supabase.auth.onAuthStateChange((_event, next) => {
      session = next;
      cleanAuthUrl();
      if (session) syncNow({ auto: true });
      else setStatus('signedout');
    });

    const { data } = await supabase.auth.getSession();
    session = data.session;
    cleanAuthUrl();

    if (session) await syncNow({ auto: true });
    else setStatus('signedout');
  } catch (e){
    setStatus('error', e.message);
  }

  // Tandai ada perubahan lokal yang belum terkirim, lalu jadwalkan push.
  subscribe(() => {
    if (applyingRemote) return;
    setMeta({ dirty: true });
    schedulePush();
  });

  window.addEventListener('online', () => { if (session) syncNow({ auto: true }); });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && session) syncNow({ auto: true });
  });
}

function schedulePush(){
  if (!session || !navigator.onLine) return;
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => syncNow({ auto: true }), PUSH_DELAY);
}

/* ---------------- Auth ---------------- */

/** Sisa jeda kirim ulang, dalam milidetik. 0 berarti boleh mengirim. */
export function otpCooldownRemaining(){
  return Math.max(0, (meta().otpCooldownUntil ?? 0) - Date.now());
}

export async function signIn(email){
  if (otpCooldownRemaining() > 0) return false;

  const supabase = await getClient();
  setStatus('working', 'Mengirim tautan…');

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: location.origin + location.pathname },
  });

  // Jeda hanya untuk percobaan yang benar-benar menyentuh pengirim email.
  // Salah ketik alamat tidak memakai kuota, jadi tidak perlu ikut dijeda.
  const kenaKuota = !error || /rate limit/i.test(error.message);
  if (kenaKuota) setMeta({ otpCooldownUntil: Date.now() + OTP_COOLDOWN_MS });

  if (error){ setStatus('error', error.message); return false; }

  setStatus('signedout', `Tautan login dikirim ke ${email}. Buka email dan klik tautannya.`);
  return true;
}

export async function signOut(){
  const supabase = await getClient();
  await supabase.auth.signOut();
  session = null;
  setMeta({ lastSyncedAt: null, dirty: true });
  setStatus('signedout', 'Sudah keluar. Data di perangkat ini tidak dihapus.');
}

/* ---------------- Baca / tulis server ---------------- */

async function fetchRemote(){
  const supabase = await getClient();
  const { data, error } = await supabase
    .from(TABLE)
    .select('state, updated_at, device')
    .eq('user_id', session.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;                       // null kalau belum ada baris
}

async function writeRemote(){
  const supabase = await getClient();
  const { data, error } = await supabase
    .from(TABLE)
    .upsert({ user_id: session.user.id, state: S, device: deviceLabel() },
            { onConflict: 'user_id' })
    .select('updated_at')
    .single();
  if (error) throw new Error(error.message);
  setMeta({ lastSyncedAt: data.updated_at, dirty: false });
  return data.updated_at;
}

function applyRemote(row){
  applyingRemote = true;
  try {
    replaceState(row.state);
    setMeta({ lastSyncedAt: row.updated_at, dirty: false });
  } finally {
    applyingRemote = false;
  }
}

/* ---------------- Alur utama ---------------- */

/**
 * Bandingkan versi lokal dan server, lalu putuskan:
 *   server kosong            → kirim lokal
 *   lokal bersih & server baru → ambil server
 *   lokal kotor & server sama  → kirim lokal
 *   lokal kotor & server baru  → konflik, tanyakan
 */
export async function syncNow({ auto = false } = {}){
  if (!session) return;
  if (!navigator.onLine){
    setStatus('error', 'Sedang offline — perubahan dikirim saat koneksi kembali.');
    return;
  }

  clearTimeout(pushTimer);
  setStatus('working', 'Menyinkronkan…');

  try {
    const remote = await fetchRemote();
    const { lastSyncedAt, dirty } = meta();

    if (!remote){
      await writeRemote();
      setStatus('ok', 'Data perangkat ini dikirim ke server.');
      return;
    }

    const serverChanged = remote.updated_at !== lastSyncedAt;

    if (!serverChanged){
      if (dirty){
        await writeRemote();
        setStatus('ok', 'Perubahan terkirim.');
      } else {
        setStatus('ok', 'Sudah sinkron.');
      }
      return;
    }

    if (!dirty){
      applyRemote(remote);
      setStatus('ok', `Data terbaru diambil dari server${remote.device ? ` (${remote.device})` : ''}.`);
      return;
    }

    pendingConflict = { remote, auto };
    setStatus('conflict', 'Perangkat ini dan server sama-sama berubah.');
  } catch (e){
    setStatus('error', e.message);
  }
}

/** Pilihan pengguna saat konflik: 'server' | 'lokal'. */
export async function resolveConflict(choice){
  const conflict = pendingConflict;
  pendingConflict = null;
  if (!conflict) return;

  setStatus('working', 'Menyelesaikan…');
  try {
    if (choice === 'server'){
      applyRemote(conflict.remote);
      setStatus('ok', 'Versi server dipakai.');
    } else {
      await writeRemote();
      setStatus('ok', 'Versi perangkat ini dikirim ke server.');
    }
  } catch (e){
    setStatus('error', e.message);
  }
}

export function cancelConflict(){
  pendingConflict = null;
  setStatus('idle', 'Konflik ditunda — belum ada yang berubah.');
}
