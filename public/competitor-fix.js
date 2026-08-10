(() => {
  const originalFetch = window.fetch.bind(window);
  const YT_ID = /(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/;

  const isLegacyAnalyze = (url) => {
    try {
      const u = new URL(url, window.location.origin);
      return /\/analyze$/.test(u.pathname) && u.pathname !== '/api/video/analyze';
    } catch { return false; }
  };

  // Analyze URL V2: never rely on the legacy worker strategy output. The local Vercel API
  // combines source metadata, verified competitor URLs and DeepSeek semantic rewriting.
  window.fetch = async (input, init) => {
    const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    if (isLegacyAnalyze(requestUrl) && init?.method?.toUpperCase() === 'POST') {
      const endpoint = new URL('/api/video/analyze', window.location.origin);
      const response = await originalFetch(endpoint.toString(), {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'Accept': 'application/json'},
        body: init?.body,
      });
      if (!response.ok) {
        let detail = '';
        try { detail = await response.clone().text(); } catch {}
        console.error('[MoltiAI Analyze V2]', response.status, detail);
      }
      return response;
    }
    return originalFetch(input, init);
  };

  const style = document.createElement('style');
  style.textContent = `
    .analysis ol li{white-space:pre-line;margin-bottom:16px;line-height:1.7}
    .analysis ol li a.moltiai-source-link{display:inline-block;margin-top:8px;font-weight:700;text-decoration:underline}
    .analysis .evidence-badge{display:inline-flex;padding:4px 8px;border-radius:999px;font-size:12px;font-weight:700;background:#ecfdf5;color:#047857;margin-left:8px}
  `;
  document.head.appendChild(style);

  const decorate = () => {
    document.querySelectorAll('.analysis h3').forEach((h3) => {
      if (h3.textContent?.includes('同題材對照組')) h3.textContent = '市場競品與標竿內容分析';
      if (h3.textContent?.includes('市場競品與標竿內容分析') && !h3.querySelector('.evidence-badge')) {
        const list = h3.parentElement?.querySelector('ol');
        const verified = list ? [...list.querySelectorAll('li')].filter((li) => /https:\/\/www\.youtube\.com\/watch\?v=/.test(li.textContent || '')).length : 0;
        if (verified) {
          const badge = document.createElement('span');
          badge.className = 'evidence-badge';
          badge.textContent = `${verified} Verified`;
          h3.appendChild(badge);
        }
      }
    });

    document.querySelectorAll('.analysis ol li').forEach((li) => {
      if (li.querySelector('a.moltiai-source-link')) return;
      const text = li.textContent || '';
      const match = text.match(/連結：(https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11})/);
      if (!match) return;
      const sourceId = match[1].match(YT_ID)?.[1] || '';
      li.textContent = text.replace(/\n?連結：https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}/, '');
      const a = document.createElement('a');
      a.className = 'moltiai-source-link';
      a.href = match[1];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.dataset.videoId = sourceId;
      a.textContent = '查看 YouTube 影片';
      li.appendChild(document.createElement('br'));
      li.appendChild(a);
    });
  };

  new MutationObserver(decorate).observe(document.documentElement, {subtree:true, childList:true});
  window.addEventListener('DOMContentLoaded', decorate);
})();
