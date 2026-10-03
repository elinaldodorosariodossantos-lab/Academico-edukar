begin;

-- O nome pode mudar; a identidade e o histórico de presença permanecem.
alter table public.frequencias add column if not exists aluno_id uuid
  references public.alunos(id) on delete set null;
create index if not exists frequencias_aluno_id_idx on public.frequencias(aluno_id);

-- Vincula somente nomes exatos e únicos dentro da turma. Não adivinha nomes antigos.
update public.frequencias f set aluno_id = a.id
from public.alunos a
where f.aluno_id is null and f.aluno = a.nome
  and (f.turma = a.turma or exists (select 1 from public.turmas t where t.id::text = f.turma and t.nome = a.turma))
  and (select count(*) from public.alunos outro where outro.nome = a.nome and outro.turma = a.turma) = 1;

create or replace function public.frequencia_vincular_aluno()
returns trigger language plpgsql security invoker set search_path = public as $$
declare v_ids uuid[]; v_nome text;
begin
  if new.aluno_id is null then
    select array_agg(a.id) into v_ids from public.alunos a
      where a.nome = new.aluno and (a.turma = new.turma or exists
        (select 1 from public.turmas t where t.id::text = new.turma and t.nome = a.turma));
    if cardinality(v_ids) = 1 then new.aluno_id := v_ids[1]; end if;
  end if;
  if new.aluno_id is not null then
    select nome into v_nome from public.alunos where id = new.aluno_id;
    if found then new.aluno := v_nome; end if;
  end if;
  return new;
end;
$$;
drop trigger if exists frequencia_vincular_aluno on public.frequencias;
create trigger frequencia_vincular_aluno before insert or update of aluno_id on public.frequencias
for each row execute function public.frequencia_vincular_aluno();

create or replace function public.aluno_sincronizar_nome()
returns trigger language plpgsql security invoker set search_path = public as $$
begin
  if new.nome is distinct from old.nome then
    -- Recupera também registros legados ainda identificados pelo nome anterior.
    update public.frequencias f set aluno_id = new.id, aluno = new.nome, updated_at = clock_timestamp()
      where f.aluno_id = new.id or (f.aluno_id is null and f.aluno = old.nome
        and (f.turma = old.turma or exists (select 1 from public.turmas t where t.id::text = f.turma and t.nome = old.turma))
        and not exists (select 1 from public.alunos a where a.id <> new.id and a.nome = old.nome and a.turma = old.turma));
    update public.financeiro_alunos set aluno_nome = new.nome where aluno_id = new.id;
  end if;
  return new;
end;
$$;
drop trigger if exists aluno_sincronizar_nome on public.alunos;
create trigger aluno_sincronizar_nome after update of nome on public.alunos
for each row execute function public.aluno_sincronizar_nome();

-- Correção confirmada pelo usuário: Miguel → João Miguel Pereira Ribeiro.
-- Só associa quando há exatamente um cadastro com esse nome na turma indicada.
do $$
declare v_id uuid; v_ids uuid[];
begin
  select array_agg(id) into v_ids from public.alunos
    where nome = 'João Miguel Pereira Ribeiro'
      and translate(lower(btrim(turma)), 'óôãáâíéêúç', 'ooaaaieeuc') = 'robotica kids noite';
  if cardinality(v_ids) = 1 then
    v_id := v_ids[1];
    update public.frequencias f set aluno_id = v_id, aluno = 'João Miguel Pereira Ribeiro', updated_at = clock_timestamp()
      where f.aluno_id is null and btrim(f.aluno) = 'Miguel'
        and (translate(lower(btrim(f.turma)), 'óôãáâíéêúç', 'ooaaaieeuc') = 'robotica kids noite'
          or exists (select 1 from public.turmas t where t.id::text = f.turma
            and translate(lower(btrim(t.nome)), 'óôãáâíéêúç', 'ooaaaieeuc') = 'robotica kids noite'));
  end if;
end;
$$;

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
  return query insert into public.frequencias (turma, data, aluno_id, aluno, presenca, conteudo_ministrado, observacoes, professor_responsavel)
    select v_turma, p_data, nullif(a->>'aluno_id', '')::uuid, a->>'aluno', a->>'presenca', coalesce(a->>'conteudo_ministrado', ''),
      coalesce(a->>'observacoes', ''), coalesce(a->>'professor_responsavel', '')
    from jsonb_array_elements(p_alunos) a returning *;
end;
$$;


notify pgrst, 'reload schema';
commit;
