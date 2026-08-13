import {useEffect, useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
  ArrowRight,
  BarChart3,
  Bot,
  BriefcaseBusiness,
  Building2,
  CheckCircle2,
  ChevronLeft,
  CircleDollarSign,
  ClipboardList,
  FileText,
  FileVideo,
  GraduationCap,
  LayoutDashboard,
  Link2,
  Megaphone,
  Music,
  Play,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
  UserRoundCheck,
  Users,
  Video,
  WandSparkles,
  Workflow,
} from 'lucide-react';
import './styles.css';
import {SalesDashboardSnapshot, SalesOS, type WorkspaceSession} from './sales-os';
import {readWorkspaceSession} from './workspace-auth';

type View = 'dashboard' | 'sales' | 'agents' | 'analyze' | 'create' | 'video-factory' | 'management';
type Department = 'management' | 'sales' | 'marketing' | 'social' | 'customer' | 'consulting' | 'training' | 'content' | 'finance';
type Platform = 'youtube' | 'instagram' | 'facebook' | 'tiktok' | 'douyin' | 'xiaohongshu' | 'other' | 'unknown';

type AnalysisResult = {
  platform: Platform;
  platformLabel: string;
  url: string;
  confidence: 'high' | 'medium' | 'fallback';
  metadataPlan: string;
  comparisons?: string[];
  scores?: {hook: number; retention: number; density: number; cta: number; titleScore: number};
  strengths: string[];
  risks: string[];
  hooks: string[];
  storyboard: string[];
  ctas: string[];
  videoPrompt: string;
};

type ContactInfo = {companyName: string; contactName: string; phone: string; email: string};
type RenderResult = {status: 'idle' | 'submitting' | 'ready' | 'error'; message?: string; videoUrl?: string};
type Agent = {
  id: string;
  department: Department;
  name: string;
  title: string;
  mission: string;
  automations: string[];
  approvals: string[];
  samplePrompt: string;
  icon: 'strategy' | 'sales' | 'marketing' | 'social' | 'crm' | 'consultant' | 'training' | 'video' | 'finance';
};
type AgentRun = {id: string; agentId: string; agentName: string; prompt: string; output: string; createdAt: string; mode: 'AI' | 'fallback'};

const workerUrl = import.meta.env.VITE_VIDEO_WORKER_URL ?? 'http://localhost:8787';
const emptyContact: ContactInfo = {companyName: '', contactName: '', phone: '', email: ''};

