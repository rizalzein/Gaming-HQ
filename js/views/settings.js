import { S, commit, uid, loginTaskId, replaceState, defaultState, serialize, storageSizeKB } from '../state.js';
import { TZ_CHOICES, PRIO_LABELS, GAME_PRESETS, STORAGE_KEY, LEGACY_STORAGE_KEY, DEFAULT_RESET } from '../config.js';
import { setHTML, esc, byId } from '../util/dom.js';
import { tzLabel, hourLabel } from '../util/format.js';
import { localDayKey } from '../util/date.js';
import { openModal, field, input, select } from '../ui/modal.js';
import { gameById, activeGames, catalogGames } from '../domain.js';
import { LEAD_CHOICES, notifPermission, requestNotif, checkAndNotify } from '../reminder.js';
import { toast } from '../ui/toast.js';

/* ---------------- Daftar game ---------------- */

export function renderSettings(){
  const games = activeGames();
  setHTML('gamelist', games.length ? games.map(g => `
    <div class="grow ${g.enabled ? '' : 'off'}" style="--gc:${esc(g.color)}">
      <div class="gn">${esc(g.name)}</div>
      <span class="gr">${esc(hourLabel(g.reset.hour))} ${esc(tzLabel(g.reset.tz))}</span>
      <button type="button" class="del" data-act="game:toggle" data-id="${esc(g.id)}"
              title="${g.enabled ? 'Nonaktifkan' : 'Aktifkan'}">${g.enabled ? '◉' : '○'}</button>
      <button type="button" class="del" data-act="game:demote" data-id="${esc(g.id)}"
              title="Pindahkan ke katalog ${esc(g.platform)}">↓</button>
      <button type="button" class="del" data-act="game:edit" data-id="${esc(g.id)}" title="Ubah">✎</button>
    </div>`).join('') : '<div class="empty">Belum ada game aktif. Tekan “+ Game” atau ambil dari ◈ 08 Katalog.</div>');

  renderMisc();
}

/** ◈ 08 — daftar ringkas koleksi, tanpa tombol claim dan tanpa pelacakan. */
export function renderCatalog(){
  const grup = [
    { key: 'mobile', label: 'Mobile' },
    { key: 'steam',  label: 'Steam'  },
  ];

  setHTML('catalog', grup.map(({ key, label }) => {
    const daftar = catalogGames(key);
    const isi = daftar.length
      ? `<div class="catgrid">${daftar.map(g => `
          <div class="catitem" style="--gc:${esc(g.color)}">
            <span class="cn" title="${esc(g.name)}">${esc(g.name)}</span>
            <button type="button" class="catmove" data-act="game:promote" data-id="${esc(g.id)}"
                    title="Jadikan game aktif dan lacak harian">↑</button>
          </div>`).join('')}</div>`
      : '<div class="empty">Kosong — semuanya sudah dipindah ke aktif.</div>';

    return `<div class="catgroup">
      <h4>${esc(label)} <span class="catcount">${daftar.length}</span></h4>
      ${isi}
    </div>`;
  }).join(''));
}

/**
 * Teks status izin sengaja menyebutkan batasnya terang-terangan. Pengguna yang
 * mengira notifikasi akan datang saat aplikasi tertutup akan menyimpulkan
 * fiturnya rusak, padahal memang tidak mungkin tanpa komponen server.
 */
function izinNotifikasi(){
  const catatan = 'Notifikasi hanya muncul selama aplikasi terbuka — situs statis tidak bisa membangunkan dirinya sendiri saat ditutup.';

  switch (notifPermission()){
    case 'granted':
      return `Notifikasi sistem <b>aktif</b>. ${catatan}`;
    case 'denied':
      return 'Notifikasi diblokir untuk situs ini. Izinkan lagi lewat pengaturan situs di browser kalau ingin memakainya.';
    case 'unsupported':
      return `Browser ini tidak mendukung notifikasi. Peringatan tetap tampil di dalam aplikasi.`;
    default:
      return `Peringatan dalam aplikasi sudah aktif.
        <button type="button" class="btn ghost" data-act="reminder:ask">Aktifkan notifikasi sistem</button>
        <br>${catatan}`;
  }
}

