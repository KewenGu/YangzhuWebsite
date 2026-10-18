import {test} from 'node:test';
import assert from 'node:assert/strict';
import {shopAI, COPY_LIMITS} from '../auth/shop-ai.mjs';
import {handle} from '../auth/worker.mjs';

let sequence = 0;
const source = {title: '净字吊坠', body: '净明派净字符吊坠，以传统净字纹样表达清静的文化寓意。'};
const png = {mime: 'image/png', base64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX4sAAAAASUVORK5CYII='};
const webp = {mime: 'image/webp', base64: 'UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA=='};
function scenario(overrides = {}) {
  const login = `editor-${++sequence}`;
  const draft = Object.fromEntries(Object.keys(COPY_LIMITS).map(key => [key, key === 'title_en' ? 'Jing Pendant' : 'Plain product information.']));
  const calls = [];
  const env = {CMS_ORIGIN: 'https://yangzhu.org', AUTH_ORIGIN: 'https://auth.example.test', ALLOWED_USERS: login, OPENAI_API_KEY: 'server-secret', AI: {run: async () => ({response: JSON.stringify(draft)})}, ...overrides};
  const fetcher = async (url, options) => {
    calls.push({url, options});
    if (url === 'https://api.github.com/user') return Response.json({login});
    if (url === 'https://api.github.com/repos/KewenGu/YangzhuWebsite') return Response.json({permissions: {push: true}});
    if (url === 'https://api.openai.com/v1/images/edits') return Response.json({data: [{b64_json: webp.base64}]});
    throw Error('Unexpected external URL');
  };
  const request = (action = 'copy', input = {product: source}, headers = {}) => new Request(`${env.AUTH_ORIGIN}/shop-ai/${action}`, {
    method: 'POST', headers: {Origin: env.CMS_ORIGIN, Authorization: 'Bearer github-session', 'Content-Type': 'application/json', ...headers}, body: JSON.stringify(input),
  });
  return {login, env, draft, calls, fetcher, request};
}

test('shop assistance checks origin, authorization, allowlist and repository push access', async () => {
  const s = scenario();
  assert.equal((await shopAI(s.request('copy', undefined, {Origin: 'https://evil.test'}), s.env, s.fetcher)).status, 403);
  assert.equal(s.calls.length, 0);
  assert.equal((await shopAI(s.request('copy', undefined, {Authorization: ''}), s.env, s.fetcher)).status, 401);
  assert.equal((await shopAI(s.request(), s.env, async () => Response.json({login: 'stranger'}))).status, 403);
  assert.equal((await shopAI(s.request(), s.env, async url => Response.json(url.endsWith('/user') ? {login: s.login} : {permissions: {push: false}}))).status, 403);
  assert.equal((await shopAI(s.request(), {...s.env, AUTH_ORIGIN: 'https://different.test'}, s.fetcher)).status, 403);
});

test('shop routes are mounted and only trusted preflight receives CORS', async () => {
  const s = scenario();
  const options = new Request(s.env.AUTH_ORIGIN + '/shop-ai/copy', {method: 'OPTIONS', headers: {Origin: s.env.CMS_ORIGIN}});
  const preflight = await handle(options, s.env, s.fetcher);
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), s.env.CMS_ORIGIN);
  assert.equal((await handle(s.request(), s.env, s.fetcher)).status, 200);
  const bad = await shopAI(new Request(s.env.AUTH_ORIGIN + '/shop-ai/image', {method: 'OPTIONS', headers: {Origin: 'null'}}), s.env, s.fetcher);
  assert.equal(bad.status, 403);
  assert.equal(bad.headers.get('Access-Control-Allow-Origin'), null);
  assert.equal((await shopAI(new Request(s.env.AUTH_ORIGIN + '/shop-ai/copy', {headers: {Origin: s.env.CMS_ORIGIN}}), s.env, s.fetcher)).status, 405);
  assert.equal((await shopAI(s.request('unknown'), s.env, s.fetcher)).status, 404);
});

test('bounded JSON and product schema reject invalid, empty, too-long and streaming oversized input', async () => {
  const s = scenario();
  for (const product of [null, [], {}, {...source, title: ''}, {...source, title: 'x'.repeat(201)}, {...source, body: '<script>alert(1)</script>'}, {...source, checkout: 'https://evil.test'}]) {
    assert.ok((await shopAI(s.request('copy', {product}), s.env, s.fetcher)).status >= 400);
  }
  assert.equal(s.calls.length, 0);
  assert.equal((await shopAI(s.request('copy', {product: source, extra: true}), s.env, s.fetcher)).status, 400);
  const invalid = new Request(s.env.AUTH_ORIGIN + '/shop-ai/copy', {method: 'POST', headers: {Origin: s.env.CMS_ORIGIN, 'Content-Type': 'application/json'}, body: 'broken'});
  assert.equal((await shopAI(invalid, s.env, s.fetcher)).status, 400);
  const tooLarge = new Request(s.env.AUTH_ORIGIN + '/shop-ai/copy', {method: 'POST', headers: {Origin: s.env.CMS_ORIGIN, 'Content-Type': 'application/json'}, body: 'x'.repeat(48 * 1024 + 1)});
  assert.equal((await shopAI(tooLarge, s.env, s.fetcher)).status, 413);
  assert.equal((await shopAI(s.request('copy', undefined, {'Content-Length': String(48 * 1024 + 1)}), s.env, s.fetcher)).status, 413);
});

