-- Release together with the phone-enabled signup form. Existing accounts and
-- financial records are preserved; missing legacy phones can be added in Settings.
begin;

create function public.normalize_et_phone(p_phone text) returns text
language plpgsql immutable strict set search_path = '' as $$
declare compact text; national text;
begin
  if length(p_phone) > 30 or btrim(p_phone) !~ '^[+0-9 -]+$' then return null; end if;
  compact := regexp_replace(btrim(p_phone),'[ -]','','g');
  if left(compact,4) = '+251' then national := substr(compact,5);
  elsif left(compact,5) = '00251' then national := substr(compact,6);
  elsif left(compact,3) = '251' then national := substr(compact,4);
  elsif left(compact,1) = '0' then national := substr(compact,2);
  else return null; end if;
  if national ~ '^(700[1-9][0-9]{5}|(7(0[1-9]|1[0-8]|2[1-35-79]|3[0-9]|77|86|99)|(8[01]|9[0-9])[0-9])[0-9]{6})$' then
    return '+251' || national;
  end if;
  return null;
end $$;
revoke all on function public.normalize_et_phone(text) from public,anon;
grant execute on function public.normalize_et_phone(text) to authenticated;

create table public.account_contacts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique check (email is null or (email = lower(btrim(email)) and length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$')),
  phone text unique check (phone is null or (public.normalize_et_phone(phone) is not null and phone = public.normalize_et_phone(phone))),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.account_contacts enable row level security;
create policy own_contacts on public.account_contacts for select to authenticated using ((select auth.uid())=user_id);
revoke all on public.account_contacts from anon,authenticated;
grant select on public.account_contacts to authenticated;

-- Fail and roll back on preexisting normalized duplicates; never merge or delete
-- accounts automatically. Existing missing/invalid phone metadata stays NULL.
insert into public.account_contacts(user_id,email,phone)
select id,nullif(lower(btrim(email)),''),public.normalize_et_phone(coalesce(nullif(phone,''),raw_user_meta_data->>'phone')) from auth.users;

create function public.capture_account_contact() returns trigger
language plpgsql security definer set search_path = '' as $$
declare canonical text; email_value text;
begin
  email_value := nullif(lower(btrim(new.email)),'');
  if tg_op='INSERT' then
    canonical := public.normalize_et_phone(coalesce(nullif(new.phone,''),new.raw_user_meta_data->>'phone'));
    if canonical is null then raise exception 'invalid_or_missing_mobile'; end if;
    if email_value is null then raise exception 'email_required'; end if;
    if length(btrim(coalesce(new.raw_user_meta_data->>'name',''))) not between 2 and 80
      or coalesce(new.raw_user_meta_data->>'name','') ~ '[[:cntrl:]<>0-9]' then raise exception 'invalid_name'; end if;
    insert into public.account_contacts(user_id,email,phone) values(new.id,email_value,canonical);
  else
    -- Changes to editable user metadata cannot claim or replace contact numbers.
    -- Only a real Auth phone change or the authenticated contact RPC can do that.
    update public.account_contacts set email=email_value,updated_at=now() where user_id=new.id;
    if new.phone is distinct from old.phone and nullif(new.phone,'') is not null then
      canonical := public.normalize_et_phone(new.phone);
      if canonical is null then raise exception 'invalid_mobile'; end if;
      update public.account_contacts set phone=canonical,updated_at=now() where user_id=new.id;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.capture_account_contact() from public,anon,authenticated;
create trigger lastbirr_capture_contact after insert or update of email,phone on auth.users
for each row execute function public.capture_account_contact();

create function public.update_contact_phone(p_phone text) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); canonical text;
begin
  if u is null then raise exception 'unauthorized'; end if;
  canonical := public.normalize_et_phone(p_phone);
  if canonical is null then raise exception 'invalid_mobile'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  update public.account_contacts set phone=canonical,updated_at=now() where user_id=u;
  if not found then raise exception 'contact_not_found'; end if;
end $$;
revoke all on function public.update_contact_phone(text) from public,anon;
grant execute on function public.update_contact_phone(text) to authenticated;

-- Validate text at the database boundary as well as in client/server schemas.
-- Existing data is not rewritten and legacy records can still be read.
create function public.validate_financial_text() returns trigger
language plpgsql set search_path = '' as $$
begin
  if tg_table_name='profiles' then
    if tg_op='INSERT' or new.name is distinct from old.name then
      if length(btrim(new.name)) not between 2 and 80 or new.name ~ '[[:cntrl:]<>0-9]' then raise exception 'invalid_name'; end if;
    end if;
  elsif tg_table_name='commitments' then
    if tg_op='INSERT' or new.title is distinct from old.title then
      if length(btrim(new.title)) not between 2 and 100 or new.title ~ '[[:cntrl:]<>]' then raise exception 'invalid_text'; end if;
    end if;
  elsif tg_table_name='transactions' then
    if tg_op='INSERT' or new.note is distinct from old.note then
      if new.note ~ '[[:cntrl:]<>]' then raise exception 'invalid_text'; end if;
    end if;
  end if;
  return new;
end $$;
revoke all on function public.validate_financial_text() from public,anon,authenticated;
create trigger lastbirr_profile_text before insert or update on public.profiles for each row execute function public.validate_financial_text();
create trigger lastbirr_commitment_text before insert or update on public.commitments for each row execute function public.validate_financial_text();
create trigger lastbirr_transaction_text before insert or update on public.transactions for each row execute function public.validate_financial_text();
commit;
