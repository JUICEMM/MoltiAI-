# vidgo-video-prototype

Local Remotion prototype for:

```text
prompt text + 3-5 images -> 15-second vertical short video
```

## Commands

```bash
npm.cmd install
npm.cmd run studio
npm.cmd run still
npm.cmd run render
npm.cmd run create-video -- --prompt "幫我做一支 15 秒影片，介紹這間咖啡店的手沖咖啡、安靜空間，以及適合下午工作的氛圍。" --images "public/sample-01.svg,public/sample-02.svg,public/sample-03.svg,public/sample-04.svg" --cta "今天就來坐坐" --music auto
```

## Composition

- `PromptImagesVertical`
- 1080x1920
- 30 fps
- 450 frames
- 15 seconds

The render input shape is defined with Zod in `src/PromptImagesVertical.tsx`.

## Local Pipeline

`scripts/create-video.mjs` is the first local version of the backend worker:

1. Validate a prompt and 3-5 image paths.
2. Copy images into `public/uploads/{jobId}`.
3. Generate Remotion props JSON in `out/{jobId}-props.json`.
4. Render a 15-second MP4 into `out/{jobId}.mp4`.

Music options:

```bash
# Use built-in generated demo music
npm.cmd run create-video -- --prompt "..." --images "a.jpg,b.jpg,c.jpg" --music auto

# Use an uploaded/local music file
npm.cmd run create-video -- --prompt "..." --images "a.jpg,b.jpg,c.jpg" --music "C:\path\to\music.mp3" --music-volume 0.18

# Disable music
npm.cmd run create-video -- --prompt "..." --images "a.jpg,b.jpg,c.jpg" --music none
```
