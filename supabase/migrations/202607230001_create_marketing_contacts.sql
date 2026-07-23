create extension if not exists pgcrypto;

create table if not exists public.marketing_contacts (
  id uuid primary key default gen_random_uuid(),
  normalized_email text not null unique,
  consent_status text not null default 'subscribed',
  consent_at timestamptz not null,
  consent_source text not null,
  unsubscribed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  utm_source text,
  utm_medium text,
  utm_campaign text,
  constraint marketing_contacts_email_length check (char_length(normalized_email) <= 254),
  constraint marketing_contacts_consent_status check (consent_status in ('subscribed', 'unsubscribed')),
  constraint marketing_contacts_consent_source check (consent_source in ('preview_inline', 'post_purchase_result'))
);

alter table public.marketing_contacts enable row level security;

revoke all privileges on table public.marketing_contacts
  from anon, authenticated;

create index if not exists marketing_contacts_consent_status_idx
  on public.marketing_contacts (consent_status);

create index if not exists marketing_contacts_created_at_idx
  on public.marketing_contacts (created_at desc);
