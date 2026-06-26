import {useMemo, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {
  ArrowRight,
  ClipboardList,
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
  comparisons?: string[];
  scores?: {
    hook: number;
    retention: number;
    density: number;
    cta: number;
    titleScore: number;
  };
  strengths: string[];
  risks: string[];
  hooks: string[];
  storyboard: string[];
  ctas: string[];
  videoPrompt: string;
};

type ContactInfo = {
  companyName: string;
  contactName: string;
  phone: string;
  email: string;
};

const workerUrl = import.meta.env.VITE_VIDEO_WORKER_URL ?? 'http://localhost:8787';

const emptyContact: ContactInfo = {
  companyName: '',
  contactName: '',
  phone: '',
  email: '',
};

const formatContactLine = (contact: ContactInfo) => {
  const lines = [
    contact.companyName ? `公司：${contact.companyName}` : '',
    contact.contactName ? `聯絡人：${contact.contactName}` : '',
    contact.phone ? `電話：${contact.phone}` : '',
    contact.email ? `Email：${contact.email}` : '',
  ].filter(Boolean);

  return lines.length ? lines.join('\n') : '尚未填寫客戶聯絡資料';
};

const sanitizeFilename = (value: string) =>
  (value.trim() || 'client').replace(/[\\/:*?"<>|]/g, '-').slice(0, 40);

const canvasToJpegBytes = (canvas: HTMLCanvasElement) =>
  new Promise<Uint8Array>((resolve, reject) => {
    canvas.toBlob(
      async (blob) => {
        if (!blob) {
          reject(new Error('PDF image export failed.'));
          return;
        }

        resolve(new Uint8Array(await blob.arrayBuffer()));
      },
      'image/jpeg',
      0.92
    );
  });

const concatBytes = (chunks: Uint8Array[]) => {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const output = new Uint8Array(total);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
};

const buildPdfFromJpegs = (pages: Uint8Array[]) => {
  const encoder = new TextEncoder();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const objects: Uint8Array[] = [];
  const pageIds: number[] = [];

  objects[1] = encoder.encode('<< /Type /Catalog /Pages 2 0 R >>');

  for (const [index, jpeg] of pages.entries()) {
    const imageId = objects.length;
    objects[imageId] = concatBytes([
      encoder.encode(
        `<< /Type /XObject /Subtype /Image /Width 1240 /Height 1754 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`
      ),
      jpeg,
      encoder.encode('\nendstream'),
    ]);

    const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im${index + 1} Do\nQ\n`;
    const contentId = objects.length;
    objects[contentId] = encoder.encode(
      `<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream`
    );

    const pageId = objects.length;
    pageIds.push(pageId);
    objects[pageId] = encoder.encode(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${
        index + 1
      } ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );
  }

  objects[2] = encoder.encode(
    `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${
      pageIds.length
    } >>`
  );

  const chunks: Uint8Array[] = [encoder.encode('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n')];
  const offsets = [0];

  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    chunks.push(encoder.encode(`${id} 0 obj\n`));
    chunks.push(objects[id]);
    chunks.push(encoder.encode('\nendobj\n'));
  }

  const xrefOffset = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  chunks.push(encoder.encode(`xref\n0 ${objects.length}\n0000000000 65535 f \n`));

  for (let id = 1; id < objects.length; id += 1) {
    chunks.push(encoder.encode(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`));
  }

  chunks.push(
    encoder.encode(
      `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`
    )
  );

  return new Blob([concatBytes(chunks)], {type: 'application/pdf'});
};

const renderReportPdf = async (report: string) => {
  const canvasWidth = 1240;
  const canvasHeight = 1754;
  const marginX = 92;
  const marginTop = 96;
  const marginBottom = 92;
  const fontSize = 26;
  const lineHeight = 40;
  const font = `${fontSize}px Arial, "Microsoft JhengHei", "Noto Sans TC", sans-serif`;
  const maxWidth = canvasWidth - marginX * 2;

  const measureCanvas = document.createElement('canvas');
  const measureContext = measureCanvas.getContext('2d');

  if (!measureContext) {
    throw new Error('Canvas is not available.');
  }

  measureContext.font = font;

  const wrapLine = (line: string) => {
    if (!line.trim()) return [''];

    const wrapped: string[] = [];
    let current = '';

    for (const char of line) {
      const next = `${current}${char}`;

      if (measureContext.measureText(next).width > maxWidth && current) {
        wrapped.push(current);
        current = char.trimStart();
      } else {
        current = next;
      }
    }

    if (current) wrapped.push(current);
    return wrapped;
  };

  const lines = report.split('\n').flatMap(wrapLine);
  const pages: Uint8Array[] = [];
  let currentLine = 0;

  while (currentLine < lines.length) {
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas is not available.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvasWidth, canvasHeight);
    context.fillStyle = '#171717';
    context.font = font;
    context.textBaseline = 'top';

    let y = marginTop;

    while (currentLine < lines.length && y <= canvasHeight - marginBottom - lineHeight) {
      const line = lines[currentLine];
      context.fillText(line, marginX, y);
      y += line ? lineHeight : Math.round(lineHeight * 0.62);
      currentLine += 1;
    }

    pages.push(await canvasToJpegBytes(canvas));
  }

  return buildPdfFromJpegs(pages);
};

