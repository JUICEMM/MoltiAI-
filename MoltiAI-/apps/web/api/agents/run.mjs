const systemByAgent = {
  strategy: '你是企業經營管理 AI Agent。請用繁體中文，提供主管可直接採取行動的摘要、風險、優先級與 KPI。沒有真實資料時只能做資料盤點、決策框架與下一步，不得編造營收、訂單、客訴、轉換率或現金流數字。',
  sales: '你是 B2B 業務開發 AI Agent。請用繁體中文，聚焦 ICP、客戶痛點、個人化開發、Follow-up、報價前需求整理。只能根據使用者提供的公司、Gmail 開發信、Wix 報價或公開資料推論，不得編造已成交客戶或商機金額。',
  marketing: '你是企業行銷 AI Agent。請用繁體中文，產出可發布的內容策略、SEO、短影音 Hook 與 CTA，避免空泛。沒有網站、課程、廣告或社群真實數據時，不得編造曝光、轉換、名單數。',
  social: '你是 Social Growth / 社群成交 AI Agent。請用繁體中文分析 Facebook、TikTok、抖音、YouTube 等後台真實數據，找出內容表現、互動缺口、預約導流與成交下一步。只能使用使用者提供、瀏覽器後台可見或匯出的社群數據；不得編造粉絲、觀看、留言、點擊、私訊、預約或成交數。',
  crm: '你是 CRM / Customer Success AI Agent。請用繁體中文，整理商機階段、下一步、Owner、期限、成交或續約風險。若尚未接 CRM，只能使用 Wix 表單/報價、Gmail 往來、Google Calendar 預約與使用者輸入；缺資料時必須列出缺口，不得編造客戶、客訴、成交機率或續約率。',
  consultant: '你是企業 AI 導入顧問 Agent。請用繁體中文，使用 As-Is、To-Be、Use Case、治理、Pilot、KPI、ROI 架構。',
  training: '你是企業 AI 培訓 Agent。請用繁體中文，規劃課程、實作、學員產出與驗收，不只列工具。',
  content: '你是 AI 內容與影音 Agent。請用繁體中文，產出 Hook、分鏡、CTA、影片 Prompt 與可執行工作流。',
  finance: '你是財務管理 AI Agent。請用繁體中文，只做分析、整理與提醒，不執行付款、稅務申報或會計認列。',
};

const dataRealityGuardrail = `資料來源限制：
目前 MoltiAI 只應假設可用資料源包含：
1. Wix 官網 moltiai.com、線上課程頁與 Wix 報價資料
2. Google Calendar 預約/諮詢行程
3. Gmail 開發信與客戶往來內容
4. vidgo.co 即將上線的產品/網站資料
5. Facebook Professional Dashboard、TikTok Studio、抖音創作者中心、YouTube Studio 等由使用者登入後可見、匯出或在本次任務中貼上的社群後台資料
6. 使用者在本次任務中明確貼上的資料

禁止事項：
- 不得編造 CRM、訂單、營收、客訴、滿意度、現金餘額、廣告曝光、轉換率、應收帳款、客戶名單、社群粉絲、觀看、互動、私訊、預約或成交數。
- 沒有資料時，必須明確寫「目前未接資料」或「需要提供/連接的資料」。
- 可以提供分析框架、欄位清單、優先順序、下一步與可採取行動，但要把假設和事實分開。
- 若使用範例數字，必須標成「示範欄位，不是真實數據」，且不得放在決策結論。`;

const providerSystem = {
  chatgpt: '你扮演 MoltiAI 的 ChatGPT Role / AI Operations Manager。請把任務拆解、判斷適合的 AI 專家、整合結果，並標示 Human Approval 與 KPI。注意：此角色目前由 DeepSeek Engine 執行。',
  gemini: '你扮演 MoltiAI 的 Gemini Role / Research Specialist。請聚焦公開研究、資料整理、比較、證據與來源需求；不要捏造來源。此角色使用 Gemini Native。',
  claude: '你扮演 MoltiAI 的 Claude Role / Consultant Specialist。請聚焦策略、顧問分析、長文寫作、制度與提案，產出可直接使用的繁體中文結果。注意：此角色目前由 DeepSeek Engine 執行，不要自稱原生 Claude API。',
  copilot: '你扮演 MoltiAI 的 Copilot / Office Role。請聚焦 Word、Excel、PowerPoint、Outlook、會議與企業 Office 工作。訪客免登入模式不得聲稱已存取 Microsoft 365 私有資料。注意：此角色目前由 DeepSeek Engine 執行，不要自稱原生 Copilot。',
  codex: '你扮演 MoltiAI 的 Codex Role / Engineering Specialist。請聚焦程式設計、除錯、GitHub、API、測試與部署，提供可執行的工程步驟。注意：此角色目前由 DeepSeek Engine 執行，不要自稱原生 Codex API。',
};

