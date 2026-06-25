import Busboy from 'busboy';
import {createReadStream, existsSync} from 'node:fs';
import {mkdir, stat, writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';

const port = Number(process.env.PORT ?? 8787);
const publicBaseUrl = process.env.PUBLIC_WORKER_URL ?? `http://localhost:${port}`;
const corsOrigin = process.env.ALLOWED_ORIGIN ?? '*';

const getCorsOrigin = (request) => {
  if (corsOrigin === '*') return '*';
  const requestOrigin = request.headers.origin;
  const allowed = corsOrigin.split(',').map((origin) => origin.trim());
  return requestOrigin && allowed.includes(requestOrigin) ? requestOrigin : allowed[0] || '*';
};

const send = (request, response, statusCode, body, contentType = 'application/json') => {
  const normalizedContentType =
    contentType.startsWith('text/') || contentType === 'application/json'
      ? `${contentType}; charset=utf-8`
      : contentType;

  response.writeHead(statusCode, {
    'Content-Type': normalizedContentType,
    'Access-Control-Allow-Origin': getCorsOrigin(request),
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(typeof body === 'string' ? body : JSON.stringify(body));
};

const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '-');

const readJsonBody = (request) => {
  return new Promise((resolve, reject) => {
    const chunks = [];

    request.on('data', (chunk) => {
      chunks.push(chunk);
    });

    request.on('end', () => {
      try {
        const body = Buffer.concat(chunks).toString('utf8') || '{}';
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error('Invalid JSON body.'));
      }
    });

    request.on('error', reject);
  });
};

const platformLabels = {
  youtube: 'YouTube / Shorts',
  instagram: 'Instagram Reels',
  facebook: 'Facebook Video / Reels',
  tiktok: 'TikTok',
  douyin: '抖音',
  xiaohongshu: '小紅書',
  other: '其他影音頻道',
  unknown: '文字主題',
};

const detectPlatform = (input = '') => {
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('facebook.com') || host.includes('fb.watch')) return 'facebook';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('douyin.com')) return 'douyin';
    if (host.includes('xiaohongshu.com') || host.includes('xhslink.com')) return 'xiaohongshu';
    return 'other';
  } catch {
    return 'unknown';
  }
};

const extractUrls = (text = '') => text.match(/https?:\/\/[^\s"'<>]+/g) ?? [];

const extractFirst = (text, patterns) => {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]?.trim()) return match[1].trim();
  }

  return '';
};

const stripTags = (text = '') =>
  text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const fetchMetadata = async (input = '') => {
  const urls = extractUrls(input);
  const url = urls[0] || input.trim();
  const platform = detectPlatform(url);

  if (!url || platform === 'unknown') {
    return {
      url,
      platform,
      title: input.trim().slice(0, 80) || '短影音主題',
      channel: '',
      description: '',
    };
  }

  if (platform === 'youtube') {
    try {
      const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const response = await fetch(endpoint, {headers: {'User-Agent': 'MoltiAI/1.0'}});
      if (response.ok) {
        const data = await response.json();
        return {
          url,
          platform,
          title: data.title || 'YouTube 參考影片',
          channel: data.author_name || '',
          description: '',
        };
      }
    } catch {
      // Fall through to HTML metadata.
    }
  }

  try {
    const response = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0 MoltiAI/1.0'}});
    const html = await response.text();
    const title =
      extractFirst(html, [
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+name=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
        /<title[^>]*>([\s\S]*?)<\/title>/i,
      ]) || `${platformLabels[platform]} 參考影片`;
    const description = extractFirst(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
    ]);

    return {url, platform, title: stripTags(title), channel: '', description: stripTags(description)};
  } catch {
    return {url, platform, title: `${platformLabels[platform]} 參考影片`, channel: '', description: ''};
  }
};

