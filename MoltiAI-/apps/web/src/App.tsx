import {useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ArrowRight, FileVideo, LineChart, Music, Upload, WandSparkles} from 'lucide-react';
import './styles.css';

type RenderResult = {
  status: 'idle' | 'submitting' | 'ready' | 'error';
  message?: string;
  videoUrl?: string;
};

const workerUrl = import.meta.env.VITE_VIDEO_WORKER_URL ?? 'http://localhost:8787';

function Home({onCreate}: {onCreate: () => void}) {
  return (
    <main className="shell">
      <section className="hero">
        <div className="kicker">MoltiAI</div>
        <h1>短影音診斷，接上 15 秒影片生成</h1>
        <p>先分析 Reels / Shorts 策略，再把 Hook、分鏡、CTA 和圖片素材轉成可下載的直式 MP4。</p>
        <div className="actions">
          <button className="primary" onClick={onCreate}>
            <FileVideo size={20} />
            生成 15 秒影片
            <ArrowRight size={18} />
          </button>
          <a className="secondary" href="https://reels-diagnose-moltiai.vercel.app/">
            <LineChart size={20} />
            回到診斷工具
          </a>
        </div>
      </section>

      <section className="steps">
        <article>
          <WandSparkles size={22} />
          <h2>1. 貼上診斷結果</h2>
          <p>把現有短影音分析產出的 Hook、分鏡和 CTA 貼進 prompt。</p>
        </article>
        <article>
          <FileVideo size={22} />
          <h2>2. 上傳圖片與音樂</h2>
          <p>選 3-5 張圖片，可用內建音樂或上傳自己的音樂檔。</p>
        </article>
        <article>
          <ArrowRight size={22} />
          <h2>3. 產出 MP4</h2>
          <p>Worker 用 Remotion render，完成後回傳手機也能播放的影片網址。</p>
        </article>
      </section>
    </main>
  );
}

function CreateVideo({onBack}: {onBack: () => void}) {
  const [prompt, setPrompt] = useState('');
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
  const [view, setView] = useState<'home' | 'create'>('home');
  return view === 'home' ? (
    <Home onCreate={() => setView('create')} />
  ) : (
    <CreateVideo onBack={() => setView('home')} />
  );
}

createRoot(document.getElementById('root')!).render(<App />);
