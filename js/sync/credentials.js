/**
 * Kredensial project Supabase.
 *
 * Isi dua nilai ini setelah membuat project (lihat README → Sinkronisasi).
 * Selama masih kosong, aplikasi tetap berjalan normal — bagian Sinkronisasi
 * hanya menampilkan petunjuk pengaturan.
 *
 * Anon key memang dirancang untuk dipasang di sisi klien dan boleh terlihat
 * publik. Yang menjaga data Anda adalah Row Level Security di supabase/schema.sql,
 * bukan kerahasiaan key ini. Jangan pernah menaruh *service role key* di sini —
 * key itu melewati semua kebijakan RLS.
 */

export const SUPABASE_URL      = '';
export const SUPABASE_ANON_KEY = '';

export const isConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
