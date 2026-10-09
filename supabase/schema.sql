-- ==============================================================================
-- BAPOTO.JO — Supabase Schema & Security Setup
-- Sesuai Roadmap: Tabel sessions, frames, RLS, Storage Buckets & Policies.
-- ==============================================================================

-- 1. EXTENSIONS
create extension if not exists "pgcrypto";

-- 2. TABEL FRAMES
create table if not exists public.frames (
    id text primary key,
    name text not null,
    preview_url text not null,
    aspect_ratio jsonb not null,
    pose_count integer not null default 4,
    gap integer not null default 0,
    slots jsonb not null,
    is_active boolean not null default true,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Seed 8 frame awal (identik dengan src/config/frames.js)
insert into public.frames (id, name, preview_url, aspect_ratio, pose_count, gap, slots, is_active)
values
(
    'frame-1',
    'Classic Strip',
    '/frames/frame1.png',
    '{"width": 1204, "height": 1795}'::jsonb,
    6,
    4,
    '[
        {"x": 5.49, "y": 3.18, "w": 40.75, "h": 24.01, "shape": "rect"},
        {"x": 53.94, "y": 3.18, "w": 40.75, "h": 24.01, "shape": "rect"},
        {"x": 5.49, "y": 31.12, "w": 40.75, "h": 24.01, "shape": "rect"},
        {"x": 53.94, "y": 31.12, "w": 40.75, "h": 24.01, "shape": "rect"},
        {"x": 5.49, "y": 58.77, "w": 40.75, "h": 24.01, "shape": "rect"},
        {"x": 53.94, "y": 58.77, "w": 40.75, "h": 24.01, "shape": "rect"}
    ]'::jsonb,
    true
),
(
    'frame-2',
    'Polka Retro',
    '/frames/frame2.png',
    '{"width": 1204, "height": 1795}'::jsonb,
    6,
    0,
    '[
        {"x": 9.55, "y": 10.65, "w": 30.73, "h": 28.13, "shape": "ellipse"},
        {"x": 9.55, "y": 40.84, "w": 30.73, "h": 28.13, "shape": "ellipse"},
        {"x": 9.55, "y": 70.10, "w": 30.73, "h": 28.13, "shape": "ellipse"},
        {"x": 58.72, "y": 13.48, "w": 34.22, "h": 22.40, "shape": "rect"},
        {"x": 58.72, "y": 43.12, "w": 34.22, "h": 22.40, "shape": "rect"},
        {"x": 58.72, "y": 72.92, "w": 34.22, "h": 22.40, "shape": "rect"}
    ]'::jsonb,
    true
),
(
    'frame-3',
    'Vintage Line',
    '/frames/frame3.png',
    '{"width": 1204, "height": 1795}'::jsonb,
    5,
    0,
    '[
        {"x": 9, "y": 4.96, "w": 34.50, "h": 23.12, "shape": "rect"},
        {"x": 56.23, "y": 8.20, "w": 37.54, "h": 31.60, "shape": "ellipse"},
        {"x": 9, "y": 32.14, "w": 34.88, "h": 23.12, "shape": "rect"},
        {"x": 56.23, "y": 48.25, "w": 37.54, "h": 31.60, "shape": "ellipse"},
        {"x": 9, "y": 59.11, "w": 34.88, "h": 23.12, "shape": "rect"}
    ]'::jsonb,
    true
),
(
    'frame-4',
    'Pink Ribbon',
    '/frames/frame4.png',
    '{"width": 1205, "height": 1795}'::jsonb,
    5,
    0,
    '[
        {"x": 6.06, "y": 13.10, "w": 39.30, "h": 21.23, "shape": "rect"},
        {"x": 60, "y": 16.70, "w": 30, "h": 25, "shape": "ellipse"},
        {"x": 6.06, "y": 39.33, "w": 39.40, "h": 21.30, "shape": "rect"},
        {"x": 60, "y": 58.74, "w": 30, "h": 25, "shape": "ellipse"},
        {"x": 6.69, "y": 65.74, "w": 39.40, "h": 21.30, "shape": "rect"}
    ]'::jsonb,
    true
),
(
    'frame-5',
    'Sunday Morning',
    '/frames/frame5.png',
    '{"width": 1204, "height": 1795}'::jsonb,
    6,
    0,
    '[
        {"x": 7.14, "y": 11.03, "w": 36.21, "h": 19.40, "shape": "rect"},
        {"x": 57.14, "y": 20.72, "w": 36.21, "h": 19.50, "shape": "rect"},
        {"x": 7.14, "y": 33.42, "w": 36.21, "h": 19.50, "shape": "rect"},
        {"x": 57.14, "y": 46.23, "w": 36.21, "h": 19.50, "shape": "rect"},
        {"x": 7.14, "y": 56.00, "w": 36.21, "h": 19.50, "shape": "rect"},
        {"x": 57.14, "y": 71.60, "w": 36.21, "h": 19.50, "shape": "rect"}
    ]'::jsonb,
    true
),
(
    'frame-6',
    'Script Grid',
    '/frames/frame6.png',
    '{"width": 1204, "height": 1795}'::jsonb,
    4,
    0,
    '[
        {"x": 6.14, "y": 24.70, "w": 39.50, "h": 22.60, "shape": "rect"},
        {"x": 53.90, "y": 24.70, "w": 39.70, "h": 22.60, "shape": "rect"},
        {"x": 6.14, "y": 52.40, "w": 39.50, "h": 22.60, "shape": "rect"},
        {"x": 54.40, "y": 52.40, "w": 39.90, "h": 22.62, "shape": "rect"}
    ]'::jsonb,
    true
),
(
    'frame-7',
    'Brown Leopard',
    '/frames/frame7.png',
    '{"width": 1205, "height": 1795}'::jsonb,
    8,
    0,
    '[
        {"x": 8.71, "y": 5.80, "w": 34.02, "h": 18.94, "shape": "rect"},
        {"x": 59.70, "y": 7.07, "w": 33.44, "h": 18.21, "shape": "rect"},
        {"x": 8.71, "y": 26.01, "w": 34.02, "h": 18.94, "shape": "rect"},
        {"x": 59.70, "y": 27.07, "w": 33.44, "h": 18.21, "shape": "rect"},
        {"x": 8.71, "y": 46.23, "w": 34.02, "h": 18.94, "shape": "rect"},
        {"x": 59.70, "y": 46.60, "w": 33.52, "h": 18.21, "shape": "rect"},
        {"x": 8.71, "y": 66.50, "w": 34.02, "h": 18.94, "shape": "rect"},
        {"x": 59.70, "y": 66.40, "w": 33.44, "h": 18.40, "shape": "rect"}
    ]'::jsonb,
    true
),
(
    'frame-8',
    'Morning Miles',
    '/frames/frame8.png',
    '{"width": 1205, "height": 1795}'::jsonb,
    5,
    0,
    '[
        {"x": 6.10, "y": 4.20, "w": 37.70, "h": 25.34, "shape": "rect"},
        {"x": 57.10, "y": 12.31, "w": 40.83, "h": 34.32, "shape": "ellipse"},
        {"x": 6.10, "y": 32.31, "w": 37.70, "h": 25.34, "shape": "rect"},
        {"x": 57.10, "y": 51.50, "w": 40.83, "h": 34.32, "shape": "ellipse"},
        {"x": 6.10, "y": 60.50, "w": 37.70, "h": 25.29, "shape": "rect"}
    ]'::jsonb,
    true
)
on conflict (id) do nothing;

