import test from 'node:test';
import assert from 'node:assert/strict';
import { testingConfig } from './testing-config.mjs';
const key = 'sb_publishable_chave-ficticia';
const jwt = (payload) => `header.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.signature`;

test('não usa as credenciais atuais quando a configuração de teste está vazia', () => {
  assert.throws(() => testingConfig({}, ['https://atual.supabase.co']), /Preencha/);
});
test('bloqueia o mesmo projeto mesmo com barra final e chave diferente', () => {
  assert.throws(() => testingConfig({ SUPABASE_TEST_URL: 'https://atual.supabase.co/', SUPABASE_TEST_PUBLIC_KEY: key }, ['https://atual.supabase.co']), /mesmo/);
});
test('permite projeto separado e chave pública', () => {
  assert.equal(testingConfig({ SUPABASE_TEST_URL: 'https://teste.supabase.co/', SUPABASE_TEST_PUBLIC_KEY: key }, ['https://atual.supabase.co']).url, 'https://teste.supabase.co');
});
test('rejeita chaves administrativas e anon de outro projeto', () => {
  for (const value of ['sb_secret_nao-permitida', jwt({ role: 'service_role', ref: 'teste' }), jwt({ role: 'anon', ref: 'atual' })]) {
    assert.throws(() => testingConfig({ SUPABASE_TEST_URL: 'https://teste.supabase.co', SUPABASE_TEST_PUBLIC_KEY: value }), /chave pública/);
  }
  assert.ok(testingConfig({ SUPABASE_TEST_URL: 'https://teste.supabase.co', SUPABASE_TEST_PUBLIC_KEY: jwt({ role: 'anon', ref: 'teste' }) }));
});
test('rejeita endereços HTTP, URLs com credenciais e domínios externos', () => {
  for (const url of ['http://teste.supabase.co', 'https://teste.supabase.co.example.com', 'https://usuario:senha@teste.supabase.co']) {
    assert.throws(() => testingConfig({ SUPABASE_TEST_URL: url, SUPABASE_TEST_PUBLIC_KEY: key }), /URL HTTPS/);
  }
});
