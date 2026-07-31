import { setHTML, esc, byId } from '../util/dom.js';
import { isConfigured } from '../sync/credentials.js';
import {
  getStatus, getSession, getMeta, getConflict, otpCooldownRemaining,
  signIn, signInWithPassword, setPassword, signOut, syncNow, resolveConflict, cancelConflict,
} from '../sync/sync.js';
import { openModal, field, input } from '../ui/modal.js';
import { toast } from '../ui/toast.js';

const DOT = { ok:'good', working:'', error:'err', conflict:'warn', signedout:'', idle:'', off:'' };

let conflictShown = false;

export function renderSync(){
  const status = getStatus();
  const session = getSession();

  if (!isConfigured()){
    setHTML('syncbox', `
      <div class="setbox">
        <h4>Belum dikonfigurasi</h4>
        <div class="note" style="margin:0">
          Sinkronisasi mati. Aplikasi tetap berjalan penuh — data tersimpan di perangkat ini saja.
          Untuk mengaktifkan: buat project Supabase gratis, jalankan
          <code>supabase/schema.sql</code>, lalu isi <code>js/sync/credentials.js</code>.
          Langkahnya ada di README bagian <b>Sinkronisasi lintas perangkat</b>.
        </div>
      </div>`);
    return;
  }

  if (!session){
    const busy = status.state === 'working';
    setHTML('syncbox', `
      <div class="setbox">
        <h4>Masuk untuk menyinkronkan</h4>
        <form class="addrow" id="sync-form" style="margin-top:0;grid-template-columns:1fr">
          <input type="email" id="sync-email" placeholder="email@anda.com" required
                 autocomplete="email" ${busy ? 'disabled' : ''}>
          <input type="password" id="sync-pass" placeholder="password"
                 autocomplete="current-password" ${busy ? 'disabled' : ''}>
          <div class="modal-actions" style="margin:0;justify-content:flex-start">
            <button class="btn" type="submit" ${busy ? 'disabled' : ''}>Masuk</button>
            <button class="btn ghost" type="button" id="sync-send" data-act="sync:magic"
                    ${busy ? 'disabled' : ''}>${MAGIC_LABEL}</button>
          </div>
        </form>
        <div class="note" id="sync-note">${status.message
          ? esc(status.message)
          : 'Punya password? Langsung masuk. Belum punya? Pakai tautan email, lalu atur password dari perangkat ini agar perangkat berikutnya tidak perlu email lagi.'}</div>
      </div>`);
    paintCooldown();
    return;
  }

  const { lastSyncedAt, dirty, device } = getMeta();
  setHTML('syncbox', `
    <div class="setbox">
      <h4>Tersambung</h4>
      <div class="setrow"><label>Akun</label><span class="gr">${esc(session.user.email ?? '—')}</span></div>
      <div class="setrow"><label>Perangkat</label><span class="gr">${esc(device ?? '—')}</span></div>
      <div class="setrow"><label>Status</label>
        <span class="chip ${DOT[status.state] ?? ''}">${esc(statusText(status, lastSyncedAt, dirty))}</span></div>
      <div class="modal-actions" style="margin-top:12px;justify-content:flex-start">
        <button type="button" class="btn ghost" data-act="sync:now"
                ${status.state === 'working' ? 'disabled' : ''}>⟳ Sinkronkan sekarang</button>
        <button type="button" class="btn ghost" data-act="sync:setpass">🔑 Atur password</button>
        <button type="button" class="btn ghost" data-act="sync:signout">Keluar</button>
      </div>
      <div class="note">Atur password sekali di sini, lalu perangkat lain bisa masuk
        dengan email + password — tanpa menunggu email dan tanpa kena batas kirim.</div>
    </div>`);

  maybeShowConflict();
}

/** Satu sumber label agar hitung mundur tidak menimpanya dengan teks berbeda. */
const MAGIC_LABEL = 'Kirim tautan email';

let cooldownTimer = null;

/**
 * Hitung mundur hanya menyentuh tombolnya, bukan merender ulang seluruh kotak.
 * Kalau kotaknya dirender ulang tiap detik, email yang sedang diketik ikut
 * terhapus di tengah pengetikan.
 */
function paintCooldown(){
  const btn = document.getElementById('sync-send');
  if (!btn){
    clearInterval(cooldownTimer);
    cooldownTimer = null;
    return;
  }

  const detik = Math.ceil(otpCooldownRemaining() / 1000);

  if (detik > 0){
    btn.disabled = true;
    btn.textContent = `Tunggu ${detik} dtk`;
    cooldownTimer ??= setInterval(paintCooldown, 1000);
  } else {
    btn.disabled = getStatus().state === 'working';
    btn.textContent = MAGIC_LABEL;
    clearInterval(cooldownTimer);
    cooldownTimer = null;
  }
}

