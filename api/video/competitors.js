const cleanQuery = (value = '') => String(value)
  .replace(/https?:\/\/\S+/g, ' ')
  .replace(/[｜|].*$/g, ' ')
  .replace(/[#【】\[\]()（）]/g, ' ')
  .replace(/\bEP\s*\d+\b/gi, ' ')
  .replace(/師父商學院|Podcast|完整版|精華版|Shorts?/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 90);

const extractVideoId = (value = '') => {
  const text = String(value || '');
  const match = text.match(/(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/) || text.match(/^([A-Za-z0-9_-]{11})$/);
  return match?.[1] || '';
};

const compact = (n) => {
  const value = Number(n || 0);
  if (!Number.isFinite(value) || value <= 0) return '未提供';
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}億`;
  if (value >= 10000) return `${(value / 10000).toFixed(1)}萬`;
  return value.toLocaleString('zh-TW');
};

const strategyFromTitle = (title = '') => {
  const numeric = /\d|億|萬|%|年|月|天/.test(title);
  const how = /如何|怎麼|步驟|方法|秘訣|攻略|為什麼|關鍵/.test(title);
  const story = /我|案例|實戰|從.*到|成功|失敗|真實|創業/.test(title);
  const angle = numeric ? '成果／數字承諾型' : how ? '問題解法／教學型' : story ? '人物案例／成長敘事型' : '同題材觀點型';
  const hook = numeric ? '先用具體數字或結果建立期待，再揭露方法。' : how ? '前三秒直接提出問題或反常識答案。' : story ? '先交代結果或轉折，再回推過程。' : '先講觀眾最在意的結果，再補原因。';
  return {
    angle,
    hook,
    structure: '結果／問題 → 關鍵觀點 → 2–3 個做法或證據 → CTA',
    takeaway: '借鏡標題承諾與前三秒切入，但不要照抄原句；應保留自己的案例與證據。',
    differentiation: '把長內容拆成單一痛點、單一證據、單一 CTA 的 15–30 秒版本。',
  };
};

const youtubeOEmbed = async (videoId) => {
  try {
    const endpoint = new URL('https://www.youtube.com/oembed');
    endpoint.searchParams.set('url', `https://www.youtube.com/watch?v=${videoId}`);
    endpoint.searchParams.set('format', 'json');
    const r = await fetch(endpoint, {headers: {'User-Agent': 'Mozilla/5.0 MoltiAI/2.0'}});
    if (!r.ok) return null;
    const data = await r.json();
    return {title: data.title || '', channel: data.author_name || ''};
  } catch { return null; }
};

const sourceMetadata = async (source) => {
  const id = extractVideoId(source);
  if (!id) return null;
  const meta = await youtubeOEmbed(id);
  return meta ? {...meta, id} : {id, title: '', channel: ''};
};

const fallbackSearch = async (query, excludeId) => {
  const url = new URL('https://www.youtube.com/results');
  url.searchParams.set('search_query', query);
  url.searchParams.set('hl', 'zh-TW');
  const r = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0 (compatible; MoltiAI/2.0; +https://www.moltiai.com)', 'Accept-Language': 'zh-TW,zh;q=0.9,en;q=0.5'}});
  if (!r.ok) throw new Error(`YouTube web search ${r.status}`);
  const html = await r.text();
  const ids = [];
  const re = /"videoId":"([A-Za-z0-9_-]{11})"/g;
  let m;
  while ((m = re.exec(html)) && ids.length < 18) {
    if (m[1] !== excludeId && !ids.includes(m[1])) ids.push(m[1]);
  }
  const verified = [];
  for (const id of ids) {
    const meta = await youtubeOEmbed(id);
    if (!meta?.title || !meta?.channel) continue;
    verified.push({id, ...meta});
    if (verified.length >= 3) break;
  }
  return verified.map((x) => ({
    title: x.title,
    channel: x.channel,
    url: `https://www.youtube.com/watch?v=${x.id}`,
    views: null,
    likes: null,
    comments: null,
    publishedAt: '',
    viewSignal: '已驗證公開 YouTube 影片；觀看數需 YouTube Data API 才能穩定取得',
    sourceMode: 'youtube-web+oembed',
    ...strategyFromTitle(x.title),
  }));
};

const apiSearch = async (apiKey, query, excludeId) => {
  const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
  searchUrl.searchParams.set('part', 'snippet');
  searchUrl.searchParams.set('type', 'video');
  searchUrl.searchParams.set('maxResults', '10');
  searchUrl.searchParams.set('order', 'relevance');
  searchUrl.searchParams.set('q', query);
  searchUrl.searchParams.set('key', apiKey);
  searchUrl.searchParams.set('relevanceLanguage', 'zh-Hant');
  const searchResp = await fetch(searchUrl);
  if (!searchResp.ok) throw new Error(`YouTube search ${searchResp.status}`);
  const searchData = await searchResp.json();
  const ids = (searchData.items || []).map((x) => x.id?.videoId).filter(Boolean).filter((id) => id !== excludeId).slice(0, 8);
  if (!ids.length) return [];

  const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
  videosUrl.searchParams.set('part', 'snippet,statistics');
  videosUrl.searchParams.set('id', ids.join(','));
  videosUrl.searchParams.set('key', apiKey);
  const videosResp = await fetch(videosUrl);
  if (!videosResp.ok) throw new Error(`YouTube videos ${videosResp.status}`);
  const videosData = await videosResp.json();
  return (videosData.items || []).slice(0, 3).map((item) => ({
    title: item.snippet?.title || '未命名影片',
    channel: item.snippet?.channelTitle || '未知頻道',
    url: `https://www.youtube.com/watch?v=${item.id}`,
    views: Number(item.statistics?.viewCount || 0),
    likes: Number(item.statistics?.likeCount || 0),
    comments: Number(item.statistics?.commentCount || 0),
    publishedAt: item.snippet?.publishedAt || '',
    viewSignal: `${compact(item.statistics?.viewCount)} 次觀看`,
    sourceMode: 'youtube-data-api',
    ...strategyFromTitle(item.snippet?.title || ''),
  }));
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed'});
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY || process.env.GOOGLE_YOUTUBE_API_KEY;
  const source = String(req.query.source || '');
  const excludeId = extractVideoId(req.query.exclude || source);
  const sourceMeta = await sourceMetadata(source);
  const rawQuery = String(req.query.q || sourceMeta?.title || '');
  const q = cleanQuery(rawQuery) || '創業 商業模式 成長';

  try {
    let items = [];
    let mode = 'youtube-web+oembed';
    if (apiKey) {
      try {
        items = await apiSearch(apiKey, q, excludeId);
        mode = 'youtube-data-api';
      } catch {
        items = [];
      }
    }
    if (items.length < 3) {
      items = await fallbackSearch(q, excludeId);
      mode = 'youtube-web+oembed';
    }
    return res.status(200).json({
      items: items.filter((x) => x.url && extractVideoId(x.url) !== excludeId).slice(0, 3),
      verified: items.length > 0,
      query: q,
      sourceTitle: sourceMeta?.title || '',
      sourceChannel: sourceMeta?.channel || '',
      mode,
      reason: items.length ? '' : '未找到可驗證的公開同題材影片。',
    });
  } catch (error) {
    return res.status(200).json({items: [], verified: false, query: q, reason: error instanceof Error ? error.message : '競品搜尋失敗'});
  }
}
