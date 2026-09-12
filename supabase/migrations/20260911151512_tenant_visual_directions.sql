alter table public.barbershops
  add column if not exists visual_direction text not null default 'studio';

update public.barbershops
set
  visual_direction = case slug
    when 'palazzo' then 'editorial'
    when 'nayara-lash' then 'serene'
    when 'raquel-beauty' then 'studio'
    else visual_direction
  end,
  primary_color = case slug
    when 'palazzo' then '#17130f'
    when 'nayara-lash' then '#d88fa5'
    when 'raquel-beauty' then '#7c3aed'
    else primary_color
  end,
  secondary_color = case slug
    when 'palazzo' then '#f5f1e8'
    when 'nayara-lash' then '#3d3233'
    when 'raquel-beauty' then '#172033'
    else secondary_color
  end;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'barbershops_visual_direction_valid'
      and conrelid = 'public.barbershops'::regclass
  ) then
    alter table public.barbershops
      add constraint barbershops_visual_direction_valid
      check (visual_direction in ('editorial', 'studio', 'serene'));
  end if;
end
$$;

comment on column public.barbershops.visual_direction is
  'Direção de arte pública do tenant: editorial, studio ou serene.';

comment on column public.barbershops.primary_color is
  'Cor predominante escolhida pelo tenant.';

comment on column public.barbershops.secondary_color is
  'Cor de tinta para textos e traços; nome mantido por compatibilidade.';
