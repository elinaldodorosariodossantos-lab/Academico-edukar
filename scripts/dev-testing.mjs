import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { parseEnv } from 'node:util';
import { testingConfig } from './testing-config.mjs';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const frontend = join(root, 'frontend');
async function readEnv(name) {
  try { return parseEnv((await readFile(join(frontend, name), 'utf8')).replace(/^\uFEFF/, '')); }
  catch (error) { if (error.code === 'ENOENT') return {}; throw error; }
}

try {
  const configs = await Promise.all(['.env', '.env.local', '.env.development', '.env.development.local'].map(readEnv));
  const { url, key } = testingConfig(await readEnv('.env.testing.local'), [
    ...configs.map((config) => config.VITE_SUPABASE_URL).filter(Boolean),
    process.env.VITE_SUPABASE_URL || '',
  ]);
  // O ambiente de testes nunca usa a URL/chave atuais como fallback.
  // As credenciais são passadas somente ao novo processo; nenhum .env é reescrito.
  process.env.VITE_SUPABASE_URL = url;
  process.env.VITE_SUPABASE_ANON_KEY = key;
  process.env.VITE_APP_NAME = 'Edukar XP — TESTES';
  const requireFrontend = createRequire(join(frontend, 'package.json'));
  const { createServer } = await import(pathToFileURL(requireFrontend.resolve('vite')).href);
  const server = await createServer({
    root: frontend,
    configFile: join(frontend, 'vite.config.ts'),
    mode: 'testing',
    cacheDir: join(frontend, 'node_modules', '.vite-testing'),
    server: { host: '127.0.0.1', port: 5177, strictPort: true, open: false },
  });
  await server.listen();
  console.log('\nEdukar XP — TESTES: http://127.0.0.1:5177');
  console.log(`Banco exclusivo de testes: ${url}`);
  console.log('Use Ctrl+C para encerrar este ambiente.');
  const close = async () => { await server.close(); process.exit(0); };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
} catch (error) {
  console.error(`Não foi possível iniciar o ambiente de testes: ${error.message}`);
  process.exitCode = 1;
}
