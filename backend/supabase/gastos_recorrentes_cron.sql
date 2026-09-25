  -- Execute após gastos.sql. O agendamento funciona mesmo com o sistema fechado.
  create extension if not exists pg_cron;
  select cron.schedule(
    'edukar-gastos-recorrentes',
    '*/10 * * * *',
    $$select public.processar_gastos_recorrentes();$$
  );
  select public.processar_gastos_recorrentes();
