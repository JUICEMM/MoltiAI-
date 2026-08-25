(() => {
  const patch = () => {
    document.querySelectorAll('input[type="file"][multiple]').forEach((input) => {
      input.setAttribute('accept', 'image/*,video/mp4,video/quicktime,video/webm');
      const label = input.closest('label');
      if (label && label.textContent?.includes('圖片素材')) {
        for (const node of Array.from(label.childNodes)) {
          if (node.nodeType === Node.TEXT_NODE && node.textContent?.includes('圖片素材')) node.textContent = '圖片 / 影片素材';
        }
        const small = label.querySelector('small');
        if (small) small.textContent = '可混合上傳 3–5 個圖片或影片；系統會自動判斷素材類型、排序、切段並加字幕。';
      }
    });
    document.querySelectorAll('h1').forEach((h) => {
      if (h.textContent?.includes('把策略與腳本變成 15 秒短影音')) {
        const p = h.parentElement?.querySelector('p');
        if (p) p.textContent = '上傳圖片或影片素材，系統自動選段、切鏡、字幕、音樂與 CTA，輸出 15 秒直式短影音。';
      }
      if (h.textContent?.includes('內容與 AI 影音生產線')) {
        const p = h.parentElement?.querySelector('p');
        if (p) p.textContent = 'Video Factory V2：素材理解 → 自動選鏡 → Timeline → 字幕 / 音樂 → Render → 人工審核。';
      }
    });
    document.querySelectorAll('.factoryFlow button p').forEach((p) => {
      if (p.textContent?.includes('3–5 張圖')) p.textContent = 'Prompt + 圖片 / 影片 + 自動選鏡 / 字幕 / 音樂';
    });
  };
  const observer = new MutationObserver(patch);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  patch();
})();