function renderMisc(){
  const h = S.holiday;
  const modeText = h.mode === null ? 'otomatis (ikut tanggal)' : h.mode ? 'dipaksa AKTIF' : 'dipaksa MATI';

  setHTML('settings-misc', `
    <div class="setbox">
      <h4>Mode liburan</h4>
      <div class="setrow"><label>Nama</label><input value="${esc(h.label)}" data-change="holiday:label" placeholder="Misal: mudik, liburan kantor"></div>
      <div class="setrow"><label>Mulai</label><input type="date" value="${esc(h.start)}" data-change="holiday:start"></div>
      <div class="setrow"><label>Selesai</label><input type="date" value="${esc(h.end)}" data-change="holiday:end"></div>
      <div class="note" style="margin-top:4px">Status sekarang: <b>${esc(modeText)}</b>.
        ${h.mode === null ? '' : '<button type="button" class="btn ghost" data-act="holiday:auto">Kembalikan ke otomatis</button>'}</div>
    </div>
    <div class="setbox">
      <h4>Pengingat reset</h4>
      <div class="setrow">
        <label>Aktif</label>
        <input type="checkbox" style="width:auto" ${S.reminder.enabled ? 'checked' : ''}
               data-change="reminder:enabled">
      </div>
      <div class="setrow">
        <label>Ingatkan</label>
        ${select('lead', LEAD_CHOICES.map(c => ({ v: c.v, l: c.l })), S.reminder.leadMinutes)
          .replace('<select ', '<select data-change="reminder:lead" ')}
      </div>
      <div class="note" style="margin-top:4px">${izinNotifikasi()}</div>
    </div>
    <div class="setbox">
      <h4>Data</h4>
      <div class="note" style="margin:0 0 10px">
        Ukuran data tersimpan: <b>${storageSizeKB()} KB</b>.
        Backup rutin disarankan — localStorage terikat ke satu browser di satu perangkat.
      </div>
      <div class="modal-actions" style="margin:0;justify-content:flex-start">
        <button type="button" class="btn ghost" data-act="data:export">⭳ Backup</button>
        <button type="button" class="btn ghost" data-act="data:importPick">⭱ Restore</button>
        <button type="button" class="btn danger" data-act="data:reset">Reset semua</button>
      </div>
    </div>`);

  const info = byId('storage-info');
  if (info) info.textContent = ` Ukuran sekarang ${storageSizeKB()} KB.`;
}

/* ---------------- Modal game ---------------- */

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function bannerRows(banners){
  const rows = [...banners, { id: '', label: '', hard: 90, soft: 74, fifty: false }];
  return `<div class="banner-edit banner-head"><span>Banner</span><span>Hard</span><span>Soft</span><span>50/50</span></div>` +
    rows.map((b, i) => `
      <div class="banner-edit">
        <input name="b${i}_label" value="${esc(b.label)}" placeholder="${i === banners.length ? '+ banner baru' : ''}">
        <input name="b${i}_hard" type="number" min="1" max="999" value="${esc(b.hard)}">
        <input name="b${i}_soft" type="number" min="0" max="999" value="${esc(b.soft)}">
        <input name="b${i}_fifty" type="checkbox" ${b.fifty ? 'checked' : ''} style="width:auto" title="Ada 50/50">
        <input type="hidden" name="b${i}_id" value="${esc(b.id)}">
      </div>`).join('');
}

function readBanners(form, count){
  const out = [];
  const used = new Set();
  for (let i = 0; i <= count; i++){
    const label = form[`b${i}_label`]?.value.trim();
    if (!label) continue;                       // dikosongkan = dihapus
    let id = form[`b${i}_id`]?.value || slug(label) || `b${i}`;
    while (used.has(id)) id += '-2';
    used.add(id);
    out.push({
      id,
      label,
      hard : Math.max(1, Number(form[`b${i}_hard`].value) || 90),
      soft : Math.max(0, Number(form[`b${i}_soft`].value) || 0),
      fifty: form[`b${i}_fifty`].checked,
    });
  }
  return out;
}

