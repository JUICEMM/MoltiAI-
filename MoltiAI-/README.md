# vidgo.co Text-and-Images-to-Video MVP

這份文件定義 vidgo.co 第一版 AI 短影音產品：

> 使用者輸入一段文字敘述，並上傳 3-5 張圖片，系統自動產出一支 15 秒直式短影音。

第一版重點不是做完整剪輯軟體，而是把「文字敘述 + 圖片素材 -> 腳本 -> 旁白 -> 字幕 -> Remotion 動態剪輯 -> MP4」包成一條穩定、可重複、可計費的自動化流程。

## Product Goal

vidgo.co 的核心體驗：

1. 使用者輸入文字敘述，例如「幫我做一支 15 秒影片，介紹這間咖啡店的手沖咖啡和安靜空間」。
2. 使用者上傳 3-5 張圖片，例如商品圖、店面圖、人物圖、活動圖。
3. AI 根據文字與圖片用途自動產生短影音腳本。
4. 系統把圖片安排到 4 個 scene，加入動態縮放、裁切、轉場、字幕與旁白。
5. 輸出 9:16 MP4，可用於 TikTok、Reels、Shorts。

第一版固定輸出：

- 15 秒
- 9:16 vertical
- 720x1280 或 1080x1920
- MP4
- 中文或英文
- 含字幕
- 含 AI 旁白
- 含背景音樂
- 可下載

## MVP Input

第一版表單只需要很少欄位：

- Prompt: 使用者想做成影片的文字敘述
- Images: 3-5 張圖片，支援 jpg、png、webp
- Language: zh-TW / en
- Tone: 專業、活潑、科技感、銷售導向、教育解釋
- Audience: 目標觀眾，可選填
- CTA: 結尾行動呼籲，可選填

Example:

```json
{
  "prompt": "幫我做一支 15 秒影片，介紹這間咖啡店的手沖咖啡、安靜空間，以及適合下午工作的氛圍。",
  "imageAssetIds": ["img_1", "img_2", "img_3", "img_4"],
  "language": "zh-TW",
  "tone": "warm_lifestyle",
  "audience": "喜歡咖啡與安靜工作空間的人",
  "cta": "今天就來坐坐"
}
```

## MVP Output

每次產生一支影片，之後再擴充成三個版本或不同開頭。

```json
{
  "videoId": "vid_123",
  "status": "ready",
  "durationSeconds": 15,
  "aspectRatio": "9:16",
  "mp4Url": "https://cdn.vidgo.co/renders/vid_123.mp4",
  "thumbnailUrl": "https://cdn.vidgo.co/renders/vid_123.jpg",
  "usedImageAssetIds": ["img_1", "img_2", "img_3", "img_4"]
}
```

## 15-Second Structure

固定結構能讓第一版穩定交付：

```text
0.0s - 2.5s    Hook
2.5s - 7.0s    Key idea 1
7.0s - 11.5s   Key idea 2
11.5s - 15.0s  CTA / punchline
```

範例輸出腳本：

```json
{
  "title": "安靜午後，從一杯手沖開始",
  "scenes": [
    {
      "start": 0,
      "end": 2.5,
      "caption": "想找一個安靜的午後角落？",
      "voiceover": "想找一個安靜的午後角落？",
      "imageAssetId": "img_1",
      "motion": "slow_zoom_in"
    },
    {
      "start": 2.5,
      "end": 7,
      "caption": "手沖咖啡，現點現做",
      "voiceover": "這裡的手沖咖啡，現點現做，香氣很乾淨。",
      "imageAssetId": "img_2",
      "motion": "pan_left"
    },
    {
      "start": 7,
      "end": 11.5,
      "caption": "也適合工作、閱讀、放空",
      "voiceover": "安靜的座位，也很適合工作、閱讀，或只是放空。",
      "imageAssetId": "img_3",
      "motion": "slow_zoom_out"
    },
    {
      "start": 11.5,
      "end": 15,
      "caption": "今天就來坐坐",
      "voiceover": "今天就來坐坐，留一段舒服的時間給自己。",
      "imageAssetId": "img_4",
      "motion": "cta_push"
    }
  ],
  "cta": "今天就來坐坐"
}
```

## System Architecture

