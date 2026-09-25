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

-- Recorrência mensal (também disponível como migração incremental).
begin;

create table if not exists public.gastos_recorrencias (
  id uuid primary key default gen_random_uuid(),
  descricao text not null,
  valor numeric(12,2) not null,
  categoria text not null,
  dia integer not null check (dia between 1 and 31),
  proximo_mes date not null,
  ativa boolean not null default true
);
alter table public.gastos_recorrencias enable row level security;
revoke all on public.gastos_recorrencias from public;
alter table public.gastos add column if not exists recorrente boolean not null default false;
alter table public.gastos add column if not exists recorrencia_id uuid references public.gastos_recorrencias(id);
alter table public.gastos add column if not exists competencia date;
create unique index if not exists gastos_recorrencia_mes_unique
  on public.gastos (recorrencia_id, competencia);

-- Dia 31 usa o último dia nos meses mais curtos, sem perder o dia original.
create or replace function public.gastos_vencimento(mes date, dia integer)
returns date language sql immutable set search_path = public as $$
  select (date_trunc('month', mes)::date +
    (least(dia, extract(day from (date_trunc('month', mes) + interval '1 month - 1 day'))::integer) - 1));
$$;

create or replace function public.gastos_sincronizar_recorrencia()
returns trigger language plpgsql security definer set search_path = public as $$
declare serie uuid;
begin
  -- Alterações internas apenas propagam a opção para o histórico.
  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.recorrencia_id is not null then
      update public.gastos_recorrencias set ativa = false where id = old.recorrencia_id;
      update public.gastos set recorrente = false where recorrencia_id = old.recorrencia_id and id <> old.id and recorrente;
    end if;
    return old;
  end if;
  if tg_op = 'UPDATE' then
    -- A identidade da parcela nunca muda em uma edição.
    new.recorrencia_id := old.recorrencia_id;
    new.competencia := old.competencia;
  end if;
  if new.recorrente and new.recorrencia_id is null then
    insert into public.gastos_recorrencias (descricao, valor, categoria, dia, proximo_mes)
    values (new.descricao, new.valor, new.categoria, extract(day from new.data),
      (date_trunc('month', new.data) + interval '1 month')::date) returning id into serie;
    new.recorrencia_id := serie;
    new.competencia := date_trunc('month', new.data)::date;
  elsif tg_op = 'UPDATE' and new.recorrencia_id is not null then
    if new.recorrente is distinct from old.recorrente then
      update public.gastos_recorrencias set ativa = new.recorrente,
        proximo_mes = case when new.recorrente then greatest(proximo_mes,
          (date_trunc('month', timezone('America/Fortaleza', now())) + interval '1 month')::date)
          else proximo_mes end
      where id = new.recorrencia_id;
      update public.gastos set recorrente = new.recorrente
      where recorrencia_id = new.recorrencia_id and id <> new.id and recorrente is distinct from new.recorrente;
    end if;
    if (new.descricao, new.valor, new.categoria, new.data) is distinct from
       (old.descricao, old.valor, old.categoria, old.data) then
      update public.gastos_recorrencias set descricao = new.descricao, valor = new.valor,
        categoria = new.categoria,
        dia = case when new.data <> old.data then extract(day from new.data)::integer else dia end
      where id = new.recorrencia_id;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists gastos_recorrencia_sync on public.gastos;
create trigger gastos_recorrencia_sync before insert or update or delete on public.gastos
for each row execute function public.gastos_sincronizar_recorrencia();

-- Restrita ao administrador/agendador. Recupera meses atrasados após interrupções.
create or replace function public.processar_gastos_recorrentes(
  hoje date default timezone('America/Fortaleza', now())::date)
returns integer language plpgsql security definer set search_path = public as $$
declare r public.gastos_recorrencias%rowtype; vencimento date; quantidade integer := 0; inseridos integer;
begin
  for r in select * from public.gastos_recorrencias where ativa order by id for update loop
    loop
      vencimento := public.gastos_vencimento(r.proximo_mes, r.dia);
      exit when hoje <= vencimento;
      insert into public.gastos (descricao, valor, data, categoria, status, recorrente, recorrencia_id, competencia)
      values (r.descricao, r.valor, vencimento, r.categoria, 'Pendente', true, r.id, r.proximo_mes)
      on conflict (recorrencia_id, competencia) do nothing;
      get diagnostics inseridos = row_count;
      quantidade := quantidade + inseridos;
      r.proximo_mes := (r.proximo_mes + interval '1 month')::date;
    end loop;
    update public.gastos_recorrencias set proximo_mes = r.proximo_mes where id = r.id;
  end loop;
  return quantidade;
end;
$$;
revoke all on function public.processar_gastos_recorrentes(date) from public;
revoke all on function public.gastos_sincronizar_recorrencia() from public;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on public.gastos_recorrencias from anon;
    revoke all on function public.processar_gastos_recorrentes(date) from anon;
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    revoke all on public.gastos_recorrencias from authenticated;
    revoke all on function public.processar_gastos_recorrentes(date) from authenticated;
  end if;
end $$;
notify pgrst, 'reload schema';
commit;

-- Categorias definidas pelos cadastros.
begin;
-- Substitui somente a lista fixa de categorias; preserva os gastos existentes.
alter table public.gastos drop constraint if exists gastos_categoria_check;
alter table public.gastos add constraint gastos_categoria_check
  check (length(btrim(categoria)) between 1 and 200);
notify pgrst, 'reload schema';
commit;
