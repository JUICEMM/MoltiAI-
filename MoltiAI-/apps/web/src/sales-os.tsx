import {useEffect, useMemo, useState} from 'react';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  Clock3,
  FileSearch,
  FileText,
  Filter,
  Flame,
  Inbox,
  Mail,
  MessageSquareText,
  Plus,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Target,
  UserRoundSearch,
  Users,
  X,
} from 'lucide-react';
import './sales-os.css';
import './sales-layout-fix.css';

export type WorkspaceSession = {
  userId: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
};

type Stage = 'new' | 'qualified' | 'research' | 'contacted' | 'replied' | 'meeting' | 'proposal' | 'won' | 'lost';
type Intent = 'UNCLASSIFIED' | 'HOT' | 'WARM' | 'LATER' | 'NO';
type Offer = 'AI 內容成長系統' | '企業 AI 導入' | 'Wondershare 企業授權';
type SalesView = 'pipeline' | 'automation' | 'delivery' | 'audit';

type AuditEvent = {id: string; action: string; detail: string; createdAt: string};
type FollowUp = {id: string; day: 3 | 7 | 14; dueAt: string; status: 'pending' | 'done'; subject: string; body: string};
type Milestone = {id: string; label: string; dueAt: string; done: boolean};
type Lead = {
  id: string;
  workspaceId: string;
  company: string;
  website: string;
  industry: string;
  employeeBand: string;
  source: string;
  contactName: string;
  contactTitle: string;
  email: string;
  phone: string;
  stage: Stage;
  intent: Intent;
  createdAt: string;
  updatedAt: string;
  nextActionAt: string;
  contentScore: number;
  aiTransformationScore: number;
  softwareScore: number;
  overallScore: number;
  bestOffer: Offer;
  qualified: boolean;
  disqualifiedReason: string;
  researchSummary: string;
  aiQualification: string;
  draftSubject: string;
  draftBody: string;
  replyText: string;
  meetingUrl: string;
  proposalAmount: number;
  proposalStatus: 'not_started' | 'draft' | 'sent' | 'accepted' | 'declined';
  lostReason: string;
  renewalAt: string;
  followUps: FollowUp[];
  milestones: Milestone[];
  signals: {
    multiSite: boolean;
    activeContent: boolean;
    weakVideo: boolean;
    hiring: boolean;
    expansion: boolean;
    aiMention: boolean;
    hasDecisionMaker: boolean;
    publicEmail: boolean;
    existingCustomer: boolean;
    optOut: boolean;
    inactive: boolean;
  };
};

type SalesState = {leads: Lead[]; audit: AuditEvent[]};

const stages: Array<{id: Stage; label: string}> = [
  {id: 'new', label: '新名單'}, {id: 'qualified', label: '已評分'}, {id: 'research', label: '已研究'},
  {id: 'contacted', label: '已開發'}, {id: 'replied', label: '已回覆'}, {id: 'meeting', label: '已預約'},
  {id: 'proposal', label: '提案 / 報價'}, {id: 'won', label: '成交'}, {id: 'lost', label: '未成交'},
];