function statusText(status, lastSyncedAt, dirty){
  if (status.state === 'working')  return status.message || 'Menyinkronkan…';
  if (status.state === 'error')    return '⚠ ' + status.message;
  if (status.state === 'conflict') return '⚠ ' + status.message;
  if (dirty)                       return 'Ada perubahan belum terkirim';
  if (lastSyncedAt)                return 'Sinkron · ' + relative(lastSyncedAt);
  return status.message || 'Siap';
}

function relative(iso){
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60_000);
  if (mins < 1)  return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return new Date(iso).toLocaleDateString('id-ID', { day:'numeric', month:'short' });
}

function maybeShowConflict(){
  const conflict = getConflict();
  if (!conflict){ conflictShown = false; return; }
  if (conflictShown) return;
  conflictShown = true;

  const when = relative(conflict.remote.updated_at);
  const from = conflict.remote.device ? ` dari ${conflict.remote.device}` : '';

  openModal({
    title: 'Data berbeda di dua tempat',
    body: `
      <div class="note" style="margin:0 0 12px">
        Perangkat ini punya perubahan yang belum terkirim, sementara server juga
        sudah berubah${esc(from)} (${esc(when)}). Keduanya tidak bisa digabung
        otomatis — pilih salah satu. Yang tidak dipilih akan tertimpa.
      </div>
      <div class="note" style="margin:0">
        Kalau ragu, tekan <b>Batal</b> lalu backup dulu lewat ◈ 08 → ⭳ Backup.
      </div>`,
    confirmLabel: 'Kirim versi perangkat ini',
    extraLabel  : 'Ambil versi server',
    onConfirm(){ conflictShown = false; resolveConflict('lokal'); },
    onExtra()  { conflictShown = false; resolveConflict('server'); },
  });

  // Modal ditutup lewat Batal / Esc / klik luar — anggap konflik ditunda.
  const root = byId('modal-root');
  const observer = new MutationObserver(() => {
    if (root.hidden){
      observer.disconnect();
      if (getConflict()){ conflictShown = false; cancelConflict(); }
    }
  });
  observer.observe(root, { attributes: true, attributeFilter: ['hidden'] });
}

export const actions = {
  async 'sync:now'(){ await syncNow(); },

  async 'sync:magic'(){
    const sisa = Math.ceil(otpCooldownRemaining() / 1000);
    if (sisa > 0){
      toast(`Tunggu ${sisa} detik sebelum minta tautan lagi.`, 'err');
      return;
    }
    const email = byId('sync-email').value.trim();
    if (!email){ toast('Isi email dulu.', 'err'); return; }

    const ok = await signIn(email);
    toast(ok ? 'Tautan login dikirim. Cek email Anda.' : getStatus().message, ok ? 'ok' : 'err');
    paintCooldown();
  },

  'sync:setpass'(){
    openModal({
      title: 'Atur password',
      body:
        field('Password baru', input('p1', '', 'type="password" autocomplete="new-password" required'),
              'Minimal 8 karakter. Setelah ini, perangkat lain bisa masuk pakai email + password tanpa menunggu email.') +
        field('Ulangi password', input('p2', '', 'type="password" autocomplete="new-password" required')),
      confirmLabel: 'Simpan password',
      onConfirm(form){
        const p1 = form.p1.value, p2 = form.p2.value;
        if (p1.length < 8){ toast('Password minimal 8 karakter.', 'err'); return false; }
        if (p1 !== p2){ toast('Ulangan password tidak sama.', 'err'); return false; }
        setPassword(p1)
          .then(() => toast('Password tersimpan. Pakai email + password ini di perangkat lain.'))
          .catch(e => toast('Gagal menyimpan password: ' + e.message, 'err'));
      },
    });
  },
  async 'sync:signout'(){
    if (!confirm('Keluar dari sinkronisasi? Data di perangkat ini tetap ada.')) return;
    await signOut();
  },
};

export const submits = {
  async 'sync-form'(){
    const email = byId('sync-email').value.trim();
    const pass  = byId('sync-pass').value;

    if (!email){ toast('Isi email dulu.', 'err'); return; }
    if (!pass){
      toast('Isi password, atau tekan “Kirim tautan email”.', 'err');
      return;
    }

    const ok = await signInWithPassword(email, pass);
    if (ok) toast('Berhasil masuk.');
    else    toast(getStatus().message, 'err');
  },
};
