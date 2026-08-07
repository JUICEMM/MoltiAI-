const cleanQuery = (value = '') => value
  .replace(/[｜|].*$/g, ' ')
  .replace(/[#【】\[\]()（）]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()
  .slice(0, 90);

const compact = (n) => {
  const value = Number(n || 0);
  if (value >= 100000000) return `${(value / 100000000).toFixed(1)}億`;
  if (value >= 10000) return `${(value / 10000).toFixed(1)}萬`;
  return value.toLocaleString('zh-TW');
};

const analyzeCandidate = (item) => {
  const title = item.snippet?.title || '';
  const views = Number(item.statistics?.viewCount || 0);
  const comments = Number(item.statistics?.commentCount || 0);
  const likes = Number(item.statistics?.likeCount || 0);
  const signals = [];
  if (/\d|億|萬|%|年|月|天/.test(title)) signals.push('標題使用數字／成果訊號，容易快速建立具體期待');
  if (/如何|怎麼|步驟|方法|秘訣|教你|攻略|為什麼/.test(title)) signals.push('採教學或問題解法型標題，搜尋意圖清楚');
  if (/我|案例|實戰|從.*到|成功|失敗|真實/.test(title)) signals.push('使用人物／案例敘事，可強化可信度與故事張力');
  if (views >= 100000) signals.push(`已有 ${compact(views)} 次觀看，可作為市場題材驗證訊號`);
  if (comments >= 100) signals.push(`留言 ${compact(comments)}，互動深度值得觀察`);
  if (!signals.length) signals.push('可拆解其標題承諾、前三秒開場、內容節奏與 CTA，作為同題材結構參考');
  return signals.slice(0, 3).join('；');
};

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({error: 'Method not allowed'});
  const apiKey = process.env.YOUTUBE_API_KEY || process.env.YOUTUBE_DATA_API_KEY || process.env.GOOGLE_YOUTUBE_API_KEY;
  const q = cleanQuery(String(req.query.q || ''));
  const exclude = String(req.query.exclude || '').trim();
  if (!q) return res.status(400).json({error: 'Missing q'});
  if (!apiKey) return res.status(200).json({items: [], verified: false, reason: 'YouTube API key 未設定，系統不會捏造競品影片。'});

  try {
    const searchUrl = new URL('https://www.googleapis.com/youtube/v3/search');
    searchUrl.searchParams.set('part', 'snippet');
    searchUrl.searchParams.set('type', 'video');
    searchUrl.searchParams.set('maxResults', '8');
    searchUrl.searchParams.set('order', 'relevance');
    searchUrl.searchParams.set('q', q);
    searchUrl.searchParams.set('key', apiKey);
    searchUrl.searchParams.set('relevanceLanguage', 'zh-Hant');
    const searchResp = await fetch(searchUrl);
    if (!searchResp.ok) throw new Error(`YouTube search ${searchResp.status}`);
    const searchData = await searchResp.json();
    const ids = (searchData.items || []).map((x) => x.id?.videoId).filter(Boolean).filter((id) => id !== exclude).slice(0, 6);
    if (!ids.length) return res.status(200).json({items: [], verified: true, reason: '未找到足夠相關的公開影片。'});

    const videosUrl = new URL('https://www.googleapis.com/youtube/v3/videos');
    videosUrl.searchParams.set('part', 'snippet,statistics,contentDetails');
    videosUrl.searchParams.set('id', ids.join(','));
    videosUrl.searchParams.set('key', apiKey);
    const videosResp = await fetch(videosUrl);
    if (!videosResp.ok) throw new Error(`YouTube videos ${videosResp.status}`);
    const videosData = await videosResp.json();
    const items = (videosData.items || []).slice(0, 3).map((item) => ({
      title: item.snippet?.title || '未命名影片',
      channel: item.snippet?.channelTitle || '未知頻道',
      url: `https://www.youtube.com/watch?v=${item.id}`,
      views: Number(item.statistics?.viewCount || 0),
      likes: Number(item.statistics?.likeCount || 0),
      comments: Number(item.statistics?.commentCount || 0),
      publishedAt: item.snippet?.publishedAt || '',
      analysis: analyzeCandidate(item),
    }));
    return res.status(200).json({items, verified: true, query: q});
  } catch (error) {
    return res.status(200).json({items: [], verified: false, reason: error instanceof Error ? error.message : '競品搜尋失敗'});
  }
}
