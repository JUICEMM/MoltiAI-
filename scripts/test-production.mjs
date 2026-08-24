const base = process.env.MOLTIAI_TEST_URL || 'https://molti-ai-drab.vercel.app';

const withTimeout = async (url, options = {}, ms = 180000) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, {...options, signal: controller.signal}); }
  finally { clearTimeout(timer); }
};

const readJson = async (url, ms = 180000) => {
  const response = await withTimeout(url, {}, ms);
  const text = await response.text();
  let json;
  try { json = JSON.parse(text); } catch { throw new Error(`${url} returned non-JSON (${response.status}): ${text.slice(0, 200)}`); }
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return json;
};

const tests = [
  ['home', async () => {
    const response = await withTimeout(base, {}, 30000);
    const html = await response.text();
    if (!response.ok || !html.includes('MoltiAI Enterprise AI Workspace')) throw new Error(`home failed (${response.status})`);
  }],
  ['core smoke', async () => {
    const json = await readJson(`${base}/api/smoke?scope=core`, 180000);
    if (!json.allPassed) throw new Error(`core smoke ${json.passed}/${json.total}`);
  }],
  ['platform smoke', async () => {
    const json = await readJson(`${base}/api/smoke-platforms`, 180000);
    if (!json.allPassed) throw new Error(`platform smoke ${json.passed}/${json.total}`);
  }],
  ['render smoke', async () => {
    const json = await readJson(`${base}/api/smoke?scope=render`, 210000);
    if (!json.allPassed) throw new Error(`render smoke ${json.passed}/${json.total}: ${JSON.stringify(json.results).slice(0, 300)}`);
  }],
];

let failed = 0;
for (const [name, run] of tests) {
  const started = Date.now();
  try {
    await run();
    console.log(`PASS ${name} (${Date.now() - started}ms)`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

if (failed) process.exit(1);
console.log(`All ${tests.length} production smoke tests passed.`);
