alter table public.barbershops
  add column if not exists primary_color text not null default '#6d5dfb',
  add column if not exists secondary_color text not null default '#22c3a6',
  add column if not exists public_description text;

update public.barbershops
set
  theme = case when slug = 'raquel-beauty' then 'custom' else theme end,
  primary_color = case slug
    when 'palazzo' then '#c89b5b'
    when 'nayara-lash' then '#d88fa5'
    when 'raquel-beauty' then '#7c3aed'
    else primary_color
  end,
  secondary_color = case slug
    when 'palazzo' then '#e0bb7a'
    when 'nayara-lash' then '#9a6f78'
    when 'raquel-beauty' then '#14b8a6'
    else secondary_color
  end,
  public_description = coalesce(
    public_description,
    'Escolha o serviço, o profissional e o melhor horário para você.'
  );

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'barbershops_primary_color_valid'
      and conrelid = 'public.barbershops'::regclass
  ) then
    alter table public.barbershops
      add constraint barbershops_primary_color_valid
      check (primary_color ~ '^#[0-9a-fA-F]{6}$');
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'barbershops_secondary_color_valid'
      and conrelid = 'public.barbershops'::regclass
  ) then
    alter table public.barbershops
      add constraint barbershops_secondary_color_valid
      check (secondary_color ~ '^#[0-9a-fA-F]{6}$');
  end if;
end
$$;

