import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { onRequestPost as redeemPromo } from '../functions/api/free-plan.js';
import { onRequestPost as checkout } from '../functions/webhook/stripe/create-session.js';

// These requests use only in-memory dependencies: no emails or live payments.
const request = (path, body) => new Request(`https://functionalwebsites.com${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
const logs = [];
const originalLog = console.log;
console.log = (...args) => logs.push(args);
try {
  for (const code of ['wrong-code', 123, {}, null, '']) {
    const response = await redeemPromo({
      request: request('/api/free-plan', { email: 'test@example.com', code }),
      env: { FREE_PLAN: 'private-promo-secret' },
    });
    assert.equal(response.status, 400, `Invalid promo input: ${JSON.stringify(code)}`);
  }
} finally {
  console.log = originalLog;
}
assert.equal(JSON.stringify(logs).includes('private-promo-secret'), false);
assert.equal(JSON.stringify(logs).includes('wrong-code'), false);
console.log('PASS invalid promo inputs return 400 without logging codes');

const originalFetch = globalThis.fetch;
let stripeCalls = 0;
globalThis.fetch = async (url, options) => {
  stripeCalls++;
  assert.equal(url, 'https://api.stripe.com/v1/checkout/sessions');
  assert.equal(options.body.get('success_url'), 'https://functionalwebsites.com/pricing/?success=true');
  return Response.json({ id: 'mock-session', url: 'https://checkout.stripe.com/mock' });
};
try {
  for (const url of ['https://elsewhere.example/', 'javascript:alert(1)', '/pricing/', 'https://functionalwebsites.com.evil.example/']) {
    for (const field of ['successUrl', 'cancelUrl']) {
      const body = { successUrl: 'https://functionalwebsites.com/pricing/?success=true', cancelUrl: 'https://functionalwebsites.com/pricing/?canceled=true', [field]: url };
      const response = await checkout({ request: request('/webhook/stripe/create-session', body), env: { STRIPE_SECRET_KEY: 'mock-secret' } });
      assert.equal(response.status, 400);
    }
  }
  assert.equal(stripeCalls, 0, 'Invalid return URLs must not reach Stripe');
  const response = await checkout({
    request: request('/webhook/stripe/create-session', { successUrl: 'https://functionalwebsites.com/pricing/?success=true', cancelUrl: 'https://functionalwebsites.com/pricing/?canceled=true' }),
    env: { STRIPE_SECRET_KEY: 'mock-secret' },
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).checkoutUrl, 'https://checkout.stripe.com/mock');
  assert.equal(stripeCalls, 1);
} finally {
  globalThis.fetch = originalFetch;
}
console.log('PASS checkout rejects foreign return URLs and accepts same-origin URLs');

const handlers = {};
const deleted = [];
const worker = await readFile(new URL('../build/offline-sw.js', import.meta.url), 'utf8');
const currentCache = worker.match(/const FW_BUILDER_CACHE = '([^']+)'/)[1];
vm.runInNewContext(worker, {
  URL,
  self: { location: { href: 'https://build.functionalwebsites.com/sw.js', origin: 'https://build.functionalwebsites.com' }, addEventListener: (name, handler) => { handlers[name] = handler; }, clients: { claim: async () => {} } },
  caches: { keys: async () => ['unrelated-app-cache', 'fw-builder-offline-old', currentCache], delete: async key => { deleted.push(key); } },
});
let activation;
handlers.activate({ waitUntil: promise => { activation = promise; } });
await activation;
assert.deepEqual(deleted, ['fw-builder-offline-old']);
console.log('PASS builder updates preserve unrelated caches and the active cache');
