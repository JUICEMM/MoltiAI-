(() => {
  const STYLE_ID = 'moltiai-ai-org-style';
  const PANEL_ID = 'moltiai-ai-org-panel';
  const OPS_ID = 'moltiai-chatgpt-ops';

  const models = {
    gemini: {name:'Gemini', role:'Research / Google / Data', color:'#67a8ff', keywords:['研究','搜尋','查詢','資料','市場','競品','趨勢','google','數據','新聞','調查','比較']},
    claude: {name:'Claude', role:'Consultant / Strategy / Writing', color:'#d4a574', keywords:['策略','顧問','提案','報告','制度','政策','企劃','文案','課程','分析','簡報','治理','roadmap']},
    copilot: {name:'Copilot', role:'Microsoft 365 / Office', color:'#70d39b', keywords:['excel','word','powerpoint','ppt','outlook','office','表格','試算表','信件','會議','文件','microsoft']},
    codex: {name:'Codex', role:'Code / GitHub / Engineering', color:'#b48cff', keywords:['程式','網站','github','git','api','修復','bug','部署','vercel','code','開發','測試','工程','資料庫']},
  };

  const clickNav = (label) => {
    const buttons = [...document.querySelectorAll('.sidebar nav button')];
    const target = buttons.find((button) => (button.textContent || '').includes(label));
    if (target) target.click();
  };

  const routeTask = (task='') => {
    const text = String(task).toLowerCase();
    const scores = Object.entries(models).map(([id, model]) => ({id, score:model.keywords.reduce((n,k)=>n+(text.includes(k.toLowerCase())?1:0),0)}));
    scores.sort((a,b)=>b.score-a.score);
    const primary = scores[0].score ? scores[0].id : 'claude';
    const secondary = scores[1].score > 0 ? scores[1].id : null;
    const approval = /寄出|發布|付款|報價|合約|刪除|部署|上線|客戶|正式/.test(text);
    return {primary, secondary, approval};
  };

  const installStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .moltiai-ai-org{margin:0 0 28px;border:1px solid rgba(255,255,255,.09);background:linear-gradient(180deg,rgba(18,25,39,.98),rgba(10,14,23,.98));border-radius:18px;padding:28px;overflow:hidden;position:relative}
      .moltiai-ai-org:before{content:'';position:absolute;inset:-120px auto auto 45%;width:360px;height:260px;background:radial-gradient(circle,rgba(110,168,255,.16),transparent 65%);pointer-events:none}
      .moltiai-ai-org-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:24px;position:relative}
      .moltiai-ai-org-head .eyebrow,.moltiai-ops-head .eyebrow{font-size:12px;letter-spacing:.14em;text-transform:uppercase;color:#8bb7ff;font-weight:800}
      .moltiai-ai-org-head h2,.moltiai-ops-head h2{font-size:30px;line-height:1.15;margin:8px 0 8px;color:#fff}
      .moltiai-ai-org-head p,.moltiai-ops-head p{margin:0;color:#aeb7c8;max-width:820px;line-height:1.65}
      .moltiai-flow{display:grid;gap:14px;position:relative}.moltiai-node{border:1px solid rgba(255,255,255,.1);border-radius:14px;background:rgba(255,255,255,.035);padding:18px 20px;box-shadow:0 12px 30px rgba(0,0,0,.18)}
      .moltiai-node strong{display:block;color:#fff;font-size:19px;margin-bottom:3px}.moltiai-node span{display:block;color:#8bb7ff;font-size:13px;font-weight:800;margin-bottom:8px}.moltiai-node p{margin:0;color:#b7c0cf;line-height:1.55;font-size:14px}
      .moltiai-human{max-width:430px;margin:0 auto;text-align:center;border-color:rgba(215,241,113,.28);background:rgba(215,241,113,.07)}.moltiai-human span{color:#d7f171}
      .moltiai-manager{max-width:600px;margin:0 auto;text-align:center;border-color:rgba(139,183,255,.36);background:rgba(139,183,255,.08)}.moltiai-manager strong{font-size:22px}
      .moltiai-arrow{text-align:center;color:#748197;font-size:22px;line-height:1;height:22px}.moltiai-model-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
      .moltiai-model{min-height:160px;display:flex;flex-direction:column}.moltiai-model .model-role{font-size:13px;color:#8bb7ff;font-weight:800;margin-bottom:8px}.moltiai-model .model-tools{margin-top:auto;padding-top:12px;color:#8894a8;font-size:12px;border-top:1px solid rgba(255,255,255,.08)}
      .moltiai-operating-note{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:18px}.moltiai-operating-note div{padding:12px 14px;border-radius:10px;background:rgba(255,255,255,.03);color:#9da8ba;font-size:13px}.moltiai-operating-note b{display:block;color:#fff;margin-bottom:4px}
      .moltiai-tool-strip{margin-top:24px;padding-top:22px;border-top:1px solid rgba(255,255,255,.08)}.moltiai-tool-strip h3{margin:0 0 12px;color:#fff;font-size:17px}.moltiai-tool-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.moltiai-tool-btn{appearance:none;text-align:left;padding:15px 16px;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:#131a28;color:#fff;cursor:pointer}.moltiai-tool-btn:hover{border-color:rgba(139,183,255,.45);transform:translateY(-1px)}.moltiai-tool-btn strong{display:block;font-size:15px;margin-bottom:5px}.moltiai-tool-btn span{color:#929daf;font-size:12px}
      .moltiai-router{margin-top:22px;padding:20px;border:1px solid rgba(139,183,255,.2);border-radius:14px;background:rgba(7,12,20,.55)}.moltiai-router h3{margin:0 0 6px;color:#fff}.moltiai-router>p{margin:0 0 14px;color:#909bad;font-size:13px}.moltiai-router-row{display:grid;grid-template-columns:1fr auto;gap:10px}.moltiai-router textarea{width:100%;min-height:92px;resize:vertical;border:1px solid rgba(255,255,255,.12);background:#0b111c;color:#fff;border-radius:10px;padding:13px;font:inherit;box-sizing:border-box}.moltiai-router button,.moltiai-primary{border:0;border-radius:10px;background:#8bb7ff;color:#08101d;font-weight:800;padding:0 18px;cursor:pointer}.moltiai-route-result{display:none;margin-top:14px;grid-template-columns:1.1fr 1fr;gap:12px}.moltiai-route-result.show{display:grid}.moltiai-route-card{border:1px solid rgba(255,255,255,.1);background:#101724;border-radius:12px;padding:15px}.moltiai-route-card small{color:#8490a3}.moltiai-route-card strong{color:#fff;display:block;font-size:18px;margin:4px 0}.moltiai-route-card p{color:#aab4c4;margin:7px 0 0;font-size:13px;line-height:1.55}.moltiai-route-steps{display:grid;gap:7px}.moltiai-route-steps div{font-size:13px;color:#aab4c4;padding:9px 10px;background:rgba(255,255,255,.035);border-radius:8px}.moltiai-route-steps b{color:#fff}
      .moltiai-old-org{display:none!important}
      .moltiai-ops-shell{border:1px solid rgba(255,255,255,.09);background:#0d1420;border-radius:18px;padding:26px}.moltiai-ops-grid{display:grid;grid-template-columns:1.35fr .85fr;gap:16px;margin-top:22px}.moltiai-ops-task,.moltiai-ops-side{border:1px solid rgba(255,255,255,.09);border-radius:14px;background:rgba(255,255,255,.025);padding:18px}.moltiai-ops-task textarea{width:100%;min-height:150px;background:#080e17;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:14px;box-sizing:border-box;font:inherit}.moltiai-ops-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:12px}.moltiai-ops-actions button{border:1px solid rgba(255,255,255,.12);background:#151d2a;color:#fff;border-radius:9px;padding:10px 13px;cursor:pointer}.moltiai-ops-actions button.primary{background:#8bb7ff;color:#07101b;border-color:#8bb7ff;font-weight:800}.moltiai-status{margin-top:15px;padding:14px;border-radius:10px;background:#0a101a;color:#aeb9c9;white-space:pre-wrap;line-height:1.55;min-height:84px}.moltiai-specialists{display:grid;gap:9px}.moltiai-specialist{border:1px solid rgba(255,255,255,.09);border-radius:10px;padding:12px}.moltiai-specialist strong{color:#fff}.moltiai-specialist span{display:block;font-size:12px;margin-top:3px;color:#94a0b2}.moltiai-human-rule{margin-top:13px;padding:11px;border-radius:9px;border:1px solid rgba(215,241,113,.18);background:rgba(215,241,113,.05);color:#c6d29f;font-size:12px;line-height:1.5}
      @media(max-width:1000px){.moltiai-model-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.moltiai-operating-note{grid-template-columns:1fr}.moltiai-ops-grid{grid-template-columns:1fr}}
      @media(max-width:620px){.moltiai-ai-org,.moltiai-ops-shell{padding:18px}.moltiai-ai-org-head h2,.moltiai-ops-head h2{font-size:24px}.moltiai-model-grid,.moltiai-tool-grid,.moltiai-route-result{grid-template-columns:1fr}.moltiai-node{padding:15px}.moltiai-router-row{grid-template-columns:1fr}.moltiai-router button{padding:12px}}
    `;
    document.head.appendChild(style);
  };

  const renderRouteResult = (host, task) => {
    const route = routeTask(task);
    const primary = models[route.primary];
    const secondary = route.secondary ? models[route.secondary] : null;
    host.innerHTML = `<div class="moltiai-route-card"><small>ChatGPT Routing Decision</small><strong>${primary.name}</strong><p>${primary.role}${secondary ? `<br>協作：${secondary.name} · ${secondary.role}` : ''}</p></div><div class="moltiai-route-card"><small>Workflow</small><div class="moltiai-route-steps"><div><b>1. Michael</b> 定義目標與限制</div><div><b>2. ChatGPT</b> 拆解任務、選模型、設定輸出</div><div><b>3. ${primary.name}</b> 執行主要工作</div><div><b>4. ChatGPT</b> 整合、品質檢查</div><div><b>5. Michael</b> ${route.approval ? '人工核准後才能執行' : '確認成果與下一步'}</div></div></div>`;
    host.classList.add('show');
  };

  const buildRouter = () => {
    const box = document.createElement('div');
    box.className='moltiai-router';
    box.innerHTML=`<h3>ChatGPT AI Task Router</h3><p>輸入公司任務，由 ChatGPT Operations Manager 判斷要交給哪一個專業 AI，並顯示人工核准點。</p><div class="moltiai-router-row"><textarea placeholder="例如：研究 20 家上市櫃製造業潛在客戶，整理 AI 導入需求並產出提案方向。"></textarea><button>分析並路由</button></div><div class="moltiai-route-result"></div>`;
    const ta=box.querySelector('textarea'); const result=box.querySelector('.moltiai-route-result');
    box.querySelector('button').addEventListener('click',()=>{const task=ta.value.trim(); if(task) renderRouteResult(result,task);});
    return box;
  };

  const buildPanel = () => {
    const panel = document.createElement('section'); panel.id=PANEL_ID; panel.className='moltiai-ai-org';
    panel.innerHTML=`<div class="moltiai-ai-org-head"><div><div class="eyebrow">MOLTIAI AI OPERATING SYSTEM</div><h2>Michael 決策，ChatGPT 管理，專業模型執行</h2><p>Human Decision → AI Operations Manager → Specialized AI Models。ChatGPT 不只是聊天工具，而是負責拆解任務、Routing、Workflow、品質檢查與 Human Approval 的營運中樞。</p></div></div><div class="moltiai-flow"><div class="moltiai-node moltiai-human"><span>HUMAN / DECISION MAKER</span><strong>Michael</strong><p>CEO · Strategy · Budget · Final Approval</p></div><div class="moltiai-arrow">↓</div><div class="moltiai-node moltiai-manager"><span>AI OPERATIONS MANAGER</span><strong>ChatGPT</strong><p>Agent / Workflow / Task Routing / Execution Management / QA</p></div><div class="moltiai-arrow">↓</div><div class="moltiai-model-grid"><div class="moltiai-node moltiai-model"><span>RESEARCH</span><strong>Gemini</strong><div class="model-role">Research / Google / Data</div><p>搜尋、資料蒐集、Google 生態與多模態研究。</p><div class="model-tools">Research Brief / Evidence / Data</div></div><div class="moltiai-node moltiai-model"><span>CONSULTANT</span><strong>Claude</strong><div class="model-role">Consultant / Strategy / Writing</div><p>策略、顧問分析、提案、制度文件與長文。</p><div class="model-tools">Strategy / Proposal / Policy</div></div><div class="moltiai-node moltiai-model"><span>OFFICE</span><strong>Copilot</strong><div class="model-role">Microsoft 365 / Office</div><p>Word、Excel、PowerPoint、Outlook 與 Office 工作。</p><div class="model-tools">Docs / Sheets / Slides / Mail</div></div><div class="moltiai-node moltiai-model"><span>ENGINEER</span><strong>Codex</strong><div class="model-role">Code / GitHub / Engineering</div><p>程式開發、修復、測試、GitHub 與部署。</p><div class="model-tools">Code / PR / Test / Deploy</div></div></div></div><div class="moltiai-operating-note"><div><b>1. Michael 決策</b>目標、預算、風險與對外承諾由人負責。</div><div><b>2. ChatGPT 協調</b>拆任務、選模型、建立 Workflow、整合輸出。</div><div><b>3. 專業模型執行</b>研究、策略、Office、工程各用最合適模型。</div></div>`;
    panel.appendChild(buildRouter());
    const tools=document.createElement('div'); tools.className='moltiai-tool-strip'; tools.innerHTML=`<h3>Content / Video Factory</h3><div class="moltiai-tool-grid"><button class="moltiai-tool-btn" data-nav="影片分析"><strong>影片分析 / PDF 報告</strong><span>Analyze URL → 競品 → Hook → 分鏡 → PDF</span></button><button class="moltiai-tool-btn" data-nav="腳本"><strong>腳本 / 15 秒影片</strong><span>Script + 3–5 張圖片 → 15 秒短影音</span></button><button class="moltiai-tool-btn" data-nav="Video Factory"><strong>Video Factory</strong><span>從分析、策略到影片生成的完整流程</span></button></div>`; panel.appendChild(tools);
    panel.querySelectorAll('[data-nav]').forEach((button)=>button.addEventListener('click',()=>clickNav(button.getAttribute('data-nav')||'')));
    return panel;
  };

  const buildOpsCenter = () => {
    const shell=document.createElement('section'); shell.id=OPS_ID; shell.className='moltiai-ops-shell';
    shell.innerHTML=`<div class="moltiai-ops-head"><div class="eyebrow">CHATGPT OPERATIONS CENTER</div><h2>AI 任務派工中心</h2><p>Michael 只需要定義目標。ChatGPT 負責把任務拆解、選擇 Gemini / Claude / Copilot / Codex、建立 Workflow、整合結果，並在高風險動作前要求人工核准。</p></div><div class="moltiai-ops-grid"><div class="moltiai-ops-task"><h3 style="color:#fff;margin-top:0">交給 ChatGPT 的任務</h3><textarea placeholder="例如：幫我找出台灣上市櫃製造業最適合導入 AI 的 20 家公司，研究需求、整理決策者資訊，最後產出開發策略。"></textarea><div class="moltiai-ops-actions"><button class="primary" data-action="route">Route & Execute</button><button data-example="research">研究客戶</button><button data-example="strategy">企業 AI 提案</button><button data-example="office">整理簡報</button><button data-example="code">修復網站</button></div><div class="moltiai-status">等待 Michael 指派任務。</div></div><aside class="moltiai-ops-side"><h3 style="color:#fff;margin-top:0">AI Specialist Pool</h3><div class="moltiai-specialists"><div class="moltiai-specialist"><strong>Gemini</strong><span>Research / Google / Data</span></div><div class="moltiai-specialist"><strong>Claude</strong><span>Consultant / Strategy / Writing</span></div><div class="moltiai-specialist"><strong>Copilot</strong><span>Microsoft 365 / Office</span></div><div class="moltiai-specialist"><strong>Codex</strong><span>Code / GitHub / Engineering</span></div></div><div class="moltiai-human-rule">Human Approval：正式寄信、報價、付款、合約、公開發布、Production 部署等高風險動作，必須由 Michael 最後核准。</div></aside></div>`;
    const ta=shell.querySelector('textarea'); const status=shell.querySelector('.moltiai-status');
    const examples={research:'研究 20 家台灣上市櫃製造業公司，找出 AI 導入痛點、公開證據與優先開發名單。',strategy:'根據客戶需求產出企業 AI 成熟度診斷、3 個 Use Case、90 日 Pilot 與 ROI 提案。',office:'把企業 AI 導入報告整理成主管簡報、Excel KPI 表與會後 Email 草稿。',code:'檢查 MoltiAI 網站錯誤，修復程式、測試、提交 GitHub 並準備 Production 部署。'};
    shell.querySelectorAll('[data-example]').forEach(b=>b.addEventListener('click',()=>{ta.value=examples[b.getAttribute('data-example')];}));
    shell.querySelector('[data-action="route"]').addEventListener('click',async()=>{
      const task=ta.value.trim(); if(!task) return; const r=routeTask(task); const p=models[r.primary]; const s=r.secondary?models[r.secondary]:null;
      status.textContent=`ChatGPT Routing\n→ Primary: ${p.name} (${p.role})${s?`\n→ Collaborator: ${s.name} (${s.role})`:''}\n→ Human Approval: ${r.approval?'Required':'Final review'}\n\nWorkflow\n1. 理解 Michael 的目標與限制\n2. 拆解子任務與成功標準\n3. 指派 ${p.name}${s?` + ${s.name}`:''}\n4. ChatGPT 整合與 QA\n5. Michael 最終確認`;
      try{
        const res=await fetch('/api/agents/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:'strategy',agentName:'ChatGPT AI Operations Manager',prompt:`你是 MoltiAI AI Operations Manager。任務：${task}\n建議主要模型：${p.name} (${p.role})${s?`；協作模型：${s.name} (${s.role})`:''}。請輸出：任務拆解、每一步 Owner、需要的輸入、交付物、Human Approval、KPI。`})});
        if(res.ok){const data=await res.json(); const output=data.output||data.text; if(output) status.textContent+=`\n\nAI Operations Plan\n${output}`;}
      }catch(e){status.textContent+='\n\n目前使用本地 Routing Plan；外部模型連線失敗不影響派工架構。';}
    });
    return shell;
  };

  const updateSidebarLabels = () => {
    const replacements=[['Workspace 首頁','AI Operating System'],['AI Agent 組織','ChatGPT Operations'],['管理 / 自動化','Workflow / Governance']];
    document.querySelectorAll('.sidebar nav button span').forEach(span=>replacements.forEach(([from,to])=>{if(span.textContent===from) span.textContent=to;}));
  };

  const enhanceDashboard = () => {
    installStyles(); updateSidebarLabels(); const page=document.querySelector('.workspacePage'); const heading=page?.querySelector('.pageHeader h1');
    if(!page||!heading||heading.textContent?.trim()!=='瞬影科技 AI 組織營運台') return;
    if(!document.getElementById(PANEL_ID)){const header=page.querySelector('.pageHeader'); if(header) header.insertAdjacentElement('afterend',buildPanel());}
    page.querySelectorAll('.sectionBlock').forEach(section=>{const h2=section.querySelector('h2'); if(h2?.textContent?.includes('公司部門 AI Organization')) section.classList.add('moltiai-old-org');});
    const intro=page.querySelector('.pageHeader p'); if(intro) intro.textContent='Michael Decision → ChatGPT Operations → Gemini / Claude / Copilot / Codex → Human Approval';
  };

  const enhanceOpsPage = () => {
    installStyles(); updateSidebarLabels(); const page=document.querySelector('.workspacePage'); const heading=page?.querySelector('.pageHeader h1');
    if(!page||!heading||heading.textContent?.trim()!=='AI Agent 組織') return;
    page.querySelectorAll('.agentWorkspace,.sectionBlock').forEach(el=>el.classList.add('moltiai-old-org'));
    heading.textContent='ChatGPT Operations'; const p=page.querySelector('.pageHeader p'); if(p) p.textContent='由 ChatGPT 擔任 AI Operations Manager，負責 Routing、Workflow、Execution Management 與 Human Approval。';
    if(!document.getElementById(OPS_ID)){const header=page.querySelector('.pageHeader'); if(header) header.insertAdjacentElement('afterend',buildOpsCenter());}
  };

  const enhance=()=>{enhanceDashboard();enhanceOpsPage();};
  const observer=new MutationObserver(enhance); observer.observe(document.documentElement,{subtree:true,childList:true}); window.addEventListener('DOMContentLoaded',enhance); setTimeout(enhance,50);
})();