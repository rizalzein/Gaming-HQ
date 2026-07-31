-- Skema sinkronisasi Gaming Headquarters.
-- Jalankan di Supabase dashboard → SQL Editor → New query → Run.
--
-- Model: satu baris per pengguna, berisi seluruh state aplikasi sebagai JSON.
-- Cocok untuk pemakaian pribadi lintas beberapa perangkat; tidak dirancang
-- untuk kolaborasi banyak orang di satu data.

create table if not exists public.app_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  state      jsonb       not null,
  updated_at timestamptz not null default now(),
  device     text                                    -- label perangkat penulis terakhir
);

-- Row Level Security: tanpa ini, anon key yang ada di repo publik bisa dipakai
-- siapa pun untuk membaca data semua orang. WAJIB aktif.
alter table public.app_state enable row level security;

drop policy if exists "baca baris sendiri"   on public.app_state;
drop policy if exists "tulis baris sendiri"  on public.app_state;
drop policy if exists "ubah baris sendiri"   on public.app_state;
drop policy if exists "hapus baris sendiri"  on public.app_state;

create policy "baca baris sendiri" on public.app_state
  for select using (auth.uid() = user_id);

create policy "tulis baris sendiri" on public.app_state
  for insert with check (auth.uid() = user_id);

create policy "ubah baris sendiri" on public.app_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "hapus baris sendiri" on public.app_state
  for delete using (auth.uid() = user_id);

-- updated_at selalu diisi server, bukan jam perangkat. Jam HP yang meleset
-- bisa membuat deteksi konflik salah menilai versi mana yang lebih baru.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists app_state_touch on public.app_state;
create trigger app_state_touch
  before insert or update on public.app_state
  for each row execute function public.touch_updated_at();
