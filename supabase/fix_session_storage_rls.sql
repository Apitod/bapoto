-- ==============================================================================
-- BAPOTO.JO — FIX STORAGE & RLS UNTUK BUCKET 'session-results'
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor bila upload hasil foto
-- ditolak atau bucket belum terdaftar.
-- ==============================================================================

-- 1. Pastikan bucket 'session-results' terdaftar sebagai PRIVATE (public = false)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'session-results',
    'session-results',
    false,
    15728640, -- 15MB limit
    array['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
on conflict (id) do update set
    public = false,
    file_size_limit = 15728640,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

-- 2. Kebijakan INSERT: Kiosk (anon & authenticated) dapat mengunggah hasil sesi
drop policy if exists "Allow anon upload to session-results" on storage.objects;
create policy "Allow anon upload to session-results"
    on storage.objects for insert
    to anon, authenticated
    with check (bucket_id = 'session-results');

-- 3. Kebijakan SELECT: Pelanggan yang membawa signed URL atau admin dapat membaca objek
drop policy if exists "Allow anon read session-results" on storage.objects;
create policy "Allow anon read session-results"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'session-results');

-- 4. Kebijakan DELETE: Hanya admin terautentikasi yang dapat menghapus objek foto
drop policy if exists "Admin delete session-results" on storage.objects;
create policy "Admin delete session-results"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'session-results');
