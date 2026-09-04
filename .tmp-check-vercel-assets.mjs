const base = 'https://academico-edukar.vercel.app';
const htmlResponse = await fetch(`${base}/`, { cache: 'no-store' });
const html = await htmlResponse.text();
const initialAssets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map((match) => match[1]);
const pending = [...initialAssets];
const checked = new Set();

while (pending.length > 0) {
  const assetPath = pending.shift();
  if (!assetPath || checked.has(assetPath)) continue;
  checked.add(assetPath);

  const response = await fetch(new URL(assetPath, base), { cache: 'no-store' });
  const contentType = response.headers.get('content-type') || '';
  const body = await response.text();
  const isHtml = /^\s*<!doctype html/i.test(body);
  console.log(`${assetPath} | ${response.status} | ${contentType} | html=${isHtml}`);

  if (assetPath.endsWith('.js') && response.ok && !isHtml) {
    for (const match of body.matchAll(/["']([^"']+\.js)["']/g)) {
      const dependency = match[1].startsWith('assets/')
        ? `/${match[1]}`
        : new URL(match[1], new URL(assetPath, base)).pathname;
      if (!checked.has(dependency)) pending.push(dependency);
    }
  }
}
