(() => {
  const PANEL_ID = 'moltiai-os-panel';
  const GUEST_ID = 'moltiai-guest-workbench';
  const STYLE_ID = 'moltiai-os-style';

  const models = {
    chatgpt: {name:'ChatGPT Role', role:'AI Operations Manager', engine:'DeepSeek Engine', desc:'拆解任務、Routing、整合、QA 與 Human Approval；目前由 DeepSeek 執行。', keywords:['管理','任務','整合','流程','workflow','派工']},
    gemini: {name:'Gemini Role', role:'Research / Google / Data', engine:'Gemini Native', desc:'Gemini 原生引擎，處理搜尋、資料蒐集、競品、趨勢與多模態研究。', keywords:['研究','搜尋','資料','市場','競品','趨勢','google','數據','新聞','調查','比較']},
    claude: {name:'Claude Role', role:'Consultant / Strategy / Writing', engine:'DeepSeek Engine', desc:'策略、提案、制度文件、長文與顧問分析；目前由 DeepSeek 執行。', keywords:['策略','顧問','提案','報告','制度','政策','企劃','文案','課程','分析','治理','roadmap']},
    copilot: {name:'Copilot / Office Role', role:'Microsoft 365 / Office-style', engine:'DeepSeek Engine', desc:'Word、Excel、PowerPoint、Outlook 類工作；Guest Mode 不存取私人 Microsoft 365 資料，目前由 DeepSeek 執行。', keywords:['excel','word','powerpoint','ppt','outlook','office','表格','試算表','信件','會議','文件','microsoft']},
    codex: {name:'Codex Role', role:'Code / GitHub / Engineering', engine:'DeepSeek Engine', desc:'程式、修復、測試、GitHub、API 與部署；目前由 DeepSeek 執行。', keywords:['程式','網站','github','git','api','修復','bug','部署','vercel','code','開發','測試','工程','資料庫']},
  };

  const routeTask = (task='') => {
    const text = String(task).toLowerCase();
    const ranked = Object.entries(models).filter(([id])=>id!=='chatgpt').map(([id,m]) => ({id, score:m.keywords.reduce((n,k)=>n+(text.includes(k.toLowerCase())?1:0),0)})).sort((a,b)=>b.score-a.score);
    const primary = ranked[0]?.score ? ranked[0].id : 'claude';
    const secondary = ranked[1]?.score > 0 ? ranked[1].id : null;
    const approval = /寄出|發布|付款|報價|合約|刪除|部署|上線|客戶|正式/.test(text);
    return {primary, secondary, approval};
  };

  const installStyles = () => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${PANEL_ID},#${GUEST_ID}{margin:0 0 26px;border:1px solid rgba(255,255,255,.1);background:#0f1623;border-radius:18px;padding:24px;color:#fff}
      #${PANEL_ID} h2,#${GUEST_ID} h2{margin:6px 0 8px;font-size:28px} #${PANEL_ID} p,#${GUEST_ID} p{color:#aeb8c8;line-height:1.6}
      .m-os-eyebrow{font-size:12px;letter-spacing:.14em;color:#8bb7ff;font-weight:800}.m-os-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:999px;background:rgba(122,221,153,.1);border:1px solid rgba(122,221,153,.2);color:#9be2b1;font-size:12px;font-weight:800;margin-left:8px}
      .m-os-flow{display:grid;gap:12px;margin-top:20px}.m-os-node{border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.03);border-radius:12px;padding:16px;text-align:center}.m-os-node strong{display:block;font-size:19px}.m-os-node span{font-size:12px;color:#8bb7ff;font-weight:800}.m-os-arrow{text-align:center;color:#75839a;font-size:20px}
      .m-os-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px}.m-os-grid .m-os-node{text-align:left;min-height:120px}.m-os-grid b{display:block;margin-top:8px;font-size:13px;color:#8bb7ff}.m-os-grid p{font-size:12px;margin:6px 0 0}
      .m-os-router{margin-top:20px;border-top:1px solid rgba(255,255,255,.08);padding-top:18px}.m-os-router h3{margin:0 0 6px}.m-os-row{display:grid;grid-template-columns:1fr auto;gap:8px}.m-os-row textarea,.m-guest-textarea{min-height:100px;background:#080e17;color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:12px;font:inherit;box-sizing:border-box;width:100%}.m-os-row button,.m-guest-run{border:0;border-radius:10px;padding:0 16px;background:#8bb7ff;color:#07101b;font-weight:800;cursor:pointer}.m-os-result,.m-guest-output{display:none;margin-top:12px;padding:14px;border-radius:10px;background:#0a1019;white-space:pre-wrap;color:#b8c2d0;line-height:1.55}.m-os-result.show,.m-guest-output.show{display:block}
      .m-os-tools{margin-top:18px;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.m-os-tool{border:1px solid rgba(255,255,255,.1);background:#151d2b;color:#fff;border-radius:10px;padding:13px;text-align:left;cursor:pointer}.m-os-tool strong{display:block}.m-os-tool span{display:block;color:#929daf;font-size:12px;margin-top:4px}
      .m-guest-models{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:9px;margin:18px 0}.m-guest-model{border:1px solid rgba(255,255,255,.1);background:#111a28;color:#fff;border-radius:12px;padding:13px;text-align:left;cursor:pointer;min-height:118px;position:relative}.m-guest-model.selected{border-color:#8bb7ff;background:rgba(139,183,255,.1)}.m-guest-model strong{display:block;font-size:16px}.m-guest-model span{display:block;color:#8bb7ff;font-size:12px;font-weight:800;margin:4px 0}.m-guest-model small{display:block;color:#939faf;line-height:1.45}.m-guest-dot{position:absolute;right:10px;top:10px;width:8px;height:8px;border-radius:50%;background:#667085}.m-guest-dot.on{background:#65d98c;box-shadow:0 0 0 3px rgba(101,217,140,.12)}
      .m-guest-grid{display:grid;grid-template-columns:1fr auto;gap:10px}.m-guest-run{padding:0 20px}.m-guest-status{margin-top:10px;color:#8d99aa;font-size:12px}.m-guest-note{margin-top:14px;padding:12px;border-radius:10px;background:rgba(255,214,102,.05);border:1px solid rgba(255,214,102,.14);color:#c6b77d;font-size:12px;line-height:1.55}
      @media(max-width:1050px){.m-guest-models{grid-template-columns:repeat(2,minmax(0,1fr))}.m-os-grid{grid-template-columns:repeat(2,minmax(0,1fr))}} @media(max-width:620px){.m-os-grid,.m-os-tools,.m-os-row,.m-guest-models,.m-guest-grid{grid-template-columns:1fr}.m-os-row button,.m-guest-run{padding:12px}}
    `;
    document.head.appendChild(style);
  };

  const clickNav = (label) => {
    const buttons = [...document.querySelectorAll('.sidebar nav button')];
    const target = buttons.find(b => (b.textContent || '').includes(label));
    if (target) target.click();
  };

  const buildPanel = () => {
    const panel = document.createElement('section'); panel.id = PANEL_ID;
    panel.innerHTML = `<div class="m-os-eyebrow">MOLTIAI AI OPERATING SYSTEM</div><h2>Michael 決策，角色派工，DeepSeek / Gemini 執行</h2><p>Human Decision → ChatGPT Operations Manager Role → Gemini Native / DeepSeek Engine。高風險動作保留 Human Approval；不宣稱原生 Claude、Copilot、Codex API。</p><div class="m-os-flow"><div class="m-os-node"><span>CEO / DECISION MAKER</span><strong>Michael</strong><p>Strategy · Budget · Final Approval</p></div><div class="m-os-arrow">↓</div><div class="m-os-node"><span>AI OPERATIONS MANAGER</span><strong>ChatGPT Role</strong><p>Agent · Workflow · Routing · QA · Execution Management · DeepSeek Engine</p></div><div class="m-os-arrow">↓</div><div class="m-os-grid"><div class="m-os-node"><span>RESEARCH</span><strong>Gemini Role</strong><b>Gemini Native</b><p>搜尋、資料蒐集、競品與趨勢研究。</p></div><div class="m-os-node"><span>CONSULTANT</span><strong>Claude Role</strong><b>DeepSeek Engine</b><p>策略、提案、制度文件與顧問分析。</p></div><div class="m-os-node"><span>OFFICE</span><strong>Copilot / Office Role</strong><b>DeepSeek Engine</b><p>Guest Mode 做 Office 任務；私人 M365 資料仍需 Microsoft 登入。</p></div><div class="m-os-node"><span>ENGINEER</span><strong>Codex Role</strong><b>DeepSeek Engine</b><p>程式、修復、測試、GitHub 與部署。</p></div></div></div><div class="m-os-router"><h3>ChatGPT Role Task Router</h3><p>輸入任務，先判斷應由哪個專業角色執行，再顯示實際 Engine、Workflow 與 Human Approval。</p><div class="m-os-row"><textarea placeholder="例如：研究 20 家上市櫃製造業潛在客戶，整理 AI 導入需求並提出開發策略。"></textarea><button>分析並路由</button></div><div class="m-os-result"></div></div><div class="m-os-tools"><button class="m-os-tool" data-nav="影片分析"><strong>影片分析 / PDF 報告</strong><span>Analyze URL → 競品 → Hook → 分鏡 → PDF</span></button><button class="m-os-tool" data-nav="腳本"><strong>腳本 / 15 秒影片</strong><span>Script + 圖片 → 15 秒短影音</span></button><button class="m-os-tool" data-nav="Video Factory"><strong>Video Factory</strong><span>保留完整內容與 AI 影音流程</span></button></div>`;
    const ta=panel.querySelector('textarea'), result=panel.querySelector('.m-os-result');
    panel.querySelector('.m-os-row button').addEventListener('click',()=>{const task=ta.value.trim();if(!task)return;const r=routeTask(task),p=models[r.primary],s=r.secondary?models[r.secondary]:null;result.textContent=`ChatGPT Role Routing\nPrimary: ${p.name} — ${p.role}\nActual Engine: ${p.engine}${s?`\nCollaborator: ${s.name} — ${s.role}\nCollaborator Engine: ${s.engine}`:''}\nHuman Approval: ${r.approval?'Required':'Final review'}\n\nWorkflow\n1. Michael 定義目標與限制\n2. ChatGPT Role 拆解任務與成功標準\n3. ${p.name}${s?` + ${s.name}`:''} 執行\n4. ChatGPT Role 整合與 QA\n5. Michael 最終確認`;result.classList.add('show');});
    panel.querySelectorAll('[data-nav]').forEach(btn=>btn.addEventListener('click',()=>clickNav(btn.getAttribute('data-nav')||''))); return panel;
  };

  const buildGuestWorkbench = () => {
    const box=document.createElement('section'); box.id=GUEST_ID;
    box.innerHTML=`<div class="m-os-eyebrow">GUEST MULTI-MODEL WORKBENCH <span class="m-os-badge">免註冊</span></div><h2>角色工作台：Gemini Native / DeepSeek Engine</h2><p>訪客不需要建立 MoltiAI 帳號。先選 AI 角色、輸入任務，直接執行；除 Gemini 為 Gemini Native，其餘角色目前由 DeepSeek Engine 執行。</p><div class="m-guest-models">${Object.entries(models).map(([id,m])=>`<button class="m-guest-model ${id==='chatgpt'?'selected':''}" data-provider="${id}"><i class="m-guest-dot" data-dot="${id}"></i><strong>${m.name}</strong><span>${m.engine}</span><small>${m.desc}</small></button>`).join('')}</div><div class="m-guest-grid"><textarea class="m-guest-textarea" placeholder="例如：幫我研究這家公司，整理 AI 導入機會、風險、3 個 Pilot 與下一步。"></textarea><button class="m-guest-run">直接執行</button></div><div class="m-guest-status">正在確認可用模型…</div><div class="m-guest-output"></div><div class="m-guest-note">產品揭露：ChatGPT / Claude / Copilot / Codex 是 MoltiAI 的任務角色介面，目前由 DeepSeek Engine 執行；Gemini Role 使用 Gemini Native。請勿對外宣稱這是原生 Claude、Copilot、Codex 或 ChatGPT API。Copilot 私有郵件、文件與企業資料仍需要 Microsoft Entra / 使用者授權。</div>`;
    let selected='chatgpt'; const status=box.querySelector('.m-guest-status'), output=box.querySelector('.m-guest-output'), textarea=box.querySelector('.m-guest-textarea'), run=box.querySelector('.m-guest-run');
    box.querySelectorAll('.m-guest-model').forEach(btn=>btn.addEventListener('click',()=>{box.querySelectorAll('.m-guest-model').forEach(x=>x.classList.remove('selected'));btn.classList.add('selected');selected=btn.getAttribute('data-provider')||'chatgpt';status.textContent=`已選擇 ${models[selected].name}。`; }));
    const refresh=async()=>{try{const r=await fetch('/api/agents/run',{cache:'no-store'});if(!r.ok)throw new Error();const d=await r.json();Object.entries(d.providers||{}).forEach(([id,on])=>{const dot=box.querySelector(`[data-dot="${id}"]`);if(dot&&on)dot.classList.add('on');});const available=Object.entries(d.providers||{}).filter(([,on])=>on).map(([id])=>`${models[id]?.name||id}(${models[id]?.engine||'Engine'})`);status.textContent=available.length?`伺服器可用：${available.join('、')}。訪客免註冊。`:'目前未偵測到外部模型憑證；仍可使用本地 Workflow Demo。';}catch{status.textContent='無法讀取模型狀態；仍可嘗試執行。';}};
    run.addEventListener('click',async()=>{const prompt=textarea.value.trim();if(!prompt)return;run.disabled=true;run.textContent='執行中…';output.classList.add('show');output.textContent=`正在交給 ${models[selected].name}（${models[selected].engine}）…`;try{const r=await fetch('/api/agents/run',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({agentId:'strategy',agentName:models[selected].name,prompt,provider:selected})});const d=await r.json();output.textContent=`Requested Role：${d.roleLabel||models[selected].name}\nActual Engine：${d.engineLabel||models[selected].engine}\nProvider Route：${d.provider||'unknown'}${d.warning?`\n狀態：${d.warning}`:''}\n\n${d.output||'沒有回傳內容'}`;status.textContent=`Requested: ${models[selected].name}｜Engine: ${d.engineLabel||models[selected].engine}｜Guest Mode`; }catch(e){output.textContent='執行失敗，請稍後再試。';status.textContent='API 暫時無法連線。';}finally{run.disabled=false;run.textContent='直接執行';}});
    refresh(); return box;
  };

  const mount = () => {
    try {
      installStyles(); const page=document.querySelector('.workspacePage'); const header=page?.querySelector('.pageHeader'); const heading=header?.querySelector('h1')?.textContent?.trim(); if(!page||!header||!heading)return false;
      if(heading==='瞬影科技 AI 組織營運台' && !document.getElementById(PANEL_ID)) header.insertAdjacentElement('afterend',buildPanel());
      if(heading==='AI Agent 組織' && !document.getElementById(GUEST_ID)) header.insertAdjacentElement('afterend',buildGuestWorkbench());
      return true;
    } catch(e){console.warn('[MoltiAI OS] mount skipped',e);return false;}
  };

  const start=()=>{let tries=0;const timer=setInterval(()=>{tries+=1;mount();if(tries>20)clearInterval(timer);},400);document.addEventListener('click',(event)=>{if(event.target.closest('.sidebar nav button'))setTimeout(mount,300);},true);};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();