const searchComparisons = async (topic) => {
  const fallback = [
    `${topic}｜痛點開場型短影音`,
    `${topic}｜開箱或教學型短影音`,
    `${topic}｜案例證明型短影音`,
  ];

  try {
    const query = encodeURIComponent(`${topic} shorts reels tiktok`);
    const response = await fetch(`https://duckduckgo.com/html/?q=${query}`, {
      headers: {'User-Agent': 'Mozilla/5.0 MoltiAI/1.0'},
    });
    const html = await response.text();
    const titles = [...html.matchAll(/class="result__a"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map((match) => stripTags(match[1]))
      .filter(Boolean)
      .slice(0, 5);

    return titles.length >= 3 ? titles.slice(0, 5) : fallback;
  } catch {
    return fallback;
  }
};

const buildStrategy = async ({input = '', title = '', description = ''}) => {
  const metadata = await fetchMetadata(`${input}\n${title}\n${description}`);
  const topic =
    title.trim() ||
    metadata.title ||
    description.trim().split(/[。！？\n]/)[0]?.trim() ||
    input.trim() ||
    '短影音主題';
  const platformLabel = platformLabels[metadata.platform] ?? platformLabels.unknown;
  const comparisons = await searchComparisons(topic);
  const hooks = [
    `你是不是也遇過「${topic.slice(0, 18)}」但不知道怎麼判斷值不值得？`,
    `先看這 3 秒，這就是「${topic.slice(0, 14)}」能不能爆的關鍵。`,
    `同樣是 ${topic.slice(0, 12)}，為什麼有些人一開口就讓人想看完？`,
    `如果你正在做 ${topic.slice(0, 12)}，這個錯誤先不要犯。`,
    `別再只介紹 ${topic.slice(0, 10)}，觀眾真正想看的是這個。`,
  ];
  const storyboard = [
    `0-3s：用反差問題開場，字幕打「${topic.slice(0, 14)} 的關鍵不是你想的那樣」。`,
    '3-6s：快速展示情境或結果，讓觀眾知道這支影片和自己有關。',
    '6-10s：拆出 2 個可複製元素，包含開場語氣、畫面節奏、賣點呈現或情緒轉折。',
    '10-13s：補一個改寫方向，把對照組靈感轉成你的品牌、商品或服務版本。',
    '13-15s：用清楚 CTA 收尾，要求留言、點連結、私訊或直接生成同款短影音。',
  ];
  const ctas = [
    '留言「想要」取得同款腳本',
    '把這支影片改成你的品牌版本',
    '上傳 3 張圖片，直接生成 15 秒短影音',
  ];

  return {
    metadata,
    platform: metadata.platform,
    platformLabel,
    topic,
    comparisons,
    confidence: metadata.platform === 'youtube' ? 'high' : metadata.platform === 'unknown' ? 'fallback' : 'medium',
    metadataPlan:
      metadata.description ||
      `已依 ${platformLabel} 與同題材公開搜尋結果建立分析；若平台限制抓取，會保留手動補標題/逐字稿流程。`,
    strengths: [
      '題材可拆成「吸引注意 -> 建立痛點 -> 給出解法 -> CTA」的短影音結構。',
      '適合用高密度字幕、快速切鏡和清楚問題句提高前三秒停留率。',
      '可直接銜接 15 秒影片生成器，形成「分析 -> 重構 -> 生成」流程。',
    ],
    risks: [
      '若沒有逐字稿或截圖，畫面節奏與留存判斷會以標題、描述和同題材對照推測。',
      '平台 API、登入牆或反爬限制可能導致 metadata 不完整，因此保留手動補充欄位。',
      '分析可參考公開內容，但不能直接下載、複製或重製未授權素材。',
    ],
    hooks,
    storyboard,
    ctas,
    scores: {
      hook: 4,
      retention: 4,
      density: 3,
      cta: 3,
      titleScore: topic.length >= 8 ? 4 : 3,
    },
  };
};

const strategyToMarkdown = (strategy) => {
  const scoreRows = Object.entries({
    '前 3 秒 Hook 強度': strategy.scores.hook,
    '敘事節奏與留存結構': strategy.scores.retention,
    資訊密度: strategy.scores.density,
    'CTA 強度': strategy.scores.cta,
    標題吸引力: strategy.scores.titleScore,
  })
    .map(([name, score]) => `| ${name} | ${score}/5 |`)
    .join('\n');
  const comparisonRows = strategy.comparisons
    .map((item, index) => `| 對照 ${index + 1} | ${item} | 用明確情境或強問題抓注意力，可借鏡其開場密度。 |`)
    .join('\n');

  return `## 一、同題材對照組
| 類型 | 對照內容 | 可借鏡點 |
|---|---|---|
${comparisonRows}

## 二、目標影片診斷
| 維度 | 分數 |
|---|---:|
${scoreRows}

### 優勢
${strategy.strengths.map((item) => `- ${item}`).join('\n')}

### 風險 / 缺口
${strategy.risks.map((item) => `- ${item}`).join('\n')}

## 三、最關鍵的 3 個改善方向
1. 開頭不要先介紹背景，先用「${strategy.topic.slice(0, 16)}」相關痛點或反差句抓注意力。
2. 中段每 3 秒給一個新資訊點，避免只有單一畫面或單一賣點重複。
3. 結尾要給明確下一步，例如留言、點連結、私訊或直接生成同款影片。`;
};

const strategyToRewriteMarkdown = (strategy) => `## 一、Hook 開頭變體 ×5
${strategy.hooks.map((item, index) => `${index + 1}. \`${item}\` - ${['痛點共鳴', '爭議反差', '數據衝擊', '懸念缺口', '反直覺'][index]}。`).join('\n')}