const agents: Agent[] = [
  {
    id: 'strategy', department: 'management', name: 'CEO / Strategy Agent', title: '經營管理',
    mission: '彙整公司 KPI、商機、專案與市場情報，產出主管決策摘要。',
    automations: ['每日營運摘要', '每週 KPI / 商機檢視', '重大風險與待決策事項', '競品與 AI 趨勢整理'],
    approvals: ['重大策略', '預算與投資', '對外承諾'],
    samplePrompt: '只根據目前可用資料源（moltiai.com / Wix 課程與報價、Google Calendar 預約、Gmail 開發信、vidgo.co）盤點本週營運狀況；沒有資料的地方請列為缺口，不要編造數字。', icon: 'strategy'
  },
  {
    id: 'sales', department: 'sales', name: 'Sales Agent', title: '業務開發',
    mission: '研究潛在客戶、整理 ICP、產生個人化開發信與 Follow-up。',
    automations: ['公司研究', 'ICP 評分', '開發信草稿', 'Follow-up 建議', '報價前需求摘要'],
    approvals: ['寄出 Email', '正式報價', '承諾交付時程'],
    samplePrompt: '針對一家 300 人製造業上市公司，整理 AI 導入切入點並草擬第一封開發信。', icon: 'sales'
  },
  {
    id: 'marketing', department: 'marketing', name: 'Marketing Agent', title: '行銷管理',
    mission: '把企業 AI 顧問服務拆成社群、SEO、短影音與活動內容。',
    automations: ['內容日曆', 'SEO 題目', 'LinkedIn / Threads 文案', '短影音 Hook', 'Campaign 復盤'],
    approvals: ['品牌聲明', '廣告預算', '敏感議題內容'],
    samplePrompt: '把「企業 AI 導入不是買 ChatGPT」做成一週 5 則內容，包含 2 支 30 秒短影音。', icon: 'marketing'
  },
  {
    id: 'social', department: 'social', name: 'Social Growth Agent', title: '社群成交',
    mission: '分析 Facebook、TikTok、抖音與 YouTube 後台數據，找出內容、互動與預約成交缺口。',
    automations: ['社群後台數據摘要', '內容表現排序', '留言 / 私訊機會整理', '預約導流 CTA 建議', '每週社群成交復盤'],
    approvals: ['對外回覆', '私訊開發', '廣告加碼', '品牌與敏感內容'],
    samplePrompt: '根據我貼上的 Facebook、TikTok、抖音、YouTube 後台數據，分析目前社群狀態、內容表現、互動缺口與導到 Google Calendar 預約的下一步；沒有提供的平台資料請標示為待補，不要編造粉絲、觀看、留言、私訊或成交數。', icon: 'social'
  },
  {
    id: 'crm', department: 'customer', name: 'CRM / Customer Success Agent', title: '客戶管理',
    mission: '整理商機階段、追蹤客戶回覆與續約機會，避免漏追。',
    automations: ['商機摘要', '待 Follow-up 清單', '會議紀要轉 CRM', '續約 / 加購提醒', '失聯客戶再啟動'],
    approvals: ['客戶狀態異動', '折扣', '客訴回覆'],
    samplePrompt: '根據目前已有的 Wix 報價、Google Calendar 預約與 Gmail 開發信，建立客戶追蹤欄位與下一步；沒有真實互動資料時請列出需要補上的資料，不要編造成交機率。', icon: 'crm'
  },
  {
    id: 'consultant', department: 'consulting', name: 'AI Consultant Agent', title: 'AI 顧問',
    mission: '執行 AI 成熟度診斷、Use Case 評估、治理檢查與 90 日 Roadmap。',
    automations: ['成熟度評估', 'Use Case 優先排序', 'As-Is / To-Be', '治理缺口', '90 日導入路線圖'],
    approvals: ['最終顧問建議', '法遵判定', '客戶正式交付'],
    samplePrompt: '客戶是 500 人零售集團，客服與行銷最耗工，請找出 3 個 Pilot 並估 KPI。', icon: 'consultant'
  },
  {
    id: 'training', department: 'training', name: 'Training Agent', title: '教育訓練',
    mission: '依產業與職能組合企業 AI 課程、工作坊、作業與課後 30 日任務。',
    automations: ['課綱配置', '講師教案', '分組實作', '學員作業', '課後追蹤'],
    approvals: ['正式課綱', '客製案例', '評量與證書'],
    samplePrompt: '規劃上市櫃公司 6 小時企業 AI 生產力工作坊，要求每組產出一個 Workflow。', icon: 'training'
  },
  {
    id: 'content', department: 'content', name: 'Content / Video Agent', title: '內容與 AI 影音',
    mission: '保留並串接 Analyze URL、策略 PDF、腳本、分鏡與 15 秒影片生成。',
    automations: ['Analyze URL', 'Hook / 分鏡 / CTA', '策略 PDF', '影片 Prompt', '15 秒影片生成'],
    approvals: ['對外發布', '品牌素材', '人物 / 版權素材'],
    samplePrompt: '分析一支競品影片，產出 5 個 Hook、15 秒分鏡、CTA 與影片生成 Prompt。', icon: 'video'
  },
  {
    id: 'finance', department: 'finance', name: 'Finance Management Agent', title: '財務管理',
    mission: '彙整應收、成本、毛利與現金流，提供管理提醒，不自動執行付款。',
    automations: ['應收提醒', '專案毛利摘要', '軟體/API 成本整理', '月度現金流摘要', '異常費用提醒'],
    approvals: ['任何付款', '會計認列', '稅務申報', '薪資與銀行操作'],
    samplePrompt: '盤點目前可從 Wix 報價、課程銷售、Gmail 往來與手動輸入建立哪些財務欄位；沒有真實營收與成本資料時請列資料缺口，不要編造現金流數字。', icon: 'finance'
  },
];

const availableDataSources = [
  'Wix 官網 moltiai.com、線上課程頁與 Wix 報價',
  'Google Calendar 預約 / 諮詢行程',
  'Gmail 開發信與客戶往來',
  'vidgo.co 即將上線的產品資料',
  'Facebook / TikTok / 抖音 / YouTube 後台可見或匯出的社群數據',
  '使用者手動貼上的客戶或營運資料',
];

const missingDataNotice = '目前尚未接正式 CRM、金流、會計、廣告後台或客服系統；社群數據只使用後台可見、匯出或本次貼上的資料。Agent 不應產生未提供的營收、訂單、客訴、成交率、現金流、粉絲、觀看、私訊或成交數字。';

const departmentLabels: Record<Department, string> = {
  management: '經營管理', sales: '業務', marketing: '行銷', social: '社群成交', customer: '客戶管理', consulting: '顧問', training: '教育訓練', content: '內容與 AI 影音', finance: '財務'
};

const platformLabels: Record<Platform, string> = {
  youtube: 'YouTube / Shorts', instagram: 'Instagram Reels', facebook: 'Facebook Video / Reels', tiktok: 'TikTok', douyin: '抖音', xiaohongshu: '小紅書', other: '其他影音頻道', unknown: '未辨識'
};