const buildStrategyReport = ({
  result,
  contact,
  sourceUrl,
  sourceTitle,
  sourceDescription,
}: {
  result: AnalysisResult;
  contact: ContactInfo;
  sourceUrl: string;
  sourceTitle: string;
  sourceDescription: string;
}) => {
  const scores = result.scores
    ? [
        `Hook 強度：${result.scores.hook}/5`,
        `留存節奏：${result.scores.retention}/5`,
        `資訊密度：${result.scores.density}/5`,
        `CTA 明確度：${result.scores.cta}/5`,
        `標題/主題吸引力：${result.scores.titleScore}/5`,
      ].join('\n')
    : '尚無量化分數';

  const source = [
    sourceUrl ? `影片網址：${sourceUrl}` : '',
    sourceTitle ? `影片標題：${sourceTitle}` : '',
    sourceDescription ? `補充描述：${sourceDescription}` : '',
  ].filter(Boolean);

  return `MoltiAI 短影音策略分析報告

一、客戶資料
${formatContactLine(contact)}

二、分析來源
平台：${result.platformLabel}
可信度：${result.confidence}
${source.length ? source.join('\n') : '來源：使用者輸入的影片或主題資料'}

三、整體判斷
${result.metadataPlan}

四、量化評分
${scores}

五、優勢
${result.strengths.map((item, index) => `${index + 1}. ${item}`).join('\n')}

六、同題材對照組
${(result.comparisons?.length ? result.comparisons : ['尚無可用對照組'])
  .map((item, index) => `${index + 1}. ${item}`)
  .join('\n')}

七、建議 Hook
${result.hooks.map((item, index) => `${index + 1}. ${item}`).join('\n')}

八、15 秒分鏡建議
${result.storyboard.map((item, index) => `${index + 1}. ${item}`).join('\n')}

九、CTA 建議
${result.ctas.map((item, index) => `${index + 1}. ${item}`).join('\n')}

十、下一步執行建議
1. 先用第 1 個 Hook 製作 15 秒直式短影音。
2. 同一素材再做 3 個版本：不同開頭、不同 CTA、不同字幕節奏。
3. 投放前先用前 3 秒停留率、完整觀看率、點擊率判斷是否保留。
4. 若客戶願意提供商品圖或品牌素材，可直接進入「生成影片」流程。

--
瞬影科技 MoltiAI
Wondershare 台灣代理商
TOPS台北好購網科技服務供應商
經濟部商發署數位轉型培訓機構
TEL:02-2634-2616
官網：www.moltiai.com`;
};

const platformExamples: Record<Platform, string> = {
  youtube: 'Shorts / 教學 / 開箱 / 觀點型影片',
  instagram: 'Reels / 品牌曝光 / 生活情境影片',
  facebook: 'Facebook Reels / 社群互動 / 導購影片',
  tiktok: 'TikTok / 節奏快 / 高互動短影音',
  douyin: '抖音 / 強 Hook / 高密度資訊流',
  xiaohongshu: '小紅書 / 種草 / 開箱心得 / 生活提案',
  other: '其他影音頻道 / 參考影片',
  unknown: '文字主題 / 手動補充分析',
};

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

