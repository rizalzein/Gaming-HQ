# Markas Gacha

Pelacak harian untuk game live-service / gacha: login harian dengan streak, tugas
mingguan & bulanan, deadline event, budget top-up, jadwal patch, posisi story, dan
catatan pity per banner.

Aplikasi web murni — tanpa framework, tanpa build step, tanpa backend. Data
disimpan di `localStorage` browser dan bisa di-backup ke file JSON.

---

## Menjalankan lokal

ES modules dan service worker tidak berfungsi lewat `file://`, jadi aplikasinya
perlu disajikan lewat HTTP. Tidak perlu Node atau Python:

```bash
powershell -ExecutionPolicy Bypass -File serve.ps1
```

Lalu buka <http://localhost:8123>. Ganti port dengan `-Port 9000` bila perlu.

---

## Struktur

```
index.html               kerangka halaman — semua isi diisi oleh JS
manifest.webmanifest     metadata PWA (nama, ikon, warna)
sw.js                    service worker: precache + offline
serve.ps1                server statis untuk pengembangan lokal
assets/                  ikon aplikasi (SVG + PNG untuk Android/iOS)
css/
  tokens.css             variabel warna, font, radius — satu sumber kebenaran
  base.css               reset, layout, tipografi, elemen form
  components.css         gaya per-komponen
js/
  main.js                bootstrap + event delegation
  config.js              konstanta & data preset (nilai awal saja)
  state.js               localStorage, migrasi skema, backup/restore
  domain.js              logika turunan: periode tugas, streak, pity
  util/                  date.js, format.js, dom.js
  ui/                    modal.js, toast.js
  views/                 satu modul per section di halaman
```

### Pola yang dipakai

Tidak ada `onclick` inline. Setiap elemen interaktif menandai dirinya:

```html
<button data-act="task:toggle" data-id="genshin:login">CLAIM</button>
<input  data-change="pity:count" data-game="hsr" data-banner="limited">
```

`main.js` memasang **satu** listener `click`, `change`, dan `submit` di
`document`, lalu mengarahkan ke handler yang diekspor tiap view sebagai
`actions`, `changes`, dan `submits`. Menambah tombol baru cukup menambah entri
di objek itu — tidak perlu menyentuh `main.js`.

Alur perubahan data selalu sama: ubah `S` → panggil `commit()` → state tersimpan
dan seluruh halaman dirender ulang.

---

## Hari-game, bukan hari kalender

Streak dan centang tidak berganti pada tengah malam waktu HP, tapi pada **jam
reset server tiap game**. Tiap game punya `reset: { tz, hour }` — default
`04:00 UTC+8` (= 03:00 WIB), mengikuti server Asia.

- Harian berganti tiap jam reset.
- Mingguan berganti tiap **Senin** pada jam reset.
- Bulanan berganti tiap tanggal 1 pada jam reset.

Jam reset bisa diubah per game di **◈ 08 Pengaturan → ✎**. Verifikasi sendiri
untuk tiap judul — nilai default belum tentu benar untuk semua game.

Hal yang sama berlaku untuk angka **soft/hard pity**: nilai bawaan adalah angka
yang umum beredar, sebagian masih perkiraan untuk game baru. Semuanya bisa
diedit per banner lewat modal game.

---

## Data & backup

Kunci penyimpanan: `markas-gacha`. Skema saat ini **v3**; data dari versi lama
(v1/v2 — format `checks` / `prios` / `pity` angka tunggal) dimigrasi otomatis
saat pertama kali dibuka, sekali saja.

**Penting:** `localStorage` terikat pada satu origin. Data yang tersimpan saat
membuka file lewat `file://` **tidak** ikut terbaca di `http://localhost:8123`
atau di URL GitHub Pages. Untuk memindahkannya: buka versi lama → **⭳ Backup**
→ buka versi baru → **⭱ Restore**. File backup format lama tetap diterima dan
ikut dimigrasi.

---

## Deploy ke GitHub Pages

Tidak ada build step, jadi isi repo langsung bisa disajikan apa adanya.

1. Buat repo kosong bernama `Gaming-HQ` di <https://github.com/new> — **publik**,
   tanpa README / .gitignore / license (repo lokal sudah punya riwayatnya).

2. Hubungkan dan kirim:

   ```bash
   git remote add origin https://github.com/<user>/Gaming-HQ.git
   git push -u origin main
   ```

   Push pertama akan membuka jendela login GitHub (Git Credential Manager).
   Setelah itu kredensialnya tersimpan.

3. Di repo → **Settings → Pages** → *Source*: `Deploy from a branch`,
   *Branch*: `main` / `/ (root)` → **Save**.

4. Tunggu satu-dua menit, situsnya muncul di
   `https://<user>.github.io/Gaming-HQ/`.

File `.nojekyll` sudah disertakan agar GitHub Pages menyajikan berkas apa adanya
tanpa memproses lewat Jekyll.

Semua path di project ini relatif (`./`, `css/…`, `js/…`), jadi aplikasinya
berfungsi di subfolder tanpa penyesuaian.

Buka URL itu di HP → menu browser → **Install app** / **Add to Home Screen**.
Setelah terpasang, aplikasinya jalan offline dan punya ikonnya sendiri.

> Seed di `js/config.js` sengaja dijaga bebas data pribadi — isinya hanya jadwal
> game yang memang publik. Agenda, nominal, posisi story, dan tanggal liburan
> diisi lewat UI dan tersimpan di browser, tidak pernah masuk repo. Jaga
> pemisahan ini kalau nanti mengubah seed.

### Setelah mengubah file

Service worker memakai **network-first** untuk file aplikasi: selama online,
browser selalu mengambil versi terbaru, dan cache hanya dipakai sebagai jaring
pengaman saat offline. Jadi update langsung terpakai tanpa langkah tambahan.

Yang tetap perlu diperbarui: kalau **menambah atau mengganti nama file**, masukkan
ke daftar `PRECACHE` di `sw.js` supaya file itu ikut tersedia offline, lalu
naikkan `VERSION` (`v2` → `v3`) agar cache lama dibuang.

---

## Rencana lanjutan

- Sinkronisasi lintas perangkat (Supabase / Firebase) supaya data sama di HP dan
  PC tanpa backup manual — saat ini data terpisah per perangkat.
- Notifikasi pengingat sebelum reset harian.
- Riwayat streak dalam bentuk heatmap.
