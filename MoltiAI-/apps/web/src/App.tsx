import {useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
  ArrowRight,
  ClipboardList,
  ExternalLink,
  FileVideo,
  Link2,
  Music,
  Search,
  Upload,
  WandSparkles,
} from 'lucide-react';
import './styles.css';

type RenderResult = {
  status: 'idle' | 'submitting' | 'ready' | 'error';
  message?: string;
  videoUrl?: string;
};

type Platform =
  | 'youtube'
  | 'instagram'
  | 'facebook'
  | 'tiktok'
  | 'douyin'
  | 'xiaohongshu'
  | 'other'
  | 'unknown';

type AnalysisResult = {
  platform: Platform;
  platformLabel: string;
  url: string;
  confidence: 'high' | 'medium' | 'fallback';
  metadataPlan: string;
  strengths: string[];
  risks: string[];
  hooks: string[];
  storyboard: string[];
  ctas: string[];
  videoPrompt: string;
};

const workerUrl = import.meta.env.VITE_VIDEO_WORKER_URL ?? 'http://localhost:8787';

const platformLabels: Record<Platform, string> = {
  youtube: 'YouTube / Shorts',
  instagram: 'Instagram Reels',
  facebook: 'Facebook Video / Reels',
  tiktok: 'TikTok',
  douyin: '抖音',
  xiaohongshu: '小紅書',
  other: '其他影音頻道',
  unknown: '未辨識',
};

const detectPlatform = (input: string): Platform => {
  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    if (host.includes('youtube.com') || host.includes('youtu.be')) return 'youtube';
    if (host.includes('instagram.com')) return 'instagram';
    if (host.includes('facebook.com') || host.includes('fb.watch')) return 'facebook';
    if (host.includes('tiktok.com')) return 'tiktok';
    if (host.includes('douyin.com')) return 'douyin';
    if (host.includes('xiaohongshu.com') || host.includes('xhslink.com')) return 'xiaohongshu';
    return 'other';
  } catch {
    return 'unknown';
  }
};

const getMetadataPlan = (platform: Platform) => {
  if (platform === 'youtube') {
    return '可接 YouTube Data API，抓標題、描述、頻道、縮圖與統計資料。';
  }

  if (platform === 'instagram' || platform === 'facebook') {
    return '可接 Meta oEmbed / Graph API 取得公開內容基本資料；遇到權限限制時需要手動補描述。';
  }

  if (platform === 'tiktok') {
    return '可先接 TikTok oEmbed 取得 embed 與基本資訊；完整資料需 Display API 權限。';
  }

  if (platform === 'douyin' || platform === 'xiaohongshu') {
    return '平台公開 API 與反爬限制較多，第一版建議用網址辨識 + 手動補標題/描述/截圖。';
  }

  if (platform === 'other') {
    return '可先抓 Open Graph / oEmbed / HTML metadata，抓不到就進入手動補資料模式。';
  }

  return '請貼上完整影片網址，或手動補充影片標題與描述。';
};

const buildAnalysis = ({
  url,
  platform,
  title,
  description,
}: {
  url: string;
  platform: Platform;
  title: string;
  description: string;
}): AnalysisResult => {
  const platformLabel = platformLabels[platform];
  const topic = title.trim() || description.trim() || `${platformLabel} 影片`;
  const context = description.trim() || '尚未補充描述，先用網址平台與一般短影音策略產生分析草稿。';

  const confidence: AnalysisResult['confidence'] =
    platform === 'youtube' ? 'high' : platform === 'unknown' ? 'fallback' : 'medium';

  const hooks = [
    `你是不是也忽略了「${topic.slice(0, 18)}」背後真正吸引人的點？`,
    `先別急著滑走，這支影片最值得拆的是前三秒。`,
    `同樣題材，為什麼有些影片能讓人看到最後？`,
  ];

  const storyboard = [
    `0-3s：用強問題或反差畫面開場，讓觀眾立刻知道這支影片和自己有關。`,
    `3-8s：快速交代核心情境，把影片主題轉成一個具體痛點或利益。`,
    `8-12s：補上證據、過程或前後差異，避免只剩空泛描述。`,
    `12-15s：用明確 CTA 收尾，例如留言、點連結、領取方案或立即試用。`,
  ];

  const ctas = ['立即了解完整方案', '留言「想要」取得模板', '把這支影片改成你的品牌版本'];

  return {
    platform,
    platformLabel,
    url,
    confidence,
    metadataPlan: getMetadataPlan(platform),
    strengths: [
      '可從既有影片網址快速建立分析脈絡，降低使用者輸入成本。',
      '適合把熱門題材拆成 Hook、分鏡和 CTA，再改寫成可生成影片的 prompt。',
      '能銜接目前 15 秒影片生成器，形成「分析 -> 重構 -> 生成」流程。',
    ],
    risks: [
      platform === 'youtube'
        ? '若未設定 YouTube API key，目前只能做前端辨識與手動補充分析。'
        : '此平台可能遇到登入、反爬、地區或 API 權限限制，需保留手動補資料流程。',
      '只貼網址不一定能取得字幕與完整畫面內容，進階版需要轉錄、截圖或使用者上傳素材。',
      '平台內容授權與隱私要分開處理，分析公開資料和下載/重製影片是不同風險。',
    ],
    hooks,
    storyboard,
    ctas,
    videoPrompt: [
      `根據 ${platformLabel} 影片網址分析，重構成一支 15 秒直式短影音。`,
      `影片網址：${url}`,
      `主題：${topic}`,
      `補充描述：${context}`,
      `Hook：${hooks[0]}`,
      `分鏡：${storyboard.join(' ')}`,
      `CTA：${ctas[0]}`,
    ].join('\n'),
  };
};

