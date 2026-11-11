-- Alcancía Viva: datos compartidos. Aplicar sobre un proyecto nuevo de Supabase.
begin;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (length(trim(display_name)) between 1 and 100),
  preferences jsonb not null default '{}' check (jsonb_typeof(preferences) = 'object'),
  learned_categories jsonb not null default '{}' check (jsonb_typeof(learned_categories) = 'object'),
  consent_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.group_members (
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null check (role in ('admin', 'member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index group_members_user_idx on public.group_members(user_id);

create table public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  code text not null unique default upper(replace(gen_random_uuid()::text, '-', '')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups on delete cascade,
  user_id uuid not null references auth.users(id),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id),
  unique (group_id, user_id)
);
create index join_requests_user_idx on public.join_requests(user_id);

create table public.goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  group_id uuid references public.groups on delete cascade,
  title text not null check (length(trim(title)) between 1 and 100),
  target_amount numeric(14,2) not null check (target_amount > 0),
  target_date date not null,
  created_at timestamptz not null default now()
);
create index goals_group_idx on public.goals(group_id);
create index goals_owner_idx on public.goals(owner_id);

create table public.movements (
  id uuid primary key, -- ID estable por intento; el reintento no duplica el aporte.
  user_id uuid not null references auth.users(id),
  type text not null check (type in ('expense', 'income', 'savings')),
  amount numeric(14,2) not null check (amount > 0),
  currency text not null default 'PEN' check (currency = 'PEN'),
  category text not null check (length(trim(category)) between 1 and 100),
  description text not null default '' check (length(description) <= 500),
  occurred_on date not null,
  source text not null check (source in ('voice', 'text', 'manual')),
  goal_id uuid references public.goals,
  group_id uuid references public.groups,
  reversed_at timestamptz,
  created_at timestamptz not null default now(),
  check ((type = 'savings' and goal_id is not null) or
         (type <> 'savings' and goal_id is null and group_id is null))
);
create index movements_user_idx on public.movements(user_id, occurred_on);
create index movements_goal_idx on public.movements(goal_id);
create index movements_group_idx on public.movements(group_id);

-- Helpers evitan recursión de políticas en la tabla de miembros.
create function private.is_member(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members
    where group_id = p_group and user_id = auth.uid());
$$;
create function private.is_admin(p_group uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.group_members
    where group_id = p_group and user_id = auth.uid() and role = 'admin');
$$;
revoke all on function private.is_member(uuid), private.is_admin(uuid) from public;
grant execute on function private.is_member(uuid), private.is_admin(uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invitations enable row level security;
alter table public.join_requests enable row level security;
alter table public.goals enable row level security;
alter table public.movements enable row level security;

create policy profiles_own on public.profiles for all to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy groups_member on public.groups for select to authenticated
  using (private.is_member(id));
create policy members_same_group on public.group_members for select to authenticated
  using (private.is_member(group_id));
create policy invitations_admin on public.group_invitations for select to authenticated
  using (private.is_admin(group_id));
create policy requests_own_or_admin on public.join_requests for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin(group_id));
create policy goals_authorized on public.goals for select to authenticated
  using ((group_id is null and owner_id = (select auth.uid())) or private.is_member(group_id));
create policy movements_authorized on public.movements for select to authenticated
  using (user_id = (select auth.uid()) or (group_id is not null and private.is_member(group_id)));

-- Escrituras de colaboración solo mediante operaciones validadas.
revoke all on public.profiles, public.groups, public.group_members,
  public.group_invitations, public.join_requests, public.goals, public.movements
  from anon, authenticated;
grant select on public.profiles, public.groups, public.group_members,
  public.group_invitations, public.join_requests, public.goals, public.movements to authenticated;
grant insert, update on public.profiles to authenticated;

create function private.create_group(p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_code text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  insert into public.groups(name, created_by) values (trim(p_name), auth.uid()) returning id into v_group;
  insert into public.group_members(group_id, user_id, role) values (v_group, auth.uid(), 'admin');
  insert into public.group_invitations(group_id) values (v_group) returning code into v_code;
  return jsonb_build_object('group_id', v_group, 'invitation_code', v_code);
end;
$$;

create function private.request_group_access(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_group uuid; v_name text; v_request uuid; v_status text;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  select i.group_id, g.name into v_group, v_name
    from public.group_invitations i join public.groups g on g.id = i.group_id
    where i.code = upper(trim(p_code)) and i.revoked_at is null and i.expires_at > now();
  if v_group is null then raise exception 'Invitación no válida o vencida'; end if;
  if private.is_member(v_group) then
    return jsonb_build_object('group_name', v_name, 'status', 'member');
  end if;
  insert into public.join_requests(group_id, user_id) values (v_group, auth.uid())
    on conflict (group_id, user_id) do nothing;
  select id, status into v_request, v_status from public.join_requests
    where group_id = v_group and user_id = auth.uid();
  return jsonb_build_object('request_id', v_request, 'group_name', v_name, 'status', v_status);
end;
$$;

create function private.decide_group_request(p_request uuid, p_approve boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare v_request public.join_requests;
begin
  select * into v_request from public.join_requests where id = p_request for update;
  if v_request.id is null or not private.is_admin(v_request.group_id) then
    raise exception 'No puedes decidir esta solicitud';
  end if;
  if p_approve is null then raise exception 'Indica aprobar o rechazar'; end if;
  if v_request.status <> 'pending' then raise exception 'La solicitud ya fue resuelta'; end if;
  update public.join_requests set status = case when p_approve then 'approved' else 'rejected' end,
    decided_at = now(), decided_by = auth.uid() where id = p_request;
  if p_approve then
    insert into public.group_members(group_id, user_id, role)
      values (v_request.group_id, v_request.user_id, 'member') on conflict do nothing;
  end if;
end;
$$;

create function private.revoke_group_invitation(p_invitation uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.group_invitations set revoked_at = now()
    where id = p_invitation and private.is_admin(group_id);
  if not found then raise exception 'No puedes revocar esta invitación'; end if;
end;
$$;

create function private.create_goal(p_title text, p_amount numeric, p_date date, p_group uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  if p_group is not null and not private.is_admin(p_group) then
    raise exception 'Solo el administrador crea metas del grupo'; end if;
  if p_date is null or p_date <= (now() at time zone 'America/Lima')::date then
    raise exception 'Elige una fecha futura'; end if;
  insert into public.goals(owner_id, group_id, title, target_amount, target_date)
    values (auth.uid(), p_group, trim(p_title), p_amount, p_date) returning id into v_id;
  return v_id;
end;
$$;

create function private.record_movement(p_id uuid, p_type text, p_amount numeric,
  p_category text, p_description text, p_date date, p_source text, p_goal uuid default null)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_goal public.goals; v_existing public.movements; v_amount numeric(14,2);
begin
  if auth.uid() is null then raise exception 'Inicia sesión'; end if;
  v_amount := p_amount;
  if p_type = 'savings' then
    select * into v_goal from public.goals where id = p_goal;
    if v_goal.id is null then raise exception 'Selecciona una meta válida'; end if;
    if (v_goal.group_id is null and v_goal.owner_id <> auth.uid()) or
       (v_goal.group_id is not null and not private.is_member(v_goal.group_id)) then
      raise exception 'No tienes acceso a esta meta'; end if;
  elsif p_goal is not null then
    raise exception 'Solo un aporte de ahorro se asigna a una meta';
  end if;
  insert into public.movements(id, user_id, type, amount, category, description,
    occurred_on, source, goal_id, group_id)
    values (p_id, auth.uid(), p_type, v_amount, trim(p_category), coalesce(p_description, ''),
      p_date, p_source, p_goal, v_goal.group_id) on conflict (id) do nothing;
  select * into v_existing from public.movements where id = p_id;
  if v_existing.user_id is distinct from auth.uid() or
     v_existing.type is distinct from p_type or v_existing.amount is distinct from v_amount or
     v_existing.goal_id is distinct from p_goal or v_existing.category is distinct from trim(p_category) or
     v_existing.description is distinct from coalesce(p_description, '') or
     v_existing.occurred_on is distinct from p_date or v_existing.source is distinct from p_source then
    raise exception 'El identificador ya corresponde a otro movimiento'; end if;
  return p_id;
end;
$$;

create function private.reverse_movement(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.movements set reversed_at = coalesce(reversed_at, now())
    where id = p_id and user_id = auth.uid();
  if not found then raise exception 'No puedes deshacer este movimiento'; end if;
end;
$$;

-- Operaciones públicas sin privilegios propios; implementaciones en esquema no expuesto.
create function public.create_group(p_name text) returns jsonb language sql security invoker set search_path = '' as $$ select private.create_group(p_name); $$;
create function public.request_group_access(p_code text) returns jsonb language sql security invoker set search_path = '' as $$ select private.request_group_access(p_code); $$;
create function public.decide_group_request(p_request uuid, p_approve boolean) returns void language sql security invoker set search_path = '' as $$ select private.decide_group_request(p_request,p_approve); $$;
create function public.revoke_group_invitation(p_invitation uuid) returns void language sql security invoker set search_path = '' as $$ select private.revoke_group_invitation(p_invitation); $$;
create function public.create_goal(p_title text,p_amount numeric,p_date date,p_group uuid default null) returns uuid language sql security invoker set search_path = '' as $$ select private.create_goal(p_title,p_amount,p_date,p_group); $$;
create function public.record_movement(p_id uuid,p_type text,p_amount numeric,p_category text,p_description text,p_date date,p_source text,p_goal uuid default null) returns uuid language sql security invoker set search_path = '' as $$ select private.record_movement(p_id,p_type,p_amount,p_category,p_description,p_date,p_source,p_goal); $$;
create function public.reverse_movement(p_id uuid) returns void language sql security invoker set search_path = '' as $$ select private.reverse_movement(p_id); $$;
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

create index groups_creator_idx on public.groups(created_by);
create index invitations_group_idx on public.group_invitations(group_id);
create index requests_decider_idx on public.join_requests(decided_by);

-- SUM sobre movimientos elimina la actualización de totales desde clientes desactualizados.
create view public.goal_progress with (security_invoker = true) as
  select g.*, coalesce((select sum(m.amount) from public.movements m
    where m.goal_id = g.id and m.reversed_at is null), 0) as current_amount
  from public.goals g;
grant select on public.goal_progress to authenticated;

revoke all on function public.create_group(text), public.request_group_access(text),
  public.decide_group_request(uuid,boolean), public.revoke_group_invitation(uuid),
  public.create_goal(text,numeric,date,uuid),
  public.record_movement(uuid,text,numeric,text,text,date,text,uuid),
  public.reverse_movement(uuid) from public, anon;
grant execute on function public.create_group(text), public.request_group_access(text),
  public.decide_group_request(uuid,boolean), public.revoke_group_invitation(uuid),
  public.create_goal(text,numeric,date,uuid),
  public.record_movement(uuid,text,numeric,text,text,date,text,uuid),
  public.reverse_movement(uuid) to authenticated;

-- Las suscripciones siguen las mismas reglas de lectura que las consultas.
alter publication supabase_realtime add table public.groups, public.group_members,
  public.join_requests, public.goals, public.movements;
commit;
