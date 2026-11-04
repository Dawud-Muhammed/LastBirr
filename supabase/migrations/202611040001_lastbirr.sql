-- LastBirr: integer santim ledger. No service-role key is needed by the app.
create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  locale text not null default 'en' check (locale in ('en','am')),
  theme text not null default 'system' check (theme in ('system','light','dark')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.wallets (
  user_id uuid primary key references public.profiles(user_id) on delete cascade,
  opening_balance bigint not null check (opening_balance between 0 and 1000000000000),
  opened_on date not null default (now() at time zone 'Africa/Addis_Ababa')::date,
  created_at timestamptz not null default now()
);
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.wallets(user_id) on delete cascade,
  start_on date not null default (now() at time zone 'Africa/Addis_Ababa')::date,
  end_on date not null, horizon_type text not null check (horizon_type in ('allowance','custom')),
  savings bigint not null check (savings between 0 and 1000000000000),
  active boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (end_on >= start_on)
);
create unique index one_active_plan on public.plans(user_id) where active;
create table public.categories (
  id text primary key, kind text not null check (kind in ('income','expense')), unique(id, kind)
);
insert into public.categories(id,kind) values
('food','expense'),('transport','expense'),('data','expense'),('education','expense'),('housing','expense'),
('health','expense'),('shopping','expense'),('entertainment','expense'),('other','expense'),
('allowance','income'),('work','income'),('gift','income'),('otherIncome','income');
create table public.commitments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.wallets(user_id) on delete cascade,
  title text not null check (length(title) between 1 and 100),
  amount bigint not null check (amount between 1 and 1000000000000), due_on date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(id,user_id)
);
create table public.transactions (
  id uuid primary key, user_id uuid not null references public.wallets(user_id) on delete cascade,
  kind text not null check (kind in ('income','expense')),
  amount bigint not null check (amount between 1 and 1000000000000), category text not null,
  note text not null default '' check (length(note) <= 240), occurred_on date not null,
  commitment_id uuid unique,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (category,kind) references public.categories(id,kind),
  foreign key (commitment_id,user_id) references public.commitments(id,user_id),
  check (commitment_id is null or kind = 'expense')
);
create index transactions_owner_date on public.transactions(user_id,occurred_on desc,created_at desc);
create index commitments_owner on public.commitments(user_id);
create table public.daily_budgets (
  user_id uuid not null references public.wallets(user_id) on delete cascade,
  day date not null, allocation bigint not null check (allocation >= 0),
  updated_at timestamptz not null default now(), primary key(user_id,day)
);

-- Explicit read policies; all financial writes go through authenticated RPCs.
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.plans enable row level security;
alter table public.commitments enable row level security;
alter table public.transactions enable row level security;
alter table public.daily_budgets enable row level security;
alter table public.categories enable row level security;
create policy own_profile on public.profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy own_wallet on public.wallets for select to authenticated using ((select auth.uid()) = user_id);
create policy own_plans on public.plans for select to authenticated using ((select auth.uid()) = user_id);
create policy own_commitments on public.commitments for select to authenticated using ((select auth.uid()) = user_id);
create policy own_transactions on public.transactions for select to authenticated using ((select auth.uid()) = user_id);
create policy own_daily_budgets on public.daily_budgets for select to authenticated using ((select auth.uid()) = user_id);
create policy read_categories on public.categories for select to authenticated using (true);
revoke all on public.profiles,public.wallets,public.plans,public.commitments,public.transactions,public.daily_budgets,public.categories from anon,authenticated;
grant select on public.profiles,public.wallets,public.plans,public.commitments,public.transactions,public.daily_budgets,public.categories to authenticated;