```text
Frontend
  Prompt input form
  3-5 image upload
  Job progress screen
  Video preview
  Download button

Backend API
  Create video job
  Read job status
  Store user credits
  Store render metadata

Queue
  Redis + BullMQ, Cloud Tasks, or SQS

AI Worker
  Analyze prompt
  Inspect uploaded images
  Generate script
  Match images to scenes
  Generate TTS voiceover
  Generate subtitle timing
  Pick background music
  Build Remotion input JSON

Remotion Renderer
  Render 15-second vertical composition
  Export MP4
  Export thumbnail

Storage
  S3, R2, or GCS
  Uploaded images
  MP4 files
  Thumbnails
  Job artifacts

Database
  Postgres
  Users
  Video jobs
  Render artifacts
  Usage ledger
```

## OpenMontage Role

OpenMontage can be used as the internal production engine, not the public product UI.

Good fit:

- Script generation workflow
- Asset planning
- Image-based video pipeline
- TTS / music / subtitles
- Remotion composition
- ffprobe validation
- quality checks

vidgo.co should own:

- User account system
- Prompt and image upload UX
- Pricing and credits
- Queue and retry policy
- Template presets
- Storage and delivery
- Admin dashboard

OpenMontage is currently listed as GNU AGPLv3 / AGPL-3.0 on GitHub, so commercial deployment needs a license decision before launch.

## Remotion Render Payload

The Remotion template should receive structured JSON. Do not hard-code generated copy inside React components.

```json
{
  "composition": "PromptImagesVertical",
  "width": 1080,
  "height": 1920,
  "fps": 30,
  "durationInFrames": 450,
  "theme": "warm_lifestyle",
  "audio": {
    "voiceoverUrl": "https://cdn.vidgo.co/audio/voice_123.mp3",
    "musicUrl": "https://cdn.vidgo.co/music/beat_01.mp3"
  },
  "scenes": [
    {
      "startFrame": 0,
      "durationFrames": 75,
      "caption": "想找一個安靜的午後角落？",
      "visual": {
        "type": "uploaded_image",
        "assetId": "img_1",
        "url": "https://cdn.vidgo.co/uploads/img_1.jpg"
      },
      "motion": "slow_zoom_in"
    }
  ],
  "cta": "今天就來坐坐"
}
```

## API Draft

### Create Video

```http
POST /api/videos
Content-Type: application/json
```

```json
{
  "prompt": "幫我做一支 15 秒影片，介紹這間咖啡店的手沖咖啡、安靜空間，以及適合下午工作的氛圍。",
  "imageAssetIds": ["img_1", "img_2", "img_3", "img_4"],
  "language": "zh-TW",
  "tone": "warm_lifestyle",
  "audience": "喜歡咖啡與安靜工作空間的人",
  "cta": "今天就來坐坐"
}
```

Response:

```json
{
  "videoId": "vid_123",
  "status": "queued"
}
```

### Get Video Status

```http
GET /api/videos/{videoId}
```

Response:

```json
{
  "videoId": "vid_123",
  "status": "rendering",
  "progress": 68,
  "currentStage": "render_mp4"
}
```

## Database Draft

