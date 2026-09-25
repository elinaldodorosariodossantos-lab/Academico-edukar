begin;
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
  return query update public.frequencias f set data = p_data, presenca = r->>'presenca',
    conteudo_ministrado = case when r ? 'conteudo_ministrado' then r->>'conteudo_ministrado' else f.conteudo_ministrado end,
    observacoes = case when r ? 'observacoes' then r->>'observacoes' else f.observacoes end, updated_at = clock_timestamp()
    from jsonb_array_elements(p_registros) r where f.id = (r->>'id')::uuid returning f.*;
end;
$$;

notify pgrst, 'reload schema';
commit;
