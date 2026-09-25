export function testingConfig(config, currentUrls = []) {
  const url = (config.SUPABASE_TEST_URL || '').trim().replace(/\/+$/, '');
  const key = (config.SUPABASE_TEST_PUBLIC_KEY || '').trim();
  if (!url || !key) {
    throw new Error('Preencha SUPABASE_TEST_URL e SUPABASE_TEST_PUBLIC_KEY em frontend/.env.testing.local com os dados de um projeto separado para testes.');
  }
  let parsed;
  try { parsed = new URL(url); } catch { throw new Error('A URL do projeto de testes é inválida.'); }
  if (parsed.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname) || parsed.username || parsed.password || parsed.port || parsed.search || parsed.hash || parsed.pathname !== '/') {
    throw new Error('Use a URL HTTPS padrão do projeto de testes, no formato https://REFERENCIA.supabase.co.');
  }
  if (currentUrls.some((current) => {
    try { return new URL(current.trim()).hostname === parsed.hostname; } catch { return false; }
  })) {
    throw new Error('O projeto informado é o mesmo do ambiente atual. Use um projeto Supabase diferente para proteger os dados existentes.');
  }
  if (!key.startsWith('sb_publishable_')) {
    let payload;
    try { payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()); } catch { /* validado abaixo */ }
    if (payload?.role !== 'anon' || (payload.ref && `${payload.ref}.supabase.co` !== parsed.hostname)) {
      throw new Error('Informe somente a chave pública anon ou publishable do projeto de testes. Chaves secretas/service_role não são aceitas.');
    }
  }
  return { url, key };
}