function gameModal(game){
  const bannerCount = game.banners.length;
  openModal({
    title: `Atur ${game.name}`,
    body:
      field('Nama', input('name', game.name, 'required')) +
      `<div class="field-row">
        ${field('Singkatan', input('short', game.short, 'maxlength="12"'))}
        ${field('Warna', input('color', game.color, 'type="color"'))}
      </div>` +
      field('Prioritas', select('priority', PRIO_LABELS.map((l, v) => ({ v, l })), game.priority)) +
      `<div class="field-row">
        ${field('Timezone server', select('tz', TZ_CHOICES.map(t => ({ v: t.v, l: t.l })), game.reset.tz))}
        ${field('Jam reset', input('hour', game.reset.hour, 'type="number" min="0" max="23"'))}
      </div>` +
      `<div class="field"><div class="hint">Reset menentukan kapan centang harian & streak berganti.
        Default 04:00 UTC+8 (= 03:00 WIB) mengikuti server Asia. Verifikasi per game — beberapa judul berbeda.</div></div>` +
      field('Banner & pity', bannerRows(game.banners), 'Kosongkan nama banner untuk menghapusnya. Baris terakhir untuk menambah banner baru.'),
    extraLabel: 'Hapus game',
    onConfirm(form){
      const name = form.name.value.trim();
      if (!name){ form.name.focus(); return false; }
      Object.assign(game, {
        name,
        short   : form.short.value.trim() || name.slice(0, 10),
        color   : form.color.value,
        priority: Number(form.priority.value),
        reset   : { tz: Number(form.tz.value), hour: Number(form.hour.value) || 0 },
        banners : readBanners(form, bannerCount),
      });
      commit();
    },
    onExtra(){
      if (!confirm(`Hapus ${game.name} beserta tugas dan catatan pity-nya?`)) return false;
      S.games   = S.games.filter(g => g.id !== game.id);
      S.tasks   = S.tasks.filter(t => t.gameId !== game.id);
      delete S.pity[game.id];
      delete S.story[game.id];
      commit();
    },
  });
}

function newGameModal(){
  const missing = GAME_PRESETS.filter(p => !S.games.some(g => g.id === p.id));
  const options = [{ v: '', l: '— Buat sendiri —' }, ...missing.map(p => ({ v: p.id, l: p.name }))];

  openModal({
    title: 'Tambah game',
    body:
      field('Dari preset', select('preset', options, ''),
            missing.length ? 'Preset sudah membawa warna dan daftar banner.' : 'Semua preset bawaan sudah ada di daftar.') +
      field('Nama game', input('name', '', 'placeholder="Nama game baru"'),
            'Diisi kalau memilih “Buat sendiri”.'),
    confirmLabel: 'Tambah',
    onConfirm(form){
      const presetId = form.preset.value;
      const preset = GAME_PRESETS.find(p => p.id === presetId);
      let game;

      if (preset){
        game = {
          id: preset.id, name: preset.name, short: preset.short, color: preset.color,
          enabled: true, priority: 2, category: 'aktif', platform: 'mobile',
          reset: { ...DEFAULT_RESET, ...(preset.reset ?? {}) },
          banners: preset.banners.map(b => ({ ...b })),
        };
      } else {
        const name = form.name.value.trim();
        if (!name){ form.name.focus(); return false; }
        let id = slug(name) || uid();
        while (S.games.some(g => g.id === id)) id += '-2';
        game = {
          id, name, short: name.slice(0, 10), color: '#57e6ff',
          enabled: true, priority: 2, category: 'aktif', platform: 'mobile',
          reset: { ...DEFAULT_RESET },
          banners: [{ id: 'limited', label: 'Karakter (limited)', hard: 90, soft: 74, fifty: true }],
        };
      }

      S.games.push(game);
      S.tasks.push({ id: loginTaskId(game.id), gameId: game.id, label: 'Login harian', cadence: 'daily', builtin: true });
      commit();
      toast(`${game.name} ditambahkan.`);
    },
  });
}

