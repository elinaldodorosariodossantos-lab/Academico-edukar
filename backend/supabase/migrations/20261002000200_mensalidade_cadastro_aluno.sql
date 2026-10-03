begin;
do $$ begin
if not exists (select 1 from information_schema.columns where table_schema = 'public' and table_name = 'alunos' and column_name = 'mensalidade') then
alter table public.alunos add column mensalidade numeric(12,2) check (mensalidade >= 0);
-- Migra apenas valores individuais conhecidos. Não consulta valores de cursos.
-- NULL significa mensalidade ainda não cadastrada; zero é um valor válido.
update public.alunos a set mensalidade = coalesce(p.valor_mensalidade, h.valor_mensalidade)
from public.alunos origem
left join public.financeiro_perfis p on p.aluno_id = origem.id
left join lateral (select valor_mensalidade from public.financeiro_alunos
  where aluno_id = origem.id order by ano_referencia desc, mes_referencia desc limit 1) h on true
where a.id = origem.id and a.mensalidade is null
  and coalesce(p.valor_mensalidade, h.valor_mensalidade) is not null;
end if;
end $$;

-- Tabelas legadas ficam intactas, mas não recebem novos cadastros automáticos.
drop trigger if exists financeiro_novo_aluno on public.alunos;
drop trigger if exists financeiro_inicializar_perfil on public.financeiro_perfis;
drop function if exists public.financeiro_novo_aluno();
drop function if exists public.financeiro_inicializar_perfil();

create or replace function public.gerar_mensalidades()
returns integer language plpgsql security invoker set search_path = public as $$
declare competencia date := date_trunc('month', timezone('America/Fortaleza', now()))::date; total integer;
begin
  insert into public.financeiro_alunos (aluno_id, aluno_nome, curso, turma, valor_mensalidade,
    mes_referencia, ano_referencia, boleto_emitido, modalidade, status_pagamento)
  select a.id, a.nome, coalesce(a.turma, 'Sem curso'), coalesce(a.turma, 'Sem turma'), a.mensalidade,
    extract(month from competencia)::integer, extract(year from competencia)::integer, 'Não', 'Boleto', 'Pendente'
  from public.alunos a where a.status = 'Ativo' and a.mensalidade is not null
  on conflict (aluno_id, mes_referencia, ano_referencia) do nothing;
  get diagnostics total = row_count;
  return total;
end;
$$;
-- O campo legado boleto_emitido/modalidade é mantido por compatibilidade do schema.
-- Não representa emissão de boleto e não é usado para determinar o valor.
notify pgrst, 'reload schema';
commit;
