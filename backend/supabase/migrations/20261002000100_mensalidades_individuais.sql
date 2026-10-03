begin;
alter table public.financeiro_perfis add column if not exists valor_mensalidade numeric(12,2) check (valor_mensalidade >= 0);
alter table public.financeiro_alunos add column if not exists modalidade text check (modalidade in ('Boleto', 'Permuta'));
alter table public.financeiro_alunos add column if not exists data_pagamento date;

-- Inicializa somente a configuração; nenhuma parcela histórica é reescrita.
insert into public.financeiro_perfis (aluno_id, modalidade, valor_mensalidade)
select a.id, coalesce(p.modalidade, case when h.status_pagamento = 'Permuta' then 'Permuta' else 'Boleto' end),
  coalesce(h.valor_mensalidade, case when p.modalidade = 'Permuta' then 0 else c.valor_mensalidade end, 0)
from public.alunos a
left join public.financeiro_perfis p on p.aluno_id = a.id
left join lateral (select f.* from public.financeiro_alunos f where f.aluno_id = a.id
  order by ano_referencia desc, mes_referencia desc limit 1) h on true
left join lateral (select valor_mensalidade from public.financeiro_cursos where turma_nome = a.turma limit 1) c on true
on conflict (aluno_id) do update set valor_mensalidade = excluded.valor_mensalidade
where financeiro_perfis.valor_mensalidade is null;

create or replace function public.financeiro_inicializar_perfil()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.valor_mensalidade is null then
    select case when new.modalidade = 'Permuta' then 0 else coalesce((select c.valor_mensalidade from public.financeiro_cursos c
      join public.alunos a on a.turma = c.turma_nome where a.id = new.aluno_id limit 1), 0)
      end
      into new.valor_mensalidade;
  end if;
  return new;
end;
$$;
drop trigger if exists financeiro_inicializar_perfil on public.financeiro_perfis;
create trigger financeiro_inicializar_perfil before insert on public.financeiro_perfis
for each row execute function public.financeiro_inicializar_perfil();

create or replace function public.financeiro_novo_aluno()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  insert into public.financeiro_perfis (aluno_id) values (new.id) on conflict (aluno_id) do nothing;
  return new;
end;
$$;
drop trigger if exists financeiro_novo_aluno on public.alunos;
create trigger financeiro_novo_aluno after insert on public.alunos
for each row execute function public.financeiro_novo_aluno();

create or replace function public.gerar_mensalidades()
returns integer language plpgsql security invoker set search_path = public as $$
declare competencia date := date_trunc('month', timezone('America/Fortaleza', now()))::date; total integer;
begin
  insert into public.financeiro_perfis (aluno_id)
  select id from public.alunos where status = 'Ativo' on conflict (aluno_id) do nothing;
  insert into public.financeiro_alunos (aluno_id, aluno_nome, curso, turma, valor_mensalidade,
    mes_referencia, ano_referencia, boleto_emitido, modalidade, status_pagamento)
  select a.id, a.nome, coalesce(a.turma, 'Sem curso'), coalesce(a.turma, 'Sem turma'), p.valor_mensalidade,
    extract(month from competencia)::integer, extract(year from competencia)::integer, 'Não', p.modalidade,
    case when p.modalidade = 'Permuta' then 'Permuta' else 'Pendente' end
  from public.alunos a join public.financeiro_perfis p on p.aluno_id = a.id where a.status = 'Ativo'
  on conflict (aluno_id, mes_referencia, ano_referencia) do nothing;
  get diagnostics total = row_count;
  return total;
end;
$$;

-- A data só é registrada em uma ação de recebimento; pagamentos antigos não são inferidos.
create or replace function public.financeiro_data_recebimento()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    if new.status_pagamento = 'Pago' then new.data_pagamento := coalesce(new.data_pagamento, timezone('America/Fortaleza', now())::date); end if;
  elsif new.status_pagamento is distinct from old.status_pagamento then
    new.data_pagamento := case when new.status_pagamento = 'Pago' then timezone('America/Fortaleza', now())::date else null end;
  else
    new.data_pagamento := old.data_pagamento;
  end if;
  return new;
end;
$$;
drop trigger if exists financeiro_data_recebimento on public.financeiro_alunos;
create trigger financeiro_data_recebimento before insert or update on public.financeiro_alunos
for each row execute function public.financeiro_data_recebimento();

-- Execução diária recupera a competência atual se a execução do dia 01 falhar.
-- 03:05 UTC corresponde a 00:05 em Fortaleza no Supabase.
do $$ begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.schedule('edukar-mensalidades', '5 3 * * *', 'select public.gerar_mensalidades();');
  else
    raise notice 'Ative pg_cron e reaplique esta migração para habilitar a geração sem a tela aberta.';
  end if;
end $$;
notify pgrst, 'reload schema';
commit;