test('AI copy uses bounded structured source, requires human review, and preserves reviewed English names', async () => {
  let invocation;
  const s = scenario();
  s.env.AI.run = async (model, input) => { invocation = {model, input}; return {response: JSON.stringify(s.draft)}; };
  const response = await shopAI(s.request('copy', {product: {...source, title_en: 'Reviewed name'}}), s.env, s.fetcher);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.review_required, true);
  assert.equal(data.draft.title_en, 'Reviewed name');
  assert.deepEqual(Object.keys(data.draft), Object.keys(COPY_LIMITS));
  assert.ok(Object.keys(data.draft).every(key=>!/^seo_|^geo_/.test(key)));
  assert.equal(JSON.parse(invocation.input.messages[1].content).body, source.body);
  assert.match(invocation.input.messages[0].content, /Never invent materials/);
  assert.match(invocation.input.messages[0].content, /Limit FAQ to the product's cultural meaning, motifs and intended use/);
  assert.match(invocation.input.messages[0].content, /Do not generate FAQ about prices, stock, available variants, payment, shipping or returns/);
  assert.doesNotMatch(invocation.input.messages[0].content, /seo_|SEO descriptions|GEO/);
  assert.equal(invocation.input.response_format.type, 'json_object');
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
});

test('AI copy rejects incomplete or unsafe structured outputs and hides upstream errors', async () => {
  for (const mutation of [draft => ({...draft, extra: 'unexpected'}), draft => ({...draft, body: '<img src=x>'}), draft => ({...draft, summary: ''}), draft => ({...draft, faq: []}), draft => ({...draft, summary_en: 'x'.repeat(801)}), draft => ({...draft, seo_description_en: 'Legacy manual search description'})]) {
    const s = scenario();
    s.env.AI.run = async () => ({response: JSON.stringify(mutation(s.draft))});
    assert.equal((await shopAI(s.request(), s.env, s.fetcher)).status, 502);
  }
  const s = scenario({AI: {run: async () => { throw Error('server-secret private details'); }}});
  const response = await shopAI(s.request(), s.env, s.fetcher);
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /server-secret|private details/);
});

test('missing provider configuration is actionable and does not call an image provider', async () => {
  const s = scenario({AI: null, OPENAI_API_KEY: undefined});
  const copy = await shopAI(s.request(), s.env, s.fetcher);
  assert.equal(copy.status, 503);
  assert.match((await copy.json()).error, /AI/);
  const image = await shopAI(s.request('image', {product: source, image: png}), s.env, s.fetcher);
  assert.equal(image.status, 503);
  assert.match((await image.json()).error, /OPENAI_API_KEY/);
  assert.equal(s.calls.filter(call => call.url.includes('openai')).length, 0);
});

test('image editing sends reference to the fixed official API with a server-only credential', async () => {
  const s = scenario();
  const response = await shopAI(s.request('image', {product: source, image: png, prompt: 'Ivory background'}), s.env, s.fetcher);
  assert.equal(response.status, 200);
  const result = await response.json();
  assert.deepEqual(result, {image: webp, review_required: true});
  const {options} = s.calls.find(call => call.url.includes('openai'));
  assert.equal(options.headers.Authorization, 'Bearer server-secret');
  const body = JSON.parse(options.body);
  assert.equal(body.images[0].image_url, `data:image/png;base64,${png.base64}`);
  assert.equal(body.n, 1);
  assert.equal(body.output_format, 'webp');
  assert.match(body.prompt, /all inscriptions/);
  assert.match(body.prompt, /watermarks/);
  assert.match(body.prompt, /Never redraw sacred symbols/);
  assert.doesNotMatch(JSON.stringify(result), /server-secret|github-session/);
  assert.ok(s.calls.filter(call => call.url.includes('github')).every(call => call.options.headers.Authorization === 'Bearer github-session'));
});

test('image validation rejects URLs, MIME spoofing, invalid base64 and oversized references without external fetches', async () => {
  for (const image of [{url: 'http://localhost/private'}, {...png, mime: 'image/svg+xml'}, {...png, mime: 'image/jpeg'}, {...png, base64: 'not an image'}, {...png, base64: 'a'.repeat(8 * 1024 * 1024 + 4)}]) {
    const s = scenario();
    assert.ok((await shopAI(s.request('image', {product: source, image}), s.env, s.fetcher)).status >= 400);
    assert.equal(s.calls.length, 0);
  }
});

test('image upstream rejection or malformed response returns a sanitized failure', async () => {
  for (const output of [Response.json({error: 'server-secret'}, {status: 401}), Response.json({data: [{url: 'https://example.test/private'}]}), Response.json({data: [{b64_json: png.base64}]})]) {
    const s = scenario();
    const response = await shopAI(s.request('image', {product: source, image: png}), s.env, (url, options) => url.includes('openai') ? output : s.fetcher(url, options));
    assert.equal(response.status, 502);
    assert.doesNotMatch(await response.text(), /server-secret|private/);
  }
});

