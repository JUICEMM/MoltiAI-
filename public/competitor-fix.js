(() => {
  const originalFetch = window.fetch.bind(window);
  const YT_ID = /(?:v=|youtu\.be\/|shorts\/)([A-Za-z0-9_-]{11})/;

  const isLegacyAnalyze = (url) => {
    try {
      const u = new URL(url, window.location.origin);
      return /\/analyze$/.test(u.pathname) && u.pathname !== '/api/video/analyze';
    } catch { return false; }
  };

  // Analyze URL V2: route legacy worker analyze calls through the Vercel API that combines
  // source metadata, verified competitor URLs and DeepSeek semantic rewriting.
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
    .moltiai-render-note{font-size:12px;color:#64748b;margin-top:8px;line-height:1.5}
  `;
  document.head.appendChild(style);

  const printableReport = () => {
    const analysis = document.querySelector('.analysis');
    if (!analysis) return false;
    const copy = analysis.cloneNode(true);
    copy.querySelectorAll('button').forEach((el) => el.remove());
    const sourceInput = [...document.querySelectorAll('input')].find((el) => /youtube|instagram|tiktok|facebook|douyin|xiaohongshu|youtu\.be/i.test(el.value || ''));
    const source = sourceInput?.value || '';
    const report = window.open('', '_blank', 'noopener,noreferrer');
    if (!report) {
      alert('瀏覽器阻擋了報告視窗，請允許此網站開啟彈出視窗後再試一次。');
      return true;
    }
    const escapedSource = source.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    report.document.open();
    report.document.write(`<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><title>MoltiAI 短影音策略報告</title><style>
      @page{size:A4;margin:14mm}*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans TC","Microsoft JhengHei",sans-serif;color:#0f172a;line-height:1.65;margin:0;background:#f8fafc}.print-hint{position:sticky;top:0;z-index:5;padding:12px 18px;background:#eaf4ff;border-bottom:1px solid #bfdbfe;color:#17324d;font-size:13px}main{max-width:780px;margin:24px auto;background:#fff;padding:36px;box-shadow:0 18px 45px rgba(15,23,42,.12)}h1{font-size:24px;margin:0 0 4px}h2{font-size:19px;margin-top:24px}h3{font-size:16px;margin-top:20px}p,li{font-size:13px}ol,ul{padding-left:22px}.head{border-bottom:2px solid #111827;padding-bottom:12px;margin-bottom:18px}.muted{color:#64748b;font-size:11px}.disclosure{margin:18px 0;padding:12px 14px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;color:#334155;font-size:12px}.analysis ol li{white-space:pre-line;margin-bottom:14px}.evidence-badge{display:inline-block;font-size:10px;margin-left:6px}.moltiai-source-link{word-break:break-all;color:#1d4ed8}button{display:none!important}@media print{body{background:white}.print-hint{display:none!important}main{margin:0;padding:0;box-shadow:none}a{color:#111827;text-decoration:none}.no-print{display:none!important}}</style></head><body><div class="print-hint">請在列印視窗選擇「另存為 PDF」，紙張選 A4；若色塊沒有出現，請開啟「背景圖形」。這段提示不會印到 PDF。</div><main><div class="head"><h1>MoltiAI 短影音策略報告</h1><div class="muted">來源：${escapedSource || '依頁面輸入資料'}<br>產生時間：${new Date().toLocaleString('zh-TW')}</div></div><div class="disclosure">執行說明：MoltiAI 會以影片 metadata、DeepSeek 內容理解、真實競品搜尋、URL 驗證與排除原影片的流程產出策略。Gemini Role 使用 Gemini Native；ChatGPT / Claude / Copilot / Codex Role 目前由 DeepSeek Engine 執行，不應對外宣稱為原生 Claude、Copilot、Codex 或 ChatGPT API。</div>${copy.outerHTML}<p class="muted">MoltiAI / 瞬影科技 - AI 分析內容仍應由人工做品牌、事實與授權確認。</p></main><script>window.onload=()=>setTimeout(()=>window.print(),350)<\/script></body></html>`);
    report.document.close();
    return true;
  };

  // Capture PDF buttons before React's old Type1-font PDF handler runs. Browser print keeps
  // Traditional Chinese glyphs intact and lets the user save a real PDF without mojibake.
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button');
    if (!button) return;
    const text = button.textContent || '';
    if (/PDF|報告/.test(text) && document.querySelector('.analysis')) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      printableReport();
    }
  }, true);

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

    // Explain the real render duration instead of making a long-running job look broken.
    document.querySelectorAll('button').forEach((button) => {
      if (!/生成 15 秒影片|生成影片|開始生成/i.test(button.textContent || '')) return;
      if (button.parentElement?.querySelector('.moltiai-render-note')) return;
      const note = document.createElement('div');
      note.className = 'moltiai-render-note';
      note.textContent = '影片由 Render Worker 實際渲染；首次冷啟動約 1–2 分鐘，請保持頁面開啟，不要重複點擊。';
      button.parentElement?.appendChild(note);
    });
  };

  new MutationObserver(decorate).observe(document.documentElement, {subtree:true, childList:true});
  window.addEventListener('DOMContentLoaded', decorate);
})();
