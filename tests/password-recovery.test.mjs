import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

// Execute the actual TypeScript server modules with only framework/network boundaries stubbed.
function load(file, mocks = {}) {
  const filename = path.resolve(file);
  const source = readFileSync(filename, 'utf8');
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const loadedModule = { exports: {} };
  const localRequire = (id) => {
    if (id in mocks) return mocks[id];
    if (id === 'server-only') return {};
    if (id.startsWith('@/')) return load(`src/${id.slice(2)}.ts`, mocks);
    if (id.startsWith('.')) return load(path.resolve(path.dirname(filename), `${id}.ts`), mocks);
    return require(id);
  };
  vm.runInThisContext(`(function(require, module, exports) {${code}\n})`, { filename })(localRequire, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const form = (values) => {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
};
const idle = { status: 'idle' };

function setup(overrides = {}) {
  const calls = [];
  const auth = {
    resetPasswordForEmail: async (...args) => { calls.push(['send', ...args]); return { error: null }; },
    verifyOtp: async (...args) => { calls.push(['verify', ...args]); return { data: { user: { id: 'recovered-user' }, session: {} }, error: null }; },
    getUser: async () => ({ data: { user: { id: 'recovered-user' } }, error: null }),
    updateUser: async (...args) => { calls.push(['update', ...args]); return { error: null }; },
    signOut: async (...args) => { calls.push(['signOut', ...args]); return { error: null }; },
    ...overrides,
  };
  const mocks = {
    'next/navigation': { redirect: (url) => { throw new Error(`REDIRECT:${url}`); } },
    '@/lib/site-url': { getSiteUrl: () => 'https://example.com' },
    '@/lib/supabase/recovery': {
      createRecoveryClient: async () => ({ auth }),
      createRecoveryEmailClient: () => ({ auth }),
      clearRecoveryCookies: async () => { calls.push(['clear']); },
    },
  };
  return { auth, calls, mocks };
}

test('site origin validation rejects missing, insecure and non-origin production values', () => {
  const { resolveSiteUrl } = load('src/lib/site-url.ts');
  for (const value of [undefined, '', 'http://example.com', 'https://localhost:3000', 'https://127.0.0.1', 'https://example.com/elsewhere', 'https://user:pass@example.com', 'https://example.com?next=evil']) {
    assert.throws(() => resolveSiteUrl(value, 'production'));
  }
  assert.equal(resolveSiteUrl('https://example.com/', 'production'), 'https://example.com');
  assert.equal(resolveSiteUrl('http://localhost:3000', 'development'), 'http://localhost:3000');
});

test('invalid email is rejected without sending; valid email is normalized', async () => {
  const { calls, mocks } = setup();
  const { requestPasswordReset } = load('src/app/forgot-password/actions.ts', mocks);
  assert.equal((await requestPasswordReset(idle, form({ email: 'invalid' }))).status, 'error');
  assert.equal(calls.length, 0);
  const result = await requestPasswordReset(idle, form({ email: ' PERSON@EXAMPLE.COM ' }));
  assert.equal(result.status, 'success');
  assert.deepEqual(calls[0], ['send', 'person@example.com', { redirectTo: 'https://example.com/reset-password' }]);
});

test('nonexistent account has the same response as successful email request', async () => {
  const ok = setup();
  const absent = setup({ resetPasswordForEmail: async () => ({ error: { code: 'user_not_found', status: 404 } }) });
  const a = await load('src/app/forgot-password/actions.ts', ok.mocks).requestPasswordReset(idle, form({ email: 'person@example.com' }));
  const b = await load('src/app/forgot-password/actions.ts', absent.mocks).requestPasswordReset(idle, form({ email: 'person@example.com' }));
  assert.deepEqual(a, b);
});

test('mail rate limits and network exceptions return actionable errors', async () => {
  for (const send of [async () => ({ error: { code: 'over_email_send_rate_limit', status: 429 } }), async () => { throw new Error('network'); }]) {
    const { mocks } = setup({ resetPasswordForEmail: send });
    const result = await load('src/app/forgot-password/actions.ts', mocks).requestPasswordReset(idle, form({ email: 'person@example.com' }));
    assert.equal(result.status, 'error');
    assert.ok(result.message);
  }
});

test('missing site config fails without sending email', async () => {
  const { mocks, calls } = setup();
  mocks['@/lib/site-url'] = { getSiteUrl: () => { throw new Error('missing'); } };
  const result = await load('src/app/forgot-password/actions.ts', mocks).requestPasswordReset(idle, form({ email: 'person@example.com' }));
  assert.equal(result.status, 'error');
  assert.equal(calls.length, 0);
});

test('callback rejects missing/wrong token type without verification and clears recovery state', async () => {
  for (const query of ['', '?token_hash=test&type=signup', '?type=recovery']) {
    const { mocks, calls } = setup();
    const response = await load('src/app/auth/recovery/route.ts', mocks).GET(new Request(`https://example.com/auth/recovery${query}`));
    assert.equal(response.headers.get('location'), '/reset-password?error=invalid-link');
    assert.ok(!calls.some(([name]) => name === 'verify'));
    assert.ok(calls.some(([name]) => name === 'clear'));
  }
});

test('valid callback verifies recovery only and strips token and hostile next from redirect', async () => {
  const { mocks, calls } = setup();
  const response = await load('src/app/auth/recovery/route.ts', mocks).GET(new Request('https://example.com/auth/recovery?token_hash=test&type=recovery&next=https://evil.example'));
  assert.equal(response.headers.get('location'), '/reset-password');
  assert.deepEqual(calls.find(([name]) => name === 'verify'), ['verify', { token_hash: 'test', type: 'recovery' }]);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
});

test('expired token and network failures clear state and go to invalid-link page', async () => {
  for (const verify of [async () => ({ data: { user: null, session: null }, error: { code: 'otp_expired' } }), async () => { throw new Error('network'); }]) {
    const { mocks, calls } = setup({ verifyOtp: verify });
    const response = await load('src/app/auth/recovery/route.ts', mocks).GET(new Request('https://example.com/auth/recovery?token_hash=test&type=recovery'));
    assert.match(response.headers.get('location'), /error=invalid-link$/);
    assert.ok(calls.some(([name]) => name === 'clear'));
  }
});

test('password mismatch and invalid length never update account', async () => {
  for (const password of ['', 'short', 'x'.repeat(73)]) {
    const { mocks, calls } = setup();
    const result = await load('src/app/reset-password/actions.ts', mocks).resetPassword(idle, form({ expectedUserId: 'recovered-user', password, passwordConfirm: password }));
    assert.equal(result.status, 'error');
    assert.ok(!calls.some(([name]) => name === 'update'));
  }
  const { mocks, calls } = setup();
  const result = await load('src/app/reset-password/actions.ts', mocks).resetPassword(idle, form({ expectedUserId: 'recovered-user', password: 'new-password', passwordConfirm: 'different' }));
  assert.ok(result.errors.passwordConfirm);
  assert.equal(calls.length, 0);
});

test('missing recovery session rejects password update even if a regular session exists', async () => {
  const { mocks, calls } = setup({ getUser: async () => ({ data: { user: null }, error: null }) });
  mocks['@/lib/supabase/server'] = { createClient: async () => { throw new Error('must not use ordinary session'); } };
  const result = await load('src/app/reset-password/actions.ts', mocks).resetPassword(idle, form({ expectedUserId: 'recovered-user', password: 'new-password', passwordConfirm: 'new-password' }));
  assert.equal(result.status, 'error');
  assert.equal(result.expired, true);
  assert.ok(!calls.some(([name]) => name === 'update'));
});

test('successful reset updates only password, signs out locally and clears recovery cookies', async () => {
  const { mocks, calls } = setup();
  await assert.rejects(load('src/app/reset-password/actions.ts', mocks).resetPassword(idle, form({ expectedUserId: 'recovered-user', password: 'new-password', passwordConfirm: 'new-password', id: 'attacker' })), /REDIRECT:\/reset-password\?status=success/);
  assert.deepEqual(calls, [['update', { password: 'new-password' }], ['signOut', { scope: 'local' }], ['clear']]);
});

test('update errors keep recovery session available for retry and do not report success', async () => {
  for (const update of [async () => ({ error: { code: 'weak_password' } }), async () => { throw new Error('network'); }]) {
    const { mocks, calls } = setup({ updateUser: update });
    const result = await load('src/app/reset-password/actions.ts', mocks).resetPassword(idle, form({ expectedUserId: 'recovered-user', password: 'new-password', passwordConfirm: 'new-password' }));
    assert.equal(result.status, 'error');
    assert.ok(!calls.some(([name]) => name === 'clear'));
  }
});

test('successful password change still clears cookies when remote signout fails', async () => {
  const { mocks, calls } = setup({ signOut: async () => { throw new Error('network'); } });
  await assert.rejects(load('src/app/reset-password/actions.ts', mocks).resetPassword(idle, form({ expectedUserId: 'recovered-user', password: 'new-password', passwordConfirm: 'new-password' })), /REDIRECT:\/reset-password\?status=success/);
  assert.ok(calls.some(([name]) => name === 'clear'));
});

test('recovery client reads only isolated cookies, caps lifetime, preserves deletions', async () => {
  let options;
  const written = [];
  const store = {
    getAll: () => [{ name: 'sb-normal-auth-token', value: 'regular' }, { name: 'daehan-recovery-auth.0', value: 'recovery' }],
    set: (...args) => written.push(args),
  };
  const api = load('src/lib/supabase/recovery.ts', {
    'next/headers': { cookies: async () => store },
    '@supabase/ssr': { createServerClient: (_url, _key, opts) => { options = opts; return {}; } },
    './config': { getSupabaseConfig: () => ({ url: 'https://example.supabase.co', publishableKey: 'public' }) },
  });
  await api.createRecoveryClient();
  assert.equal(options.cookieOptions.name, 'daehan-recovery-auth');
  assert.deepEqual(options.cookies.getAll(), [{ name: 'daehan-recovery-auth.0', value: 'recovery' }]);
  options.cookies.setAll([{ name: 'daehan-recovery-auth', value: 'value', options: { maxAge: 34560000 } }, { name: 'daehan-recovery-auth.0', value: '', options: { maxAge: 0 } }]);
  assert.equal(written[0][2].maxAge, 900);
  assert.equal(written[0][2].httpOnly, true);
  assert.equal(written[1][2].maxAge, 0);
  written.length = 0;
  await api.clearRecoveryCookies();
  assert.deepEqual(written.map(([name]) => name), ['daehan-recovery-auth.0']);
});

test('changed recovery account in another tab cannot update a different displayed account', async () => {
  const { mocks, calls } = setup();
  const result = await load('src/app/reset-password/actions.ts', mocks).resetPassword(idle, form({
    expectedUserId: 'original-user', password: 'new-password', passwordConfirm: 'new-password',
  }));
  assert.equal(result.status, 'error');
  assert.ok(!calls.some(([name]) => name === 'update'));
});

test('real SSR SDK writes and clears isolated recovery cookies after TokenHash verification', async () => {
  const { createServerClient } = require('@supabase/ssr');
  const writes = [];
  const jar = new Map([['sb-existing-auth-token', 'existing-session']]);
  const fakeUser = { id: '00000000-0000-4000-8000-000000000001', aud: 'authenticated', email: 'fixture@example.com', app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z' };
  const expiry = Math.floor(Date.now() / 1000) + 3600;
  const token = [Buffer.from(JSON.stringify({ alg: 'HS256' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: fakeUser.id, exp: expiry })).toString('base64url'), 'test-signature'].join('.');
  const api = load('src/lib/supabase/recovery.ts', {
    'next/headers': { cookies: async () => ({
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      set: (name, value, options) => { writes.push({ name, options }); if (options.maxAge === 0) jar.delete(name); else jar.set(name, value); },
    }) },
    './config': { getSupabaseConfig: () => ({ url: 'https://fixture.supabase.co', publishableKey: 'fixture-public-key' }) },
    '@supabase/ssr': { createServerClient: (url, key, options) => createServerClient(url, key, {
      ...options,
      global: { fetch: async (input, init) => {
        const address = String(input);
        if (address.endsWith('/verify')) {
          assert.deepEqual(JSON.parse(init.body), { token_hash: 'fixture-token', type: 'recovery', gotrue_meta_security: {} });
          return new Response(JSON.stringify({ access_token: token, refresh_token: 'fixture-refresh', expires_in: 3600, token_type: 'bearer', user: fakeUser }), { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
        if (address.endsWith('/user')) return new Response(JSON.stringify(fakeUser), { status: 200 });
        throw new Error(`Unexpected mock auth request: ${address}`);
      } },
    }) },
  });
  const client = await api.createRecoveryClient();
  const result = await client.auth.verifyOtp({ token_hash: 'fixture-token', type: 'recovery' });
  assert.equal(result.error, null);
  assert.equal(result.data.user.id, fakeUser.id);
  assert.ok(writes.some(({ name, options }) => name.startsWith('daehan-recovery-auth') && options.maxAge === 900 && options.httpOnly));
  const restored = await api.createRecoveryClient({ readOnly: true });
  assert.equal((await restored.auth.getUser()).data.user.id, fakeUser.id);
  await api.clearRecoveryCookies();
  assert.deepEqual([...jar], [['sb-existing-auth-token', 'existing-session']]);
});