const normalizeTopic = (url: string, title: string, description: string, platform: Platform) => {
  const cleanTitle = title.trim();
  const cleanDescription = description.trim();

  if (cleanTitle) return cleanTitle;
  if (cleanDescription) return cleanDescription.split(/[。！？\n]/)[0]?.trim() || cleanDescription;
  if (platform !== 'unknown') return `${platformLabels[platform]} 參考影片`;
  return url.trim() || '短影音主題';
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
  const topic = normalizeTopic(url, title, description, platform);
  const context =
    description.trim() ||
    `目前以「${topic}」和 ${platformExamples[platform]} 的常見節奏建立可執行分析。`;

  const confidence: AnalysisResult['confidence'] =
    platform === 'youtube' ? 'high' : platform === 'unknown' ? 'fallback' : 'medium';

  const hooks = [
    `你是不是也遇過「${topic.slice(0, 18)}」但不知道怎麼判斷值不值得？`,
    `先看這 3 秒，這就是「${topic.slice(0, 14)}」能不能爆的關鍵。`,
    `同樣是 ${topic.slice(0, 12)}，為什麼有些人一開口就讓人想看完？`,
    `如果你正在做 ${topic.slice(0, 12)}，這個錯誤先不要犯。`,
  ];

  const storyboard = [
    `0-3s：用問題或反差畫面開場，字幕直接打出「${topic.slice(0, 14)} 的關鍵不是你想的那樣」。`,
    `3-6s：快速展示參考影片或主題中的核心情境，讓觀眾知道這和自己有關。`,
    `6-10s：拆出 2 個可複製元素：開場語氣、畫面節奏、賣點呈現或情緒轉折。`,
    `10-13s：補一個改寫方向，把原影片靈感轉成你的品牌、商品或服務版本。`,
    `13-15s：用明確 CTA 收尾，要求留言、點連結、私訊或直接生成同款短影音。`,
  ];

  const ctas = [
    '留言「想要」取得同款腳本',
    '把這支影片改成你的品牌版本',
    '上傳 3 張圖片，直接生成 15 秒短影音',
  ];

  return {
    platform,
    platformLabel,
    url,
    confidence,
    metadataPlan: getMetadataPlan(platform),
    strengths: [
      `主題明確，可直接拆成「吸引注意 -> 建立痛點 -> 給出解法 -> CTA」的 15 秒結構。`,
      `${platformLabel} 適合用高密度字幕和快速畫面轉場，提高前三秒停留率。`,
      '分析結果可直接帶入影片生成器，形成「網址/主題 -> Hook -> 分鏡 -> CTA -> MP4」流程。',
    ],
    risks: [
      platform === 'youtube'
        ? '若未設定 YouTube API key，目前只能做前端辨識與手動補充分析。'
        : '此平台可能遇到登入、反爬、地區或 API 權限限制，需保留手動補資料流程。',
      '只貼網址不一定能取得字幕與完整畫面內容，進階版需要轉錄、截圖或使用者上傳素材。',
      '目前輸出是策略重構，不會下載或複製原影片；商用時仍要注意素材授權。',
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
  const [contact, setContact] = useState<ContactInfo>(emptyContact);
  const [copyStatus, setCopyStatus] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [error, setError] = useState('');

  const platform = detectPlatform(url);
  const canAnalyze = url.trim().length >= 4 || title.trim().length >= 2 || description.trim().length >= 4;
  const report = result
    ? buildStrategyReport({
        result,
        contact,
        sourceUrl: url,
        sourceTitle: title,
        sourceDescription: description,
      })
    : '';

  const updateContact = (field: keyof ContactInfo, value: string) => {
    setContact((current) => ({...current, [field]: value}));
  };

  const copyReport = async () => {
    if (!report) return;

    try {
      await navigator.clipboard.writeText(report);
      setCopyStatus('已複製策略報告');
    } catch {
      setCopyStatus('瀏覽器不允許自動複製，請手動選取報告文字');
    }
  };

  const downloadReport = async () => {
    if (!report) return;

    try {
      setCopyStatus('正在產生 PDF...');
      const pdf = await renderReportPdf(report);
      const pdfUrl = URL.createObjectURL(pdf);
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `moltiai-strategy-report-${sanitizeFilename(contact.companyName)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(pdfUrl);
      setCopyStatus('PDF 已開始下載');
    } catch (pdfError) {
      setCopyStatus(pdfError instanceof Error ? pdfError.message : 'PDF 產生失敗，請稍候再試');
    }
  };

  const analyze = async () => {
    if (!canAnalyze) return;
    setStatus('loading');
    setError('');

    try {
      const response = await fetch(`${workerUrl}/analyze`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({url, title, description}),
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as AnalysisResult;
      setResult(data);
      setStatus('idle');
    } catch (analysisError) {
      setResult(buildAnalysis({url, platform, title, description}));
      setStatus('error');
      setError(
        analysisError instanceof Error
          ? `已改用本地策略分析。後端暫時無法抓取資料：${analysisError.message}`
          : '已改用本地策略分析。後端暫時無法抓取資料。'
      );
    }
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
          <div className="formGroup">
            <h2>客戶資料</h2>
            <label>
              對方公司名稱
              <input
                value={contact.companyName}
                onChange={(event) => updateContact('companyName', event.target.value)}
                placeholder="例如：ABC 美學診所 / XX 餐飲品牌"
              />
            </label>
            <label>
              聯絡人姓名
              <input
                value={contact.contactName}
                onChange={(event) => updateContact('contactName', event.target.value)}
                placeholder="例如：王小姐"
              />
            </label>
            <div className="twoFields">
              <label>
                電話
                <input
                  value={contact.phone}
                  onChange={(event) => updateContact('phone', event.target.value)}
                  placeholder="手機或公司電話"
                />
              </label>
              <label>
                Email
                <input
                  type="email"
                  value={contact.email}
                  onChange={(event) => updateContact('email', event.target.value)}
                  placeholder="client@example.com"
                />
              </label>
            </div>
          </div>
          <label>
            影片網址
            <input
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="貼影片網址，或直接輸入主題文字"
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

          <button disabled={!canAnalyze || status === 'loading'} onClick={analyze}>
            <Search size={20} />
            {status === 'loading' ? '分析中...' : '產生 Hook / 分鏡 / CTA'}
          </button>
        </div>

        <aside className="preview widePreview">
          <h2>分析結果</h2>
          {error ? <p className="error">{error}</p> : null}
          {!result ? (
            <p>貼上網址後會在這裡產生平台判斷、資料取得策略、Hook、分鏡與 CTA。</p>
          ) : (
            <div className="analysis">
              <div className={`badge ${result.confidence}`}>{result.platformLabel}</div>
              <p>{result.metadataPlan}</p>

              {result.comparisons?.length ? (
                <>
                  <h3>同題材對照組</h3>
                  <ol>{result.comparisons.map((item) => <li key={item}>{item}</li>)}</ol>
                </>
              ) : null}

              {result.scores ? (
                <>
                  <h3>診斷分數</h3>
                  <ul>
                    <li>Hook：{result.scores.hook}/5</li>
                    <li>留存節奏：{result.scores.retention}/5</li>
                    <li>資訊密度：{result.scores.density}/5</li>
                    <li>CTA：{result.scores.cta}/5</li>
                    <li>標題吸引力：{result.scores.titleScore}/5</li>
                  </ul>
                </>
              ) : null}

              <h3>優勢</h3>
              <ul>{result.strengths.map((item) => <li key={item}>{item}</li>)}</ul>

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

              <div className="reportBox">
                <div className="reportHeader">
                  <h3>策略建議報告</h3>
                  <div className="reportActions">
                    <button type="button" className="miniButton" onClick={copyReport}>
                      複製
                    </button>
                    <button type="button" className="miniButton" onClick={downloadReport}>
                      下載 PDF
                    </button>
                  </div>
                </div>
                {copyStatus ? <p className="hint">{copyStatus}</p> : null}
                <pre className="reportText">{report}</pre>
              </div>
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