-- Private helper; called under the same per-user lock as every ledger mutation.
create function public.lb_snapshot() returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); d date := (now() at time zone 'Africa/Addis_Ababa')::date;
b bigint; e bigint; s bigint; spent bigint; ending date; allocation bigint;
begin
  select w.opening_balance + coalesce((select sum(case when t.kind='income' then t.amount else -t.amount end) from public.transactions t where t.user_id=u),0)
    into b from public.wallets w where w.user_id=u;
  if b is null then return; end if;
  if abs(b) > 9000000000000 then raise exception 'balance_limit'; end if;
  select coalesce(sum(c.amount),0) into e from public.commitments c where c.user_id=u and not exists(select 1 from public.transactions t where t.commitment_id=c.id);
  select p.savings,p.end_on into s,ending from public.plans p where p.user_id=u and p.active;
  select coalesce(sum(t.amount),0) into spent from public.transactions t where t.user_id=u and t.kind='expense' and t.commitment_id is null and t.occurred_on=d;
  if e > 9000000000000 or spent > 9000000000000 then raise exception 'balance_limit'; end if;
  allocation := greatest(0,b+spent-e-coalesce(s,0)) / greatest(1,coalesce(ending-d,1));
  insert into public.daily_budgets(user_id,day,allocation) values(u,d,allocation)
    on conflict(user_id,day) do update set allocation=excluded.allocation,updated_at=now();
end $$;
revoke all on function public.lb_snapshot() from public,anon,authenticated;

create function public.onboard(p_name text,p_balance bigint,p_end date,p_savings bigint,p_horizon text,p_commitment bigint,p_title text,p_locale text)
returns void language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid();
begin
  if u is null then raise exception 'unauthorized'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  if exists(select 1 from public.wallets where user_id=u) then return; end if;
  if p_end < (now() at time zone 'Africa/Addis_Ababa')::date or p_commitment < 0 then raise exception 'invalid_plan'; end if;
  insert into public.profiles(user_id,name,locale) values(u,trim(p_name),p_locale);
  insert into public.wallets(user_id,opening_balance) values(u,p_balance);
  insert into public.plans(user_id,end_on,savings,horizon_type) values(u,p_end,p_savings,p_horizon);
  if p_commitment > 0 then insert into public.commitments(user_id,title,amount,due_on) values(u,trim(p_title),p_commitment,p_end); end if;
  perform public.lb_snapshot();
end $$;

