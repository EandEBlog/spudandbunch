// rebuild-hook — turns Strapi "publish" webhooks into static-site rebuilds.
//
// On a webhook (or manual trigger), it debounces and serializes builds, runs
// `astro build && pagefind` for apps/web, and — only on success — replaces the
// served directory's contents. A failed build (e.g. Strapi briefly down) leaves
// the previously published site untouched, so we never publish an empty site.
//
// Dependency-free (Node stdlib only).
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readdir, rm, cp } from 'node:fs/promises';
import { join } from 'node:path';

const PORT = Number(process.env.PORT || 8080);
const SECRET = process.env.WEBHOOK_SECRET || '';
const REPO = process.env.REPO_DIR || '/app';
const DIST_SRC = join(REPO, 'apps/web/dist');
const SITE_DIR = process.env.SITE_DIR || '/srv';
const DEBOUNCE_MS = Number(process.env.DEBOUNCE_MS || 4000);

let building = false;
let pending = false;
let timer = null;
let lastBuild = null;
let lastError = null;

const log = (...a) => console.log('[rebuild]', ...a);

function schedule(reason) {
  log('scheduled:', reason);
  if (timer) clearTimeout(timer);
  timer = setTimeout(run, DEBOUNCE_MS);
}

async function run() {
  if (building) {
    pending = true; // a build is in flight; coalesce into one more after it
    return;
  }
  building = true;
  try {
    await build();
    await publish();
    lastBuild = new Date().toISOString();
    lastError = null;
    log('published', lastBuild);
  } catch (err) {
    lastError = err.message;
    log('FAILED:', err.message, '— keeping the previously published site');
  } finally {
    building = false;
    if (pending) {
      pending = false;
      schedule('coalesced');
    }
  }
}

function build() {
  return new Promise((resolve, reject) => {
    log('building…');
    const proc = spawn('npm', ['run', 'build', '-w', 'apps/web'], {
      cwd: REPO,
      stdio: 'inherit',
      env: process.env,
    });
    proc.on('error', reject);
    proc.on('exit', (code) =>
      code === 0 ? resolve() : reject(new Error(`build exited with code ${code}`)),
    );
  });
}

// Replace the served directory's contents with the fresh build output.
async function publish() {
  for (const entry of await readdir(SITE_DIR)) {
    await rm(join(SITE_DIR, entry), { recursive: true, force: true });
  }
  await cp(DIST_SRC, SITE_DIR, { recursive: true });
}

// Drain (and discard) a request body, capped to avoid abuse.
function drain(req) {
  return new Promise((resolve) => {
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > 1_000_000) req.destroy();
    });
    req.on('end', resolve);
    req.on('error', resolve);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, building, lastBuild, lastError }));
  }

  if (req.method === 'POST' && (req.url === '/webhook' || req.url === '/rebuild')) {
    await drain(req);
    if (SECRET && req.headers['x-webhook-secret'] !== SECRET) {
      res.writeHead(401);
      return res.end('unauthorized');
    }
    schedule(req.url === '/rebuild' ? 'manual' : 'webhook');
    res.writeHead(202);
    return res.end('build scheduled');
  }

  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, () => {
  log(`listening on ${PORT} | repo: ${REPO} | site: ${SITE_DIR}`);
  schedule('startup'); // build once on boot so the site exists
});
