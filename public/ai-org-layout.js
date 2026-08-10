(() => {
  const PANEL_ID = 'moltiai-os-panel';
  const STYLE_ID = 'moltiai-os-style';

  const models = {
    gemini: {name:'Gemini', role:'Research / Google / Data', keywords:['研究','搜尋','資料','市場','競品','趨勢','google','數據','新聞','調查','比較']},
    claude: {name:'Claude', role:'Consultant / Strategy / Writing', keywords:['策略','顧問','提案','報告','制度','政策','企劃','文案','課程','分析','治理','roadmap']},
    copilot: {name:'Copilot', role:'Microsoft 365 / Office', keywords:['excel','word','powerpoint','ppt','outlook','office','表格','試算表','信件','會議','文件','microsoft']},
    codex: {name:'Codex', role:'Code / GitHub / Engineering', keywords:['程式','網站','github','git','api','修復','bug','部署','vercel','code','開發','測試','工程','資料庫']},
  };

  const routeTask = (task='') => {
    const text = String(task).toLowerCase();
    const ranked = Object.entries(models).map(([id,m]) => ({id, score:m.keywords.reduce((n,k)=>n+(text.includes(k.toLowerCase())?1:0),0)})).sort((a,b)=>b.score-a.score);
    const primary = ranked[0].score ? ranked[0].id : 'claude';
    const secondary = ranked[1].score > 0 ? ranked[1].id : null;
    const approval = /寄出|發布|付款|報價|合約|刪除|部署|上線|客戶|正式/.test(text);
    return {primary, secondary, approval};
  };

  const installStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID}{margin:0 0 26px;border:1px solid rgba(255,255,255,.1);background:#0f1623;border-radius:18px;padding:24px;color:#fff}
      #${PANEL_ID} h2{margin:6px 0 8px;font-size:28px} #${PANEL_ID} p{color:#aeb8c8;line-height:1.6}
      .m-os-eyebrow{font-size:12px;letter-spacing:.14em;color:#8bb7ff;font-weight:800}
      .m-os-flow{display:grid;gap:12px;margin-top:20px}.m-os-node{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);border-radius:12px;padding:16px;text-align:center}.m-os-node strong{display:block;font-size:19px}.m-os-node span{font-size:12px;color:#8bb7ff;font-weight:800}.m-os-arrow{text-align:center;color:#75839a;font-size:20px}
      .m-os-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.m-os-grid .m-os-node{text-align:left;min-height:120px}.m-os-grid b{display:block;margin-top:8px;font-size:13px;color:#8bb7ff}.m-os-grid p{font-size:12px;margin:6px 0 0}
      .m-os-router{margin-top:20px;border-top:1px solid rgba(255,255,255,.08);padding-top:18px}.m-os-router h3{margin:0 0 6px}.m-os-row{display:grid;grid-template-columns:1fr auto;gap:8px}.m-os-row textarea{min-height:88px;background:#080e17;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:12px;font:inherit}.m-os-row button{border:0;border-radius:10px;padding:0 16px;background:#8bb7ff;color:#07101b;font-weight:800;cursor:pointer}.m-os-result{display:none;margin-top:12px;padding:14px;border-radius:10px;background:#0a1019;white-space:pre-wrap;color:#b8c2d0;line-height:1.55}.m-os-result.show{display:block}
      .m-os-tools{margin-top:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.m-os-tool{border:1px solid rgba(255,255,255,.1);background:#151d2b;color:#fff;border-radius:10px;padding:13px;text-align:left;cursor:pointer}.m-os-tool strong{display:block}.m-os-tool span{display:block;color:#929daf;font-size:12px;margin-top:4px}
      @media(max-width:900px){.m-os-grid{grid-template-columns:repeat(2,minmax(0,1fr))}} @media(max-width:620px){.m-os-grid,.m-os-tools,.m-os-row{grid-template-columns:1fr}.m-os-row button{padding:12px}}
    `;
    document.head.appendChild(style);
  };

  const clickNav = (label) => {
    const buttons = [...document.querySelectorAll('.sidebar nav button')];
    const target = buttons.find(b => (b.textContent || '').includes(label));
    if (target) target.click();
  };

  const buildPanel = () => {
    const panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="m-os-eyebrow">MOLTIAI AI OPERATING SYSTEM</div>
      <h2>Michael 決策，ChatGPT 管理，專業 AI 執行</h2>
      <p>Human Decision → ChatGPT Operations Manager → Gemini / Claude / Copilot / Codex。高風險動作保留 Human Approval。</p>
      <div class="m-os-flow">
        <div class="m-os-node"><span>CEO / DECISION MAKER</span><strong>Michael</strong><p>Strategy · Budget · Final Approval</p></div>
        <div class="m-os-arrow">↓</div>
        <div class="m-os-node"><span>AI OPERATIONS MANAGER</span><strong>ChatGPT</strong><p>Agent · Workflow · Routing · QA · Execution Management</p></div>
        <div class="m-os-arrow">↓</div>
        <div class="m-os-grid">
          <div class="m-os-node"><span>RESEARCH</span><strong>Gemini</strong><b>Research / Google / Data</b><p>搜尋、資料蒐集、競品與趨勢研究。</p></div>
          <div class="m-os-node"><span>CONSULTANT</span><strong>Claude</strong><b>Consultant / Strategy / Writing</b><p>策略、提案、制度文件與顧問分析。</p></div>
          <div class="m-os-node"><span>OFFICE</span><strong>Copilot</strong><b>Microsoft 365 / Office</b><p>Word、Excel、PowerPoint、Outlook。</p></div>
          <div class="m-os-node"><span>ENGINEER</span><strong>Codex</strong><b>Code / GitHub / Engineering</b><p>程式、修復、測試、GitHub 與部署。</p></div>
        </div>
      </div>
      <div class="m-os-router">
        <h3>ChatGPT AI Task Router</h3>
        <p>輸入任務，先判斷應由哪個專業 AI 執行，再顯示 Workflow 與 Human Approval。</p>
        <div class="m-os-row"><textarea placeholder="例如：研究 20 家上市櫃製造業潛在客戶，整理 AI 導入需求並提出開發策略。"></textarea><button>分析並路由</button></div>
        <div class="m-os-result"></div>
      </div>
      <div class="m-os-tools">
        <button class="m-os-tool" data-nav="影片分析"><strong>影片分析 / PDF 報告</strong><span>Analyze URL → 競品 → Hook → 分鏡 → PDF</span></button>
        <button class="m-os-tool" data-nav="腳本"><strong>腳本 / 15 秒影片</strong><span>Script + 圖片 → 15 秒短影音</span></button>
        <button class="m-os-tool" data-nav="Video Factory"><strong>Video Factory</strong><span>保留完整內容與 AI 影音流程</span></button>
      </div>`;

    const ta = panel.querySelector('textarea');
    const result = panel.querySelector('.m-os-result');
    panel.querySelector('.m-os-row button').addEventListener('click', () => {
      const task = ta.value.trim();
      if (!task) return;
      const r = routeTask(task); const p = models[r.primary]; const s = r.secondary ? models[r.secondary] : null;
      result.textContent = `ChatGPT Routing\nPrimary: ${p.name} — ${p.role}${s ? `\nCollaborator: ${s.name} — ${s.role}` : ''}\nHuman Approval: ${r.approval ? 'Required' : 'Final review'}\n\nWorkflow\n1. Michael 定義目標與限制\n2. ChatGPT 拆解任務與成功標準\n3. ${p.name}${s ? ` + ${s.name}` : ''} 執行\n4. ChatGPT 整合與 QA\n5. Michael 最終確認`;
      result.classList.add('show');
    });
    panel.querySelectorAll('[data-nav]').forEach(btn => btn.addEventListener('click', () => clickNav(btn.getAttribute('data-nav') || '')));
    return panel;
  };

  const mount = () => {
    try {
      installStyles();
      if (document.getElementById(PANEL_ID)) return true;
      const page = document.querySelector('.workspacePage');
      const header = page?.querySelector('.pageHeader');
      if (!page || !header) return false;
      header.insertAdjacentElement('afterend', buildPanel());
      return true;
    } catch (e) {
      console.warn('[MoltiAI OS] mount skipped', e);
      return false;
    }
  };

  const start = () => {
    let tries = 0;
    const timer = setInterval(() => { tries += 1; if (mount() || tries > 20) clearInterval(timer); }, 400);
    document.addEventListener('click', (event) => {
      if (event.target.closest('.sidebar nav button')) setTimeout(() => mount(), 300);
    }, true);
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();