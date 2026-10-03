begin;
alter table public.alunos add column if not exists mensalidade_permuta boolean not null default false;

-- Alterações manuais na competência atual atualizam a condição do cadastro.
-- Edições de competências antigas não alteram o cadastro nem outras parcelas.
create or replace function public.financeiro_sincronizar_permuta()
returns trigger language plpgsql security invoker set search_path = public as $$
declare atual date := date_trunc('month', timezone('America/Fortaleza', now()))::date;
begin
  if new.mes_referencia = extract(month from atual) and new.ano_referencia = extract(year from atual) then
    if new.status_pagamento = 'Permuta' then
      new.valor_mensalidade := 0;
      update public.alunos set mensalidade = 0, mensalidade_permuta = true where id = new.aluno_id
        and (mensalidade is distinct from 0 or mensalidade_permuta is distinct from true);
    else
      update public.alunos set mensalidade_permuta = false where id = new.aluno_id and mensalidade_permuta;
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists financeiro_sincronizar_permuta on public.financeiro_alunos;
create trigger financeiro_sincronizar_permuta before insert or update on public.financeiro_alunos
for each row execute function public.financeiro_sincronizar_permuta();

create or replace function public.gerar_mensalidades()
returns integer language plpgsql security invoker set search_path = public as $$
declare competencia date := date_trunc('month', timezone('America/Fortaleza', now()))::date; total integer;
begin
  insert into public.financeiro_alunos (aluno_id, aluno_nome, curso, turma, valor_mensalidade,
    mes_referencia, ano_referencia, boleto_emitido, modalidade, status_pagamento)
  select a.id, a.nome, coalesce(a.turma, 'Sem curso'), coalesce(a.turma, 'Sem turma'),
    case when a.mensalidade_permuta then 0 else a.mensalidade end,
    extract(month from competencia)::integer, extract(year from competencia)::integer, 'Não',
    case when a.mensalidade_permuta then 'Permuta' else 'Boleto' end,
    case when a.mensalidade_permuta then 'Permuta' else 'Pendente' end
  from public.alunos a where a.status = 'Ativo' and a.mensalidade is not null
  on conflict (aluno_id, mes_referencia, ano_referencia) do nothing;
  get diagnostics total = row_count;
  return total;
end;
$$;
notify pgrst, 'reload schema';
commit;
