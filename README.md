# Gaming Headquarters

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
  sync/                  credentials.js, client.js, sync.js (opsional)
supabase/
  schema.sql             tabel + Row Level Security
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

Kunci penyimpanan: `gaming-hq`. Skema saat ini **v3**; data dari versi lama
(v1/v2 — format `checks` / `prios` / `pity` angka tunggal) dimigrasi otomatis
saat pertama kali dibuka, sekali saja.

Aplikasi ini sebelumnya bernama *Markas Gacha* dan memakai kunci `markas-gacha`.
Kalau kunci baru belum ada, isi kunci lama dibaca sekali lalu dipindahkan — jadi
data lama ikut terbawa tanpa langkah manual. Entri lamanya sengaja **tidak
dihapus** agar tetap ada salinan; ia tidak akan dibaca lagi setelah kunci baru
terisi. Hal yang sama berlaku untuk metadata sinkronisasi
(`markas-gacha:sync` → `gaming-hq:sync`).

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

**Perubahan butuh waktu sampai 10 menit untuk terlihat.** GitHub Pages mengirim
`Cache-Control: max-age=600` dan headernya tidak bisa diatur. Selama entri itu
masih segar, browser menyajikan berkas dari HTTP cache-nya sendiri — dan
permintaan itu **tidak pernah sampai ke service worker**, jadi tidak ada strategi
caching di `sw.js` yang bisa menambalnya. Terukur lewat Resource Timing:
`workerStart: 0`, `deliveryType: "cache"`, `transferSize: 0`.

Konsekuensi yang perlu diingat: sesaat setelah deploy, satu berkas lama bisa
tercampur dengan berkas baru dalam satu halaman.

Cara memaksa versi terbaru saat menguji:

- **Ctrl+Shift+R** (hard reload) — melewati HTTP cache.
- Atau tunggu 10 menit; setelah itu sendirinya segar.

Service worker tetap memakai network-first dengan `cache: 'no-cache'`, dan
`sw.js` didaftarkan dengan `updateViaCache: 'none'`. Keduanya membantu untuk
permintaan yang memang sampai ke service worker — sekadar bukan obat untuk
kasus di atas.

Kalau penundaan ini mengganggu, pindah ke **Cloudflare Pages** menyelesaikannya:
di sana berkas `_headers` bisa memaksa `Cache-Control: no-cache` untuk `js/` dan
`css/`, sesuatu yang tidak mungkin di GitHub Pages.

Yang tetap perlu diperbarui: kalau **menambah atau mengganti nama file**, masukkan
ke daftar `PRECACHE` di `sw.js` supaya file itu ikut tersedia offline, lalu
naikkan `VERSION` (`v2` → `v3`) agar cache lama dibuang.

---

## Sinkronisasi lintas perangkat

Opsional. Selama belum dikonfigurasi, aplikasi berjalan penuh dengan data lokal
saja dan `supabase-js` **tidak diunduh sama sekali**.

### Cara kerja

localStorage tetap sumber kebenaran lokal; Supabase hanya lapisan di atasnya.
Seluruh state disimpan sebagai **satu baris JSON per pengguna** — pilihan sadar:
untuk pemakaian pribadi di dua-tiga perangkat ini jauh lebih sederhana daripada
memecah tiap entitas jadi tabel.

Konsekuensinya perubahan bersamaan tidak bisa digabung otomatis. Yang terjadi:

| Kondisi | Tindakan |
|---|---|
| Server belum punya data | Kirim data perangkat ini |
| Server berubah, lokal tidak | Ambil versi server |
| Lokal berubah, server tidak | Kirim perubahan |
| Keduanya berubah | **Tanya** — pilih versi server atau versi perangkat ini |

Push otomatis 4 detik setelah perubahan terakhir. Pull otomatis saat aplikasi
dibuka, saat kembali dari background, dan saat koneksi pulih.

### Pengaturan

1. Buat project gratis di <https://supabase.com/dashboard>.

2. **SQL Editor → New query** → tempel isi [`supabase/schema.sql`](supabase/schema.sql) → **Run**.
   Ini membuat tabel `app_state` sekaligus mengaktifkan Row Level Security.

3. **Authentication → URL Configuration**:
   - *Site URL*: `https://rizalzein.github.io/Gaming-HQ/`
   - *Redirect URLs*: tambahkan juga `http://localhost:8123/` untuk pengembangan lokal.

   Tanpa langkah ini, tautan magic link akan ditolak.

4. **Project Settings → API**, salin *Project URL* dan *anon public key* ke
   [`js/sync/credentials.js`](js/sync/credentials.js).

5. Commit dan push. Setelah Pages selesai build, buka **◈ 09 Sinkronisasi**,
   masukkan email, tekan **Kirim tautan email**, lalu klik tautan yang masuk.

### Menambah perangkat tanpa email

Layanan email bawaan Supabase dibatasi beberapa kirim per jam dan memang
ditujukan untuk pengujian saja. Mengandalkan magic link di tiap perangkat cepat
menabrak batas itu — termasuk saat mencoba login di HP.

Karena itu ada jalur kedua:

1. Dari perangkat yang **sudah masuk**, tekan **🔑 Atur password** dan simpan
   password minimal 8 karakter.
2. Di perangkat berikutnya, isi email + password lalu tekan **Masuk**.

Jalur ini tidak menyentuh pengirim email sama sekali, jadi bebas dari batas
kirim. Magic link tetap tersedia sebagai cadangan, dengan jeda 60 detik antar
permintaan agar kuota tidak terbakar klik beruntun.

Kalau tetap ingin magic link lega di semua perangkat, pasang SMTP sendiri
(Brevo, Resend, dan sejenisnya) di **Authentication → SMTP Settings** — itu
pengaturan dashboard, tidak perlu perubahan kode.

### Catatan keamanan

*Anon key* memang dirancang untuk ditempel di klien dan boleh terlihat publik —
yang menjaga data adalah kebijakan RLS di `schema.sql`, bukan kerahasiaan key.
Karena itu langkah 2 tidak boleh dilewati: tanpa RLS aktif, siapa pun yang
membuka repo bisa membaca dan menulis tabel itu.

Jangan pernah menaruh *service role key* di `credentials.js` — key tersebut
melewati semua kebijakan RLS.

---

## Rencana lanjutan

- Notifikasi pengingat sebelum reset harian.
- Riwayat streak dalam bentuk heatmap.
- Halaman ringkasan bulanan (total top-up, streak terpanjang, pity terpakai).