const stageLabel = (stage: Stage) => stages.find((item) => item.id === stage)?.label ?? stage;
const nowIso = () => new Date().toISOString();
const datePlus = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
const clamp = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const scoreLead = (lead: Pick<Lead, 'industry' | 'employeeBand' | 'signals'>) => {
  const coreIndustries = ['醫美', '牙醫', '教育培訓', '專業服務', 'B2B 企業服務'];
  const secondaryIndustries = ['連鎖服務', '健康', '零售品牌', '製造業'];
  const industry = coreIndustries.some((x) => lead.industry.includes(x)) ? 15 : secondaryIndustries.some((x) => lead.industry.includes(x)) ? 8 : 2;
  const size = ['20–49', '50–99', '100–300'].includes(lead.employeeBand) ? 8 : lead.employeeBand === '300+' ? 5 : 1;
  const s = lead.signals;
  const base = industry + size + (s.multiSite ? 7 : 0) + (s.activeContent ? 5 : 0) + (s.weakVideo ? 10 : 0) + (s.hiring ? 10 : 0) + (s.expansion ? 5 : 0) + (s.aiMention ? 6 : 0) + (s.hasDecisionMaker ? 7 : 0) + (s.publicEmail ? 4 : 0) + (s.existingCustomer ? 15 : 0);
  const penalties = (s.inactive ? 30 : 0) + (s.optOut ? 100 : 0);
  const contentScore = clamp(industry + size + (s.multiSite ? 10 : 0) + (s.activeContent ? 20 : 0) + (s.weakVideo ? 20 : 0) + (s.expansion ? 10 : 0) + (s.hasDecisionMaker ? 8 : 0) + (s.publicEmail ? 5 : 0) - penalties);
  const aiTransformationScore = clamp(industry + size * 2 + (s.aiMention ? 22 : 0) + (s.hiring ? 15 : 0) + (s.multiSite ? 8 : 0) + (s.hasDecisionMaker ? 10 : 0) + (s.publicEmail ? 5 : 0) - penalties);
  const softwareScore = clamp((lead.industry.includes('教育') ? 25 : 6) + size * 2 + (s.hiring ? 10 : 0) + (s.existingCustomer ? 25 : 0) + (s.hasDecisionMaker ? 10 : 0) + (s.publicEmail ? 8 : 0) - penalties);
  const best = Math.max(contentScore, aiTransformationScore, softwareScore);
  const bestOffer: Offer = best === contentScore ? 'AI 內容成長系統' : best === aiTransformationScore ? '企業 AI 導入' : 'Wondershare 企業授權';
  return {contentScore, aiTransformationScore, softwareScore, overallScore: clamp(base - penalties), bestOffer};
};

const blankLead = (workspaceId: string): Lead => {
  const base: Lead = {
    id: crypto.randomUUID(), workspaceId, company: '', website: '', industry: '醫美', employeeBand: '20–49', source: 'Wix / moltiai.com',
    contactName: '', contactTitle: '', email: '', phone: '', stage: 'new', intent: 'UNCLASSIFIED', createdAt: nowIso(), updatedAt: nowIso(), nextActionAt: datePlus(3),
    contentScore: 0, aiTransformationScore: 0, softwareScore: 0, overallScore: 0, bestOffer: 'AI 內容成長系統', qualified: false, disqualifiedReason: '',
    researchSummary: '', aiQualification: '', draftSubject: '', draftBody: '', replyText: '', meetingUrl: 'https://www.moltiai.com/', proposalAmount: 0,
    proposalStatus: 'not_started', lostReason: '', renewalAt: '', followUps: [], milestones: [],
    signals: {multiSite: false, activeContent: true, weakVideo: true, hiring: false, expansion: false, aiMention: false, hasDecisionMaker: false, publicEmail: false, existingCustomer: false, optOut: false, inactive: false},
  };
  return {...base, ...scoreLead(base)};
};

const seedState = (session: WorkspaceSession): SalesState => {
  const lead = blankLead(session.workspaceId);
  lead.company = '台灣成長診所（示範）'; lead.website = 'https://example.com'; lead.industry = '醫美'; lead.employeeBand = '50–99';
  lead.contactName = '王經理'; lead.contactTitle = '行銷主管'; lead.email = 'demo@example.com'; lead.source = 'Wix 表單（示範）'; lead.stage = 'qualified';
  lead.signals = {...lead.signals, multiSite: true, hiring: true, expansion: true, hasDecisionMaker: true, publicEmail: true};
  Object.assign(lead, scoreLead(lead)); lead.qualified = true;
  lead.aiQualification = '示範資料：多據點、持續產製內容且近期擴張，決策者與公開聯絡方式完整；優先以 AI 內容成長系統切入。';
  return {leads: [lead], audit: [{id: crypto.randomUUID(), action: 'WORKSPACE_CREATED', detail: `建立 ${session.workspaceName} 與一筆可刪除的示範商機`, createdAt: nowIso()}]};
};

const storeKey = (workspaceId: string) => `moltiai:sales-os:v1:${workspaceId}`;
const loadState = (session: WorkspaceSession): SalesState => {
  try { const saved = localStorage.getItem(storeKey(session.workspaceId)); return saved ? JSON.parse(saved) as SalesState : seedState(session); }
  catch { return seedState(session); }
};