-- The only write entrypoint. Caller identity always comes from the verified JWT.
create function public.mutate_finances(p_operation text,p_data jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare u uuid := auth.uid(); d date := (now() at time zone 'Africa/Addis_Ababa')::date;
opened date; c public.commitments; t public.transactions; target uuid := nullif(p_data->>'id','')::uuid;
begin
  if u is null then raise exception 'unauthorized'; end if;
  perform pg_advisory_xact_lock(hashtextextended(u::text,0));
  select opened_on into opened from public.wallets where user_id=u for update;
  if opened is null then raise exception 'onboarding_required'; end if;
  case p_operation
  when 'transaction' then
    if (p_data->>'occurred_on')::date > d or (p_data->>'occurred_on')::date < opened then raise exception 'invalid_date'; end if;
    select * into t from public.transactions where id=target;
    if t.id is not null and (t.user_id <> u or t.commitment_id is not null) then raise exception 'protected_transaction'; end if;
    insert into public.transactions(id,user_id,kind,amount,category,note,occurred_on)
      values(target,u,p_data->>'kind',(p_data->>'amount')::bigint,p_data->>'category',coalesce(p_data->>'note',''),(p_data->>'occurred_on')::date)
      on conflict(id) do update set kind=excluded.kind,amount=excluded.amount,category=excluded.category,note=excluded.note,occurred_on=excluded.occurred_on,updated_at=now()
      where public.transactions.user_id=u and public.transactions.commitment_id is null;
  when 'deleteTransaction' then
    -- Removing a settlement automatically reopens its commitment (derived state).
    delete from public.transactions where id=target and user_id=u;
  when 'commitment' then
    if exists(select 1 from public.transactions where commitment_id=target) then raise exception 'paid_commitment'; end if;
    if exists(select 1 from public.commitments where id=target and user_id<>u) then raise exception 'unauthorized'; end if;
    insert into public.commitments(id,user_id,title,amount,due_on)
      values(target,u,trim(p_data->>'title'),(p_data->>'amount')::bigint,nullif(p_data->>'due_on','')::date)
      on conflict(id) do update set title=excluded.title,amount=excluded.amount,due_on=excluded.due_on,updated_at=now() where public.commitments.user_id=u;
  when 'deleteCommitment' then
    if exists(select 1 from public.transactions where commitment_id=target and user_id=u) then raise exception 'paid_commitment'; end if;
    delete from public.commitments where id=target and user_id=u;
  when 'settle' then
    select * into c from public.commitments where id=target and user_id=u for update;
    if c.id is null then raise exception 'not_found'; end if;
    insert into public.transactions(id,user_id,kind,amount,category,note,occurred_on,commitment_id)
      values(gen_random_uuid(),u,'expense',c.amount,'other',c.title,d,c.id) on conflict(commitment_id) do nothing;
  when 'plan' then
    if (p_data->>'end_on')::date < d then raise exception 'invalid_plan'; end if;
    update public.plans set end_on=(p_data->>'end_on')::date,savings=(p_data->>'savings')::bigint,horizon_type=p_data->>'horizon_type',updated_at=now() where user_id=u and active;
  when 'newPeriod' then
    if (p_data->>'end_on')::date < d then raise exception 'invalid_plan'; end if;
    update public.plans set active=false,updated_at=now() where user_id=u and active;
    insert into public.plans(user_id,end_on,savings,horizon_type) values(u,(p_data->>'end_on')::date,(p_data->>'savings')::bigint,p_data->>'horizon_type');
  when 'profile' then
    update public.profiles set name=trim(p_data->>'name'),locale=p_data->>'locale',theme=p_data->>'theme',updated_at=now() where user_id=u;
    return;
  when 'preferences' then
    update public.profiles set locale=coalesce(p_data->>'locale',locale),theme=coalesce(p_data->>'theme',theme),updated_at=now() where user_id=u;
    return;
  when 'snapshot' then null;
  else raise exception 'invalid_operation';
  end case;
  perform public.lb_snapshot();
end $$;
revoke all on function public.onboard(text,bigint,date,bigint,text,bigint,text,text) from public,anon;
revoke all on function public.mutate_finances(text,jsonb) from public,anon;
grant execute on function public.onboard(text,bigint,date,bigint,text,bigint,text,text) to authenticated;
grant execute on function public.mutate_finances(text,jsonb) to authenticated;

-- One statement provides an internally consistent MVCC snapshot, even while
-- another tab changes a commitment and its payment. JSON aggregation also avoids
-- PostgREST's default row cap silently truncating a user's transaction ledger.
create function public.read_finances() returns jsonb language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'profile',(select to_jsonb(p) from public.profiles p where p.user_id=auth.uid()),
    'wallet',(select to_jsonb(w) from public.wallets w where w.user_id=auth.uid()),
    'plan',(select to_jsonb(p) from public.plans p where p.user_id=auth.uid() and p.active),
    'transactions',coalesce((select jsonb_agg(t order by t.occurred_on desc,t.created_at desc,t.id) from public.transactions t where t.user_id=auth.uid()),'[]'::jsonb),
    'commitments',coalesce((select jsonb_agg(to_jsonb(c) || jsonb_build_object('paid',exists(select 1 from public.transactions t where t.commitment_id=c.id))) from public.commitments c where c.user_id=auth.uid()),'[]'::jsonb),
    'snapshots',coalesce((select jsonb_agg(b order by b.day) from public.daily_budgets b where b.user_id=auth.uid()),'[]'::jsonb),
    'today',(now() at time zone 'Africa/Addis_Ababa')::date
  );
$$;
revoke all on function public.read_finances() from public,anon;
grant execute on function public.read_finances() to authenticated;
