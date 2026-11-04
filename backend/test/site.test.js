// Publicação em um serviço só: a API entrega o site compilado e o React Router (index.html).
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, before, test } from 'node:test';
import { criarApp } from '../src/app.js';
import { config as base } from '../src/config.js';
import { criarRepoMemoria } from '../src/repos/memoria.js';

let srv; let url;
before(() => {
  const dir = mkdtempSync(join(tmpdir(), 'site-'));
  mkdirSync(join(dir, 'assets'));
  writeFileSync(join(dir, 'index.html'), '<!doctype html><title>Studio Aurora</title><div id="root"></div>');
  writeFileSync(join(dir, 'assets', 'app-abc123.js'), 'console.log(1)');
  writeFileSync(join(dir, 'sw.js'), '// sw');
  const config = { ...base, jwtSecret: 'segredo-de-teste-bem-longo-123', siteDir: dir };
  srv = criarApp(criarRepoMemoria(), config).listen(0);
  url = `http://localhost:${srv.address().port}`;
});
after(() => srv.close());

test('a raiz e as rotas do React devolvem o index.html', async () => {
  for (const caminho of ['/', '/admin/agenda', '/agendar/identificar?servico=1']) {
    const r = await fetch(url + caminho);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /Studio Aurora/);
  }
});

test('arquivos com hash têm cache longo e sw.js nunca fica em cache', async () => {
  const a = await fetch(`${url}/assets/app-abc123.js`);
  assert.match(a.headers.get('cache-control'), /immutable/);
  const sw = await fetch(`${url}/sw.js`);
  assert.equal(sw.headers.get('cache-control'), 'no-cache');
});

test('a API continua respondendo e rota /api desconhecida dá 404 em JSON', async () => {
  assert.deepEqual(await (await fetch(`${url}/api/saude`)).json(), { ok: true });
  const r = await fetch(`${url}/api/nao-existe`);
  assert.equal(r.status, 404);
  assert.equal((await r.json()).erro, 'Rota não encontrada.');
});

test('a política de segurança não força https (rede local)', async () => {
  const r = await fetch(url + '/');
  assert.ok(!(r.headers.get('content-security-policy') || '').includes('upgrade-insecure-requests'));
});
