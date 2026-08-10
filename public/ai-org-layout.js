(() => {
  const STYLE_ID = 'moltiai-ai-org-style';
  const PANEL_ID = 'moltiai-ai-org-panel';

  const clickNav = (label) => {
    const buttons = [...document.querySelectorAll('.sidebar nav button')];
    const target = buttons.find((button) => (button.textContent || '').includes(label));
    if (target) target.click();
  };

  const installStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .moltiai-ai-org{margin:0 0 28px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,rgba(18,25,39,.98),rgba(10,14,23,.98));border-radius:18px;padding:28px;overflow:hidden;position:relative}
      .moltiai-ai-org:before{content:'';position:absolute;inset:-120px auto auto 45%;width:360px;height:260px;background:radial-gradient(circle,rgba(110,168,255,.16),transparent 65%);pointer-events:none}
      .moltiai-ai-org-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:24px;position:relative}
      .moltiai-ai-org-head .eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8bb7ff;font-weight:800}
      .moltiai-ai-org-head h2{font-size:30px;line-height:1.15;margin:8px 0 8px;color:#fff}
      .moltiai-ai-org-head p{margin:0;color:#aeb7c8;max-width:760px;line-height:1.65}
      .moltiai-flow{display:grid;gap:14px;position:relative}
      .moltiai-node{border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.035);padding:18px 20px;box-shadow:0 12px 30px rgba(0,0,0,.18)}
      .moltiai-node strong{display:block;color:#fff;font-size:19px;margin-bottom:3px}.moltiai-node span{display:block;color:#8bb7ff;font-size:13px;font-weight:800;margin-bottom:8px}.moltiai-node p{margin:0;color:#b7c0cf;line-height:1.55;font-size:14px}
      .moltiai-human{max-width:430px;margin:0 auto;text-align:center;border-color:rgba(215,241,113,.28);background:rgba(215,241,113,.07)}
      .moltiai-human span{color:#d7f171}.moltiai-manager{max-width:600px;margin:0 auto;text-align:center;border-color:rgba(139,183,255,.36);background:rgba(139,183,255,.08)}
      .moltiai-manager strong{font-size:22px}.moltiai-arrow{text-align:center;color:#748197;font-size:22px;line-height:1;height:22px}
      .moltiai-model-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
      .moltiai-model{min-height:160px;display:flex;flex-direction:column}.moltiai-model .model-role{font-size:13px;color:#8bb7ff;font-weight:800;margin-bottom:8px}.moltiai-model .model-tools{margin-top:auto;padding-top:12px;color:#8894a8;font-size:12px;border-top:1px solid rgba(255,255,255,.08)}
      .moltiai-operating-note{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:18px}.moltiai-operating-note div{padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.03);color:#9da8ba;font-size:13px}.moltiai-operating-note b{display:block;color:#fff;margin-bottom:4px}
      .moltiai-tool-strip{margin-top:24px;padding-top:22px;border-top:1px solid rgba(255,255,255,.08)}.moltiai-tool-strip h3{margin:0 0 12px;color:#fff;font-size:17px}.moltiai-tool-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.moltiai-tool-btn{appearance:none;text-align:left;padding:15px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:#131a28;color:#fff;cursor:pointer}.moltiai-tool-btn:hover{border-color:rgba(139,183,255,.45);transform:translateY(-1px)}.moltiai-tool-btn strong{display:block;font-size:15px;margin-bottom:5px}.moltiai-tool-btn span{color:#929daf;font-size:12px}
      .moltiai-old-org{display:none!important}
      @media(max-width:1000px){.moltiai-model-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.moltiai-operating-note{grid-template-columns:1fr}}
      @media(max-width:620px){.moltiai-ai-org{padding:18px}.moltiai-ai-org-head h2{font-size:24px}.moltiai-model-grid,.moltiai-tool-grid{grid-template-columns:1fr}.moltiai-node{padding:15px}}
    `;
    document.head.appendChild(style);
  };

  const buildPanel = () => {
    const panel = document.createElement('section');
    panel.id = PANEL_ID;
    panel.className = 'moltiai-ai-org';
    panel.innerHTML = `
      <div class="moltiai-ai-org-head">
        <div>
          <div class="eyebrow">MOLTIAI AI OPERATING SYSTEM</div>
          <h2>Michael 決策，ChatGPT 管理，專業模型執行</h2>
          <p>把 AI 從零散工具改成公司營運架構：人負責方向與核准，ChatGPT 負責拆解任務、協調 Agent 與 Workflow，再交給最適合的專業模型完成工作。</p>
        </div>
      </div>
      <div class="moltiai-flow">
        <div class="moltiai-node moltiai-human">
          <span>HUMAN / DECISION MAKER</span>
          <strong>Michael</strong>
          <p>CEO · Strategy · Final Approval</p>
        </div>
        <div class="moltiai-arrow">↓</div>
        <div class="moltiai-node moltiai-manager">
          <span>AI OPERATIONS MANAGER</span>
          <strong>ChatGPT</strong>
          <p>Agent / Workflow / Task Routing / Execution Management</p>
        </div>
        <div class="moltiai-arrow">↓</div>
        <div class="moltiai-model-grid">
          <div class="moltiai-node moltiai-model"><span>RESEARCH</span><strong>Gemini</strong><div class="model-role">Research / Google / Data</div><p>搜尋、資料蒐集、Google 生態與多模態研究。</p><div class="model-tools">交付：Research Brief / Evidence / Data</div></div>
          <div class="moltiai-node moltiai-model"><span>CONSULTANT</span><strong>Claude</strong><div class="model-role">Consultant / Strategy / Writing</div><p>長文分析、策略、提案、制度文件與顧問型產出。</p><div class="model-tools">交付：Strategy / Proposal / Policy</div></div>
          <div class="moltiai-node moltiai-model"><span>OFFICE</span><strong>Copilot</strong><div class="model-role">Microsoft 365 / Office</div><p>Word、Excel、PowerPoint、Outlook 與企業 Office 工作。</p><div class="model-tools">交付：Docs / Sheets / Slides / Mail</div></div>
          <div class="moltiai-node moltiai-model"><span>ENGINEER</span><strong>Codex</strong><div class="model-role">Code / GitHub / Engineering</div><p>程式開發、修復、測試、GitHub 與產品工程流程。</p><div class="model-tools">交付：Code / PR / Test / Deploy</div></div>
        </div>
      </div>
      <div class="moltiai-operating-note">
        <div><b>1. Michael 決策</b>目標、預算、風險、對外承諾由人負責。</div>
        <div><b>2. ChatGPT 協調</b>拆任務、選模型、管理 Workflow 與品質。</div>
        <div><b>3. 專業模型執行</b>Research、Consulting、Office、Engineering 各司其職。</div>
      </div>
      <div class="moltiai-tool-strip">
        <h3>保留的 Content / Video Factory</h3>
        <div class="moltiai-tool-grid">
          <button class="moltiai-tool-btn" data-nav="影片分析"><strong>影片分析 / PDF 報告</strong><span>Analyze URL → 競品 → Hook → 分鏡 → PDF</span></button>
          <button class="moltiai-tool-btn" data-nav="腳本"><strong>腳本 / 15 秒影片</strong><span>Script + 3–5 張圖片 → 15 秒短影音</span></button>
          <button class="moltiai-tool-btn" data-nav="Video Factory"><strong>Video Factory</strong><span>從分析、策略到影片生成的完整流程</span></button>
        </div>
      </div>`;
    panel.querySelectorAll('[data-nav]').forEach((button) => button.addEventListener('click', () => clickNav(button.getAttribute('data-nav') || '')));
    return panel;
  };

  const updateSidebarLabels = () => {
    const replacements = [
      ['Workspace 首頁', 'AI Operating System'],
      ['AI Agent 組織', 'ChatGPT Operations'],
      ['管理 / 自動化', 'Workflow / Governance'],
    ];
    document.querySelectorAll('.sidebar nav button span').forEach((span) => {
      replacements.forEach(([from, to]) => { if (span.textContent === from) span.textContent = to; });
    });
  };

  const enhanceDashboard = () => {
    installStyles();
    updateSidebarLabels();
    const page = document.querySelector('.workspacePage');
    const heading = page?.querySelector('.pageHeader h1');
    if (!page || !heading || heading.textContent?.trim() !== '瞬影科技 AI 組織營運台') return;
    if (!document.getElementById(PANEL_ID)) {
      const header = page.querySelector('.pageHeader');
      if (header) header.insertAdjacentElement('afterend', buildPanel());
    }
    page.querySelectorAll('.sectionBlock').forEach((section) => {
      const h2 = section.querySelector('h2');
      if (h2?.textContent?.includes('公司部門 AI Organization')) section.classList.add('moltiai-old-org');
    });
    const intro = page.querySelector('.pageHeader p');
    if (intro) intro.textContent = 'Human Decision + ChatGPT Operations + Specialized AI Models + Verified Workflows';
  };

  const observer = new MutationObserver(() => enhanceDashboard());
  observer.observe(document.documentElement, {subtree:true, childList:true});
  window.addEventListener('DOMContentLoaded', enhanceDashboard);
  setTimeout(enhanceDashboard, 50);
})();