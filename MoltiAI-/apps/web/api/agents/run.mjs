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

const fallback = (agentName, prompt) => `【${agentName}】\n\n任務\n${prompt}\n\n建議流程\n1. 先確認輸入資料、目標與成功指標。\n2. AI 負責研究、整理與初稿。\n3. 高風險動作由人工確認。\n4. 把成果寫入 SOP / CRM / 專案紀錄。\n5. 用節省工時、品質、轉換率與成本做 30 日驗證。\n\n下一步\n先選一個高頻、可衡量的流程做 Pilot，再決定是否擴大。`;

async function callOpenAI(system, prompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: {'Content-Type': 'application/json', Authorization: `Bearer ${process.env.OPENAI_API_KEY}`},
    body: JSON.stringify({model: process.env.OPENAI_MODEL || 'gpt-4.1-mini', temperature: 0.3, messages: [{role: 'system', content: system}, {role: 'user', content: prompt}]})
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callAnthropic(system, prompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST', headers: {'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01'},
    body: JSON.stringify({model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5', max_tokens: 1800, system, messages: [{role: 'user', content: prompt}]})
  });
  if (!response.ok) throw new Error(await response.text());
  const data = await response.json();
  return data.content?.map((part) => part.text || '').join('\n') || '';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  const {agentId = 'strategy', agentName = 'AI Agent', prompt = ''} = req.body || {};
  if (!String(prompt).trim()) return res.status(400).json({error: 'prompt is required'});
  const system = systemByAgent[agentId] || systemByAgent.strategy;
  try {
    let output = '';
    let provider = 'fallback';
    if (process.env.OPENAI_API_KEY) { output = await callOpenAI(system, String(prompt)); provider = 'openai'; }
    else if (process.env.ANTHROPIC_API_KEY) { output = await callAnthropic(system, String(prompt)); provider = 'anthropic'; }
    if (!output) output = fallback(agentName, String(prompt));
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json({output, provider});
  } catch (error) {
    return res.status(200).json({output: fallback(agentName, String(prompt)), provider: 'fallback', warning: error instanceof Error ? error.message : 'AI provider unavailable'});
  }
}
