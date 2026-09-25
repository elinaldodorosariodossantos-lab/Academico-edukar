begin;

create table if not exists public.gastos (
  id uuid primary key default gen_random_uuid(),
  descricao text not null check (length(btrim(descricao)) between 1 and 200),
  valor numeric(12,2) not null check (valor > 0 and valor <= 9999999999.99),
  data date not null,
  categoria text not null check (categoria in ('Energia', 'Água', 'Internet', 'Aluguel', 'Material Didático', 'Equipamentos', 'Limpeza', 'Transporte', 'Outros')),
  status text not null default 'Pendente' check (status in ('Pago', 'Pendente')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists gastos_data_idx on public.gastos (data desc, id);

create or replace function public.gastos_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at = clock_timestamp();
  return new;
end;
$$;
drop trigger if exists gastos_update_timestamp on public.gastos;
create trigger gastos_update_timestamp before update on public.gastos
for each row execute function public.gastos_updated_at();

-- Mesmo modelo de acesso dos módulos atuais, sem modificar suas políticas.
alter table public.gastos enable row level security;
drop policy if exists gastos_select on public.gastos;
drop policy if exists gastos_insert on public.gastos;
drop policy if exists gastos_update on public.gastos;
drop policy if exists gastos_delete on public.gastos;
create policy gastos_select on public.gastos for select using (true);
create policy gastos_insert on public.gastos for insert with check (true);
create policy gastos_update on public.gastos for update using (true) with check (true);
create policy gastos_delete on public.gastos for delete using (true);

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    grant select, insert, update, delete on public.gastos to anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    grant select, insert, update, delete on public.gastos to authenticated;
  end if;
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'gastos') then
    alter publication supabase_realtime add table public.gastos;
  end if;
end;
$$;
notify pgrst, 'reload schema';
commit;
