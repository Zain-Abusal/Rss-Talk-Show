begin;
create function public.registration_analytics() returns jsonb language sql stable security invoker set search_path='' as $$
 select jsonb_build_object(
  'total',(select count(*) from public.tickets),
  'registered',(select count(*) from public.tickets where status='registered'),
  'checkedIn',(select count(*) from public.tickets where status='checked_in'),
  'cancelled',(select count(*) from public.tickets where status='cancelled'),
  'roles',coalesce((select jsonb_agg(row_to_json(r)) from (select role as label,count(*) as count from public.tickets where status<>'cancelled' group by role order by count(*) desc) r),'[]'::jsonb),
  'grades',coalesce((select jsonb_agg(row_to_json(g)) from (select grade as label,count(*) as count from public.tickets where status<>'cancelled' group by grade order by count(*) desc) g),'[]'::jsonb),
  'daily',coalesce((select jsonb_agg(row_to_json(d)) from (select to_char(created_at at time zone 'Asia/Dubai','YYYY-MM-DD') as day,count(*) as count from public.tickets group by day order by day desc limit 14) d),'[]'::jsonb)
 );
$$;
revoke all on function public.registration_analytics() from public,anon,authenticated;
grant execute on function public.registration_analytics() to service_role;
commit;