/* ---------------- Backup / restore ---------------- */

function exportData(){
  const blob = new Blob([serialize()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `gaming-hq-backup-${localDayKey()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  toast('Backup diunduh.');
}

function importFile(fileInput){
  const file = fileInput.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const data = JSON.parse(reader.result);
      const looksValid = data && typeof data === 'object' &&
        ('games' in data || 'checks' in data || 'events' in data || 'progress' in data);
      if (!looksValid) throw new Error('Format tidak dikenali');
      if (!confirm('Ganti semua data sekarang dengan isi file backup ini?')) return;
      replaceState(data);
      toast('Data berhasil dipulihkan.');
    } catch (e){
      toast('File tidak valid: ' + e.message, 'err');
    } finally {
      fileInput.value = '';
    }
  };
  reader.onerror = () => { toast('Gagal membaca file.', 'err'); fileInput.value = ''; };
  reader.readAsText(file);
}

export const actions = {
  'game:new'(){ newGameModal(); },
  'game:edit'({ id }){
    const game = gameById(id);
    if (game) gameModal(game);
  },
  'game:toggle'({ id }){
    const game = gameById(id);
    if (!game) return;
    game.enabled = !game.enabled;
    commit();
  },

  /** Katalog → aktif. Tugas login dibuat di sini karena katalog tidak punya. */
  'game:promote'({ id }){
    const game = gameById(id);
    if (!game) return;
    game.category = 'aktif';
    game.enabled  = true;
    if (!S.tasks.some(t => t.id === loginTaskId(game.id))){
      S.tasks.push({ id: loginTaskId(game.id), gameId: game.id, label: 'Login harian', cadence: 'daily', builtin: true });
    }
    commit();
    toast(`${game.name} kini dilacak harian.`);
  },

  /**
   * Aktif → katalog. Tugas login bawaan dibuang, tapi tugas buatan pengguna
   * dan riwayat centang dibiarkan utuh — kalau game ini dipromosikan lagi,
   * streak dan tugasnya kembali seperti semula.
   */
  'game:demote'({ id }){
    const game = gameById(id);
    if (!game) return;
    if (!confirm(`Pindahkan ${game.name} ke katalog ${game.platform}? Streak dan riwayatnya disimpan.`)) return;
    game.category = game.platform ?? 'mobile';
    S.tasks = S.tasks.filter(t => t.id !== loginTaskId(game.id));
    commit();
    toast(`${game.name} dipindah ke katalog.`);
  },
  'holiday:auto'(){ S.holiday.mode = null; commit(); },

  async 'reminder:ask'(){
    const hasil = await requestNotif();
    commit();                                  // status izin ikut dirender ulang
    if (hasil === 'granted'){
      toast('Notifikasi sistem diaktifkan.');
      await checkAndNotify();                  // langsung kirim kalau memang sudah waktunya
    } else if (hasil === 'denied'){
      toast('Notifikasi ditolak. Peringatan dalam aplikasi tetap jalan.', 'err');
    }
  },
  'data:export': exportData,
  'data:importPick'(){ byId('import-file').click(); },
  'data:reset'(){
    if (!confirm('Hapus SEMUA data Gaming HQ dan kembali ke bawaan?')) return;
    if (!confirm('Yakin? Streak, budget, dan catatan pity ikut hilang. Sudah backup?')) return;
    // Kunci lama ikut dibuang, kalau tidak reset akan langsung memulihkannya.
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {}
    replaceState(defaultState());
    toast('Data dikembalikan ke bawaan.');
  },
};

export const changes = {
  'reminder:enabled'(ds, el){ S.reminder.enabled = el.checked; commit(); },
  'reminder:lead'(ds, el){ S.reminder.leadMinutes = Number(el.value) || 120; commit(); },
  'holiday:label'(ds, el){ S.holiday.label = el.value.trim(); commit(); },
  'holiday:start'(ds, el){ S.holiday.start = el.value; commit(); },
  'holiday:end'(ds, el){ S.holiday.end = el.value; commit(); },
  'data:import'(ds, el){ importFile(el); },
};
