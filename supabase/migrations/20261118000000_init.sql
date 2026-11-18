-- CaptionFlow schema. All access goes through the Next.js server (secret key);
-- RLS is enabled with no policies so the public anon/publishable key can read or write nothing.

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  owner_id text not null,
  prompt text not null check (char_length(prompt) between 3 and 500),
  platform text not null check (platform in ('instagram', 'x', 'linkedin', 'facebook', 'tiktok')),
  caption text not null check (char_length(caption) between 1 and 2200),
  hashtags text[] not null default '{}',
  scheduled_at timestamptz not null,
  notes text check (char_length(notes) <= 1000),
  image_path text,
  drive_file_id text,
  status text not null default 'scheduled' check (status in ('scheduled', 'notified')),
  notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_owner_scheduled_idx on public.posts (owner_id, scheduled_at);
create index posts_due_idx on public.posts (scheduled_at) where notified_at is null;

create table public.notification_settings (
  owner_id text primary key,
  enabled boolean not null default true,
  email text not null check (char_length(email) <= 254),
  lead_minutes integer not null default 0 check (lead_minutes in (0, 15, 60, 1440)),
  subject_prefix text not null default 'CaptionFlow' check (char_length(subject_prefix) <= 60),
  include_hashtags boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.posts enable row level security;
alter table public.notification_settings enable row level security;

create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger posts_touch before update on public.posts
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.notification_settings
  for each row execute function public.touch_updated_at();

-- Private bucket for post images (images only, 5 MB max).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('post-images', 'post-images', false, 5242880, array['image/jpeg', 'image/png', 'image/webp']);

-- Timezone used to format times in emails.
alter table public.notification_settings add column timezone text not null default 'UTC'
  check (char_length(timezone) <= 64);
