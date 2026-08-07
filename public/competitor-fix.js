(() => {
  const nativeFetch = window.fetch.bind(window);

  const parseBody = (body) => {
    if (!body || typeof body !== 'string') return {};
    try { return JSON.parse(body); } catch { return {}; }
  };

  const videoIdFromUrl = (value = '') => {
    try {
      const u = new URL(value);
      if (u.hostname.includes('youtu.be')) return u.pathname.split('/').filter(Boolean)[0] || '';
      return u.searchParams.get('v') || '';
    } catch { return ''; }
  };

  const deriveQuery = (requestBody, data) => {
    if (requestBody.title && requestBody.title.trim()) return requestBody.title.trim();
    const candidates = [data?.title, data?.sourceTitle, data?.metadata?.title, data?.videoTitle].filter(Boolean);
    if (candidates.length) return String(candidates[0]).trim();
    const first = Array.isArray(data?.comparisons) ? String(data.comparisons[0] || '') : '';
    if (first) return first.split('｜')[0].replace(/^(\d+[.、]\s*)/, '').trim();
    if (requestBody.description) return String(requestBody.description).split(/[。！？\n]/)[0].trim();
    return '';
  };

  const formatNumber = (n) => {
    const value = Number(n || 0);
    if (value >= 100000000) return `${(value / 100000000).toFixed(1)}億`;
    if (value >= 10000) return `${(value / 10000).toFixed(1)}萬`;
    return value.toLocaleString('zh-TW');
  };

  window.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    const response = await nativeFetch(input, init);
    if (!/\/analyze(?:\?|$)/.test(url)) return response;

    try {
      const data = await response.clone().json();
      const requestBody = parseBody(init?.body);
      const query = deriveQuery(requestBody, data);
      const exclude = videoIdFromUrl(requestBody.url || '');

      if (!query) {
        data.comparisons = ['目前缺少可用的影片標題／主題，無法搜尋可驗證的同題材競品；請補上標題或描述。'];
      } else {
        const competitorResponse = await nativeFetch(`/api/video/competitors?q=${encodeURIComponent(query)}&exclude=${encodeURIComponent(exclude)}`);
        const competitorData = await competitorResponse.json();
        if (Array.isArray(competitorData.items) && competitorData.items.length) {
          data.comparisons = competitorData.items.map((item, index) => {
            const stats = item.views ? `觀看 ${formatNumber(item.views)}` : '觀看數未提供';
            return `${index + 1}. ${item.title}｜頻道：${item.channel}｜${stats}｜值得借鏡：${item.analysis}｜連結：${item.url}`;
          });
          data.metadataPlan = `${data.metadataPlan || ''} 競品對照已改為 YouTube 公開搜尋的可驗證影片，包含頻道、觀看訊號、連結與內容角度分析。`.trim();
        } else {
          data.comparisons = [`目前未取得可驗證的公開競品影片：${competitorData.reason || '搜尋結果不足'}。系統不再用原影片標題自行製造三個假對照組。`];
        }
      }

      return new Response(JSON.stringify(data), {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch {
      return response;
    }
  };

  const enhanceComparisonUi = () => {
    document.querySelectorAll('h3').forEach((heading) => {
      if (heading.textContent?.trim() === '同題材對照組') heading.textContent = '市場競品與標竿內容分析';
    });

    document.querySelectorAll('.analysis li').forEach((li) => {
      if (li.querySelector('a')) return;
      const text = li.textContent || '';
      const match = text.match(/https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]+/);
      if (!match) return;
      const before = text.slice(0, match.index).replace(/連結：\s*$/, '');
      const after = text.slice((match.index || 0) + match[0].length);
      li.textContent = before;
      const link = document.createElement('a');
      link.href = match[0];
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = '查看 YouTube 影片';
      link.style.marginLeft = '8px';
      link.style.fontWeight = '700';
      li.appendChild(link);
      if (after.trim()) li.appendChild(document.createTextNode(after));
    });
  };

  new MutationObserver(enhanceComparisonUi).observe(document.documentElement, {subtree: true, childList: true});
  window.addEventListener('DOMContentLoaded', enhanceComparisonUi);
})();
