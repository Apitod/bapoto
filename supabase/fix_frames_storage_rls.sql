-- ==============================================================================
-- BAPOTO.JO — FIX STORAGE & DATABASE RLS FOR FRAMES BUCKET
-- Jalankan skrip ini di Supabase Dashboard -> SQL Editor
-- ==============================================================================

-- 1. Pastikan bucket 'frames' ada dan berstatus public
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
    'frames',
    'frames',
    true,
    10485760, -- 10MB
    array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update set
    public = true,
    file_size_limit = 10485760,
    allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

-- 2. Kebijakan INSERT (Upload) ke bucket 'frames'
drop policy if exists "Allow upload to frames bucket" on storage.objects;
drop policy if exists "Allow authenticated upload to frames" on storage.objects;
create policy "Allow upload to frames bucket"
    on storage.objects for insert
    to anon, authenticated
    with check (bucket_id = 'frames');

-- 3. Kebijakan UPDATE (Upsert) pada bucket 'frames'
drop policy if exists "Allow update to frames bucket" on storage.objects;
create policy "Allow update to frames bucket"
    on storage.objects for update
    to anon, authenticated
    using (bucket_id = 'frames')
    with check (bucket_id = 'frames');

-- 4. Kebijakan DELETE pada bucket 'frames'
drop policy if exists "Allow delete from frames bucket" on storage.objects;
create policy "Allow delete from frames bucket"
    on storage.objects for delete
    to anon, authenticated
    using (bucket_id = 'frames');

-- 5. Kebijakan SELECT (Read) pada bucket 'frames'
drop policy if exists "Public read frames bucket" on storage.objects;
create policy "Public read frames bucket"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'frames');

-- 6. Pastikan tabel public.frames dapat di-insert/update/delete oleh Admin
drop policy if exists "Admin full access on frames" on public.frames;
create policy "Admin full access on frames"
    on public.frames for all
    to anon, authenticated
    using (true)
    with check (true);
