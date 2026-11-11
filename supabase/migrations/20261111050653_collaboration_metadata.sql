begin;
create function private.group_people(p_group uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
 if not private.is_member(p_group) then raise exception 'No tienes acceso al grupo'; end if;
 return jsonb_build_object(
  'members', coalesce((select jsonb_agg(jsonb_build_object('user_id',m.user_id,'name',coalesce(p.display_name,'Integrante'),'role',m.role)) from public.group_members m left join public.profiles p on p.id=m.user_id where m.group_id=p_group),'[]'),
  'requests', case when private.is_admin(p_group) then coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',coalesce(p.display_name,'Solicitante'),'status',r.status)) from public.join_requests r left join public.profiles p on p.id=r.user_id where r.group_id=p_group and r.status='pending'),'[]') else '[]'::jsonb end
 );
end; $$;
create function public.group_people(p_group uuid) returns jsonb language sql security invoker set search_path = '' as $$ select private.group_people(p_group); $$;
create function private.my_requests() returns jsonb language plpgsql security definer set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Inicia sesión'; end if;
 return coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'name',g.name,'status',r.status)) from public.join_requests r join public.groups g on g.id=r.group_id where r.user_id=auth.uid()),'[]');
end; $$;
create function public.my_requests() returns jsonb language sql security invoker set search_path = '' as $$ select private.my_requests(); $$;
create function private.create_group_invitation(p_group uuid) returns text language plpgsql security definer set search_path = '' as $$
declare v_code text;
begin
 if not private.is_admin(p_group) then raise exception 'Solo el administrador crea invitaciones'; end if;
 insert into public.group_invitations(group_id) values(p_group) returning code into v_code;
 return v_code;
end; $$;
create function public.create_group_invitation(p_group uuid) returns text language sql security invoker set search_path = '' as $$ select private.create_group_invitation(p_group); $$;
revoke all on function private.group_people(uuid),private.my_requests(),private.create_group_invitation(uuid),public.group_people(uuid),public.my_requests(),public.create_group_invitation(uuid) from public,anon;
grant execute on function private.group_people(uuid),private.my_requests(),private.create_group_invitation(uuid),public.group_people(uuid),public.my_requests(),public.create_group_invitation(uuid) to authenticated;
commit;