## 二、分鏡建議
| 秒數區間 | 畫面 / 運鏡 | 口播或字卡 | 目的 |
|---|---|---|---|
${strategy.storyboard
  .map((item) => {
    const [range, copy] = item.split('：');
    return `| ${range} | 快切、近景、字幕同步 | ${copy} | 提高停留與轉換 |`;
  })
  .join('\n')}

## 三、行動呼籲 CTA ×3
${strategy.ctas.map((item) => `- ${item}`).join('\n')}`;

const buildBatchJson = async (prompt) => {
  const urls = extractUrls(prompt).slice(0, 8);
  const items = urls.length ? urls : prompt.split('\n').filter((line) => line.trim()).slice(0, 8);
  const videos = [];

  for (const [index, item] of items.entries()) {
    const strategy = await buildStrategy({input: item});
    const base = 14 + ((index * 3) % 7);
    videos.push({
      name: strategy.metadata.title || strategy.topic,
      hook: Math.min(5, strategy.scores.hook),
      retention: Math.max(2, Math.min(5, strategy.scores.retention - (index % 2))),
      density: Math.max(2, Math.min(5, strategy.scores.density + (index % 3 === 0 ? 1 : 0))),
      cta: Math.max(2, Math.min(5, strategy.scores.cta)),
      titleScore: Math.max(2, Math.min(5, strategy.scores.titleScore)),
      total: base,
      verdict: `適合用「${strategy.hooks[0].slice(0, 24)}」方向強化前三秒。`,
      fix: '把開場改成問題句，並在結尾加入明確行動指令。',
    });
  }

  videos.sort((a, b) => b.total - a.total);
  return {
    summary: '整批影片的最大機會是強化前三秒 Hook 與結尾 CTA。表現較好的影片通常先給痛點或結果，再補證據；較弱的影片容易先鋪陳背景，導致停留流失。',
    videos,
  };
};

const buildSpawnEnv = () => {
  const env = {};
  let pathValue = '';

  for (const [key, value] of Object.entries(process.env)) {
    if (key.toLowerCase() === 'path') {
      pathValue = pathValue || value || '';
      continue;
    }

    env[key] = value;
  }

  env.Path = pathValue;
  return env;
};

const runRender = ({prompt, cta, images, musicMode, musicPath, outputPath}) => {
  const music =
    musicMode === 'none'
      ? 'none'
      : musicMode === 'upload' && musicPath
        ? musicPath
        : 'auto';

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        'scripts/create-video.mjs',
        '--prompt',
        prompt,
        '--images',
        images.join(','),
        '--cta',
        cta,
        '--music',
        music,
        '--output',
        outputPath,
      ],
      {stdio: 'inherit', env: buildSpawnEnv()}
    );

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Render failed with exit code ${code}`));
      }
    });
  });
};

const parseMultipart = (request) => {
  return new Promise((resolve, reject) => {
    const jobId = new Date().toISOString().replace(/[:.]/g, '-');
    const incomingDir = path.join('tmp', 'incoming', jobId);
    const fields = {};
    const images = [];
    let musicPath = null;
    const pendingWrites = [];

    mkdir(incomingDir, {recursive: true})
      .then(() => {
        const busboy = Busboy({headers: request.headers});

        busboy.on('field', (name, value) => {
          fields[name] = value;
        });

        busboy.on('file', (name, file, info) => {
          const filename = safeName(info.filename || `${name}.bin`);
          const filePath = path.join(incomingDir, `${name}-${Date.now()}-${filename}`);
          const chunks = [];

          file.on('data', (chunk) => {
            chunks.push(chunk);
          });

          file.on('end', () => {
            const writePromise = writeFile(filePath, Buffer.concat(chunks)).then(() => {
              if (name === 'images') {
                images.push(filePath);
              } else if (name === 'music') {
                musicPath = filePath;
              }
            });
            pendingWrites.push(writePromise);
          });
        });

        busboy.on('error', reject);
        busboy.on('finish', async () => {
          await Promise.all(pendingWrites);
          resolve({jobId, fields, images, musicPath});
        });

        request.pipe(busboy);
      })
      .catch(reject);
  });
};