create or replace function public.provision_tenant_with_owner(
  actor_auth_user_id uuid,
  owner_auth_user_id uuid,
  tenant_name text,
  tenant_slug text,
  tenant_business_type text,
  tenant_phone text,
  tenant_address text,
  tenant_instagram text,
  tenant_logo_url text,
  tenant_description text,
  tenant_primary_color text,
  tenant_secondary_color text,
  tenant_plan text,
  owner_name text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_tenant uuid;
  normalized_slug text := lower(trim(tenant_slug));
  normalized_phone text := regexp_replace(coalesce(tenant_phone, ''), '\D', '', 'g');
  normalized_instagram text := nullif(trim(coalesce(tenant_instagram, '')), '');
  normalized_logo text := nullif(trim(coalesce(tenant_logo_url, '')), '');
begin
  if not exists (
    select 1
    from public.profiles p
    where p.auth_user_id = actor_auth_user_id
      and p.active
      and p.role = 'platform_admin'
  ) then
    raise exception 'Acesso exclusivo da administração Chrona' using errcode = '42501';
  end if;

  if not exists (select 1 from auth.users u where u.id = owner_auth_user_id) then
    raise exception 'O convite do responsável não foi encontrado' using errcode = '22023';
  end if;

  if exists (select 1 from public.profiles p where p.auth_user_id = owner_auth_user_id) then
    raise exception 'Este e-mail já está vinculado a uma conta Chrona' using errcode = '23505';
  end if;

  if length(trim(coalesce(tenant_name, ''))) < 2 or length(trim(tenant_name)) > 120 then
    raise exception 'Informe um nome de empresa válido' using errcode = '22023';
  end if;
  if normalized_slug !~ '^[a-z0-9]+(?:-[a-z0-9]+)*$' or length(normalized_slug) > 80 then
    raise exception 'O slug deve usar letras minúsculas, números e hífens' using errcode = '22023';
  end if;
  if exists (select 1 from public.barbershops b where b.slug = normalized_slug) then
    raise exception 'Este slug já está em uso' using errcode = '23505';
  end if;
  if normalized_phone !~ '^[0-9]{10,15}$' then
    raise exception 'Informe um WhatsApp válido com DDD' using errcode = '22023';
  end if;
  if tenant_primary_color !~ '^#[0-9a-fA-F]{6}$' or tenant_secondary_color !~ '^#[0-9a-fA-F]{6}$' then
    raise exception 'As cores da identidade visual são inválidas' using errcode = '22023';
  end if;
  if tenant_plan not in ('essential', 'pro') then
    raise exception 'Plano inválido' using errcode = '22023';
  end if;
  if length(trim(coalesce(owner_name, ''))) < 2 or length(trim(owner_name)) > 120 then
    raise exception 'Informe o nome do responsável' using errcode = '22023';
  end if;
  if normalized_logo is not null and normalized_logo !~ '^https://[^[:space:]]+$' then
    raise exception 'A logo deve usar um link HTTPS' using errcode = '22023';
  end if;

  insert into public.barbershops (
    name,
    slug,
    logo_url,
    phone,
    address,
    instagram,
    whatsapp_message,
    business_type,
    theme,
    primary_color,
    secondary_color,
    public_description
  ) values (
    trim(tenant_name),
    normalized_slug,
    normalized_logo,
    normalized_phone,
    coalesce(nullif(trim(coalesce(tenant_address, '')), ''), 'Endereço a configurar'),
    normalized_instagram,
    'Olá! Quero saber mais sobre os serviços e horários disponíveis.',
    lower(trim(coalesce(tenant_business_type, 'services'))),
    'custom',
    lower(tenant_primary_color),
    lower(tenant_secondary_color),
    coalesce(
      nullif(trim(coalesce(tenant_description, '')), ''),
      'Escolha o serviço, o profissional e o melhor horário para você.'
    )
  ) returning id into new_tenant;

  insert into public.subscriptions (
    barbershop_id,
    plan,
    status,
    trial_ends_at,
    current_period_end
  ) values (
    new_tenant,
    tenant_plan,
    'trial',
    now() + interval '30 days',
    now() + interval '30 days'
  );

  insert into public.business_hours (
    barbershop_id,
    weekday,
    is_open,
    opening_time,
    closing_time,
    break_start,
    break_end
  )
  select
    new_tenant,
    day_number,
    day_number between 1 and 6,
    case when day_number between 1 and 6 then '09:00'::time end,
    case when day_number between 1 and 6 then '19:00'::time end,
    case when day_number between 1 and 6 then '12:00'::time end,
    case when day_number between 1 and 6 then '13:00'::time end
  from generate_series(0, 6) as day_number;

  insert into public.cash_categories (barbershop_id, name)
  select new_tenant, category_name
  from (values
    ('Serviços'),
    ('Produtos'),
    ('Materiais'),
    ('Aluguel'),
    ('Marketing'),
    ('Outras')
  ) as categories(category_name);

  insert into public.profiles (auth_user_id, barbershop_id, name, role, active)
  values (owner_auth_user_id, new_tenant, trim(owner_name), 'owner', true);

  return jsonb_build_object(
    'id', new_tenant,
    'slug', normalized_slug,
    'ownerUserId', owner_auth_user_id
  );
end
$$;

create or replace function public.attach_tenant_owner(
  actor_auth_user_id uuid,
  owner_auth_user_id uuid,
  target_barbershop_id uuid,
  owner_name text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  tenant_slug text;
begin
  if not exists (
    select 1
    from public.profiles p
    where p.auth_user_id = actor_auth_user_id
      and p.active
      and p.role = 'platform_admin'
  ) then
    raise exception 'Acesso exclusivo da administração Chrona' using errcode = '42501';
  end if;

  select b.slug into tenant_slug
  from public.barbershops b
  where b.id = target_barbershop_id;

  if tenant_slug is null then
    raise exception 'Empresa não encontrada' using errcode = 'P0002';
  end if;
  if not exists (select 1 from auth.users u where u.id = owner_auth_user_id) then
    raise exception 'O convite do responsável não foi encontrado' using errcode = '22023';
  end if;
  if exists (select 1 from public.profiles p where p.auth_user_id = owner_auth_user_id) then
    raise exception 'Este e-mail já está vinculado a uma conta Chrona' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.profiles p
    where p.barbershop_id = target_barbershop_id
      and p.role = 'owner'
      and p.active
  ) then
    raise exception 'Esta empresa já possui um responsável ativo' using errcode = '23505';
  end if;
  if length(trim(coalesce(owner_name, ''))) < 2 or length(trim(owner_name)) > 120 then
    raise exception 'Informe o nome do responsável' using errcode = '22023';
  end if;

  insert into public.profiles (auth_user_id, barbershop_id, name, role, active)
  values (owner_auth_user_id, target_barbershop_id, trim(owner_name), 'owner', true);

  return jsonb_build_object(
    'id', target_barbershop_id,
    'slug', tenant_slug,
    'ownerUserId', owner_auth_user_id
  );
end
$$;

revoke all on function public.provision_tenant_with_owner(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.provision_tenant_with_owner(
  uuid, uuid, text, text, text, text, text, text, text, text, text, text, text, text
) to service_role;

revoke all on function public.attach_tenant_owner(uuid, uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.attach_tenant_owner(uuid, uuid, uuid, text)
  to service_role;

revoke execute on function public.create_tenant(text, text, text, text, text, text)
  from authenticated;
