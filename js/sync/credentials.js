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

export const SUPABASE_URL      = 'https://xftrqaqtxggarbptperc.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmdHJxYXF0eGdnYXJicHRwZXJjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0ODY3NTgsImV4cCI6MjEwMTA2Mjc1OH0.61jQj4oj6m7RnjS1ZdEERCiYgbQ3z_fkA01-odUCy4g';

export const isConfigured = () => Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
