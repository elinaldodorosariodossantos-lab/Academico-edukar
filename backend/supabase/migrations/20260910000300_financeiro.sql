create extension if not exists pgcrypto;

create table if not exists public.financeiro_perfis (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade unique,
  modalidade text not null default 'Boleto'
    check (modalidade in ('Boleto', 'Permuta')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.financeiro_alunos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  aluno_nome text not null,
  curso text not null default 'Sem curso',
  turma text not null default 'Sem turma',
  valor_mensalidade numeric(12, 2) not null default 0
    check (valor_mensalidade >= 0),
  mes_referencia integer not null
    check (mes_referencia between 1 and 12),
  ano_referencia integer not null,
  boleto_emitido text not null default 'Não'
    check (boleto_emitido in ('Sim', 'Não')),
  status_pagamento text not null default 'Pendente'
    check (status_pagamento in ('Pago', 'Permuta', 'Pendente')),
  observacoes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (aluno_id, mes_referencia, ano_referencia)
);

create table if not exists public.financeiro_cursos (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade unique,
  turma_nome text not null,
  valor_mensalidade numeric(12, 2) not null default 0 check (valor_mensalidade >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists financeiro_alunos_periodo_idx
  on public.financeiro_alunos (ano_referencia, mes_referencia);

create or replace function public.update_financeiro_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists update_financeiro_perfis_updated_at on public.financeiro_perfis;
create trigger update_financeiro_perfis_updated_at
before update on public.financeiro_perfis
for each row execute function public.update_financeiro_updated_at();

drop trigger if exists update_financeiro_alunos_updated_at on public.financeiro_alunos;
create trigger update_financeiro_alunos_updated_at
before update on public.financeiro_alunos
for each row execute function public.update_financeiro_updated_at();

drop trigger if exists update_financeiro_cursos_updated_at on public.financeiro_cursos;
create trigger update_financeiro_cursos_updated_at
before update on public.financeiro_cursos
for each row execute function public.update_financeiro_updated_at();

alter table public.financeiro_perfis enable row level security;
alter table public.financeiro_alunos enable row level security;
alter table public.financeiro_cursos enable row level security;

drop policy if exists "financeiro_perfis_select_all" on public.financeiro_perfis;
drop policy if exists "financeiro_perfis_insert_all" on public.financeiro_perfis;
drop policy if exists "financeiro_perfis_update_all" on public.financeiro_perfis;
drop policy if exists "financeiro_alunos_select_all" on public.financeiro_alunos;
drop policy if exists "financeiro_alunos_insert_all" on public.financeiro_alunos;
drop policy if exists "financeiro_alunos_update_all" on public.financeiro_alunos;
drop policy if exists "financeiro_cursos_select_all" on public.financeiro_cursos;
drop policy if exists "financeiro_cursos_insert_all" on public.financeiro_cursos;
drop policy if exists "financeiro_cursos_update_all" on public.financeiro_cursos;

create policy "financeiro_perfis_select_all"
  on public.financeiro_perfis for select using (true);
create policy "financeiro_perfis_insert_all"
  on public.financeiro_perfis for insert with check (true);
create policy "financeiro_perfis_update_all"
  on public.financeiro_perfis for update using (true) with check (true);

create policy "financeiro_alunos_select_all"
  on public.financeiro_alunos for select using (true);
create policy "financeiro_alunos_insert_all"
  on public.financeiro_alunos for insert with check (true);
create policy "financeiro_alunos_update_all"
  on public.financeiro_alunos for update using (true) with check (true);

create policy "financeiro_cursos_select_all"
  on public.financeiro_cursos for select using (true);
create policy "financeiro_cursos_insert_all"
  on public.financeiro_cursos for insert with check (true);
create policy "financeiro_cursos_update_all"
  on public.financeiro_cursos for update using (true) with check (true);
