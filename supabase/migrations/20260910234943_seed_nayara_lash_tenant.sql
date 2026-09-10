do $$
declare
  shop_id uuid;
begin
  insert into public.barbershops(name,slug,logo_url,phone,address,instagram,whatsapp_message,opening_time,closing_time,break_start,break_end)
  values(
    'Nayara Lash Designer','nayara-lash',null,'5562999999999',
    'Rua das Acácias, 210 — Setor Bueno, Goiânia - GO','@nayara.lashdesigner',
    'Olá! Bem-vinda à Nayara Lash Designer. Escolha seu procedimento e agende seu horário pelo nosso sistema oficial.',
    '09:00','19:00','12:00','13:00'
  )
  on conflict (slug) do update set name=excluded.name, phone=excluded.phone, address=excluded.address,
    instagram=excluded.instagram, whatsapp_message=excluded.whatsapp_message, updated_at=now()
  returning id into shop_id;

  insert into public.subscriptions(barbershop_id,plan,status,trial_ends_at,current_period_end)
  values(shop_id,'pro','trial',now()+interval '30 days',now()+interval '30 days')
  on conflict (barbershop_id) do update set plan='pro',status='trial',trial_ends_at=excluded.trial_ends_at,current_period_end=excluded.current_period_end;

  insert into public.business_hours(barbershop_id,weekday,is_open,opening_time,closing_time,break_start,break_end)
  select shop_id,d,d between 1 and 6,case when d between 1 and 6 then '09:00'::time end,
    case when d between 1 and 6 then '19:00'::time end,case when d between 1 and 6 then '12:00'::time end,
    case when d between 1 and 6 then '13:00'::time end from generate_series(0,6) d
  on conflict (barbershop_id,weekday) do update set is_open=excluded.is_open,opening_time=excluded.opening_time,
    closing_time=excluded.closing_time,break_start=excluded.break_start,break_end=excluded.break_end;

  insert into public.services(barbershop_id,name,description,duration_minutes,price)
  select shop_id,x.name,x.description,x.duration,x.price from (values
    ('Extensão Fio a Fio','Resultado natural com aplicação personalizada.',120,140),
    ('Volume Brasileiro','Volume leve, elegante e confortável.',150,180),
    ('Volume Russo','Maior densidade e acabamento marcante.',180,220),
    ('Manutenção de Cílios','Reposição e renovação do procedimento.',90,100),
    ('Lash Lifting','Curvatura e definição dos cílios naturais.',75,120),
    ('Design de Sobrancelhas','Mapeamento e acabamento personalizado.',40,45)
  ) x(name,description,duration,price)
  on conflict do nothing;

  insert into public.professionals(barbershop_id,name,phone,active)
  select shop_id,'Nayara','5562999999999',true
  where not exists(select 1 from public.professionals where barbershop_id=shop_id and name='Nayara');

  insert into public.cash_categories(barbershop_id,name)
  select shop_id,name from (values('Serviços'),('Produtos'),('Materiais'),('Aluguel'),('Marketing'),('Outras')) c(name)
  on conflict do nothing;
end $$;
