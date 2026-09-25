begin;
-- Substitui somente a lista fixa de categorias; preserva os gastos existentes.
alter table public.gastos drop constraint if exists gastos_categoria_check;
alter table public.gastos add constraint gastos_categoria_check
  check (length(btrim(categoria)) between 1 and 200);
notify pgrst, 'reload schema';
commit;