```sql
create table video_jobs (
  id uuid primary key,
  user_id uuid,
  prompt text not null,
  language text not null default 'zh-TW',
  tone text not null default 'professional',
  audience text,
  cta text,
  status text not null default 'queued',
  progress int not null default 0,
  script_json jsonb,
  render_payload jsonb,
  mp4_url text,
  thumbnail_url text,
  error_message text,
  cost_cents int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

```sql
create table image_assets (
  id uuid primary key,
  user_id uuid,
  video_job_id uuid references video_jobs(id),
  original_filename text not null,
  mime_type text not null,
  width int,
  height int,
  storage_url text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
```

```sql
create table usage_ledger (
  id uuid primary key,
  user_id uuid,
  video_job_id uuid references video_jobs(id),
  event_type text not null,
  provider text,
  cost_cents int not null default 0,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
```

## Worker Pipeline

```text
1. validate_input
2. validate_images
3. normalize_images
4. analyze_prompt
5. generate_script
6. match_images_to_scenes
7. generate_voiceover
8. generate_subtitle_timing
9. select_background_music
10. build_remotion_payload
11. render_mp4
12. render_thumbnail
13. run_ffprobe_validation
14. upload_artifacts
15. mark_ready
```

Recommended first version:

- Use one fixed Remotion template.
- Use the 3-5 uploaded images as primary visuals.
- Use AI-generated still images only as fallback or paid upgrade.
- Use TTS for voiceover.
- Use captions burned into the composition.
- Use licensed stock music or a fixed built-in track.
- Avoid AI video generation APIs at first because cost and latency are harder to control.

## Cost Control

Hard limits for v1:

- One video per request
- 15 seconds max
- Four scenes max
- 3-5 uploaded images
- 10 MB max per image
- One TTS generation
- One render attempt plus one retry
- No reference video analysis in v1
- No user-uploaded long videos in v1
- Max cost per job stored in config

## Roadmap

### Phase 1: Local Render Prototype

- Scaffold a Remotion project
- Build `PromptImagesVertical` composition
- Render from a static JSON file with 3-5 local images
- Export one 15-second MP4 locally
- Add a local CLI pipeline that accepts prompt text and 3-5 image paths

Current implementation:

```text
vidgo-video-prototype/
  src/PromptImagesVertical.tsx
  scripts/create-video.mjs
  public/sample-01.svg
  public/sample-02.svg
  public/sample-03.svg
  public/sample-04.svg
```

Run the local prototype:

```bash
cd vidgo-video-prototype
npm.cmd install
npm.cmd run create-video -- --prompt "幫我做一支 15 秒影片，介紹這間咖啡店的手沖咖啡、安靜空間，以及適合下午工作的氛圍。" --images "public/sample-01.svg,public/sample-02.svg,public/sample-03.svg,public/sample-04.svg" --cta "今天就來坐坐" --music auto
```

This creates:

- `public/uploads/{jobId}/image-*.svg`
- `public/uploads/{jobId}/music.*` when a local music file is provided
- `out/{jobId}-props.json`
- `out/{jobId}.mp4`

Music support:

- `--music auto`: use the built-in generated demo background track
- `--music "path/to/music.mp3"`: copy and use a local uploaded music file
- `--music none`: render without music
- `--music-volume 0.18`: control background volume

### Phase 2: AI Script Worker

- Add AI script generation from prompt
- Convert script into scene JSON
- Match uploaded images to scenes
- Validate scene count, duration, and caption length

### Phase 3: Audio

- Add TTS voiceover
- Add background music
- Add subtitle timing
- Mix audio safely

### Phase 4: Web App

- Build prompt input page
- Add image upload
- Add job status page
- Add video preview and download
- Store generated videos in object storage

### Phase 5: Monetization

- Add login
- Add credits
- Add watermark for free users
- Add retry/regenerate
- Add template presets

## Source Notes

- OpenMontage GitHub: https://github.com/calesthio/OpenMontage
- OpenMontage README describes agentic video production with scripting, asset generation, editing, Remotion composition, subtitles, music, and quality checks.
- The repository currently lists GNU AGPLv3 / AGPL-3.0 as its license.

## GitHub and Deployment

GitHub should be used for source code, issues, and deployment automation. It should not be the place that renders videos or stores user-generated MP4 files.

Recommended setup:

```text
GitHub
  Source code
  Pull requests
  GitHub Actions for tests

Vercel
  Frontend website
  Prompt and upload UI
  Video preview page

Render / Railway / Fly.io / Cloud Run
  Remotion worker API
  Chrome + ffmpeg rendering

Cloudflare R2 / S3 / GCS
  Uploaded images
  Uploaded music
  Rendered MP4 files
```

This workspace now contains a GitHub-ready starter integration:

```text
apps/web/
  Next.js frontend for Vercel
  /create-video upload and preview page

vidgo-video-prototype/
  Remotion template
  Local CLI renderer
  HTTP worker API at POST /render
```

Local integration run:

```bash
npm.cmd install
npm.cmd run worker:dev
npm.cmd run web:dev
```

Then open:

```text
http://localhost:3000/create-video
```

Do not commit these folders:

- `vidgo-video-prototype/node_modules/`
- `vidgo-video-prototype/out/`
- `vidgo-video-prototype/public/uploads/`

They are intentionally ignored in `.gitignore`.