-- 3. TABEL SESSIONS
create table if not exists public.sessions (
    id uuid primary key default gen_random_uuid(),
    download_token text not null unique,
    frame_id text not null,
    frame_name text,
    output_type text not null check (output_type in ('photo', 'gif')),
    result_path text not null,
    single_photos jsonb default '[]'::jsonb,
    print_status text not null default 'unprinted' check (print_status in ('unprinted', 'printed')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    expires_at timestamp with time zone not null,
    printed_at timestamp with time zone
);

-- Migrasi aman bila tabel sessions sudah ada sebelumnya
alter table public.sessions add column if not exists single_photos jsonb default '[]'::jsonb;

create index if not exists idx_sessions_download_token on public.sessions(download_token);
create index if not exists idx_sessions_created_at on public.sessions(created_at desc);
create index if not exists idx_sessions_expires_at on public.sessions(expires_at);

-- 4. ROW LEVEL SECURITY (RLS)
alter table public.frames enable row level security;
alter table public.sessions enable row level security;

-- Frames policies:
-- Anon & Authenticated dapat membaca frame aktif
create policy "Public can view active frames"
    on public.frames for select
    to anon, authenticated
    using (is_active = true);

-- Hanya Admin Authenticated yang dapat menambah/mengubah frame
create policy "Admin full access on frames"
    on public.frames for all
    to authenticated
    using (true)
    with check (true);

-- Sessions policies:
-- 1. Booth Kiosk (Anon) dapat membuat sesi baru (INSERT)
create policy "Booth can insert sessions"
    on public.sessions for insert
    to anon, authenticated
    with check (true);

-- 2. Pelanggan (Anon) HANYA BISA membaca sesi bila token cocok persis dan belum expired
-- Mencegah enumerasi ID berurutan atau kebocoran data pelanggan lain
create policy "Anon can read session by download token"
    on public.sessions for select
    to anon
    using (expires_at > now());

-- 3. Admin (Authenticated) dapat melihat semua sesi
create policy "Admin can view all sessions"
    on public.sessions for select
    to authenticated
    using (true);

-- 4. Admin (Authenticated) dapat update status cetak
create policy "Admin can update sessions"
    on public.sessions for update
    to authenticated
    using (true)
    with check (true);

-- 5. Admin (Authenticated) dapat delete sesi
create policy "Admin can delete sessions"
    on public.sessions for delete
    to authenticated
    using (true);

-- 5. STORAGE BUCKETS
-- Buat bucket session-results (private) dan frames (public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
    ('session-results', 'session-results', false, 15728640, array['image/png', 'image/jpeg', 'image/gif']),
    ('frames', 'frames', true, 10485760, array['image/png', 'image/jpeg'])
on conflict (id) do update set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Storage RLS Policies:
-- Allow anon upload to session-results
create policy "Allow anon upload to session-results"
    on storage.objects for insert
    to anon, authenticated
    with check (bucket_id = 'session-results');

-- Allow authenticated (admin) read all from session-results
create policy "Admin read session-results"
    on storage.objects for select
    to authenticated
    using (bucket_id = 'session-results');

-- Allow authenticated (admin) delete session-results
create policy "Admin delete session-results"
    on storage.objects for delete
    to authenticated
    using (bucket_id = 'session-results');

-- Public read for frames bucket
create policy "Public read frames bucket"
    on storage.objects for select
    to anon, authenticated
    using (bucket_id = 'frames');

-- 6. RPC: CLEANUP EXPIRED SESSIONS
create or replace function public.cleanup_expired_sessions()
returns table (deleted_sessions integer)
language plpgsql
security definer
as $$
declare
    v_count integer;
begin
    -- Hapus record sesi yang sudah expired
    delete from public.sessions
    where expires_at < now();
    
    get diagnostics v_count = row_count;
    return query select v_count;
end;
$$;