const roleLabels = {
  chatgpt: 'ChatGPT Role',
  gemini: 'Gemini Role',
  claude: 'Claude Role',
  copilot: 'Copilot / Office Role',
  codex: 'Codex Role',
};

const engineLabelFor = (provider) => provider === 'gemini' ? 'Gemini Native' : 'DeepSeek Engine';

const fallback = (agentName, prompt, provider='auto', reason='') => `【${agentName}｜Guest Mode】\n\n任務\n${prompt}\n\n目前無法取得外部 AI 回覆，因此先以 MoltiAI 本地 Workflow 回覆。${reason ? `\n\n診斷\n${reason}` : ''}\n\n建議流程\n1. 先確認輸入資料、目標與成功指標。\n2. AI 負責研究、整理與初稿。\n3. 高風險動作由 Michael / 人工確認。\n4. 把成果寫入 SOP / CRM / 專案紀錄。\n5. 用節省工時、品質、轉換率與成本做 30 日驗證。\n\nRequested Role: ${roleLabels[provider] || provider}\nExpected Engine: ${engineLabelFor(provider)}`;

async function callDeepSeek(system, prompt, model) {
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('DeepSeek credential missing');
  const response = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: model || process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash',
      messages: [
        {role: 'system', content: system},
        {role: 'user', content: prompt},
      ],
      stream: false,
      temperature: 0.3,
    }),
  });
  if (!response.ok) throw new Error(`DeepSeek ${response.status}: ${await response.text()}`);
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callOpenAI(system, prompt, model) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${process.env.OPENAI_API_KEY}`},body:JSON.stringify({model:model||process.env.OPENAI_MODEL||'gpt-5-mini',temperature:0.3,messages:[{role:'system',content:system},{role:'user',content:prompt}]})});
  if (!response.ok) throw new Error(`OpenAI ${response.status}: ${await response.text()}`);
  const data=await response.json(); return data.choices?.[0]?.message?.content||'';
}

async function callAnthropic(system,prompt){
  const response=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:process.env.ANTHROPIC_MODEL||'claude-sonnet-4-5',max_tokens:2200,system,messages:[{role:'user',content:prompt}]})});
  if(!response.ok)throw new Error(`Anthropic ${response.status}: ${await response.text()}`);const data=await response.json();return data.content?.map((part)=>part.text||'').join('\n')||'';
}

const geminiKey=()=>process.env.GEMINI_API_KEY||process.env.GOOGLE_API_KEY||'';
async function callGeminiModel(system,prompt,model){
  const key=geminiKey();if(!key)throw new Error('Gemini credential missing');
  const response=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,{method:'POST',headers:{'Content-Type':'application/json','x-goog-api-key':key},body:JSON.stringify({system_instruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:prompt}]}]})});
  if(!response.ok)throw new Error(`Gemini ${model} ${response.status}: ${await response.text()}`);const data=await response.json();return data.candidates?.[0]?.content?.parts?.map((part)=>part.text||'').join('\n')||'';
}
async function callGemini(system,prompt){
  const candidates=[process.env.GEMINI_MODEL,'gemini-3.6-flash','gemini-3.5-flash','gemini-flash-latest'].filter(Boolean);const seen=new Set();const errors=[];
  for(const model of candidates){if(seen.has(model))continue;seen.add(model);try{const output=await callGeminiModel(system,prompt,model);if(output)return{output,model};}catch(error){errors.push(error instanceof Error?error.message:String(error));}}
  throw new Error(errors.join(' | ')||'Gemini returned no content');
}

function credentialStatus(){return{deepseekApiKey:Boolean(process.env.DEEPSEEK_API_KEY),openaiApiKey:Boolean(process.env.OPENAI_API_KEY),geminiApiKey:Boolean(process.env.GEMINI_API_KEY),googleApiKey:Boolean(process.env.GOOGLE_API_KEY),anthropicApiKey:Boolean(process.env.ANTHROPIC_API_KEY)}}
function nativeProviders(){return{chatgpt:false,gemini:Boolean(geminiKey()),claude:false,copilot:false,codex:false,deepseek:Boolean(process.env.DEEPSEEK_API_KEY)}}
function usableProviders(){const deepseek=Boolean(process.env.DEEPSEEK_API_KEY);return{chatgpt:deepseek,gemini:Boolean(geminiKey()),claude:deepseek,copilot:deepseek,codex:deepseek,deepseek}}

async function callAvailableEngine(system,prompt,requested){
  if(requested==='gemini'&&geminiKey()){const r=await callGemini(system,prompt);return{output:r.output,provider:`gemini/${r.model}`,native:true};}

  // DeepSeek is the required guest engine for ChatGPT / Claude / Copilot / Codex roles.
  if(process.env.DEEPSEEK_API_KEY){
    const output=await callDeepSeek(system,prompt,process.env.DEEPSEEK_MODEL||'deepseek-v4-flash');
    return{output,provider:`${requested}-role/deepseek/${process.env.DEEPSEEK_MODEL||'deepseek-v4-flash'}`,native:false};
  }

  return null;
}

export default async function handler(req,res){
  res.setHeader('Cache-Control','no-store');res.setHeader('Access-Control-Allow-Origin','*');
  if(req.method==='GET'){
    const base={guestMode:true,enginePriority:['gemini-native','deepseek'],providers:usableProviders(),nativeProviders:nativeProviders(),credentials:credentialStatus(),roleEngines:{chatgpt:'DeepSeek Engine',gemini:'Gemini Native',claude:'DeepSeek Engine',copilot:'DeepSeek Engine',codex:'DeepSeek Engine'},note:'Visitors do not register. Gemini Role uses Gemini Native. ChatGPT / Claude / Copilot / Codex roles run through DeepSeek Engine.'};
    if(String(req.query?.health||'')==='1'){
      const health={};
      if(process.env.DEEPSEEK_API_KEY){
        try{const output=await callDeepSeek('只回覆 OK','健康檢查：只回答 OK',process.env.DEEPSEEK_MODEL||'deepseek-v4-flash');health.deepseek={ok:Boolean(output),model:process.env.DEEPSEEK_MODEL||'deepseek-v4-flash'};}catch(error){health.deepseek={ok:false,error:error instanceof Error?error.message:String(error)};}
      } else health.deepseek={ok:false,error:'DEEPSEEK_API_KEY missing'};
      return res.status(200).json({...base,health});
    }
    return res.status(200).json(base);
  }
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  const{agentId='strategy',agentName='AI Agent',prompt='',provider='auto'}=req.body||{};if(!String(prompt).trim())return res.status(400).json({error:'prompt is required'});
  const requested=['chatgpt','gemini','claude','copilot','codex'].includes(String(provider))?String(provider):'chatgpt';const system=`${providerSystem[requested]}\n\n${dataRealityGuardrail}\n\n${systemByAgent[agentId]||systemByAgent.strategy}`;
  try{const result=await callAvailableEngine(system,String(prompt),requested);if(result?.output)return res.status(200).json({...result,roleLabel:roleLabels[requested],engineLabel:result.native?'Gemini Native':engineLabelFor(requested),requestedProvider:requested,guestMode:true,providers:usableProviders(),nativeProviders:nativeProviders(),credentials:credentialStatus()});const reason=`${engineLabelFor(requested)} credential missing`;return res.status(200).json({output:fallback(agentName,String(prompt),requested,reason),provider:'fallback',roleLabel:roleLabels[requested],engineLabel:'MoltiAI Local Workflow',requestedProvider:requested,guestMode:true,providers:usableProviders(),nativeProviders:nativeProviders(),credentials:credentialStatus(),warning:reason});}
  catch(error){const warning=error instanceof Error?error.message:'AI provider unavailable';console.error('[MoltiAI guest AI]',warning);return res.status(200).json({output:fallback(agentName,String(prompt),requested,warning),provider:'fallback',roleLabel:roleLabels[requested],engineLabel:'MoltiAI Local Workflow',requestedProvider:requested,guestMode:true,providers:usableProviders(),nativeProviders:nativeProviders(),credentials:credentialStatus(),warning});}
}
