-- Auditoria somente leitura; executar no SQL Editor para verificar o banco real.
-- Não remove tabelas, campos, registros, políticas ou funções.
begin transaction read only;

do $$
declare tabela text; total bigint;
begin
  foreach tabela in array array['financeiro_perfis', 'financeiro_cursos', 'financeiro_alunos', 'gastos'] loop
    if to_regclass(format('public.%I', tabela)) is not null then
      execute format('select count(*) from public.%I', tabela) into total;
      raise notice '%: % registros', tabela, total;
    else
      raise notice '%: tabela ausente', tabela;
    end if;
  end loop;
end;
$$;

select table_name, column_name, data_type, column_default, is_nullable
from information_schema.columns
where table_schema = 'public' and table_name in
  ('alunos', 'financeiro_perfis', 'financeiro_cursos', 'financeiro_alunos', 'gastos')
order by table_name, ordinal_position;

select conname, conrelid::regclass as origem, confrelid::regclass as destino,
  pg_get_constraintdef(oid) as definicao
from pg_constraint
where contype = 'f' and (conrelid in (
  select oid from pg_class where relnamespace = 'public'::regnamespace
    and relname in ('financeiro_perfis', 'financeiro_cursos', 'financeiro_alunos', 'gastos'))
  or confrelid in (select oid from pg_class where relnamespace = 'public'::regnamespace
    and relname in ('financeiro_perfis', 'financeiro_cursos', 'financeiro_alunos', 'gastos')));

select c.relname as tabela, t.tgname, pg_get_triggerdef(t.oid) as definicao
from pg_trigger t join pg_class c on c.oid = t.tgrelid
where not t.tgisinternal and c.relnamespace = 'public'::regnamespace
  and c.relname in ('alunos', 'financeiro_perfis', 'financeiro_cursos', 'financeiro_alunos', 'gastos');

select n.nspname, p.proname, pg_get_functiondef(p.oid) as definicao
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.prokind = 'f'
  and (p.prosrc ilike '%financeiro_%' or p.proname ilike '%mensalidade%');

select schemaname, viewname, definition from pg_views
where definition ilike '%financeiro_perfis%' or definition ilike '%financeiro_cursos%';
select schemaname, matviewname, definition from pg_matviews
where definition ilike '%financeiro_perfis%' or definition ilike '%financeiro_cursos%';
select schemaname, tablename, policyname, cmd, qual, with_check from pg_policies
where schemaname = 'public' and tablename in
  ('alunos', 'financeiro_perfis', 'financeiro_cursos', 'financeiro_alunos', 'gastos');

-- Dependências registradas no catálogo, além das referências textuais acima.
select pg_describe_object(d.classid, d.objid, d.objsubid) as objeto,
  pg_describe_object(d.refclassid, d.refobjid, d.refobjsubid) as depende_de, d.deptype
from pg_depend d where d.refclassid = 'pg_class'::regclass
  and d.refobjid in (select oid from pg_class where relnamespace = 'public'::regnamespace
    and relname in ('financeiro_perfis', 'financeiro_cursos'));

commit;