test('image provider HTTP failures are distinguishable without exposing upstream details', async () => {
  for (const [status, phrase] of [[400, '请求参数'], [401, '密钥无效'], [403, '权限不足'], [404, '图片模型不存在'], [429, '请求过于频繁'], [500, '暂时不可用']]) {
    const s = scenario();
    const output = Response.json({error: {message: 'server-secret https://private.test/request', code: 'unknown-secret-code', type: 'unknown-secret-type'}, secret: 'github-session'}, {status, headers: {'x-request-id': 'private-request-id'}});
    const response = await shopAI(s.request('image', {product: source, image: png}), s.env, (url, options) => url.includes('openai') ? output : s.fetcher(url, options));
    assert.equal(response.status, status === 429 ? 429 : 502);
    const message = (await response.json()).error;
    assert.match(message, new RegExp(phrase));
    assert.match(message, new RegExp(`HTTP ${status}`));
    assert.doesNotMatch(message, /server-secret|github-session|private|unknown-secret|https:/);
  }
});

test('image provider exposes only allowlisted error codes and fixed explanations', async () => {
  for (const [code, phrase] of [['invalid_api_key', '密钥无效'], ['model_not_found', '图片模型不存在'], ['insufficient_quota', '额度不足'], ['billing_hard_limit_reached', '额度不足'], ['organization_verification_required', '组织验证'], ['permission_denied', '权限不足'], ['rate_limit_exceeded', '请求过于频繁'], ['invalid_request_error', '请求参数']]) {
    const s = scenario();
    const output = Response.json({error: {code, message: 'server-secret private response', detail: 'private-request-id'}}, {status: 400});
    const response = await shopAI(s.request('image', {product: source, image: png}), s.env, (url, options) => url.includes('openai') ? output : s.fetcher(url, options));
    assert.equal(response.status, 502);
    const message = (await response.json()).error;
    assert.match(message, new RegExp(phrase));
    assert.match(message, new RegExp(`HTTP 400；${code}`));
    assert.doesNotMatch(message, /server-secret|private/);
  }
  const s = scenario();
  const output = Response.json({error: {code: 'unrecognized-secret', type: 'insufficient_quota', message: 'server-secret'}}, {status: 429});
  const response = await shopAI(s.request('image', {product: source, image: png}), s.env, (url, options) => url.includes('openai') ? output : s.fetcher(url, options));
  assert.equal(response.status, 429);
  assert.match((await response.json()).error, /HTTP 429；insufficient_quota/);
});

test('malformed and oversized image provider error bodies safely fall back to HTTP classification', async () => {
  let canceled = false;
  const oversized = new ReadableStream({
    start(controller) { controller.enqueue(new TextEncoder().encode('server-secret'.repeat(2000))); },
    cancel() { canceled = true; },
  });
  const outputs = [new Response('not JSON server-secret', {status: 403}), new Response(oversized, {status: 403}), new Response('server-secret', {status: 403, headers: {'Content-Length': String(16 * 1024 + 1)}})];
  for (const output of outputs) {
    const s = scenario();
    const response = await shopAI(s.request('image', {product: source, image: png}), s.env, (url, options) => url.includes('openai') ? output : s.fetcher(url, options));
    assert.equal(response.status, 502);
    const message = (await response.json()).error;
    assert.match(message, /权限不足.*HTTP 403/);
    assert.doesNotMatch(message, /server-secret|JSON|内容过大|413/);
  }
  assert.equal(canceled, true);
});

test('shared rate limiting and per-editor fallback prevent additional provider calls', async () => {
  const denied = scenario({SHOP_AI_RATE_LIMIT: {limit: async () => ({success: false})}});
  assert.equal((await shopAI(denied.request(), denied.env, denied.fetcher)).status, 429);
  const s = scenario();
  for (let i = 0; i < 2; i++) assert.equal((await shopAI(s.request('image', {product: source, image: png}), s.env, s.fetcher)).status, 200);
  assert.equal((await shopAI(s.request('image', {product: source, image: png}), s.env, s.fetcher)).status, 429);
  assert.equal(s.calls.filter(call => call.url.includes('openai')).length, 2);
});

test('an overlapping generation is rejected and a completed request releases its lock', async () => {
  const s = scenario();
  let release, started;
  const ready = new Promise(resolve => { started = resolve; });
  s.env.AI.run = async () => {
    started();
    await new Promise(resolve => { release = resolve; });
    return {response: s.draft};
  };
  const first = shopAI(s.request(), s.env, s.fetcher);
  await ready;
  assert.equal((await shopAI(s.request(), s.env, s.fetcher)).status, 429);
  release();
  assert.equal((await first).status, 200);
  s.env.AI.run = async () => ({response: s.draft});
  assert.equal((await shopAI(s.request(), s.env, s.fetcher)).status, 200);
});
