\set ON_ERROR_STOP on
begin;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.record_movement('20000000-0000-0000-0000-000000000001','savings',100,
  'Ahorro','Aporte simultáneo',current_date,'text',(select id from public.goals where title='Viaje'));
select pg_sleep(1);
commit;
