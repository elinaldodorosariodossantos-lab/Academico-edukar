begin;
alter table public.gastos add column if not exists observacoes text not null default '';
notify pgrst, 'reload schema';
commit;