const classifyIntent = (text: string): Intent => {
  const value = text.toLowerCase();
  if (/不要|退訂|unsubscribe|沒興趣|拒絕|不用了/.test(value)) return 'NO';
  if (/下季|之後|later|明年|再聯絡|暫緩/.test(value)) return 'LATER';
  if (/報價|安排會議|預約|本週|盡快|方案|價格|demo|簡報/.test(value)) return 'HOT';
  if (/有興趣|資料|了解|評估|看看|轉給/.test(value)) return 'WARM';
  return 'WARM';
};

const makeDraft = (lead: Lead) => ({
  subject: `${lead.company}｜${lead.bestOffer}合作建議`,
  body: `${lead.contactName || lead.contactTitle || '您好'}：\n\n我是瞬影科技 MoltiAI 的 Michael。我們注意到 ${lead.company} 在${lead.industry}市場持續成長，想分享一個與「${lead.bestOffer}」相關的具體切入點。\n\n我們不是只提供單一工具，而是會先盤點現況、找出可在 30 天內驗證的流程，再協助團隊落地。若合適，我可以用 20 分鐘說明一個針對 ${lead.company} 的初步方案。\n\n是否方便安排時間交流？\n\nMichael｜瞬影科技 MoltiAI\nhttps://www.moltiai.com/`,
});

function ScorePill({label, value}: {label: string; value: number}) {
  return <div className="scorePill"><span>{label}</span><strong>{value}</strong></div>;
}

