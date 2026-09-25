import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, delimiter } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const frontend = join(root, 'frontend');
const cli = join(root, 'node_modules', 'supabase', 'dist', 'supabase.js');
const cliEnv = { ...process.env, SUPABASE_TELEMETRY_DISABLED: '1' };
if (process.platform === 'win32') {
  const paths = [
    join(process.env.ProgramFiles || 'C:/Program Files', 'Docker', 'Docker', 'resources', 'bin'),
    join(process.env.LOCALAPPDATA || '', 'Programs', 'DockerDesktop', 'resources', 'bin'),
  ].filter((path) => existsSync(join(path, 'docker.exe')));
  cliEnv.PATH = [...paths, process.env.PATH || ''].join(delimiter);
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: root, env: cliEnv, windowsHide: true, ...options });
    let output = '';
    let errorOutput = '';
    child.stdout?.on('data', (chunk) => { output += chunk; });
    child.stderr?.on('data', (chunk) => { errorOutput += chunk; });
    child.on('error', reject);
    child.on('close', (code) => code === 0 ? resolve(output) : reject(new Error(`O comando ${args[0]} falhou (código ${code}). ${errorOutput.replace(/(sb_secret_|eyJ)[\w.-]+/g, '[chave omitida]')}`)));
  });
}
const supabase = (...args) => run(process.execPath, [cli, ...args, '--workdir', join(root, 'backend')]);

try {
  if (!existsSync(cli)) throw new Error('Execute npm install na raiz do projeto para instalar a CLI do Supabase.');
  if (!existsSync(join(frontend, 'node_modules', 'vite'))) throw new Error('Execute npm run install:frontend para instalar o frontend.');
  try { await run('docker', ['info', '--format', '{{.ServerVersion}}']); }
  catch { throw new Error('Docker não está disponível. Instale o Docker Desktop com WSL 2, abra o Docker Desktop e aguarde ficar pronto. Depois execute npm run dev:local novamente. Veja LOCAL.md.'); }

  console.log('Iniciando o Supabase local. Na primeira execução, o download das imagens pode demorar.');
  const timer = setInterval(() => console.log('Aguardando o Supabase local iniciar...'), 20000);
  try { await supabase('start'); } finally { clearInterval(timer); }
  console.log('Aplicando as migrações pendentes somente no banco local...');
  await supabase('migration', 'up', '--local');
  const status = JSON.parse(await supabase('status', '-o', 'json'));
  const url = status.API_URL || status.api?.url;
  const publicKey = status.PUBLISHABLE_KEY || status.ANON_KEY || status.auth?.publishable_key || status.auth?.anon_key;
  if (!url || !/^http:\/\/(127\.0\.0\.1|localhost):\d+\/?$/.test(url) || !publicKey) {
    throw new Error('A CLI não retornou o endereço e a chave pública do Supabase local. Confira o Docker e tente novamente.');
  }
  // Apenas o processo local recebe estas variáveis; o .env da nuvem não é alterado.
  process.env.VITE_SUPABASE_URL = url;
  process.env.VITE_SUPABASE_ANON_KEY = publicKey;
  const requireFrontend = createRequire(join(frontend, 'package.json'));
  const { createServer } = await import(pathToFileURL(requireFrontend.resolve('vite')).href);
  const server = await createServer({
    root: frontend,
    configFile: join(frontend, 'vite.config.ts'),
    cacheDir: join(frontend, 'node_modules', '.vite-local'),
    server: { host: '127.0.0.1', port: 5176, strictPort: true, open: false },
  });
  await server.listen();
  console.log('\nFrontend local: http://127.0.0.1:5176');
  console.log(`Backend local: ${url}`);
  console.log('Painel do banco: http://127.0.0.1:54323');
  console.log('Banco local independente, inicialmente vazio. Cadastre turmas e alunos para testar.');
  console.log('Ctrl+C encerra o frontend. Para parar o backend preservando os dados: npm run local:stop');
  const close = async () => { await server.close(); process.exit(0); };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
} catch (error) {
  console.error(`\nNão foi possível iniciar o ambiente local: ${error.message}`);
  process.exitCode = 1;
}