const detectPlatform = (input: string): Platform => {
  try {
    const host = new URL(input).hostname.replace(/^www\./, '').toLowerCase();
    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('facebook.com') || host.includes('fb.watch')) return 'facebook';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('douyin.com')) return 'douyin';
    if (host.includes('xiaohongshu.com') || host.includes('xhslink.com')) return 'xiaohongshu';
    return 'other';
  } catch { return 'unknown'; }
};

const metadataPlan = (platform: Platform) => {
  if (platform === 'youtube') return 'YouTube 優先由後端 API 取得標題、描述、頻道、縮圖與統計；失敗時使用手動補資料。';
  if (platform === 'instagram' || platform === 'facebook') return 'IG / FB 優先使用 oEmbed / Graph API；受權限限制時保留手動補資料。';
  if (platform === 'tiktok') return 'TikTok 優先使用 oEmbed；完整資料依 API 權限而定。';
  if (platform === 'douyin' || platform === 'xiaohongshu') return '抖音與小紅書保留手動補標題、描述與觀察重點，避免反爬與登入限制。';
  return '可先抓 Open Graph / oEmbed；抓不到就進入手動補資料模式。';
};

const buildFallbackAnalysis = (url: string, title: string, description: string): AnalysisResult => {
  const platform = detectPlatform(url);
  const platformLabel = platformLabels[platform];
  const topic = title.trim() || description.trim().split(/[。！？\n]/)[0] || (platform === 'unknown' ? '短影音主題' : `${platformLabel} 參考影片`);
  const short = topic.slice(0, 18);
  const hooks = [
    `你是不是也遇過「${short}」卻不知道哪裡出了問題？`,
    `先看這 3 秒，這就是「${short}」能不能留住人的關鍵。`,
    `同樣是 ${short}，為什麼有人一開口就讓人想看完？`,
    `如果你正在做 ${short}，這個錯誤先不要犯。`,
    `不用增加預算，先把 ${short} 的第一句改掉。`,
  ];
  const storyboard = [
    `0-3s：反差 / 問題 Hook，字幕直打「${short} 的關鍵不是你想的那樣」。`,
    '3-6s：快速交代痛點與使用情境，讓目標觀眾對號入座。',
    '6-10s：提供 2 個具體做法或證據，不講抽象口號。',
    '10-13s：展示改善後結果或可複製範例。',
    '13-15s：只留一個 CTA：留言、私訊、預約或進入生成影片。',
  ];
  return {
    platform, platformLabel, url, confidence: platform === 'youtube' ? 'high' : platform === 'unknown' ? 'fallback' : 'medium',
    metadataPlan: metadataPlan(platform),
    comparisons: ['痛點開場型：同題材先講失敗原因，再給 3 步解法', '教學型：以實作流程取代產品介紹', '案例證明型：用 Before / After 與結果數字建立信任'],
    scores: {hook: 4, retention: 4, density: 4, cta: 3, titleScore: 4},
    strengths: ['主題可直接拆成 15 秒「Hook → 痛點 → 方法 → CTA」。', '可做 3 種開場 A/B 測試，不需要重拍完整影片。', '分析結果可直接接到影片生成器。'],
    risks: ['只貼網址不一定能取得完整字幕與畫面內容，必要時需補標題 / 描述。', '商用重製前仍須確認圖片、音樂、人物與原始素材授權。'],
    hooks, storyboard,
    ctas: ['留言「AI」取得完整腳本', '預約企業 AI / 內容流程健檢', '上傳 3-5 張圖片直接生成 15 秒短影音'],
    videoPrompt: `主題：${topic}\nHook：${hooks[0]}\n分鏡：${storyboard.join(' ')}\nCTA：預約企業 AI / 內容流程健檢`,
  };
};

const buildReport = (result: AnalysisResult, contact: ContactInfo, title: string, description: string) => `MoltiAI 短影音策略分析報告\n\n一、客戶資料\n公司：${contact.companyName || '未填'}\n聯絡人：${contact.contactName || '未填'}\n電話：${contact.phone || '未填'}\nEmail：${contact.email || '未填'}\n\n二、分析來源\n平台：${result.platformLabel}\n網址：${result.url || '未提供'}\n標題：${title || '未提供'}\n補充：${description || '未提供'}\n可信度：${result.confidence}\n\n三、Metadata / API 策略\n${result.metadataPlan}\n\n四、診斷分數\n${result.scores ? `Hook ${result.scores.hook}/5｜留存 ${result.scores.retention}/5｜密度 ${result.scores.density}/5｜CTA ${result.scores.cta}/5｜標題 ${result.scores.titleScore}/5` : '未量化'}\n\n五、優勢\n${result.strengths.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n六、同題材對照組\n${(result.comparisons || []).map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n七、Hook\n${result.hooks.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n八、15 秒分鏡\n${result.storyboard.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n九、CTA\n${result.ctas.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n十、下一步\n以第一個 Hook 製作 15 秒直式短影音，至少測 3 個開頭版本，並用前三秒停留率、完播率、點擊或詢問率判斷。\n\n--\n瞬影科技 MoltiAI｜www.moltiai.com`;

