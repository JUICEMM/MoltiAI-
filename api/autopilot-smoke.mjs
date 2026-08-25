const worker = process.env.VIDEO_WORKER_URL || 'https://molti-ai-worker.onrender.com';

const svg = (label, bg) => `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="480" height="854"><rect width="100%" height="100%" fill="${bg}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="Arial" font-size="58" font-weight="700">${label}</text></svg>`;

async function renderImages() {
  const fd = new FormData();
  fd.set('prompt', 'MoltiAI 自動剪輯測試，先建立一支基礎影片，再把影片當作素材重新剪輯。');
  fd.set('cta', '立即測試');
  fd.set('musicMode', 'none');
  for (const [i, bg] of ['#23364d','#5a3d5c','#2f5a4a'].entries()) {
    fd.append('images', new Blob([svg(`SCENE ${i + 1}`, bg)], {type:'image/svg+xml'}), `scene-${i + 1}.svg`);
  }
  const r = await fetch(`${worker}/render`, {method:'POST', body:fd});
  const text = await r.text();
  if (!r.ok) throw new Error(`seed render ${r.status}: ${text.slice(0,500)}`);
  return JSON.parse(text).videoUrl;
}

async function renderMixed(seedUrl) {
  const seed = await fetch(seedUrl);
  if (!seed.ok) throw new Error(`seed video fetch ${seed.status}`);
  const video = await seed.arrayBuffer();
  const fd = new FormData();
  fd.set('prompt', '用影片作為開場，接兩張圖片，自動切段並加入字幕，最後用明確 CTA 收尾。');
  fd.set('cta', '完成自動剪輯');
  fd.set('musicMode', 'none');
  fd.append('media', new Blob([video], {type:'video/mp4'}), 'seed.mp4');
  fd.append('media', new Blob([svg('PRODUCT', '#624b2f')], {type:'image/svg+xml'}), 'product.svg');
  fd.append('media', new Blob([svg('CTA', '#3f315e')], {type:'image/svg+xml'}), 'cta.svg');
  const r = await fetch(`${worker}/render`, {method:'POST', body:fd});
  const text = await r.text();
  if (!r.ok) throw new Error(`mixed render ${r.status}: ${text.slice(0,800)}`);
  return JSON.parse(text);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control','no-store');
  try {
    const started = Date.now();
    const seedUrl = await renderImages();
    const mixed = await renderMixed(seedUrl);
    const video = await fetch(mixed.videoUrl);
    res.status(200).json({ok: video.ok, seedUrl, mixed, videoStatus: video.status, elapsedMs: Date.now()-started});
  } catch (error) {
    res.status(500).json({ok:false,error:error instanceof Error?error.message:String(error)});
  }
}
