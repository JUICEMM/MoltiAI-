const WORKER = process.env.VITE_VIDEO_WORKER_URL || 'https://molti-ai-worker.onrender.com';

const asJson = async (response) => {
  const text = await response.text();
  try { return {text, json: JSON.parse(text)}; } catch { return {text, json: null}; }
};

const withTimeout = async (url, options = {}, ms = 45000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, {...options, signal: controller.signal}); }
  finally { clearTimeout(timer); }
};

const originFromReq = (req) => {
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'molti-ai-drab.vercel.app';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return `${proto}://${host}`;
};

async function testAgent(origin, agentId, provider = 'chatgpt') {
  const response = await withTimeout(`${origin}/api/agents/run`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      agentId,
      agentName: `${agentId} smoke`,
      provider,
      prompt: `Smoke test ${agentId}/${provider}. 請只回覆：PASS ${agentId} ${provider}`,
    }),
  }, 30000);
  const body = await asJson(response);
  const output = body.json?.output || '';
  return {
    name: `agent:${agentId}:${provider}`,
    ok: response.ok && Boolean(output) && body.json?.provider !== 'fallback',
    status: response.status,
    provider: body.json?.provider || '',
    requestedProvider: body.json?.requestedProvider || provider,
    sample: output.slice(0, 180),
    warning: body.json?.warning || '',
  };
}

async function testWorkerHealth() {
  const response = await withTimeout(`${WORKER}/health`, {}, 45000);
  const body = await asJson(response);
  return {name: 'video-worker:health', ok: response.ok && body.json?.ok === true, status: response.status, detail: body.json || body.text.slice(0, 200)};
}

async function warmWorker() {
  try { await testWorkerHealth(); } catch {}
  await new Promise((resolve) => setTimeout(resolve, 1500));
}

async function testAnalyze() {
  const source = 'https://www.youtube.com/watch?v=lkMBIDdkgjI';
  const response = await withTimeout(`${WORKER}/analyze`, {
    method: 'POST', headers: {'content-type': 'application/json'},
    body: JSON.stringify({url: source, title: '', description: ''}),
  }, 60000);
  const body = await asJson(response);
  const j = body.json || {};
  return {
    name: 'analyze-url:worker',
    ok: response.ok && Array.isArray(j.hooks) && j.hooks.length >= 3 && Array.isArray(j.storyboard) && j.storyboard.length >= 3,
    status: response.status,
    platform: j.platformLabel || '',
    sourceTitle: j.metadata?.title || '',
    hook: j.hooks?.[0] || '',
    comparisons: j.comparisons?.slice?.(0, 3) || [],
  };
}

async function testCompetitors(origin) {
  const source = 'https://www.youtube.com/watch?v=lkMBIDdkgjI';
  const response = await withTimeout(`${origin}/api/video/competitors?source=${encodeURIComponent(source)}`, {}, 60000);
  const body = await asJson(response);
  const j = body.json || {};
  const sourceId = 'lkMBIDdkgjI';
  const items = Array.isArray(j.items) ? j.items : [];
  return {
    name: 'competitors:verified-youtube',
    ok: response.ok && items.length > 0 && items.every((x) => typeof x.url === 'string' && x.url.includes('youtube.com/watch') && !x.url.includes(sourceId)),
    status: response.status,
    verified: Boolean(j.verified),
    mode: j.mode || '',
    query: j.query || '',
    items: items.map((x) => ({title: x.title, channel: x.channel, url: x.url, viewSignal: x.viewSignal, publishedLabel: x.publishedLabel})),
    reason: j.reason || '',
  };
}

function svgBlob(label, fill) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><rect width="1080" height="1920" fill="${fill}"/><text x="540" y="960" text-anchor="middle" font-size="86" fill="white" font-family="sans-serif">${label}</text></svg>`;
  return new Blob([svg], {type: 'image/svg+xml'});
}

async function testRender() {
  await warmWorker();
  const form = new FormData();
  form.set('prompt', 'MoltiAI smoke test video: enterprise AI workflow, clean corporate style.');
  form.set('cta', 'MoltiAI');
  form.set('musicMode', 'none');
  form.append('images', svgBlob('MoltiAI 1', '#111827'), 'smoke-1.svg');
  form.append('images', svgBlob('MoltiAI 2', '#1f2937'), 'smoke-2.svg');
  form.append('images', svgBlob('MoltiAI 3', '#374151'), 'smoke-3.svg');
  const response = await withTimeout(`${WORKER}/render`, {method: 'POST', body: form}, 180000);
  const body = await asJson(response);
  const videoUrl = body.json?.videoUrl || '';
  let videoOk = false;
  let videoStatus = null;
  if (videoUrl) {
    try {
      const videoResp = await withTimeout(videoUrl, {method: 'GET', headers: {Range: 'bytes=0-32'}}, 45000);
      videoStatus = videoResp.status;
      videoOk = videoResp.ok || videoResp.status === 206;
    } catch {}
  }
  return {name: 'video-render:15s', ok: response.ok && Boolean(videoUrl) && videoOk, status: response.status, videoStatus, videoUrl, detail: body.json || body.text.slice(0, 500)};
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'GET') return res.status(405).json({error: 'GET only'});
  const scope = String(req.query?.scope || 'core');
  const origin = originFromReq(req);
  const results = [];

  try {
    if (scope === 'agents' || scope === 'all' || scope === 'core') {
      const agentIds = ['strategy','sales','marketing','crm','consultant','training','content','finance'];
      const agentTests = await Promise.all(agentIds.map((id) => testAgent(origin, id, 'chatgpt')));
      results.push(...agentTests);
      const roleTests = await Promise.all(['gemini','claude','copilot','codex'].map((p) => testAgent(origin, 'strategy', p)));
      results.push(...roleTests);
    }
    if (scope === 'analyze' || scope === 'all' || scope === 'core') {
      results.push(await testWorkerHealth());
      results.push(await testAnalyze());
      results.push(await testCompetitors(origin));
    }
    if (scope === 'render' || scope === 'all') results.push(await testRender());
  } catch (error) {
    results.push({name: 'smoke-harness', ok: false, error: error instanceof Error ? error.message : String(error)});
  }

  const passed = results.filter((x) => x.ok).length;
  return res.status(200).json({
    generatedAt: new Date().toISOString(),
    scope,
    origin,
    worker: WORKER,
    passed,
    total: results.length,
    allPassed: results.length > 0 && passed === results.length,
    results,
  });
}