const escapePdf = (text: string) => text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
const downloadSimplePdf = (text: string, filename: string) => {
  const lines = text.split('\n').flatMap((line) => {
    const chunks: string[] = [];
    let s = line;
    while (s.length > 42) { chunks.push(s.slice(0, 42)); s = s.slice(42); }
    chunks.push(s); return chunks;
  });
  const pageLines = 42;
  const pages: string[][] = [];
  for (let i = 0; i < lines.length; i += pageLines) pages.push(lines.slice(i, i + pageLines));
  const objects: string[] = [];
  const pageIds: number[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  let nextId = 3;
  pages.forEach((page) => {
    const contentId = nextId++;
    const pageId = nextId++;
    pageIds.push(pageId);
    const content = `BT /F1 10 Tf 42 800 Td 14 TL ${page.map((line, idx) => `${idx ? 'T* ' : ''}(${escapePdf(line)}) Tj`).join(' ')} ET`;
    objects[contentId] = `<< /Length ${content.length} >>\nstream\n${content}\nendstream`;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> /Contents ${contentId} 0 R >>`;
  });
  objects[2] = `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
  let pdf = '%PDF-1.4\n'; const offsets: number[] = [0];
  for (let i = 1; i < objects.length; i++) { offsets[i] = pdf.length; pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`; }
  const xref = pdf.length; pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let i = 1; i < objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const blob = new Blob([pdf], {type: 'application/pdf'}); const href = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = href; a.download = filename; a.click(); setTimeout(() => URL.revokeObjectURL(href), 1000);
};

const localAgentOutput = (agent: Agent, prompt: string) => {
  const now = new Date().toLocaleString('zh-TW');
  return `【${agent.name}｜${now}】\n\n任務\n${prompt}\n\n資料來源狀態\n目前可用：\n${availableDataSources.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n尚未接上：正式 CRM、金流/付款、會計、廣告後台、客服系統、課程銷售明細。\n\n重要限制\n${missingDataNotice}\n\n建議執行流程\n1. 先確認這次任務要讀取哪個資料源。\n2. 沒有資料的欄位標示為「待補」，不要用範例數字代替。\n3. AI 先做研究、整理與草稿。\n4. 依部門規則做品質 / 風險檢查。\n5. 需要核准的動作交由人工確認。\n\n自動化項目\n${agent.automations.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n人工核准\n${agent.approvals.map((x, i) => `${i + 1}. ${x}`).join('\n')}\n\n下一步\n先建立 Wix 報價、Calendar 預約、Gmail 開發信的統一客戶追蹤表，再讓 Agent 依真實資料產出決策摘要。`;
};

function IconForAgent({agent}: {agent: Agent}) {
  const props = {size: 22};
  if (agent.icon === 'strategy') return <Target {...props} />;
  if (agent.icon === 'sales') return <BriefcaseBusiness {...props} />;
  if (agent.icon === 'marketing') return <Megaphone {...props} />;
  if (agent.icon === 'social') return <BarChart3 {...props} />;
  if (agent.icon === 'crm') return <Users {...props} />;
  if (agent.icon === 'consultant') return <Workflow {...props} />;
  if (agent.icon === 'training') return <GraduationCap {...props} />;
  if (agent.icon === 'video') return <Video {...props} />;
  return <CircleDollarSign {...props} />;
}

function Sidebar({view, setView, session}: {view: View; setView: (v: View) => void; session: WorkspaceSession}) {
  const items: Array<[View, string, React.ReactNode]> = [
    ['dashboard', 'Workspace 首頁', <LayoutDashboard size={18} />],
    ['sales', 'Lead & Sales', <BriefcaseBusiness size={18} />],
    ['agents', 'AI Agent 組織', <Bot size={18} />],
    ['management', '管理 / 自動化', <Settings2 size={18} />],
    ['analyze', '影片分析 / PDF 報告', <Search size={18} />],
    ['create', '腳本 / 15 秒影片', <FileVideo size={18} />],
    ['video-factory', 'Video Factory 首頁', <Video size={18} />],
  ];
  return <aside className="sidebar">
    <div className="brand"><div className="brandMark">M</div><div><strong>MoltiAI</strong><span>Enterprise AI Workspace</span></div></div>
    <nav>{items.map(([id, label, icon]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>{icon}<span>{label}</span></button>)}</nav>
    <div className="workspaceIdentity"><Building2 size={17}/><div><strong>{session.workspaceName}</strong><span>{session.email}</span></div></div>
    <div className="sidebarNote"><ShieldCheck size={18} /><span>AI 先做研究與草稿；高風險動作保留人工核准。</span></div>
  </aside>;
}

function Dashboard({setView, runs, session}: {setView: (v: View) => void; runs: AgentRun[]; session: WorkspaceSession}) {
  return <main className="workspacePage">
    <header className="pageHeader"><div><span className="eyebrow">MOLTIAI AI-NATIVE COMPANY</span><h1>瞬影科技 AI 組織營運台</h1><p>把業務、行銷、顧問、培訓、影音與財務拆成可審核的 AI 工作流程。</p></div><button className="primary" onClick={() => setView('agents')}><Bot size={18}/>開啟 Agent</button></header>
    <section className="metrics">
      <article><Bot/><strong>{agents.length}</strong><span>部門 Agents</span></article>
      <article><Play/><strong>{runs.length}</strong><span>已執行任務</span></article>
      <article><UserRoundCheck/><strong>100%</strong><span>高風險人工核准</span></article>
      <article><BarChart3/><strong>30 日</strong><span>Pilot 驗證週期</span></article>
    </section>
    <section className="sectionBlock"><div className="sectionTitle"><div><h2>公司部門 AI Organization</h2><p>展示給上市櫃公司看的核心架構：Human Decision + AI Workforce + Enterprise Systems。</p></div></div>
      <div className="agentGrid">{agents.map((agent) => <article className="agentCard" key={agent.id}><div className="agentIcon"><IconForAgent agent={agent}/></div><div className="agentDept">{departmentLabels[agent.department]}</div><h3>{agent.name}</h3><p>{agent.mission}</p><button onClick={() => setView('agents')}>查看與執行 <ArrowRight size={16}/></button></article>)}</div>
    </section>
    <SalesDashboardSnapshot session={session}/>
    <section className="sectionBlock"><div className="sectionTitle"><div><h2>內容與 AI 影音</h2><p>以下功能保留為既有 Video Factory 的核心能力。</p></div></div>
      <div className="quickGrid"><button onClick={() => setView('analyze')}><Search/><strong>Analyze URL</strong><span>影片網址 → Hook / 分鏡 / CTA / PDF</span></button><button onClick={() => setView('create')}><FileVideo/><strong>腳本 / 15 秒影片</strong><span>Prompt + 3–5 張圖 → MP4</span></button><button onClick={() => setView('video-factory')}><Video/><strong>Video Factory 首頁</strong><span>從分析到生成的完整流程</span></button></div>
    </section>
  </main>;
}

function AgentsPage({runs, setRuns}: {runs: AgentRun[]; setRuns: React.Dispatch<React.SetStateAction<AgentRun[]>>}) {
  const [selected, setSelected] = useState(agents[0]);
  const [prompt, setPrompt] = useState(agents[0].samplePrompt);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState('');
  const choose = (agent: Agent) => { setSelected(agent); setPrompt(agent.samplePrompt); setOutput(''); };
  const run = async () => {
    if (!prompt.trim()) return; setLoading(true); setOutput('');
    let text = ''; let mode: AgentRun['mode'] = 'AI';
    try {
      const res = await fetch('/api/agents/run', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({agentId: selected.id, agentName: selected.name, prompt})});
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json() as {output?: string; text?: string}; text = data.output || data.text || '';
      if (!text) throw new Error('AI 沒有回傳內容');
    } catch {
      mode = 'fallback'; text = localAgentOutput(selected, prompt);
    }
    const item: AgentRun = {id: crypto.randomUUID(), agentId: selected.id, agentName: selected.name, prompt, output: text, createdAt: new Date().toISOString(), mode};
    setRuns((current) => [item, ...current].slice(0, 50)); setOutput(text); setLoading(false);
  };
  return <main className="workspacePage"><header className="pageHeader"><div><span className="eyebrow">AI WORKFORCE</span><h1>AI Agent 組織</h1><p>每個 Agent 都有自動化工作、人工核准點與可衡量 KPI。未接資料源時只做盤點與草稿，不編造營運數字。</p></div></header>
    <div className="agentWorkspace"><section className="agentList">{agents.map((a) => <button key={a.id} className={selected.id === a.id ? 'selected' : ''} onClick={() => choose(a)}><span className="agentIcon small"><IconForAgent agent={a}/></span><span><strong>{a.name}</strong><small>{a.title}</small></span></button>)}</section>
      <section className="agentDetail"><div className="detailHero"><div className="agentIcon"><IconForAgent agent={selected}/></div><div><span>{departmentLabels[selected.department]}</span><h2>{selected.name}</h2><p>{selected.mission}</p></div></div>
        <div className="dataNotice"><strong>目前資料源</strong><span>{availableDataSources.join('、')}</span><small>{missingDataNotice}</small></div>
        <div className="twoCols"><div><h3>可自動化</h3><ul>{selected.automations.map((x) => <li key={x}><CheckCircle2 size={16}/>{x}</li>)}</ul></div><div><h3>必須人工核准</h3><ul>{selected.approvals.map((x) => <li key={x}><ShieldCheck size={16}/>{x}</li>)}</ul></div></div>
        <label className="taskBox"><span>交給 Agent 的任務</span><textarea value={prompt} onChange={(e) => setPrompt(e.target.value)}/><button className="primary" disabled={loading || !prompt.trim()} onClick={run}><Sparkles size={18}/>{loading ? '執行中...' : '執行 Agent'}</button></label>
        {output && <div className="outputBox"><div className="outputHeader"><h3>Agent 輸出</h3><button onClick={() => navigator.clipboard.writeText(output)}>複製</button></div><pre>{output}</pre></div>}
      </section>
    </div>
    {runs.length > 0 && <section className="sectionBlock"><div className="sectionTitle"><h2>最近執行</h2></div><div className="runList">{runs.slice(0, 8).map((r) => <article key={r.id}><div><strong>{r.agentName}</strong><span>{new Date(r.createdAt).toLocaleString('zh-TW')} · {r.mode}</span></div><p>{r.prompt}</p></article>)}</div></section>}
  </main>;
}

function ManagementPage({runs}: {runs: AgentRun[]}) {
  return <main className="workspacePage"><header className="pageHeader"><div><span className="eyebrow">AUTOMATION & GOVERNANCE</span><h1>管理 / 自動化</h1><p>用部門、Workflow、Approval、KPI 四層管理 AI，而不是只管理 Prompt。</p></div></header>
    <section className="sectionBlock"><div className="flow"><div><strong>1. Trigger</strong><span>Email / 表單 / 行程 / 手動</span></div><ArrowRight/><div><strong>2. AI Process</strong><span>研究 / 分析 / 草稿</span></div><ArrowRight/><div><strong>3. Human Approval</strong><span>風險與品質核准</span></div><ArrowRight/><div><strong>4. Action</strong><span>寄送 / CRM / 發布 / 交付</span></div><ArrowRight/><div><strong>5. KPI</strong><span>工時 / 品質 / ROI</span></div></div></section>
    <section className="sectionBlock"><div className="sectionTitle"><div><h2>部門自動化藍圖</h2><p>高風險流程不做無人監督自動執行。</p></div></div><div className="automationTable"><div className="tableHead"><span>部門</span><span>Agent</span><span>自動化</span><span>人工核准</span></div>{agents.map((a) => <div className="tableRow" key={a.id}><span>{departmentLabels[a.department]}</span><span>{a.name}</span><span>{a.automations.slice(0, 3).join('、')}</span><span>{a.approvals.join('、')}</span></div>)}</div></section>
    <section className="sectionBlock"><div className="sectionTitle"><h2>執行紀錄</h2></div><p className="muted">目前瀏覽器已保存 {runs.length} 筆 Agent 任務紀錄；正式企業版可再接 CRM、資料庫、權限與 Audit Log。</p></section>
  </main>;
}

function AnalyzeUrl({onBack, onGenerate}: {onBack: () => void; onGenerate: (prompt: string) => void}) {
  const [url, setUrl] = useState(''); const [title, setTitle] = useState(''); const [description, setDescription] = useState('');
  const [contact, setContact] = useState<ContactInfo>(emptyContact); const [result, setResult] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle'); const [error, setError] = useState('');
  const canAnalyze = url.trim().length >= 4 || title.trim().length >= 2 || description.trim().length >= 4;
  const analyze = async () => {
    if (!canAnalyze) return; setStatus('loading'); setError('');
    try {
      const response = await fetch(`${workerUrl}/analyze`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({url, title, description})});
      if (!response.ok) throw new Error(await response.text());
      setResult(await response.json() as AnalysisResult); setStatus('idle');
    } catch (e) {
      setResult(buildFallbackAnalysis(url, title, description)); setStatus('error'); setError(e instanceof Error ? `後端暫時無法取得資料，已改用本地策略分析：${e.message}` : '已改用本地策略分析');
    }
  };
  const report = result ? buildReport(result, contact, title, description) : '';
  return <main className="workspacePage"><header className="pageHeader compact"><button className="backButton" onClick={onBack}><ChevronLeft size={18}/>回 Workspace</button><div><span className="eyebrow">ANALYZE URL</span><h1>貼上影片網址，自動產生短影音策略</h1><p>YouTube 可優先接 API；IG、FB、TikTok 用 oEmbed；抖音與小紅書保留手動補資料。</p></div></header>
    <div className="contentGrid"><section className="formCard"><h2>客戶與來源</h2><div className="twoInputs"><label>公司<input value={contact.companyName} onChange={(e) => setContact({...contact, companyName: e.target.value})}/></label><label>聯絡人<input value={contact.contactName} onChange={(e) => setContact({...contact, contactName: e.target.value})}/></label></div><div className="twoInputs"><label>電話<input value={contact.phone} onChange={(e) => setContact({...contact, phone: e.target.value})}/></label><label>Email<input value={contact.email} onChange={(e) => setContact({...contact, email: e.target.value})}/></label></div><label>影片網址<input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="YouTube / IG / FB / TikTok / 抖音 / 小紅書"/><small>辨識：{platformLabels[detectPlatform(url)]}</small></label><label>影片標題，可選填<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="抓不到 metadata 時手動補充"/></label><label>影片描述 / 觀察重點，可選填<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="內容重點、前三秒、CTA、產品資訊..."/></label><button className="primary" disabled={!canAnalyze || status === 'loading'} onClick={analyze}><Search size={18}/>{status === 'loading' ? '分析中...' : '產生 Hook / 分鏡 / CTA'}</button></section>
      <section className="resultCard"><h2>分析結果</h2>{error && <p className="error">{error}</p>}{!result ? <div className="emptyState"><Search/><p>貼上影片網址後，這裡會顯示平台判斷、策略、對照組、Hook、分鏡、CTA 與 PDF。</p></div> : <div className="analysis"><span className={`confidence ${result.confidence}`}>{result.platformLabel} · {result.confidence}</span><p>{result.metadataPlan}</p>{result.scores && <div className="scoreGrid"><span>Hook <strong>{result.scores.hook}/5</strong></span><span>留存 <strong>{result.scores.retention}/5</strong></span><span>密度 <strong>{result.scores.density}/5</strong></span><span>CTA <strong>{result.scores.cta}/5</strong></span></div>}<h3>同題材對照組</h3><ol>{result.comparisons?.map((x) => <li key={x}>{x}</li>)}</ol><h3>Hook</h3><ol>{result.hooks.map((x) => <li key={x}>{x}</li>)}</ol><h3>15 秒分鏡</h3><ol>{result.storyboard.map((x) => <li key={x}>{x}</li>)}</ol><h3>CTA</h3><ul>{result.ctas.map((x) => <li key={x}>{x}</li>)}</ul><div className="actionRow"><button className="primary" onClick={() => onGenerate(result.videoPrompt)}><FileVideo size={17}/>用分析生成影片</button><button onClick={() => navigator.clipboard.writeText(report)}><ClipboardList size={17}/>複製報告</button><button onClick={() => downloadSimplePdf(report, `moltiai-strategy-${contact.companyName || 'report'}.pdf`)}><FileText size={17}/>下載 PDF</button></div></div>}</section></div>
  </main>;
}

function CreateVideo({onBack, initialPrompt}: {onBack: () => void; initialPrompt: string}) {
  const [prompt, setPrompt] = useState(initialPrompt); const [cta, setCta] = useState('立即了解'); const [musicMode, setMusicMode] = useState<'auto' | 'upload' | 'none'>('auto');
  const [images, setImages] = useState<FileList | null>(null); const [music, setMusic] = useState<File | null>(null); const [result, setResult] = useState<RenderResult>({status: 'idle'});
  const imageCount = images?.length ?? 0; const canSubmit = prompt.trim().length > 8 && imageCount >= 3 && imageCount <= 5;
  const helper = useMemo(() => imageCount === 0 ? '請上傳 3-5 張圖片。' : imageCount < 3 ? `目前 ${imageCount} 張，至少 3 張。` : imageCount > 5 ? `目前 ${imageCount} 張，最多 5 張。` : `已選 ${imageCount} 張圖片。`, [imageCount]);
  const submit = async () => {
    if (!canSubmit || !images) return; setResult({status: 'submitting', message: '正在送出影片生成任務...'});
    const form = new FormData(); form.set('prompt', prompt); form.set('cta', cta); form.set('musicMode', musicMode); Array.from(images).forEach((img) => form.append('images', img)); if (musicMode === 'upload' && music) form.set('music', music);
    try { const res = await fetch(`${workerUrl}/render`, {method: 'POST', body: form}); if (!res.ok) throw new Error(await res.text()); const data = await res.json() as {videoUrl: string}; setResult({status: 'ready', videoUrl: data.videoUrl}); }
    catch (e) { setResult({status: 'error', message: e instanceof Error ? e.message : '影片生成失敗'}); }
  };
  return <main className="workspacePage"><header className="pageHeader compact"><button className="backButton" onClick={onBack}><ChevronLeft size={18}/>回 Workspace</button><div><span className="eyebrow">SCRIPT / 15S VIDEO</span><h1>把策略與腳本變成 15 秒短影音</h1><p>保留既有 3-5 張圖片、CTA、音樂與 MP4 生成流程。</p></div></header><div className="contentGrid"><section className="formCard"><label>影片描述 / Script<textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="可從 Analyze URL 一鍵帶入"/></label><label>CTA<input value={cta} onChange={(e) => setCta(e.target.value)}/></label><label>圖片素材<div className="fileBox"><Upload size={20}/><input type="file" multiple accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e) => setImages(e.target.files)}/></div><small>{helper}</small></label><label>音樂<select value={musicMode} onChange={(e) => setMusicMode(e.target.value as typeof musicMode)}><option value="auto">自動音樂</option><option value="upload">上傳音樂</option><option value="none">不要音樂</option></select></label>{musicMode === 'upload' && <label>音樂檔案<div className="fileBox"><Music size={20}/><input type="file" accept="audio/*" onChange={(e) => setMusic(e.target.files?.[0] ?? null)}/></div></label>}<button className="primary" disabled={!canSubmit || result.status === 'submitting'} onClick={submit}><WandSparkles size={18}/>{result.status === 'submitting' ? '生成中...' : '生成 15 秒影片'}</button></section><section className="resultCard"><h2>影片預覽</h2>{result.status === 'idle' && <div className="emptyState"><Video/><p>完成腳本與素材後，影片會顯示在這裡。</p></div>}{result.status === 'submitting' && <p>{result.message}</p>}{result.status === 'error' && <p className="error">{result.message}</p>}{result.status === 'ready' && result.videoUrl && <><video className="video" src={result.videoUrl} controls playsInline/><a className="downloadLink" href={result.videoUrl} download>下載 MP4</a></>}</section></div></main>;
}

function VideoFactory({setView}: {setView: (v: View) => void}) {
  return <main className="workspacePage"><header className="pageHeader"><div><span className="eyebrow">VIDEO FACTORY</span><h1>內容與 AI 影音生產線</h1><p>保留原本的影片分析與生成功能，並把它正式掛在 Content / Video Agent 底下。</p></div></header><section className="factoryFlow"><button onClick={() => setView('analyze')}><span>01</span><Search/><strong>Analyze URL</strong><p>影片網址 → metadata / fallback → 策略分析</p></button><ArrowRight/><button onClick={() => setView('analyze')}><span>02</span><ClipboardList/><strong>策略 / PDF</strong><p>Hook、對照組、分鏡、CTA、報告</p></button><ArrowRight/><button onClick={() => setView('create')}><span>03</span><FileVideo/><strong>腳本 / 15 秒影片</strong><p>Prompt + 3–5 張圖 + 音樂</p></button><ArrowRight/><button><span>04</span><UserRoundCheck/><strong>人工審核</strong><p>品牌、事實、版權與 CTA</p></button></section><section className="sectionBlock"><div className="sectionTitle"><div><h2>平台資料取得策略</h2><p>這是必須保留的 Analyze URL 規則。</p></div></div><div className="platformGrid"><article><strong>YouTube</strong><p>優先接 API；抓不到時 fallback。</p></article><article><strong>IG / FB</strong><p>oEmbed / Graph API，受限時手動補。</p></article><article><strong>TikTok</strong><p>oEmbed 優先，完整資料視權限。</p></article><article><strong>抖音 / 小紅書</strong><p>保留手動補資料，避免反爬風險。</p></article></div></section></main>;
}

function App() {
  const [session] = useState<WorkspaceSession>(() => readWorkspaceSession()!);
  const entryView: View = new URLSearchParams(window.location.search).get('intake') === '1' ? 'sales' : 'dashboard';
  const [view, setView] = useState<View>(entryView); const [initialPrompt, setInitialPrompt] = useState('');
  const runsKey = `moltiai-agent-runs:${session.workspaceId}`;
  const [runs, setRuns] = useState<AgentRun[]>(() => { try { return JSON.parse(localStorage.getItem(`moltiai-agent-runs:${readWorkspaceSession()!.workspaceId}`) || '[]'); } catch { return []; } });
  useEffect(() => { localStorage.setItem(runsKey, JSON.stringify(runs)); }, [runs, runsKey]);
  useEffect(() => { try { setRuns(JSON.parse(localStorage.getItem(`moltiai-agent-runs:${session.workspaceId}`) || '[]')); } catch { setRuns([]); } }, [session.workspaceId]);
  let page: React.ReactNode;
  if (view === 'dashboard') page = <Dashboard setView={setView} runs={runs} session={session}/>;
  else if (view === 'sales') page = <SalesOS session={session}/>;
  else if (view === 'agents') page = <AgentsPage runs={runs} setRuns={setRuns}/>;
  else if (view === 'management') page = <ManagementPage runs={runs}/>;
  else if (view === 'analyze') page = <AnalyzeUrl onBack={() => setView('dashboard')} onGenerate={(p) => {setInitialPrompt(p); setView('create');}}/>;
  else if (view === 'create') page = <CreateVideo onBack={() => setView('dashboard')} initialPrompt={initialPrompt}/>;
  else page = <VideoFactory setView={setView}/>;
  return <div className="appShell"><Sidebar view={view} setView={setView} session={session}/><div className="mainArea">{page}</div></div>;
}

createRoot(document.getElementById('root')!).render(<App/>);
