(() => {
  const originalFetch = window.fetch.bind(window);
  const YT_ID = /(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/;

  const extractId = (value = '') => String(value).match(YT_ID)?.[1] || '';
  const cleanTopic = (value = '') => String(value)
    .replace(/師父商學院\s*EP\s*\d+\s*[-–—:]?/gi, '')
    .replace(/\bEP\s*\d+\b/gi, '')
    .replace(/[｜|].*$/g, '')
    .replace(/【.*?】|\[.*?\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const buildHooks = (title = '', competitors = []) => {
    const topic = cleanTopic(title) || '這個主題';
    const corpus = `${topic} ${competitors.map((x) => x.title).join(' ')}`;
    if (/創業|10\s*億|十億|賺錢|商業|營收|公司|生意/.test(corpus)) {
      return [
        '創業最先拖垮你的，可能不是沒客戶，而是固定成本。',
        '從 0 做到規模化，第一步通常不是創新，而是先找到已被驗證的模式。',
        '有產品卻沒有流量，生意其實還沒有真正開始。',
        '真正能把公司放大的，不是更努力，而是把成功流程變成可以複製。',
        '如果只能重做一次創業，我會先把這三個高成本錯誤拿掉。',
      ];
    }
    if (/SEO|搜尋|排名|流量|網站/.test(corpus)) {
      return [
        '網站有內容卻沒詢問，問題可能根本不是 SEO 做得不夠。',
        '排名上去不等於有客戶，真正要看的其實是這三個轉換點。',
        '同樣做 SEO，為什麼有人有流量卻沒有訂單？',
        '別再只追關鍵字排名，先檢查流量進站後發生了什麼。',
        '如果 SEO 做了半年還沒帶來詢問，先從這個地方重做。',
      ];
    }
    const short = topic.length > 28 ? `${topic.slice(0, 28)}…` : topic;
    return [
      `多數人談「${short}」時，真正忽略的是結果怎麼被做出來。`,
      `如果只用 15 秒講清楚「${short}」，我會先講這個關鍵。`,
      '同一個主題，為什麼有些影片前三秒就讓人想看完？',
      '別急著介紹內容，先把觀眾最在意的結果放到第一句。',
      `把「${short}」改成短影音，最值得保留的不是標題，而是證據。`,
    ];
  };

  const buildStoryboard = (hooks, title = '') => {
    const topic = cleanTopic(title) || '主題';
    return [
      `0-3s：直接說「${hooks[0]}」，畫面先出結果或最強反差，不再重複影片標題。`,
      `3-6s：用一句話交代「${topic}」真正的痛點／目標，讓觀眾知道這和自己有什麼關係。`,
      '6-10s：只講 2 個可驗證重點；優先使用數字、案例、Before / After 或具體步驟。',
      '10-13s：加入一個競品沒有講清楚的差異化觀點，轉成品牌自己的方法。',
      '13-15s：只保留一個 CTA，例如留言關鍵字、私訊、預約或進入下一步生成。',
    ];
  };

  const comparisonText = (x) => {
    const date = x.publishedAt ? new Date(x.publishedAt).toLocaleDateString('zh-TW') : '公開 fallback 未提供';
    return `${x.title}\n頻道：${x.channel}｜發布：${date}｜觀看訊號：${x.viewSignal || '未提供'}\n內容角度：${x.angle || '同題材觀點'}\nHook：${x.hook || '先結果、再方法'}\n結構：${x.structure || 'Hook → 方法 → 證據 → CTA'}\n值得借鏡：${x.takeaway || '拆解標題承諾與前三秒節奏'}\nMoltiAI 差異化：${x.differentiation || '轉成單一痛點與單一 CTA 的短影音'}\n連結：${x.url}`;
  };

  async function enhanceAnalyzeResponse(response, requestBody) {
    try {
      const data = await response.clone().json();
      if (!data || typeof data !== 'object') return response;
      const source = String(requestBody?.url || data.url || '');
      if (!/youtu(?:be\.com|\.be)/i.test(source)) return response;
      const requestedTitle = String(requestBody?.title || '').trim();
      const q = cleanTopic(requestedTitle);
      const endpoint = new URL('/api/video/competitors', window.location.origin);
      endpoint.searchParams.set('source', source);
      if (q) endpoint.searchParams.set('q', q);
      const id = extractId(source);
      if (id) endpoint.searchParams.set('exclude', id);
      const competitorResponse = await originalFetch(endpoint.toString(), {headers: {'Accept': 'application/json'}});
      const competitorData = competitorResponse.ok ? await competitorResponse.json() : {items: []};
      const competitors = Array.isArray(competitorData.items) ? competitorData.items.filter((x) => x?.url && extractId(x.url) !== id).slice(0, 3) : [];
      const sourceTitle = String(competitorData.sourceTitle || requestedTitle || '').trim();
      const hooks = buildHooks(sourceTitle, competitors);
      data.hooks = hooks;
      data.storyboard = buildStoryboard(hooks, sourceTitle);
      data.comparisons = competitors.length
        ? competitors.map(comparisonText)
        : ['目前未找到可驗證的公開同題材影片；系統已停止製造假競品。請稍後重試或補充更明確的影片主題。'];
      data.metadataPlan = competitors.length
        ? `來源辨識：YouTube 已驗證。競品證據：${competitors.length}/3 Verified（${competitorData.mode || 'public search'}）。競品均有可驗證 YouTube URL，且已排除原影片與原頻道。`
        : '來源辨識：YouTube 已驗證。競品搜尋未取得足夠可驗證結果，因此不顯示假競品；Hook 已改用主題語意重寫，不再截斷原標題。';
      data.confidence = competitors.length >= 3 ? 'high' : competitors.length ? 'medium' : 'fallback';
      data.scores = {...(data.scores || {}), density: Math.max(3, Number(data.scores?.density || 3))};
      data.videoPrompt = `主題：${cleanTopic(sourceTitle) || '短影音主題'}\nHook：${hooks[0]}\n分鏡：${data.storyboard.join(' ')}\nCTA：只保留一個明確行動`;
      const headers = new Headers(response.headers);
      headers.set('content-type', 'application/json; charset=utf-8');
      return new Response(JSON.stringify(data), {status: response.status, statusText: response.statusText, headers});
    } catch (error) {
      console.warn('[MoltiAI Analyze V2] enhancement skipped', error);
      return response;
    }
  }

  window.fetch = async (input, init) => {
    const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);
    const isAnalyze = /\/analyze(?:\?|$)/.test(requestUrl) && !/\/api\/video\/competitors/.test(requestUrl);
    let body = null;
    if (isAnalyze && init?.body && typeof init.body === 'string') {
      try { body = JSON.parse(init.body); } catch { body = null; }
    }
    const response = await originalFetch(input, init);
    return isAnalyze && response.ok ? enhanceAnalyzeResponse(response, body) : response;
  };

  const style = document.createElement('style');
  style.textContent = `
    .analysis ol li { white-space: pre-line; margin-bottom: 14px; }
    .analysis ol li a.moltiai-source-link { display:inline-block; margin-top:6px; font-weight:700; text-decoration:underline; }
  `;
  document.head.appendChild(style);

  const decorate = () => {
    document.querySelectorAll('.analysis h3').forEach((h3) => {
      if (h3.textContent?.includes('同題材對照組')) h3.textContent = '市場競品與標竿內容分析';
    });
    document.querySelectorAll('.analysis ol li').forEach((li) => {
      if (li.querySelector('a.moltiai-source-link')) return;
      const text = li.textContent || '';
      const match = text.match(/連結：(https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11})/);
      if (!match) return;
      const cleaned = text.replace(/\n?連結：https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}/, '');
      li.textContent = cleaned;
      const a = document.createElement('a');
      a.className = 'moltiai-source-link';
      a.href = match[1];
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = '查看 YouTube 影片';
      li.appendChild(document.createElement('br'));
      li.appendChild(a);
    });
  };
  new MutationObserver(decorate).observe(document.documentElement, {subtree: true, childList: true});
  window.addEventListener('DOMContentLoaded', decorate);
})();
