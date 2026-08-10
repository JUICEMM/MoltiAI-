const WORKER = process.env.VITE_VIDEO_WORKER_URL || 'https://molti-ai-worker.onrender.com';

const platformLabels = {
  youtube: 'YouTube / Shorts', instagram: 'Instagram Reels', facebook: 'Facebook Video / Reels',
  tiktok: 'TikTok', douyin: '抖音', xiaohongshu: '小紅書', other: '其他影音頻道', unknown: '未辨識',
};

const detectPlatform = (input='') => {
  try {
    const host = new URL(input).hostname.replace(/^www\./,'').toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('facebook.com') || host.includes('fb.watch')) return 'facebook';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('douyin.com')) return 'douyin';
    if (host.includes('xiaohongshu.com') || host.includes('xhslink.com')) return 'xiaohongshu';
    return 'other';
  } catch { return 'unknown'; }
};

const timeoutFetch = async (url, options={}, ms=30000) => {
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

const cleanJson = (text='') => {
  const cleaned = String(text).replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'').trim();
  try { return JSON.parse(cleaned); } catch {
    const start = cleaned.indexOf('{'), end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start,end+1));
    throw new Error('AI response was not valid JSON');
  }
};

async function getMetadata(url, title, description) {
  const platform = detectPlatform(url);
  if (platform === 'douyin' || platform === 'xiaohongshu') {
    return {url, platform, title: title || `${platformLabels[platform]} 參考內容`, channel:'', description: description || ''};
  }
  try {
    const response = await timeoutFetch(`${WORKER}/analyze`, {
      method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({url,title,description})
    }, 25000);
    if (response.ok) {
      const data = await response.json();
      return {...(data.metadata || {}), url, platform: data.platform || platform, title: title || data.metadata?.title || '', description: description || data.metadata?.description || ''};
    }
  } catch {}
  return {url, platform, title: title || `${platformLabels[platform]} 參考內容`, channel:'', description: description || ''};
}

async function getCompetitors(origin, url, title) {
  if (detectPlatform(url) !== 'youtube') return {items:[], verified:false, mode:'not-applicable'};
  try {
    const endpoint = new URL('/api/video/competitors', origin);
    endpoint.searchParams.set('source', url);
    if (title) endpoint.searchParams.set('q', title);
    const response = await timeoutFetch(endpoint.toString(), {headers:{accept:'application/json'}}, 30000);
    if (!response.ok) return {items:[], verified:false, mode:'error'};
    return await response.json();
  } catch { return {items:[], verified:false, mode:'timeout'}; }
}

