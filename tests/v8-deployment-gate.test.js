import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// These are readiness gates, not substitutes for integration or safety testing.
// They deliberately fail while the branch still contains the legacy V0.4.5 server.
const read = (p) => fs.readFileSync(path.resolve(p), 'utf8');

test('V8 server uses durable PostgreSQL, not volatile in-memory sessions', () => {
  const server = read('server.js');
  assert.match(server, /from ['"]pg['"]/);
  assert.match(server, /DATABASE_URL/);
  assert.doesNotMatch(server, /const sessions\s*=\s*new Map\(/);
});

test('V8 server enforces per-account ownership and authentication', () => {
  const server = read('server.js');
  assert.match(server, /owner_id/);
  assert.match(server, /auth_sessions/);
  assert.match(server, /recovery_hash/);
  assert.match(server, /web_search_consent/);
});

test('V8 browser interface is separate from legacy root files', () => {
  for (const file of ['public/index.html', 'public/app.js', 'public/style.css'])
    assert.ok(fs.statSync(file).isFile(), file);
});

test('V8 real-world experience guard is integrated in server', () => {
  const server = read('server.js');
  assert.match(server, /governTurn\(/);
  assert.match(server, /governMessage\(/);
  assert.match(server, /experiment_event/);
});

test('V8 engine never defaults to an unverified model identifier', () => {
  const engine = read('engine.js');
  assert.doesNotMatch(engine, /gpt-6-sol/);
});

test('V8 public interface does not render chat text as HTML', () => {
  const app = read('public/app.js');
  assert.match(app, /textContent/);
  assert.doesNotMatch(app, /innerHTML/);
});
