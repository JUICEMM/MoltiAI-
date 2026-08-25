(() => {
  const patch = () => {
    document.querySelectorAll('input[type="file"][multiple]').forEach((input) => {
      input.setAttribute('accept', 'image/png,image/jpeg,image/webp,image/svg+xml');
    });
    document.querySelectorAll('h1').forEach((h) => {
      if (h.textContent?.includes('內容與 AI 影音生產線')) {
        const p = h.parentElement?.querySelector('p');
        if (p) p.textContent = 'Video Factory：分析 → 策略 → 腳本 → 影片生成。Autopilot V2（影片素材、自動選鏡、字幕）已進開發分支，正式 renderer 維持穩定版。';
      }
    });
  };
  const observer = new MutationObserver(patch);
  observer.observe(document.documentElement, {childList:true, subtree:true});
  patch();
})();
