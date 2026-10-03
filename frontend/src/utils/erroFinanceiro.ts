export function mensagemErroFinanceiro(error: unknown): string {
  if (typeof error === 'string' && error.trim()) return error;
  if (error && typeof error === 'object') {
    const { message, code } = error as { message?: unknown; code?: unknown };
    if (code === 'PGRST202' || (typeof message === 'string' && /gerar_mensalidades.*(schema cache|does not exist)|Could not find.*gerar_mensalidades/i.test(message))) {
      return 'A rotina de mensalidades ainda não está disponível no banco. Aplique as migrações do Financeiro no Supabase e atualize a página.';
    }
    if (typeof message === 'string' && message.trim()) return message;
  }
  return 'Não foi possível concluir a operação financeira. Tente novamente.';
}
