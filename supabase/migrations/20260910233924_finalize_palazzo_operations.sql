create or replace function public.complete_appointment(target_appointment uuid, paid_amount numeric, paid_method text)
returns uuid language plpgsql security invoker set search_path='' as $$
declare a public.appointments; c_name text; tx uuid; actor uuid;
begin
 select * into a from public.appointments where id=target_appointment for update;
 if a.id is null then raise exception 'Agendamento não encontrado ou acesso negado' using errcode='42501'; end if;
 if a.status in ('cancelled','no_show') then raise exception 'Agendamento cancelado ou marcado como falta não pode ser concluído' using errcode='22023'; end if;
 select id into tx from public.cash_transactions where appointment_id=a.id and type='income';
 if tx is not null then return tx; end if;
 if paid_amount<=0 or paid_method not in ('Pix','Dinheiro','Débito','Crédito') then raise exception 'Pagamento inválido' using errcode='22023'; end if;
 select name into c_name from public.clients where id=a.client_id;
 select id into actor from public.profiles where auth_user_id=(select auth.uid()) and active limit 1;
 update public.appointments set status='completed',total=paid_amount,updated_at=now() where id=a.id;
 update public.clients set last_visit=a.appointment_date,updated_at=now() where id=a.client_id;
 insert into public.cash_transactions(barbershop_id,appointment_id,type,description,amount,category,payment_method,transaction_date,created_by)
 values(a.barbershop_id,a.id,'income','Atendimento — '||c_name,paid_amount,'Serviços',paid_method,a.appointment_date,actor) returning id into tx;
 insert into public.reminders(barbershop_id,client_id,type,scheduled_for) values(a.barbershop_id,a.client_id,'return',a.appointment_date+20) on conflict do nothing;
 return tx;
end; $$;
revoke all on function public.complete_appointment(uuid,numeric,text) from public,anon;
grant execute on function public.complete_appointment(uuid,numeric,text) to authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_tenant_member(uuid) to authenticated;
create schema if not exists extensions;
alter extension btree_gist set schema extensions;

create table if not exists public.cash_categories (
  id uuid primary key default gen_random_uuid(),
  barbershop_id uuid not null references public.barbershops(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(barbershop_id,name)
);
alter table public.cash_categories enable row level security;
create policy cash_categories_tenant_all on public.cash_categories for all to authenticated
using ((select private.is_tenant_member(barbershop_id)))
with check ((select private.is_tenant_member(barbershop_id)));
grant select,insert,update,delete on public.cash_categories to authenticated;
insert into public.cash_categories(barbershop_id,name)
select b.id,c.name from public.barbershops b cross join (values('Serviços'),('Produtos'),('Insumos'),('Aluguel'),('Marketing'),('Outras')) c(name)
where b.slug='palazzo' on conflict do nothing;