function Home({onCreate, onAnalyze}: {onCreate: () => void; onAnalyze: () => void}) {
  return (
    <main className="shell">
      <section className="hero">
        <div className="kicker">MoltiAI</div>
        <h1>貼上影片網址，分析短影音策略</h1>
        <p>
          支援 YouTube、IG、FB、TikTok、抖音、小紅書與其他影音網址。先產出 Hook、分鏡、CTA，再接上 15 秒影片生成。
        </p>
        <div className="actions">
          <button className="primary" onClick={onAnalyze}>
            <Search size={20} />
            貼網址開始分析
            <ArrowRight size={18} />
          </button>
          <button className="primary" onClick={onCreate}>
            <FileVideo size={20} />
            生成 15 秒影片
          </button>
          <a className="secondary" href="https://reels-diagnose-moltiai.vercel.app/" target="_blank">
            <ExternalLink size={20} />
            舊版診斷工具
          </a>
        </div>
      </section>

      <section className="steps">
        <article>
          <Link2 size={22} />
          <h2>1. 貼上影片網址</h2>
          <p>自動判斷平台，能抓資料就抓，抓不到就引導補標題、描述或截圖。</p>
        </article>
        <article>
          <ClipboardList size={22} />
          <h2>2. 產生策略分析</h2>
          <p>輸出優缺點、Hook 變體、分鏡節奏、CTA，以及可生成影片的 prompt。</p>
        </article>
        <article>
          <ArrowRight size={22} />
          <h2>3. 一鍵生成影片</h2>
          <p>把分析結果帶進影片生成頁，加入 3-5 張圖片和音樂後輸出 MP4。</p>
        </article>
      </section>
    </main>
  );
}

function AnalyzeUrl({
  onBack,
  onGenerate,
}: {
  onBack: () => void;
  onGenerate: (prompt: string) => void;
}) {
  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  const platform = detectPlatform(url);
  const canAnalyze = platform !== 'unknown';

  const analyze = () => {
    if (!canAnalyze) return;
    setResult(buildAnalysis({url, platform, title, description}));
  };

  return (
    <main className="shell">
      <section className="header">
        <button className="textButton" onClick={onBack}>
          回首頁
        </button>
        <div className="kicker">Analyze URL</div>
        <h1>貼上影片網址，自動產生短影音策略</h1>
        <p>YouTube 可優先接 API；IG、FB、TikTok 用 oEmbed；抖音與小紅書保留手動補資料。</p>
      </section>

      <section className="grid">
        <div className="form">
          <label>
            影片網址
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.youtube.com/shorts/..."
            />
            <span className="hint">目前辨識：{platformLabels[platform]}</span>
          </label>

          <label>
            影片標題，可選填
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="抓不到 metadata 時可手動補充"
            />
          </label>

          <label>
            影片描述 / 觀察重點，可選填
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="例：前三秒用了反差開場，中段展示產品效果，最後引導留言..."
            />
          </label>

          <button disabled={!canAnalyze} onClick={analyze}>
            <Search size={20} />
            開始分析
          </button>
        </div>

        <aside className="preview widePreview">
          <h2>分析結果</h2>
          {!result ? (
            <p>貼上網址後會在這裡產生平台判斷、資料取得策略、Hook、分鏡與 CTA。</p>
          ) : (
            <div className="analysis">
              <div className={`badge ${result.confidence}`}>{result.platformLabel}</div>
              <p>{result.metadataPlan}</p>

              <h3>優勢</h3>
              <ul>{result.strengths.map((item) => <li key={item}>{item}</li>)}</ul>

              <h3>注意事項</h3>
              <ul>{result.risks.map((item) => <li key={item}>{item}</li>)}</ul>

              <h3>Hook 變體</h3>
              <ol>{result.hooks.map((item) => <li key={item}>{item}</li>)}</ol>

              <h3>15 秒分鏡</h3>
              <ol>{result.storyboard.map((item) => <li key={item}>{item}</li>)}</ol>

              <h3>CTA</h3>
              <ul>{result.ctas.map((item) => <li key={item}>{item}</li>)}</ul>

              <button className="inlineAction" onClick={() => onGenerate(result.videoPrompt)}>
                <FileVideo size={18} />
                用這份分析生成影片
              </button>
            </div>
          )}
        </aside>
      </section>
    </main>
  );
}

