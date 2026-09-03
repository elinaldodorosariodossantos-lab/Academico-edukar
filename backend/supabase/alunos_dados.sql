alter table public.alunos
  add column if not exists cpf text,
  add column if not exists data_nascimento text,
  add column if not exists data_inicio date,
  add column if not exists responsavel text,
  add column if not exists cpf_responsavel text,
  add column if not exists endereco text,
  add column if not exists bairro text,
  add column if not exists cidade text,
  add column if not exists estado text,
  add column if not exists email text,
  add column if not exists telefone text,
  add column if not exists turma text,
  add column if not exists dias_aula text[] default '{}',
  add column if not exists mensagem text default '',
  add column if not exists status text default 'Ativo',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists alunos_cpf_unique_idx
  on public.alunos (regexp_replace(cpf, '[^0-9]', '', 'g'))
  where cpf is not null and cpf <> '';

create index if not exists alunos_email_idx
  on public.alunos (lower(email));