async function deepSeekStrategy({metadata, competitors, manualDescription}) {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY missing');
  const evidence = competitors.map((x, i) => ({
    index:i+1, title:x.title, channel:x.channel, url:x.url,
    publishedAt:x.publishedAt || x.publishedLabel || '', viewSignal:x.viewSignal || '',
  }));
  const system = `你是 MoltiAI 的短影音策略顧問。請以繁體中文分析，不得截斷標題後硬套模板，不得捏造觀看數、發布日期、競品或來源。競品只能使用我提供的 verifiedCompetitors。若資料不足要明說。Hook 必須理解主題後重寫，口語、具體、有商業價值。只輸出 JSON。`;
  const user = JSON.stringify({
    source:{platform:metadata.platform,title:metadata.title,channel:metadata.channel,description:metadata.description || manualDescription || '',url:metadata.url},
    verifiedCompetitors:evidence,
    outputSchema:{
      topic:'一句話核心主題',
      strengths:['3點'], risks:['2-3點'],
      hooks:['5句，每句自然且不是截斷標題'],
      storyboard:['0-3s','3-6s','6-10s','10-13s','13-15s'],
      ctas:['3句'],
      scores:{hook:4,retention:4,density:4,cta:3,titleScore:4},
      competitorAnalysis:[{index:1,angle:'',hook:'',structure:'',takeaway:'',weakness:'',differentiation:''}],
      videoPrompt:'可直接用於15秒直式影片生成的完整 prompt'
    }
  });
  const response = await timeoutFetch('https://api.deepseek.com/chat/completions', {
    method:'POST', headers:{'content-type':'application/json',authorization:`Bearer ${process.env.DEEPSEEK_API_KEY}`},
    body:JSON.stringify({model:process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',temperature:0.35,stream:false,response_format:{type:'json_object'},messages:[{role:'system',content:system},{role:'user',content:user}]})
  }, 45000);
  if (!response.ok) throw new Error(`DeepSeek ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return cleanJson(data.choices?.[0]?.message?.content || '{}');
}

const safeScore = (v, fallback=3) => Math.max(1, Math.min(5, Number(v) || fallback));

export default async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Access-Control-Allow-Origin','*');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({error:'POST only'});
  const {url='', title='', description=''} = req.body || {};
  if (!String(url).trim() && !String(title).trim() && !String(description).trim()) return res.status(400).json({error:'url, title or description is required'});

  const origin = originFromReq(req);
  const metadata = await getMetadata(String(url), String(title), String(description));
  const competitorData = await getCompetitors(origin, String(url), String(title || metadata.title || ''));
  const competitors = Array.isArray(competitorData.items) ? competitorData.items.slice(0,3) : [];

  let ai;
  try { ai = await deepSeekStrategy({metadata, competitors, manualDescription:String(description)}); }
  catch (error) {
    return res.status(502).json({error:'Analyze URL V2 AI unavailable', detail:error instanceof Error ? error.message : String(error), metadata, competitors});
  }

  const compAnalysis = Array.isArray(ai.competitorAnalysis) ? ai.competitorAnalysis : [];
  const comparisons = competitors.map((x,i) => {
    const a = compAnalysis.find((item) => Number(item.index) === i+1) || compAnalysis[i] || {};
    return `${x.title}\n頻道：${x.channel || '未提供'}｜發布：${x.publishedLabel || x.publishedAt || '公開搜尋未提供'}｜觀看訊號：${x.viewSignal || '未提供'}\n內容角度：${a.angle || '同題材內容'}\nHook：${a.hook || '未取得'}\n結構：${a.structure || '未取得'}\n值得借鏡：${a.takeaway || '未取得'}\n不足／不建議照抄：${a.weakness || '需依品牌情境調整'}\nMoltiAI 差異化：${a.differentiation || '轉成品牌自己的痛點、證據與 CTA'}\n連結：${x.url}`;
  });

  const platform = metadata.platform || detectPlatform(String(url));
  const platformLabel = platformLabels[platform] || platformLabels.unknown;
  return res.status(200).json({
    platform, platformLabel, url:String(url),
    confidence: competitors.length >= 3 ? 'high' : competitors.length ? 'medium' : (platform === 'youtube' ? 'medium' : 'fallback'),
    metadata,
    metadataPlan: platform === 'youtube'
      ? `來源辨識：YouTube。競品證據：${competitors.length}/3 Verified（${competitorData.mode || 'public search'}）。只顯示有可驗證 URL 的公開影片。`
      : `${platformLabel}：已使用可取得 metadata 與手動補充內容分析；平台限制時不捏造外部資料。`,
    comparisons: comparisons.length ? comparisons : ['目前沒有足夠可驗證的公開競品資料；系統不會製造假競品。'],
    strengths: Array.isArray(ai.strengths) ? ai.strengths.slice(0,5) : [],
    risks: Array.isArray(ai.risks) ? ai.risks.slice(0,5) : [],
    hooks: Array.isArray(ai.hooks) ? ai.hooks.slice(0,5) : [],
    storyboard: Array.isArray(ai.storyboard) ? ai.storyboard.slice(0,5) : [],
    ctas: Array.isArray(ai.ctas) ? ai.ctas.slice(0,3) : [],
    scores:{
      hook:safeScore(ai.scores?.hook,4), retention:safeScore(ai.scores?.retention,4), density:safeScore(ai.scores?.density,3),
      cta:safeScore(ai.scores?.cta,3), titleScore:safeScore(ai.scores?.titleScore,4),
    },
    videoPrompt:String(ai.videoPrompt || ''),
    topic:String(ai.topic || metadata.title || title || ''),
    evidence:{verifiedCompetitors:competitors.length, mode:competitorData.mode || '', sourceTitle:metadata.title || ''},
  });
}
