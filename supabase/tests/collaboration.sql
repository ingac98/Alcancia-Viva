\set ON_ERROR_STOP on
-- Ejecutar solo en la base desechable inicializada con local-bootstrap.sql.
begin;
insert into auth.users(id) values
 ('00000000-0000-0000-0000-000000000001'),
 ('00000000-0000-0000-0000-000000000002'),
 ('00000000-0000-0000-0000-000000000003');
create function pg_temp.assert_test(ok boolean, message text) returns void
language plpgsql as $$ begin
 if ok is distinct from true then raise exception 'TEST FAILED: %', message; end if;
end; $$;
create function pg_temp.expect_denied(command text) returns void language plpgsql as $$
declare rejected boolean := false;
begin
 begin execute command;
 exception when insufficient_privilege or raise_exception or check_violation then rejected := true;
 end;
 if not rejected then raise exception 'TEST FAILED: operación no autorizada aceptada: %', command; end if;
end; $$;

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
with result as (select public.create_group('Familia') as j)
 select j->>'group_id' as family_id, j->>'invitation_code' as invitation from result \gset
select public.create_goal('Viaje',1000,current_date+60,:'family_id') as trip_id \gset
select public.create_goal('Emergencia',2000,current_date+90,:'family_id') as emergency_id \gset
with result as (select public.create_group('Amigos') as j)
 select j->>'group_id' as friends_id from result \gset

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
with result as (select public.request_group_access(:'invitation') as j)
 select j->>'request_id' as request_id from result \gset
select public.request_group_access(:'invitation');
select pg_temp.assert_test((select count(*)=1 from public.join_requests),'Solicitud duplicada');
select pg_temp.assert_test((select count(*)=0 from public.groups),'Pendiente ve grupos privados');
select pg_temp.assert_test((select count(*)=0 from public.goals),'Pendiente ve metas');
select pg_temp.expect_denied(format('select public.decide_group_request(%L,true)', :'request_id'));
select pg_temp.expect_denied(format('insert into public.group_members values (%L,auth.uid(),%L,now())', :'family_id','admin'));
select pg_temp.expect_denied(format('select public.record_movement(gen_random_uuid(),%L,10,%L,%L,current_date,%L,%L)', 'savings','Ahorro','', 'text', :'trip_id'));

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.decide_group_request(:'request_id',true);
select public.record_movement('10000000-0000-0000-0000-000000000001','savings',50,'Ahorro','Aporte',current_date,'text',:'trip_id');
select public.record_movement('10000000-0000-0000-0000-000000000002','expense',25,'Transporte','Taxi privado',current_date,'text');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select pg_temp.assert_test((select count(*)=1 from public.groups),'Miembro ve grupo ajeno');
select pg_temp.assert_test((select count(*)=2 from public.goals),'Miembro no ve ambas metas');
select pg_temp.assert_test((select count(*)=0 from public.movements where type='expense'),'Se filtró gasto privado');
select public.record_movement('10000000-0000-0000-0000-000000000003','savings',100,'Ahorro','Aporte',current_date,'voice',:'trip_id');
select public.record_movement('10000000-0000-0000-0000-000000000003','savings',100,'Ahorro','Aporte',current_date,'voice',:'trip_id');
select pg_temp.assert_test((select current_amount=150 from public.goal_progress where id=:'trip_id'),'Total o reintento incorrecto');
select pg_temp.assert_test((select current_amount=0 from public.goal_progress where id=:'emergency_id'),'Se alteró otra meta');
select pg_temp.expect_denied(format('select public.reverse_movement(%L)','10000000-0000-0000-0000-000000000001'));
select public.reverse_movement('10000000-0000-0000-0000-000000000003');
select pg_temp.assert_test((select current_amount=50 from public.goal_progress where id=:'trip_id'),'Deshacer no revierte avance');
select pg_temp.expect_denied(format('select public.record_movement(gen_random_uuid(),%L,0,%L,%L,current_date,%L,%L)','savings','Ahorro','','text',:'trip_id'));
select pg_temp.expect_denied('select public.record_movement(gen_random_uuid(),''savings'',10,''Ahorro'','''',current_date,''text'')');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
with result as (select public.request_group_access(:'invitation') as j)
 select j->>'request_id' as rejected_request_id from result \gset
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select public.decide_group_request(:'rejected_request_id',false);
select public.revoke_group_invitation(id) from public.group_invitations where group_id=:'family_id';
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select pg_temp.assert_test((select count(*)=0 from public.goals),'Solicitud rechazada obtuvo acceso');
select pg_temp.expect_denied(format('select public.request_group_access(%L)',:'invitation'));
set role anon;
select pg_temp.expect_denied('select * from public.groups');
select pg_temp.expect_denied('select public.create_group(''Sin sesión'')');
reset role;
select 'PASS: permisos, solicitudes, aprobación/rechazo, grupos, metas, privacidad, aportes, reintento y reversión' as resultado;
commit;
