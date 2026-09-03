create extension if not exists pgcrypto;

create table if not exists turmas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cpf text,
  professor text,
  horario text,
  hora_inicio text,
  hora_fim text,
  dias_semana text[] default '{}',
  quantidade_alunos integer default 0,
  sala text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists horarios (
  id uuid primary key default gen_random_uuid(),
  hora_inicial text,
  hora_final text,
  sala text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists alunos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  data_nascimento text,
  data_inicio date,
  responsavel text,
  cpf_responsavel text,
  endereco text,
  bairro text,
  cidade text,
  estado text,
  email text,
  telefone text,
  turma text,
  dias_aula text[] default '{}',
  mensagem text default '',
  status text default 'Ativo',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists frequencias (
  id uuid primary key default gen_random_uuid(),
  data text,
  turma text,
  aluno text,
  presenca text,
  conteudo_ministrado text,
  observacoes text,
  professor_responsavel text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists contatos_vinculados (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text not null,
  relacao text default 'Responsável',
  aluno text,
  turma text default 'Robótica Kids',
  principal boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists mensagens_automatica (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid references public.turmas(id) on delete cascade,
  titulo text not null,
  tipo text not null check (tipo in ('inicio', 'presente', 'ausente', 'fim')),
  minutos_antes integer default 15,
  texto text not null,
  ativo boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists financeiro_perfis (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade unique,
  modalidade text not null default 'Boleto' check (modalidade in ('Boleto', 'Permuta')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists financeiro_alunos (
  id uuid primary key default gen_random_uuid(),
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  aluno_nome text not null,
  curso text not null default 'Sem curso',
  turma text not null default 'Sem turma',
  valor_mensalidade numeric(12, 2) not null default 0 check (valor_mensalidade >= 0),
  mes_referencia integer not null check (mes_referencia between 1 and 12),
  ano_referencia integer not null,
  boleto_emitido text not null default 'Não' check (boleto_emitido in ('Sim', 'Não')),
  status_pagamento text not null default 'Pendente' check (status_pagamento in ('Pago', 'Permuta', 'Pendente')),
  observacoes text default '',
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (aluno_id, mes_referencia, ano_referencia)
);

create index if not exists financeiro_alunos_periodo_idx
on public.financeiro_alunos (ano_referencia, mes_referencia);

create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_turmas_updated_at on public.turmas;
drop trigger if exists update_alunos_updated_at on public.alunos;
drop trigger if exists update_horarios_updated_at on public.horarios;
drop trigger if exists update_frequencias_updated_at on public.frequencias;
drop trigger if exists update_contatos_vinculados_updated_at on public.contatos_vinculados;
drop trigger if exists update_mensagens_automatica_updated_at on public.mensagens_automatica;
drop trigger if exists update_financeiro_perfis_updated_at on public.financeiro_perfis;
drop trigger if exists update_financeiro_alunos_updated_at on public.financeiro_alunos;

create trigger update_turmas_updated_at
before update on public.turmas
for each row
execute function update_updated_at_column();

create trigger update_alunos_updated_at
before update on public.alunos
for each row
execute function update_updated_at_column();

create trigger update_horarios_updated_at
before update on public.horarios
for each row
execute function update_updated_at_column();

create trigger update_frequencias_updated_at
before update on public.frequencias
for each row
execute function update_updated_at_column();

create trigger update_contatos_vinculados_updated_at
before update on public.contatos_vinculados
for each row
execute function update_updated_at_column();

create trigger update_mensagens_automatica_updated_at
before update on public.mensagens_automatica
for each row
execute function update_updated_at_column();

create trigger update_financeiro_perfis_updated_at
before update on public.financeiro_perfis
for each row
execute function update_updated_at_column();

create trigger update_financeiro_alunos_updated_at
before update on public.financeiro_alunos
for each row
execute function update_updated_at_column();

alter table public.turmas enable row level security;
alter table public.horarios enable row level security;
alter table public.alunos enable row level security;
alter table public.frequencias enable row level security;
alter table public.contatos_vinculados enable row level security;
alter table public.mensagens_automatica enable row level security;
alter table public.financeiro_perfis enable row level security;
alter table public.financeiro_alunos enable row level security;

drop policy if exists "turmas_select_all" on public.turmas;
drop policy if exists "turmas_insert_all" on public.turmas;
drop policy if exists "turmas_update_all" on public.turmas;
drop policy if exists "turmas_delete_all" on public.turmas;

drop policy if exists "horarios_select_all" on public.horarios;
drop policy if exists "horarios_insert_all" on public.horarios;
drop policy if exists "horarios_update_all" on public.horarios;
drop policy if exists "horarios_delete_all" on public.horarios;

drop policy if exists "alunos_select_all" on public.alunos;
drop policy if exists "alunos_insert_all" on public.alunos;
drop policy if exists "alunos_update_all" on public.alunos;
drop policy if exists "alunos_delete_all" on public.alunos;

drop policy if exists "frequencias_select_all" on public.frequencias;
drop policy if exists "frequencias_insert_all" on public.frequencias;
drop policy if exists "frequencias_update_all" on public.frequencias;
drop policy if exists "frequencias_delete_all" on public.frequencias;
drop policy if exists "contatos_vinculados_select_all" on public.contatos_vinculados;
drop policy if exists "contatos_vinculados_insert_all" on public.contatos_vinculados;
drop policy if exists "contatos_vinculados_update_all" on public.contatos_vinculados;
drop policy if exists "contatos_vinculados_delete_all" on public.contatos_vinculados;
drop policy if exists "mensagens_automatica_select_all" on public.mensagens_automatica;
drop policy if exists "mensagens_automatica_insert_all" on public.mensagens_automatica;
drop policy if exists "mensagens_automatica_update_all" on public.mensagens_automatica;
drop policy if exists "mensagens_automatica_delete_all" on public.mensagens_automatica;
drop policy if exists "financeiro_perfis_select_all" on public.financeiro_perfis;
drop policy if exists "financeiro_perfis_insert_all" on public.financeiro_perfis;
drop policy if exists "financeiro_perfis_update_all" on public.financeiro_perfis;
drop policy if exists "financeiro_perfis_delete_all" on public.financeiro_perfis;
drop policy if exists "financeiro_alunos_select_all" on public.financeiro_alunos;
drop policy if exists "financeiro_alunos_insert_all" on public.financeiro_alunos;
drop policy if exists "financeiro_alunos_update_all" on public.financeiro_alunos;
drop policy if exists "financeiro_alunos_delete_all" on public.financeiro_alunos;

create policy "turmas_select_all" on public.turmas for select using (true);
create policy "turmas_insert_all" on public.turmas for insert with check (true);
create policy "turmas_update_all" on public.turmas for update using (true) with check (true);
create policy "turmas_delete_all" on public.turmas for delete using (true);

create policy "horarios_select_all" on public.horarios for select using (true);
create policy "horarios_insert_all" on public.horarios for insert with check (true);
create policy "horarios_update_all" on public.horarios for update using (true) with check (true);
create policy "horarios_delete_all" on public.horarios for delete using (true);

create policy "alunos_select_all" on public.alunos for select using (true);
create policy "alunos_insert_all" on public.alunos for insert with check (true);
create policy "alunos_update_all" on public.alunos for update using (true) with check (true);
create policy "alunos_delete_all" on public.alunos for delete using (true);

create policy "frequencias_select_all" on public.frequencias for select using (true);
create policy "frequencias_insert_all" on public.frequencias for insert with check (true);
create policy "frequencias_update_all" on public.frequencias for update using (true) with check (true);
create policy "frequencias_delete_all" on public.frequencias for delete using (true);

create policy "contatos_vinculados_select_all" on public.contatos_vinculados for select using (true);
create policy "contatos_vinculados_insert_all" on public.contatos_vinculados for insert with check (true);
create policy "contatos_vinculados_update_all" on public.contatos_vinculados for update using (true) with check (true);
create policy "contatos_vinculados_delete_all" on public.contatos_vinculados for delete using (true);

create policy "mensagens_automatica_select_all" on public.mensagens_automatica for select using (true);
create policy "mensagens_automatica_insert_all" on public.mensagens_automatica for insert with check (true);
create policy "mensagens_automatica_update_all" on public.mensagens_automatica for update using (true) with check (true);
create policy "mensagens_automatica_delete_all" on public.mensagens_automatica for delete using (true);

create policy "financeiro_perfis_select_all" on public.financeiro_perfis for select using (true);
create policy "financeiro_perfis_insert_all" on public.financeiro_perfis for insert with check (true);
create policy "financeiro_perfis_update_all" on public.financeiro_perfis for update using (true) with check (true);
create policy "financeiro_perfis_delete_all" on public.financeiro_perfis for delete using (true);

create policy "financeiro_alunos_select_all" on public.financeiro_alunos for select using (true);
create policy "financeiro_alunos_insert_all" on public.financeiro_alunos for insert with check (true);
create policy "financeiro_alunos_update_all" on public.financeiro_alunos for update using (true) with check (true);
create policy "financeiro_alunos_delete_all" on public.financeiro_alunos for delete using (true);