function CreateVideo({onBack, initialPrompt}: {onBack: () => void; initialPrompt: string}) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [cta, setCta] = useState('立即了解');
  const [musicMode, setMusicMode] = useState<'auto' | 'upload' | 'none'>('auto');
  const [images, setImages] = useState<FileList | null>(null);
  const [music, setMusic] = useState<File | null>(null);
  const [result, setResult] = useState<RenderResult>({status: 'idle'});

  const imageCount = images?.length ?? 0;
  const canSubmit = prompt.trim().length > 8 && imageCount >= 3 && imageCount <= 5;

  const helperText = useMemo(() => {
    if (imageCount === 0) return '請上傳 3-5 張圖片。';
    if (imageCount < 3) return `目前 ${imageCount} 張，至少需要 3 張。`;
    if (imageCount > 5) return `目前 ${imageCount} 張，最多只能 5 張。`;
    return `已選 ${imageCount} 張圖片。`;
  }, [imageCount]);

  const submit = async () => {
    if (!canSubmit || !images) return;

    setResult({status: 'submitting', message: '正在送出影片生成任務...'});
    const formData = new FormData();
    formData.set('prompt', prompt);
    formData.set('cta', cta);
    formData.set('musicMode', musicMode);

    Array.from(images).forEach((image) => {
      formData.append('images', image);
    });

    if (musicMode === 'upload' && music) {
      formData.set('music', music);
    }

    try {
      const response = await fetch(`${workerUrl}/render`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as {videoUrl: string};
      setResult({status: 'ready', videoUrl: data.videoUrl});
    } catch (error) {
      setResult({
        status: 'error',
        message: error instanceof Error ? error.message : '影片生成失敗',
      });
    }
  };

  return (
    <main className="shell">
      <section className="header">
        <button className="textButton" onClick={onBack}>
          回首頁
        </button>
        <div className="kicker">Create Video</div>
        <h1>把診斷結果變成 15 秒短影音</h1>
        <p>貼上 Hook / 分鏡 / CTA，加入 3-5 張圖片，再選音樂來源。</p>
      </section>

      <section className="grid">
        <div className="form">
          <label>
            影片描述
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="例：根據這份短影音診斷，做一支 15 秒影片。Hook 是..."
            />
          </label>

          <label>
            CTA
            <input value={cta} onChange={(event) => setCta(event.target.value)} />
          </label>

          <label>
            圖片素材
            <div className="fileBox">
              <Upload size={20} />
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                multiple
                onChange={(event) => setImages(event.target.files)}
              />
            </div>
            <span className="hint">{helperText}</span>
          </label>

          <label>
            音樂
            <select
              value={musicMode}
              onChange={(event) => setMusicMode(event.target.value as typeof musicMode)}
            >
              <option value="auto">自動音樂</option>
              <option value="upload">上傳音樂</option>
              <option value="none">不要音樂</option>
            </select>
          </label>

          {musicMode === 'upload' ? (
            <label>
              音樂檔案
              <div className="fileBox">
                <Music size={20} />
                <input
                  type="file"
                  accept="audio/mpeg,audio/wav,audio/mp4,audio/aac,audio/ogg"
                  onChange={(event) => setMusic(event.target.files?.[0] ?? null)}
                />
              </div>
            </label>
          ) : null}

          <button disabled={!canSubmit || result.status === 'submitting'} onClick={submit}>
            <WandSparkles size={20} />
            生成影片
          </button>
        </div>

        <aside className="preview">
          <h2>輸出預覽</h2>
          {result.status === 'idle' ? <p>送出後，完成的 MP4 會顯示在這裡。</p> : null}
          {result.status === 'submitting' ? <p>{result.message}</p> : null}
          {result.status === 'error' ? <p className="error">{result.message}</p> : null}
          {result.status === 'ready' && result.videoUrl ? (
            <>
              <video src={result.videoUrl} controls playsInline className="video" />
              <a href={result.videoUrl} download>
                下載 MP4
              </a>
            </>
          ) : null}
        </aside>
      </section>
    </main>
  );
}

function App() {
  const [view, setView] = useState<'home' | 'analyze' | 'create'>('home');
  const [initialPrompt, setInitialPrompt] = useState('');

  if (view === 'analyze') {
    return (
      <AnalyzeUrl
        onBack={() => setView('home')}
        onGenerate={(prompt) => {
          setInitialPrompt(prompt);
          setView('create');
        }}
      />
    );
  }

  if (view === 'create') {
    return <CreateVideo onBack={() => setView('home')} initialPrompt={initialPrompt} />;
  }

  return (
    <Home
      onAnalyze={() => setView('analyze')}
      onCreate={() => {
        setInitialPrompt('');
        setView('create');
      }}
    />
  );
}

createRoot(document.getElementById('root')!).render(<App />);
