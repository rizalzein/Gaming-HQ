import { SUPABASE_URL, SUPABASE_ANON_KEY, isConfigured } from './credentials.js';

/**
 * supabase-js diambil dari CDN sebagai ES module, jadi project ini tetap tanpa
 * build step. Modulnya dimuat hanya saat sinkronisasi benar-benar dipakai —
 * kalau fitur ini tidak diaktifkan, tidak ada byte tambahan yang diunduh.
 */
const CDN = 'https://esm.sh/@supabase/supabase-js@2';

let clientPromise = null;

export async function getClient(){
  if (!isConfigured()) throw new Error('Supabase belum dikonfigurasi');
  clientPromise ??= import(CDN).then(({ createClient }) =>
    createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession   : true,
        autoRefreshToken : true,
        detectSessionInUrl: true,   // menangkap token dari tautan magic link
      },
    }));
  return clientPromise;
}

/** Bersihkan token sisa magic link dari address bar setelah login. */
export function cleanAuthUrl(){
  if (location.hash.includes('access_token') || location.search.includes('code=')){
    history.replaceState(null, '', location.pathname);
  }
}
