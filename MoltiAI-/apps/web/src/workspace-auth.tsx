import {FormEvent, useEffect, useState} from 'react';
import {ArrowRight, Bot, Building2, KeyRound, LockKeyhole, Mail, ShieldCheck} from 'lucide-react';
import type {WorkspaceSession} from './sales-os';

const sessionKey = 'moltiai:workspace-session:v1';
const verifierKey = 'moltiai:workspace-verifiers:v1';

export const michaelWorkspaceSession: WorkspaceSession = {
  userId: 'user_michael',
  email: 'michael@moltiai.com',
  workspaceId: 'ws_moltiai_michael',
  workspaceName: '瞬影科技 MoltiAI',
};

const slug = (value: string) => value.trim().toLowerCase().replace(/[^a-z0-9@._-]+/g, '-');
const digest = async (value: string) => {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

export const readWorkspaceSession = (): WorkspaceSession | null => {
  try { return (JSON.parse(localStorage.getItem(sessionKey) || 'null') as WorkspaceSession | null) || michaelWorkspaceSession; }
  catch { return michaelWorkspaceSession; }
};

export const clearWorkspaceSession = () => localStorage.setItem(sessionKey, JSON.stringify(michaelWorkspaceSession));

export function WorkspaceSignIn({onSignedIn}: {onSignedIn: (session: WorkspaceSession) => void}) {
  const [email, setEmail] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    onSignedIn(michaelWorkspaceSession);
  }, [onSignedIn]);

  const signIn = async (event: FormEvent) => {
    event.preventDefault(); setError('');
    if (!email.includes('@') || accessCode.length < 6 || workspaceName.trim().length < 2) { setError('請輸入有效 Email、工作區名稱與至少 6 碼存取碼。'); return; }
    setLoading(true);
    const account = slug(email);
    const hash = await digest(`${account}:${accessCode}`);
    const verifiers = JSON.parse(localStorage.getItem(verifierKey) || '{}') as Record<string, string>;
    if (verifiers[account] && verifiers[account] !== hash) { setLoading(false); setError('存取碼不正確。這個 V1 帳號只存在目前瀏覽器。'); return; }
    verifiers[account] = hash; localStorage.setItem(verifierKey, JSON.stringify(verifiers));
    const session: WorkspaceSession = {userId: `user_${account}`, email: email.trim().toLowerCase(), workspaceId: `ws_${account}`, workspaceName: workspaceName.trim()};
    localStorage.setItem(sessionKey, JSON.stringify(session)); setLoading(false); onSignedIn(session);
  };

  return <main className="signInPage">
    <section className="signInBrand"><div className="brand"><div className="brandMark">M</div><div><strong>MoltiAI</strong><span>Enterprise AI Workspace</span></div></div><div className="signInCopy"><span className="eyebrow">CLOSED-LOOP B2B OPERATING SYSTEM</span><h1>從第一筆 Lead，走到成交、交付與續約。</h1><p>Sales Agent、內容與影音、管理自動化，共用同一個企業工作區。</p></div><div className="signInFlow"><div><Building2/><span>Prospect</span></div><ArrowRight/><div><Bot/><span>AI Qualification</span></div><ArrowRight/><div><ShieldCheck/><span>Human Approval</span></div><ArrowRight/><div><LockKeyhole/><span>Delivery</span></div></div></section>
    <section className="signInPanel"><form onSubmit={signIn}><div><span className="eyebrow">WORKSPACE SIGN IN</span><h2>登入你的工作區</h2><p>首次登入會在目前瀏覽器建立獨立工作區。</p></div><label><span><Mail size={16}/>工作 Email</span><input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com"/></label><label><span><Building2 size={16}/>工作區名稱</span><input value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} placeholder="公司或團隊名稱"/></label><label><span><KeyRound size={16}/>存取碼</span><input type="password" autoComplete="current-password" value={accessCode} onChange={(e) => setAccessCode(e.target.value)} placeholder="至少 6 碼"/></label>{error && <p className="error">{error}</p>}<button className="primary" disabled={loading}>{loading ? '登入中...' : '進入 Workspace'}<ArrowRight size={17}/></button><small><ShieldCheck size={14}/>V1 使用瀏覽器隔離資料；正式企業帳號將切換至伺服器 Auth + Postgres。</small></form></section>
  </main>;
}