function LeadForm({lead, onSave, onCancel}: {lead: Lead; onSave: (lead: Lead) => void; onCancel: () => void}) {
  const [draft, setDraft] = useState(lead);
  const setField = <K extends keyof Lead>(key: K, value: Lead[K]) => setDraft((current) => ({...current, [key]: value}));
  const setSignal = (key: keyof Lead['signals'], value: boolean) => setDraft((current) => ({...current, signals: {...current.signals, [key]: value}}));
  const scored = {...draft, ...scoreLead(draft)};
  return <div className="modalBackdrop"><section className="leadModal" role="dialog" aria-modal="true" aria-label="新增潛在客戶">
    <div className="modalHeader"><div><span className="eyebrow">PROSPECT INTAKE</span><h2>{lead.company ? '編輯潛在客戶' : '新增潛在客戶'}</h2></div><button className="iconButton" onClick={onCancel} aria-label="關閉"><X size={18}/></button></div>
    <div className="formGrid">
      <label>公司名稱<input value={draft.company} onChange={(e) => setField('company', e.target.value)} placeholder="公司 / 品牌名稱"/></label>
      <label>網站<input value={draft.website} onChange={(e) => setField('website', e.target.value)} placeholder="https://"/></label>
      <label>產業<select value={draft.industry} onChange={(e) => setField('industry', e.target.value)}>{['醫美','牙醫','教育培訓','專業服務','B2B 企業服務','連鎖服務','健康','零售品牌','製造業','其他'].map((x) => <option key={x}>{x}</option>)}</select></label>
      <label>員工人數<select value={draft.employeeBand} onChange={(e) => setField('employeeBand', e.target.value)}>{['<5','5–19','20–49','50–99','100–300','300+'].map((x) => <option key={x}>{x}</option>)}</select></label>
      <label>名單來源<input value={draft.source} onChange={(e) => setField('source', e.target.value)}/></label>
      <label>決策者<input value={draft.contactName} onChange={(e) => setField('contactName', e.target.value)} placeholder="姓名"/></label>
      <label>職稱<input value={draft.contactTitle} onChange={(e) => setField('contactTitle', e.target.value)} placeholder="行銷 / 營運 / HR / IT"/></label>
      <label>Email<input type="email" value={draft.email} onChange={(e) => setField('email', e.target.value)}/></label>
      <label>電話<input value={draft.phone} onChange={(e) => setField('phone', e.target.value)}/></label>
    </div>
    <h3>Qualification signals</h3>
    <div className="signalGrid">
      {([
        ['multiSite','多據點 / 多品牌'],['activeContent','持續做內容 / 廣告'],['weakVideo','影音或 CTA 明顯可改善'],['hiring','近 90 天相關招募'],['expansion','近期擴點 / 新產品'],
        ['aiMention','公開提到 AI / 數位轉型'],['hasDecisionMaker','找到決策者'],['publicEmail','有公開企業信箱'],['existingCustomer','既有客戶'],['inactive','疑似停止營運'],['optOut','明確拒絕聯絡'],
      ] as Array<[keyof Lead['signals'], string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={draft.signals[key]} onChange={(e) => setSignal(key, e.target.checked)}/><span>{label}</span></label>)}
    </div>
    <div className="liveScore"><ScorePill label="Content" value={scored.contentScore}/><ScorePill label="AI 導入" value={scored.aiTransformationScore}/><ScorePill label="Software" value={scored.softwareScore}/><div><span>最佳方案</span><strong>{scored.bestOffer}</strong></div></div>
    <div className="modalActions"><button onClick={onCancel}>取消</button><button className="primary" disabled={!draft.company.trim()} onClick={() => onSave({...scored, updatedAt: nowIso()})}><CheckCircle2 size={17}/>儲存並評分</button></div>
  </section></div>;
}

export function SalesOS({session}: {session: WorkspaceSession}) {
  const [state, setState] = useState<SalesState>(() => loadState(session));
  const [view, setView] = useState<SalesView>('pipeline');
  const [selectedId, setSelectedId] = useState<string>(() => loadState(session).leads[0]?.id ?? '');
  const [editing, setEditing] = useState<Lead | null>(() => new URLSearchParams(window.location.search).get('intake') === '1' ? blankLead(session.workspaceId) : null);
  const [searchTerm, setSearchTerm] = useState('');
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('intake') === '1') {
      url.searchParams.delete('intake');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
  }, []);
  const selected = state.leads.find((lead) => lead.id === selectedId) ?? state.leads[0];
  const saveState = (next: SalesState) => { setState(next); localStorage.setItem(storeKey(session.workspaceId), JSON.stringify(next)); };
  const audit = (action: string, detail: string): AuditEvent => ({id: crypto.randomUUID(), action, detail, createdAt: nowIso()});
  const updateLead = (id: string, patch: Partial<Lead>, action: string, detail: string) => {
    const next = {...state, leads: state.leads.map((lead) => lead.id === id ? {...lead, ...patch, workspaceId: session.workspaceId, updatedAt: nowIso()} : lead), audit: [audit(action, detail), ...state.audit].slice(0, 200)};
    saveState(next);
  };
  const saveLead = (lead: Lead) => {
    const exists = state.leads.some((item) => item.id === lead.id);
    const next = {...state, leads: exists ? state.leads.map((item) => item.id === lead.id ? {...lead, workspaceId: session.workspaceId} : item) : [{...lead, workspaceId: session.workspaceId}, ...state.leads], audit: [audit(exists ? 'LEAD_UPDATED' : 'LEAD_CREATED', `${lead.company}｜${lead.bestOffer}`), ...state.audit]};
    saveState(next); setSelectedId(lead.id); setEditing(null);
  };
  const runQualification = (lead: Lead) => {
    const hardFail = lead.signals.optOut ? '已明確拒絕聯絡，永久排除' : lead.signals.inactive ? '公司疑似停止營運，停止開發' : !lead.email && !lead.phone ? '沒有可驗證聯絡方式，先進 Nurture' : '';
    const tier = lead.overallScore >= 85 ? 'A+' : lead.overallScore >= 70 ? 'A' : lead.overallScore >= 50 ? 'B' : 'C';
    const summary = hardFail || `${tier} Lead。${lead.bestOffer}為最高適配方案；先驗證「${lead.industry}、${lead.employeeBand} 人、${lead.signals.hiring ? '近期招募' : '無招募訊號'}、${lead.signals.expansion ? '正在擴張' : '尚無擴張訊號'}」後再送出開發信。`;
    updateLead(lead.id, {qualified: !hardFail && lead.overallScore >= 50, disqualifiedReason: hardFail, aiQualification: summary, stage: hardFail ? 'lost' : 'qualified'}, 'AI_QUALIFIED', `${lead.company}｜${summary}`);
  };
  const runResearch = (lead: Lead) => {
    const summary = `研究 Brief｜${lead.company}\n• 產業 / 規模：${lead.industry}，${lead.employeeBand} 人\n• 公開訊號：${[lead.signals.hiring && '招募', lead.signals.expansion && '擴張', lead.signals.aiMention && 'AI / 數位轉型', lead.signals.activeContent && '持續內容'].filter(Boolean).join('、') || '待補'}\n• 決策者：${lead.contactName || '待找'} ${lead.contactTitle || ''}\n• 建議切入：${lead.bestOffer}\n• 事實查核：正式寄送前仍需人工讀取官網、LinkedIn、社群、新聞與招募頁。`;
    updateLead(lead.id, {researchSummary: summary, stage: 'research'}, 'RESEARCH_CREATED', `${lead.company} 公司研究 Brief`);
  };
  const generateDraft = (lead: Lead) => {
    const draft = makeDraft(lead);
    updateLead(lead.id, {draftSubject: draft.subject, draftBody: draft.body, stage: 'contacted'}, 'GMAIL_DRAFT_CREATED', `${lead.company} 開發信草稿（尚未寄出）`);
  };
  const createFollowUps = (lead: Lead) => {
    const followUps: FollowUp[] = ([3, 7, 14] as const).map((day) => ({id: crypto.randomUUID(), day, dueAt: datePlus(day), status: 'pending', subject: `Re: ${lead.draftSubject || `${lead.company}合作建議`}`, body: day === 3 ? '想確認您是否有看到前一封信；若目前正在評估 AI / 內容流程，我可以先整理一頁切入建議。' : day === 7 ? '補充一個同產業常見情境：先以 30 天 Pilot 驗證工時與品質，再決定是否擴大。' : '這是最後一次跟進；若時機尚未成熟，我可以在下一季再聯絡，也歡迎直接告訴我不需後續。'}));
    updateLead(lead.id, {followUps, nextActionAt: followUps[0].dueAt}, 'FOLLOW_UP_SCHEDULED', `${lead.company} Day 3 / 7 / 14 已建立`);
  };
  const classify = (lead: Lead) => {
    const intent = classifyIntent(lead.replyText); const stage: Stage = intent === 'NO' ? 'lost' : 'replied';
    updateLead(lead.id, {intent, stage, lostReason: intent === 'NO' ? '客戶明確拒絕 / 退訂' : lead.lostReason}, 'REPLY_CLASSIFIED', `${lead.company} → ${intent}`);
  };
  const markWon = (lead: Lead) => {
    const milestones: Milestone[] = [
      {id: crypto.randomUUID(), label: 'Kickoff 與權限確認', dueAt: datePlus(3), done: false},
      {id: crypto.randomUUID(), label: '需求 / 素材 / 資料盤點', dueAt: datePlus(7), done: false},
      {id: crypto.randomUUID(), label: 'Pilot 初版交付', dueAt: datePlus(21), done: false},
      {id: crypto.randomUUID(), label: '驗收與下一階段 Roadmap', dueAt: datePlus(30), done: false},
    ];
    updateLead(lead.id, {stage: 'won', proposalStatus: 'accepted', milestones, renewalAt: datePlus(90)}, 'DEAL_WON', `${lead.company} 已進入 onboarding / delivery handoff`);
  };

  const filtered = useMemo(() => state.leads.filter((lead) => `${lead.company} ${lead.contactName} ${lead.industry}`.toLowerCase().includes(searchTerm.toLowerCase())), [state.leads, searchTerm]);
  const metrics = useMemo(() => ({pipeline: state.leads.filter((x) => !['won','lost'].includes(x.stage)).length, hot: state.leads.filter((x) => x.intent === 'HOT').length, proposals: state.leads.filter((x) => x.stage === 'proposal').length, won: state.leads.filter((x) => x.stage === 'won').reduce((sum, x) => sum + x.proposalAmount, 0)}), [state.leads]);
  const pendingFollowUps = state.leads.flatMap((lead) => lead.followUps.map((item) => ({lead, item}))).filter(({item}) => item.status === 'pending');

  return <main className="workspacePage salesOsPage">
    <header className="pageHeader salesHeader"><div><span className="eyebrow">MOLTIAI SALES OS</span><h1>Lead & Sales</h1><p>從潛在客戶、評分、開發與回覆，一路接到成交、交付與續約。</p></div><button className="primary" onClick={() => setEditing(blankLead(session.workspaceId))}><Plus size={18}/>新增潛在客戶</button></header>
    <section className="salesMetrics">
      <article><Target/><div><strong>{metrics.pipeline}</strong><span>進行中商機</span></div></article><article><Flame/><div><strong>{metrics.hot}</strong><span>HOT 回覆</span></div></article><article><FileText/><div><strong>{metrics.proposals}</strong><span>提案 / 報價</span></div></article><article><CircleDollarSign/><div><strong>NT$ {metrics.won.toLocaleString()}</strong><span>已成交金額</span></div></article>
    </section>
    <div className="salesTabs">{([['pipeline','Pipeline'],['automation','Automation'],['delivery','Delivery'],['audit','Audit Log']] as Array<[SalesView,string]>).map(([id,label]) => <button key={id} className={view === id ? 'active' : ''} onClick={() => setView(id)}>{label}</button>)}</div>

    {view === 'pipeline' && <>
      <section className="salesToolbar"><div className="searchBox"><Search size={17}/><input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="搜尋公司、聯絡人、產業"/></div><span><Filter size={15}/> 所有資料均限制在 {session.workspaceName}</span></section>
      <section className="pipelineBoard">{stages.map((stage) => <div className="pipelineColumn" key={stage.id}><header><span>{stage.label}</span><strong>{filtered.filter((lead) => lead.stage === stage.id).length}</strong></header>{filtered.filter((lead) => lead.stage === stage.id).map((lead) => <button key={lead.id} className={selected?.id === lead.id ? 'selected' : ''} onClick={() => setSelectedId(lead.id)}><div><strong>{lead.company}</strong><span className={`intent ${lead.intent.toLowerCase()}`}>{lead.intent === 'UNCLASSIFIED' ? lead.overallScore : lead.intent}</span></div><small>{lead.bestOffer}</small><span>{lead.contactName || '待找決策者'} · {lead.industry}</span></button>)}</div>)}</section>
      {selected && <section className="leadDetail">
        <div className="leadSummary"><div><span className="eyebrow">ACCOUNT 360</span><h2>{selected.company}</h2><p>{selected.industry} · {selected.employeeBand} 人 · {selected.source}</p></div><div className="detailActions"><button onClick={() => setEditing(selected)}>編輯</button><select value={selected.stage} onChange={(e) => updateLead(selected.id, {stage: e.target.value as Stage}, 'STAGE_CHANGED', `${selected.company} → ${stageLabel(e.target.value as Stage)}`)}>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></div></div>
        {selected.disqualifiedReason && <div className="hardFilter"><Filter size={18}/><div><strong>Hard filter</strong><span>{selected.disqualifiedReason}</span></div></div>}
        <div className="detailGrid">
          <div className="scorePanel"><h3>Multi-score Lead Scoring</h3><ScorePill label="content_score" value={selected.contentScore}/><ScorePill label="ai_transformation_score" value={selected.aiTransformationScore}/><ScorePill label="software_score" value={selected.softwareScore}/><div className="routeOffer"><span>Best-offer routing</span><strong>{selected.bestOffer}</strong></div><button className="primary" onClick={() => runQualification(selected)}><Sparkles size={17}/>AI Qualification</button>{selected.aiQualification && <p>{selected.aiQualification}</p>}</div>
          <div className="contactPanel"><h3>決策者與聯絡方式</h3><dl><dt>姓名 / 職稱</dt><dd>{selected.contactName || '待找'} {selected.contactTitle}</dd><dt>Email</dt><dd>{selected.email || '待補'}</dd><dt>電話</dt><dd>{selected.phone || '待補'}</dd><dt>網站</dt><dd>{selected.website || '待補'}</dd></dl><button onClick={() => runResearch(selected)}><FileSearch size={17}/>建立公司研究 Brief</button>{selected.researchSummary && <pre>{selected.researchSummary}</pre>}</div>
          <div className="outreachPanel"><h3>Gmail 草稿與 Follow-up</h3><div className="buttonRow"><button onClick={() => generateDraft(selected)}><Mail size={17}/>產生草稿</button><button disabled={!selected.draftBody} onClick={() => createFollowUps(selected)}><Clock3 size={17}/>Day 3 / 7 / 14</button></div>{selected.draftBody ? <><input value={selected.draftSubject} onChange={(e) => updateLead(selected.id, {draftSubject: e.target.value}, 'DRAFT_EDITED', `${selected.company} 主旨已更新`)}/><textarea value={selected.draftBody} onChange={(e) => updateLead(selected.id, {draftBody: e.target.value}, 'DRAFT_EDITED', `${selected.company} 內文已更新`)}/><div className="buttonRow"><button onClick={() => navigator.clipboard.writeText(`${selected.draftSubject}\n\n${selected.draftBody}`)}>複製</button><a className="buttonLink" href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(selected.email)}&su=${encodeURIComponent(selected.draftSubject)}&body=${encodeURIComponent(selected.draftBody)}`} target="_blank" rel="noreferrer"><Send size={16}/>在 Gmail 開啟</a></div><small>只產生草稿；寄送前保留人工核准。</small></> : <p className="emptyCopy">完成 AI Qualification 與研究後建立個人化開發信。</p>}</div>
          <div className="replyPanel"><h3>回覆意圖分類</h3><textarea value={selected.replyText} onChange={(e) => updateLead(selected.id, {replyText: e.target.value}, 'REPLY_CAPTURED', `${selected.company} 回覆內容已更新`)} placeholder="貼上客戶回覆，分類 HOT / WARM / LATER / NO"/><button onClick={() => classify(selected)} disabled={!selected.replyText.trim()}><MessageSquareText size={17}/>分類回覆</button><div className={`intentResult ${selected.intent.toLowerCase()}`}>{selected.intent}</div></div>
          <div className="meetingPanel"><h3>會議與提案</h3><label>預約連結<input value={selected.meetingUrl} onChange={(e) => updateLead(selected.id, {meetingUrl: e.target.value}, 'MEETING_LINK_UPDATED', selected.company)}/></label><div className="buttonRow"><a className="buttonLink" href={selected.meetingUrl} target="_blank" rel="noreferrer"><CalendarCheck size={16}/>開啟預約</a><button onClick={() => updateLead(selected.id, {stage: 'meeting'}, 'MEETING_BOOKED', `${selected.company} 會議已預約`)}>標記已預約</button></div><label>報價金額<input type="number" value={selected.proposalAmount || ''} onChange={(e) => updateLead(selected.id, {proposalAmount: Number(e.target.value), stage: 'proposal', proposalStatus: 'draft'}, 'PROPOSAL_UPDATED', `${selected.company} NT$ ${e.target.value}`)}/></label><select value={selected.proposalStatus} onChange={(e) => updateLead(selected.id, {proposalStatus: e.target.value as Lead['proposalStatus'], stage: 'proposal'}, 'PROPOSAL_STATUS', `${selected.company} → ${e.target.value}`)}><option value="not_started">尚未建立</option><option value="draft">草稿</option><option value="sent">已寄出</option><option value="accepted">接受</option><option value="declined">拒絕</option></select></div>
          <div className="outcomePanel"><h3>Won / Lost → Onboarding</h3><p>成交後自動建立 30 日交付節點與 90 日續約提醒。</p><div className="buttonRow"><button className="successButton" onClick={() => markWon(selected)}><BadgeCheck size={17}/>標記成交</button><button onClick={() => updateLead(selected.id, {stage: 'lost', lostReason: selected.lostReason || '未符合目前優先級'}, 'DEAL_LOST', selected.company)}>標記未成交</button></div></div>
        </div>
      </section>}
    </>}

    {view === 'automation' && <section className="automationWorkspace"><div className="sectionTitle"><div><h2>自動化工作佇列</h2><p>不使用 n8n；由 Sales OS 狀態與到期日直接產生任務。</p></div></div>{pendingFollowUps.length === 0 ? <div className="emptyState"><Inbox/><p>尚無待執行 Follow-up。</p></div> : <div className="taskQueue">{pendingFollowUps.map(({lead,item}) => <article key={item.id}><div className="taskIcon"><RefreshCw size={18}/></div><div><strong>{lead.company} · Day {item.day}</strong><span>{new Date(item.dueAt).toLocaleDateString('zh-TW')} · {item.subject}</span><p>{item.body}</p></div><button onClick={() => updateLead(lead.id, {followUps: lead.followUps.map((x) => x.id === item.id ? {...x, status: 'done'} : x)}, 'FOLLOW_UP_COMPLETED', `${lead.company} Day ${item.day}`)}><CheckCircle2 size={17}/>完成</button></article>)}</div>}</section>}

    {view === 'delivery' && <section className="deliveryWorkspace"><div className="sectionTitle"><div><h2>成交、交付與續約</h2><p>Sales → Onboarding → Project Handoff → Milestones → Upsell / Renewal。</p></div></div>{state.leads.filter((lead) => lead.stage === 'won').length === 0 ? <div className="emptyState"><ClipboardCheck/><p>商機標記成交後，交付里程碑會出現在這裡。</p></div> : <div className="deliveryGrid">{state.leads.filter((lead) => lead.stage === 'won').map((lead) => <article key={lead.id}><header><div><strong>{lead.company}</strong><span>{lead.bestOffer}</span></div><BadgeCheck/></header><div className="handoffSummary"><span>成交金額 <strong>NT$ {lead.proposalAmount.toLocaleString()}</strong></span><span>續約檢視 <strong>{new Date(lead.renewalAt).toLocaleDateString('zh-TW')}</strong></span></div>{lead.milestones.map((milestone) => <label className={milestone.done ? 'done' : ''} key={milestone.id}><input type="checkbox" checked={milestone.done} onChange={(e) => updateLead(lead.id, {milestones: lead.milestones.map((x) => x.id === milestone.id ? {...x, done: e.target.checked} : x)}, 'MILESTONE_UPDATED', `${lead.company}｜${milestone.label}`)}/><span>{milestone.label}<small>{new Date(milestone.dueAt).toLocaleDateString('zh-TW')}</small></span></label>)}</article>)}</div>}</section>}

    {view === 'audit' && <section className="auditWorkspace"><div className="sectionTitle"><div><h2>Workspace Audit Log</h2><p>每個關鍵狀態變更都有 workspace-scoped 記錄。</p></div></div><div className="auditList">{state.audit.map((event) => <article key={event.id}><Activity size={16}/><div><strong>{event.action}</strong><span>{event.detail}</span></div><time>{new Date(event.createdAt).toLocaleString('zh-TW')}</time></article>)}</div></section>}
    {editing && <LeadForm lead={editing} onSave={saveLead} onCancel={() => setEditing(null)}/>}
  </main>;
}

export function SalesDashboardSnapshot({session}: {session: WorkspaceSession}) {
  const state = loadState(session);
  const active = state.leads.filter((lead) => !['won','lost'].includes(lead.stage));
  const followUps = state.leads.reduce((sum, lead) => sum + lead.followUps.filter((item) => item.status === 'pending').length, 0);
  return <section className="sectionBlock"><div className="sectionTitle"><div><h2>Sales OS 今日摘要</h2><p>只顯示 {session.workspaceName} 的商機與待辦。</p></div></div><div className="salesSnapshot"><div><Building2/><strong>{active.length}</strong><span>進行中商機</span></div><div><UserRoundSearch/><strong>{state.leads.filter((lead) => lead.contactName).length}</strong><span>已有決策者</span></div><div><Clock3/><strong>{followUps}</strong><span>待 Follow-up</span></div><div><BarChart3/><strong>{state.leads.filter((lead) => lead.stage === 'won').length}</strong><span>已成交</span></div></div></section>;
}