const serveFile = async (request, response) => {
  const url = new URL(request.url ?? '/', publicBaseUrl);
  const fileName = safeName(path.basename(url.pathname));
  const filePath = path.join('out', fileName);

  if (!existsSync(filePath)) {
    send(request, response, 404, 'Not found', 'text/plain');
    return;
  }

  const fileStat = await stat(filePath);
  response.writeHead(200, {
    'Content-Type': fileName.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream',
    'Content-Length': fileStat.size,
    'Access-Control-Allow-Origin': getCorsOrigin(request),
  });
  createReadStream(filePath).pipe(response);
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') {
      send(request, response, 204, '');
      return;
    }

    const url = new URL(request.url ?? '/', publicBaseUrl);

    if (request.method === 'GET' && url.pathname === '/health') {
      send(request, response, 200, {ok: true});
      return;
    }

    if (request.method === 'GET' && url.pathname.startsWith('/out/')) {
      await serveFile(request, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/render') {
      const {jobId, fields, images, musicPath} = await parseMultipart(request);
      const prompt = String(fields.prompt ?? '').trim();
      const cta = String(fields.cta ?? '立即了解').trim();
      const musicMode = String(fields.musicMode ?? 'auto').trim();

      if (prompt.length < 8) {
        send(request, response, 400, 'Prompt is too short.', 'text/plain');
        return;
      }

      if (images.length < 3 || images.length > 5) {
        send(request, response, 400, 'Please upload 3-5 images.', 'text/plain');
        return;
      }

      await mkdir('out', {recursive: true});
      const outputPath = path.join('out', `${jobId}.mp4`);
      await runRender({prompt, cta, images, musicMode, musicPath, outputPath});

      send(request, response, 200, {
        jobId,
        status: 'ready',
        videoUrl: `${publicBaseUrl}/out/${path.basename(outputPath)}`,
      });
      return;
    }

    if (request.method === 'POST' && (url.pathname === '/analyze' || url.pathname === '/api/analyze')) {
      const body = await readJsonBody(request);
      const strategy = await buildStrategy({
        input: String(body.url ?? body.input ?? body.prompt ?? ''),
        title: String(body.title ?? ''),
        description: String(body.description ?? body.transcript ?? ''),
      });

      send(request, response, 200, {
        platform: strategy.platform,
        platformLabel: strategy.platformLabel,
        url: strategy.metadata.url,
        confidence: strategy.confidence,
        metadataPlan: strategy.metadataPlan,
        metadata: strategy.metadata,
        comparisons: strategy.comparisons,
        strengths: strategy.strengths,
        risks: strategy.risks,
        hooks: strategy.hooks,
        storyboard: strategy.storyboard,
        ctas: strategy.ctas,
        scores: strategy.scores,
        videoPrompt: [
          `根據 ${strategy.platformLabel} 影片/主題分析，重構成一支 15 秒直式短影音。`,
          `主題：${strategy.topic}`,
          `Hook：${strategy.hooks[0]}`,
          `分鏡：${strategy.storyboard.join(' ')}`,
          `CTA：${strategy.ctas[0]}`,
        ].join('\n'),
      });
      return;
    }

    if (request.method === 'POST' && url.pathname === '/api/diagnose') {
      const body = await readJsonBody(request);
      const prompt = String(body.prompt ?? '');

      if (/僅輸出 JSON|\"videos\"|videos|批次|橫向比較/i.test(prompt)) {
        const batch = await buildBatchJson(prompt);
        send(request, response, 200, {text: JSON.stringify(batch)});
        return;
      }

      const strategy = await buildStrategy({input: prompt});
      const text = /重構成|Hook 開頭變體|分鏡建議|行動呼籲 CTA/.test(prompt)
        ? strategyToRewriteMarkdown(strategy)
        : strategyToMarkdown(strategy);
      send(request, response, 200, {text});
      return;
    }

    send(request, response, 404, 'Not found', 'text/plain');
  } catch (error) {
    send(request, response, 500, error instanceof Error ? error.message : 'Internal error', 'text/plain');
  }
});

server.listen(port, () => {
  console.log(`MoltiAI video worker listening on ${publicBaseUrl}`);
});
