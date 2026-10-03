-- Executar após a migração em banco de teste. Tudo é revertido ao final.
begin;
do $$
declare normal uuid; permuta uuid; mes integer := extract(month from timezone('America/Fortaleza', now()));
  ano integer := extract(year from timezone('America/Fortaleza', now())); antes jsonb; depois jsonb;
begin
  insert into public.alunos (nome, status) values ('TESTE mensalidade normal', 'Ativo') returning id into normal;
  insert into public.alunos (nome, status) values ('TESTE mensalidade permuta', 'Ativo') returning id into permuta;
  update public.financeiro_perfis set valor_mensalidade = 200 where aluno_id = normal;
  update public.financeiro_perfis set valor_mensalidade = 150, modalidade = 'Permuta' where aluno_id = permuta;
  perform public.gerar_mensalidades();
  if not exists (select 1 from public.financeiro_alunos where aluno_id = normal and mes_referencia = mes
    and ano_referencia = ano and valor_mensalidade = 200 and status_pagamento = 'Pendente') then
    raise exception 'Falha: geração normal';
  end if;
  if not exists (select 1 from public.financeiro_alunos where aluno_id = permuta and mes_referencia = mes
    and ano_referencia = ano and valor_mensalidade = 150 and status_pagamento = 'Permuta' and modalidade = 'Permuta') then
    raise exception 'Falha: proteção da permuta';
  end if;
  update public.financeiro_alunos set status_pagamento = 'Pago' where aluno_id = normal;
  if not exists (select 1 from public.financeiro_alunos where aluno_id = normal and data_pagamento is not null) then
    raise exception 'Falha: data do recebimento';
  end if;
  select jsonb_agg(to_jsonb(f) order by f.id) into antes from public.financeiro_alunos f where aluno_id in (normal, permuta);
  update public.financeiro_perfis set valor_mensalidade = 120, modalidade = 'Boleto' where aluno_id = permuta;
  perform public.gerar_mensalidades();
  perform public.gerar_mensalidades();
  select jsonb_agg(to_jsonb(f) order by f.id) into depois from public.financeiro_alunos f where aluno_id in (normal, permuta);
  if antes is distinct from depois then raise exception 'Falha: histórico alterado ou parcelas duplicadas'; end if;
  if (select valor_mensalidade from public.financeiro_perfis where aluno_id = normal) <> 200 then
    raise exception 'Falha: alteração atingiu outro aluno';
  end if;
end $$;
rollback;
