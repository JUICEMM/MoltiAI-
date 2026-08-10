const systemByAgent = {
  strategy: '你是企業經營管理 AI Agent。請用繁體中文，提供主管可直接採取行動的摘要、風險、優先級與 KPI。',
  sales: '你是 B2B 業務開發 AI Agent。請用繁體中文，聚焦 ICP、客戶痛點、個人化開發、Follow-up、報價前需求整理。',
  marketing: '你是企業行銷 AI Agent。請用繁體中文，產出可發布的內容策略、SEO、短影音 Hook 與 CTA，避免空泛。',
  crm: '你是 CRM / Customer Success AI Agent。請用繁體中文，整理商機階段、下一步、Owner、期限、成交或續約風險。',
  consultant: '你是企業 AI 導入顧問 Agent。請用繁體中文，使用 As-Is、To-Be、Use Case、治理、Pilot、KPI、ROI 架構。',
  training: '你是企業 AI 培訓 Agent。請用繁體中文，規劃課程、實作、學員產出與驗收，不只列工具。',
  content: '你是 AI 內容與影音 Agent。請用繁體中文，產出 Hook、分鏡、CTA、影片 Prompt 與可執行工作流。',
  finance: '你是財務管理 AI Agent。請用繁體中文，只做分析、整理與提醒，不執行付款、稅務申報或會計認列。',
};

const providerSystem = {
  chatgpt: '你扮演 MoltiAI 的 ChatGPT AI Operations Manager。請把任務拆解、判斷適合的 AI 專家、整合結果，並標示 Human Approval 與 KPI。',
  gemini: '你扮演 MoltiAI 的 Gemini Research Specialist。請聚焦公開研究、資料整理、比較、證據與來源需求；不要捏造來源。',
  claude: '你扮演 MoltiAI 的 Claude Consultant Specialist。請聚焦策略、顧問分析、長文寫作、制度與提案，產出可直接使用的繁體中文結果。',
  copilot: '你扮演 MoltiAI 的 Office / Copilot Specialist。請聚焦 Word、Excel、PowerPoint、Outlook、會議與企業 Office 工作。訪客免登入模式不得聲稱已存取 Microsoft 365 私有資料。',
  codex: '你扮演 MoltiAI 的 Codex Engineering Specialist。請聚焦程式設計、除錯、GitHub、API、測試與部署，提供可執行的工程步驟。',
};

const fallback = (agentName, prompt, provider='auto') => `【${agentName}｜Guest Mode】\n\n任務\n${prompt}\n\n目前沒有任何可用的伺服器端 AI 憑證，因此先以 MoltiAI 本地 Workflow 回覆。\n\n建議流程\n1. 先確認輸入資料、目標與成功指標。\n2. AI 負責研究、整理與初稿。\n3. 高風險動作由 Michael / 人工確認。\n4. 把成果寫入 SOP / CRM / 專案紀錄。\n5. 用節省工時、品質、轉換率與成本做 30 日驗證。\n\nRequested Role: ${provider}`;

async function callOpenAI(system, prompt, model) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}`},
    body: JSON.stringify({model: model || process.env.OPENAI_MODEL || 'gpt-5-mini', temperature: 0.3, messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(system, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: {'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01'},
    body: JSON.stringify({model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5', max_tokens: 2200, system, messages: [{role: 'user', content: prompt}]})
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.content?.map((part) => part.text || '').join('\n') || '';
}

async function callGemini(system, prompt) {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  const model = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST', headers: {'Content-Type': 'application/json', 'x-goog-api-key': key},
    body: JSON.stringify({system_instruction: {parts: [{text: system}]}, contents: [{role: 'user', parts: [{text: prompt}]}]})
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('\n') || '';
}

function nativeProviders() {
  return {
    chatgpt: Boolean(process.env.OPENAI_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY),
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
    copilot: false,
    codex: Boolean(process.env.OPENAI_API_KEY),
  };
}

function hasAnyEngine() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

function usableProviders() {
  const on = hasAnyEngine();
  return {chatgpt:on, gemini:on, claude:on, copilot:on, codex:on};
}

async function callAvailableEngine(system, prompt, requested) {
  if (requested === 'chatgpt' && process.env.OPENAI_API_KEY) return {output: await callOpenAI(system, prompt, process.env.OPENAI_MODEL || 'gpt-5-mini'), provider:'chatgpt', native:true};
  if (requested === 'gemini' && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) return {output: await callGemini(system, prompt), provider:'gemini', native:true};
  if (requested === 'claude' && process.env.ANTHROPIC_API_KEY) return {output: await callAnthropic(system, prompt), provider:'claude', native:true};
  if (requested === 'codex' && process.env.OPENAI_API_KEY) return {output: await callOpenAI(system, prompt, process.env.OPENAI_CODEX_MODEL || 'gpt-5.1-codex'), provider:'codex', native:true};

  // Guest proxy: the requested role remains the same, while the actual engine uses any server-side model that is available.
  if (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY) return {output: await callGemini(system, prompt), provider:`${requested}-role/gemini`, native:false};
  if (process.env.OPENAI_API_KEY) return {output: await callOpenAI(system, prompt, process.env.OPENAI_MODEL || 'gpt-5-mini'), provider:`${requested}-role/openai`, native:false};
  if (process.env.ANTHROPIC_API_KEY) return {output: await callAnthropic(system, prompt), provider:`${requested}-role/claude`, native:false};
  return null;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'GET') return res.status(200).json({guestMode:true, providers:usableProviders(), nativeProviders:nativeProviders(), note:'Visitors do not register. Provider credentials stay server-side. Non-native roles may run through a server-side guest proxy.'});
  if (req.method !== 'POST') return res.status(405).json({error:'Method not allowed'});
  const {agentId='strategy', agentName='AI Agent', prompt='', provider='auto'} = req.body || {};
  if (!String(prompt).trim()) return res.status(400).json({error:'prompt is required'});
  const requested = ['chatgpt','gemini','claude','copilot','codex'].includes(String(provider)) ? String(provider) : 'chatgpt';
  const system = `${providerSystem[requested]}\n\n${systemByAgent[agentId] || systemByAgent.strategy}`;
  try {
    const result = await callAvailableEngine(system, String(prompt), requested);
    if (result?.output) return res.status(200).json({...result, requestedProvider:requested, guestMode:true, providers:usableProviders(), nativeProviders:nativeProviders()});
    return res.status(200).json({output:fallback(agentName,String(prompt),requested),provider:'fallback',requestedProvider:requested,guestMode:true,providers:usableProviders(),nativeProviders:nativeProviders(),warning:'No server-side AI engine configured'});
  } catch (error) {
    return res.status(200).json({output:fallback(agentName,String(prompt),requested),provider:'fallback',requestedProvider:requested,guestMode:true,providers:usableProviders(),nativeProviders:nativeProviders(),warning:error instanceof Error ? error.message : 'AI provider unavailable'});
  }
}