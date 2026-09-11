alter table public.barbershops
  add column if not exists business_type text not null default 'services',
  add column if not exists theme text not null default 'classic';

update public.barbershops set business_type='barber',theme='classic' where slug='palazzo';
update public.barbershops set business_type='lash',theme='rose' where slug='nayara-lash';

create policy subscriptions_platform_manage on public.subscriptions for all to authenticated
using (exists(select 1 from public.profiles p where p.auth_user_id=(select auth.uid()) and p.active and p.role='platform_admin'))
with check (exists(select 1 from public.profiles p where p.auth_user_id=(select auth.uid()) and p.active and p.role='platform_admin'));

create or replace function public.create_tenant(
  tenant_name text,
  tenant_slug text,
  tenant_business_type text,
  tenant_phone text,
  tenant_plan text default 'essential',
  tenant_theme text default 'rose'
) returns uuid
language plpgsql security invoker set search_path=''
as $$
declare new_tenant uuid;
begin
  if not exists(select 1 from public.profiles p where p.auth_user_id=(select auth.uid()) and p.active and p.role='platform_admin') then
    raise exception 'Acesso exclusivo da administração Chrona' using errcode='42501';
  end if;
  if trim(tenant_name)='' or tenant_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' then
    raise exception 'Nome ou slug inválido' using errcode='22023';
  end if;
  insert into public.barbershops(name,slug,phone,business_type,theme,address,whatsapp_message)
  values(trim(tenant_name),lower(tenant_slug),regexp_replace(tenant_phone,'\D','','g'),tenant_business_type,tenant_theme,'Endereço a configurar','Olá! Agende seu horário pelo nosso sistema oficial.')
  returning id into new_tenant;
  insert into public.subscriptions(barbershop_id,plan,status,trial_ends_at,current_period_end)
  values(new_tenant,tenant_plan,'trial',now()+interval '30 days',now()+interval '30 days');
  insert into public.business_hours(barbershop_id,weekday,is_open,opening_time,closing_time,break_start,break_end)
  select new_tenant,d,d between 1 and 6,case when d between 1 and 6 then '09:00'::time end,
    case when d between 1 and 6 then '19:00'::time end,case when d between 1 and 6 then '12:00'::time end,
    case when d between 1 and 6 then '13:00'::time end from generate_series(0,6) d;
  insert into public.cash_categories(barbershop_id,name)
  select new_tenant,name from (values('Serviços'),('Produtos'),('Materiais'),('Aluguel'),('Marketing'),('Outras')) c(name);
  return new_tenant;
end $$;

revoke all on function public.create_tenant(text,text,text,text,text,text) from public,anon;
grant execute on function public.create_tenant(text,text,text,text,text,text) to authenticated;
