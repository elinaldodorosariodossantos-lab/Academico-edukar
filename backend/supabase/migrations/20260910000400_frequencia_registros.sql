-- Aplicar uma vez no SQL Editor do projeto Supabase, antes de usar a nova tela.
-- Não apaga nem transforma registros existentes. Mantém a tabela dos relatórios.
begin;

create or replace function public.frequencia_nome_turma(p_turma text)
returns text language sql stable security invoker set search_path = public
as $$
  select coalesce((select nome from public.turmas where id::text = p_turma limit 1), p_turma);
$$;

create or replace function public.criar_registro_frequencia(p_turma text, p_data text, p_alunos jsonb)
returns setof public.frequencias language plpgsql security invoker set search_path = public
as $$
declare v_turma text := public.frequencia_nome_turma(p_turma);
begin
  if coalesce(btrim(v_turma), '') = '' or coalesce(p_data, '') !~ '^\d{4}-\d{2}-\d{2}$' then
    raise exception 'Informe uma turma e uma data válidas.';
  end if;
  perform p_data::date;
  if jsonb_typeof(p_alunos) is distinct from 'array' then raise exception 'Informe a lista de alunos.'; end if;
  if jsonb_array_length(p_alunos) = 0 then raise exception 'Não há alunos vinculados a esta turma.'; end if;
  if exists (select 1 from jsonb_array_elements(p_alunos) a
    where coalesce(btrim(a->>'aluno'), '') = '' or coalesce(a->>'presenca', '') not in ('Presente', 'Falta')) then
    raise exception 'Informe o aluno e seu status de presença.';
  end if;
  -- Serializa gravações, inclusive chamadas simultâneas, antes de consultar duplicidade.
  lock table public.frequencias in share row exclusive mode;
  if exists (select 1 from public.frequencias f where public.frequencia_nome_turma(f.turma) = v_turma and f.data = p_data) then
    raise exception using errcode = '23505', message = 'Já existe um registro de frequência para esta turma nesta data. Não é permitido criar registros duplicados.';
  end if;
  return query insert into public.frequencias (turma, data, aluno, presenca, conteudo_ministrado, observacoes, professor_responsavel)
    select v_turma, p_data, a->>'aluno', a->>'presenca', coalesce(a->>'conteudo_ministrado', ''),
      coalesce(a->>'observacoes', ''), coalesce(a->>'professor_responsavel', '')
    from jsonb_array_elements(p_alunos) a returning *;
end;
$$;

-- Confere o conjunto inteiro e a versão lida pela tela para não editar/excluir
-- uma chamada parcial, removida ou alterada por outro usuário.
create or replace function public.validar_registro_frequencia(p_registros jsonb)
returns void language plpgsql security invoker set search_path = public
as $$
declare v_total integer; v_turma text; v_data text;
begin
  if jsonb_typeof(p_registros) is distinct from 'array' then raise exception 'Informe a frequência.'; end if;
  v_total := jsonb_array_length(p_registros);
  if v_total = 0 then raise exception 'Informe a frequência.'; end if;
  v_turma := public.frequencia_nome_turma(p_registros->0->>'turma');
  v_data := p_registros->0->>'data';
  if (select count(distinct r->>'id') from jsonb_array_elements(p_registros) r) <> v_total
    or exists (select 1 from jsonb_array_elements(p_registros) r
      where public.frequencia_nome_turma(r->>'turma') is distinct from v_turma or r->>'data' is distinct from v_data)
    or (select count(*) from public.frequencias f where public.frequencia_nome_turma(f.turma) = v_turma and f.data = v_data) <> v_total
    or (select count(*) from public.frequencias f join jsonb_array_elements(p_registros) r on f.id = (r->>'id')::uuid
      where f.data = r->>'data' and f.turma = r->>'turma'
      and f.updated_at is not distinct from (r->>'updated_at')::timestamptz) <> v_total then
    raise exception 'Esta frequência foi alterada ou removida. Atualize o histórico e tente novamente.';
  end if;
end;
$$;

create or replace function public.editar_registro_frequencia(p_data text, p_registros jsonb)
returns setof public.frequencias language plpgsql security invoker set search_path = public
as $$
declare v_turma text;
begin
  if coalesce(p_data, '') !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Informe uma data válida.'; end if;
  perform p_data::date;
  lock table public.frequencias in share row exclusive mode;
  perform public.validar_registro_frequencia(p_registros);
  v_turma := public.frequencia_nome_turma(p_registros->0->>'turma');
  if exists (select 1 from jsonb_array_elements(p_registros) r where coalesce(r->>'presenca', '') not in ('Presente', 'Falta')) then
    raise exception 'Informe o status de presença de todos os alunos.';
  end if;
  if exists (select 1 from public.frequencias f
    where public.frequencia_nome_turma(f.turma) = v_turma and f.data = p_data
    and not exists (select 1 from jsonb_array_elements(p_registros) r where (r->>'id')::uuid = f.id)) then
    raise exception using errcode = '23505', message = 'Já existe um registro de frequência para esta turma nesta data. Não é permitido criar registros duplicados.';
  end if;
  return query update public.frequencias f set data = p_data, presenca = r->>'presenca', updated_at = clock_timestamp()
    from jsonb_array_elements(p_registros) r where f.id = (r->>'id')::uuid returning f.*;
end;
$$;

create or replace function public.excluir_registro_frequencia(p_registros jsonb)
returns setof public.frequencias language plpgsql security invoker set search_path = public
as $$
begin
  lock table public.frequencias in share row exclusive mode;
  perform public.validar_registro_frequencia(p_registros);
  return query delete from public.frequencias f using jsonb_array_elements(p_registros) r
    where f.id = (r->>'id')::uuid returning f.*;
end;
$$;

-- As funções respeitam os privilégios e as políticas RLS existentes (security invoker).
notify pgrst, 'reload schema';
commit;
