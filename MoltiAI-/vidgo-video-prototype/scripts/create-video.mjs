import {copyFile, mkdir, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

const allowedExtensions = new Set(['.jpg', '.jpeg', '.png', '.webp', '.svg']);
const allowedMusicExtensions = new Set(['.mp3', '.wav', '.m4a', '.aac', '.ogg']);
const motions = ['slow_zoom_in', 'pan_left', 'slow_zoom_out', 'pan_right', 'cta_push'];

const parseArgs = (argv) => {
  const args = {
    prompt: '',
    images: [],
    tone: 'warm_lifestyle',
    cta: '了解更多',
    brandName: 'VIDGO',
    output: '',
    music: 'auto',
    musicVolume: 0.55,
    noRender: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = argv[i + 1];

    if (arg === '--prompt') {
      args.prompt = next ?? '';
      i += 1;
    } else if (arg === '--images') {
      args.images = (next ?? '')
        .split(',')
        .map((imagePath) => imagePath.trim())
        .filter(Boolean);
      i += 1;
    } else if (arg === '--tone') {
      args.tone = next ?? args.tone;
      i += 1;
    } else if (arg === '--cta') {
      args.cta = next ?? args.cta;
      i += 1;
    } else if (arg === '--brand') {
      args.brandName = next ?? args.brandName;
      i += 1;
    } else if (arg === '--output') {
      args.output = next ?? '';
      i += 1;
    } else if (arg === '--music') {
      args.music = next ?? 'auto';
      i += 1;
    } else if (arg === '--music-volume') {
      args.musicVolume = Number(next ?? args.musicVolume);
      i += 1;
    } else if (arg === '--no-render') {
      args.noRender = true;
    }
  }

  return args;
};

const usage = () => {
  console.log(`Usage:
  npm.cmd run create-video -- --prompt "影片主題文字" --images "public/sample-01.svg,public/sample-02.svg,public/sample-03.svg" --cta "立即了解"

Options:
  --prompt     Required. Text description for the video.
  --images     Required. Comma-separated list of 3-5 image paths.
  --tone       Optional. Defaults to warm_lifestyle.
  --cta        Optional. Defaults to 了解更多.
  --brand      Optional. Defaults to VIDGO.
  --music      Optional. "auto", "none", or a local .mp3/.wav/.m4a/.aac/.ogg path. Defaults to auto.
  --music-volume Optional. Background music volume from 0 to 1. Defaults to 0.55.
  --output     Optional. Output MP4 path.
  --no-render  Optional. Generate props JSON only.`);
};

const cleanText = (text) => text.replace(/\s+/g, ' ').trim();

const splitPrompt = (prompt) => {
  const normalized = cleanText(prompt);
  const pieces = normalized
    .split(/[，。,.!?！？、；;：:]+/u)
    .map((piece) => piece.trim())
    .filter(Boolean);

  if (pieces.length >= 3) {
    return pieces;
  }

  return [
    normalized,
    '把重點整理成清楚的短影音節奏',
    '用畫面、字幕與旁白快速傳達價值',
  ];
};

const clip = (text, maxLength) => {
  const trimmed = cleanText(text);
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 1)}...` : trimmed;
};

const buildTitle = (prompt) => {
  const firstPart = splitPrompt(prompt)[0] ?? prompt;
  return clip(firstPart, 18);
};

const buildScenes = ({prompt, copiedImages, cta}) => {
  const pieces = splitPrompt(prompt);
  const sceneCount = copiedImages.length;

  return copiedImages.map((image, index) => {
    const isFirst = index === 0;
    const isLast = index === sceneCount - 1;
    const idea = pieces[index] ?? pieces[pieces.length - 1] ?? prompt;
    const caption = isLast ? cta : isFirst ? clip(idea, 22) : clip(idea, 18);
    const voiceover = isLast
      ? `${cta}。`
      : `${idea.replace(/[。！？.!?]+$/u, '')}。`;

    return {
      caption,
      voiceover,
      image,
      motion: motions[index % motions.length],
    };
  });
};

const prepareMusic = async ({music, musicVolume, jobId}) => {
  if (music === 'none') {
    return null;
  }

  const volume = Number.isFinite(musicVolume)
    ? Math.max(0, Math.min(1, musicVolume))
    : 0.55;

  if (!music || music === 'auto') {
    return {
      src: 'music/default-pulse.wav',
      volume,
    };
  }

  const extension = path.extname(music).toLowerCase();

  if (!allowedMusicExtensions.has(extension)) {
    throw new Error(`Unsupported music type: ${music}`);
  }

  if (!existsSync(music)) {
    throw new Error(`Music file not found: ${music}`);
  }

  const musicDir = path.join('public', 'uploads', jobId);
  const targetName = `music${extension}`;
  const targetPath = path.join(musicDir, targetName);
  await copyFile(music, targetPath);

  return {
    src: path.posix.join('uploads', jobId, targetName),
    volume,
  };
};

const buildSpawnEnv = () => {
  const env = {};
  let pathValue = '';

  for (const [key, value] of Object.entries(process.env)) {
    if (key.toLowerCase() === 'path') {
      pathValue = pathValue || value || '';
      continue;
    }

    env[key] = value;
  }

  env.Path = pathValue;
  return env;
};

const run = async () => {
  const args = parseArgs(process.argv.slice(2));

  if (!args.prompt || args.images.length < 3 || args.images.length > 5) {
    usage();
    throw new Error('Please provide --prompt and 3-5 image paths via --images.');
  }

  for (const imagePath of args.images) {
    const extension = path.extname(imagePath).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      throw new Error(`Unsupported image type: ${imagePath}`);
    }

    if (!existsSync(imagePath)) {
      throw new Error(`Image not found: ${imagePath}`);
    }
  }

  const jobId = new Date().toISOString().replace(/[:.]/g, '-');
  const uploadDir = path.join('public', 'uploads', jobId);
  const outDir = 'out';
  await mkdir(uploadDir, {recursive: true});
  await mkdir(outDir, {recursive: true});

  const copiedImages = [];

  for (const [index, imagePath] of args.images.entries()) {
    const extension = path.extname(imagePath).toLowerCase();
    const targetName = `image-${String(index + 1).padStart(2, '0')}${extension}`;
    const targetPath = path.join(uploadDir, targetName);
    await copyFile(imagePath, targetPath);
    copiedImages.push(path.posix.join('uploads', jobId, targetName));
  }

  const props = {
    prompt: cleanText(args.prompt),
    title: buildTitle(args.prompt),
    tone: args.tone,
    cta: cleanText(args.cta),
    brandName: cleanText(args.brandName),
    music: await prepareMusic({
      music: args.music,
      musicVolume: args.musicVolume,
      jobId,
    }),
    scenes: buildScenes({prompt: args.prompt, copiedImages, cta: args.cta}),
  };

  const propsPath = path.join(outDir, `${jobId}-props.json`);
  const outputPath = args.output || path.join(outDir, `${jobId}.mp4`);
  const remotionPropsPath = propsPath.replace(/\\/g, '/');
  const remotionOutputPath = outputPath.replace(/\\/g, '/');
  await writeFile(propsPath, `${JSON.stringify(props, null, 2)}\n`, 'utf8');

  console.log(`Props: ${propsPath}`);

  if (args.noRender) {
    console.log('Skipped render because --no-render was passed.');
    return;
  }

  await new Promise((resolve, reject) => {
    const remotionBin =
      process.platform === 'win32'
        ? path.join('node_modules', '.bin', 'remotion.cmd')
        : path.join('node_modules', '.bin', 'remotion');
    const renderArgs = [
      'render',
      'PromptImagesVertical',
      process.platform === 'win32' ? remotionOutputPath : outputPath,
      `--props=${process.platform === 'win32' ? remotionPropsPath : propsPath}`,
    ];
    const command = process.platform === 'win32' ? 'cmd.exe' : remotionBin;
    const commandArgs =
      process.platform === 'win32'
        ? ['/d', '/c', `${remotionBin} ${renderArgs.map((arg) => `"${arg}"`).join(' ')}`]
        : renderArgs;

    const child = spawn(command, commandArgs, {stdio: 'inherit', env: buildSpawnEnv()});

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Render failed with exit code ${code}`));
      }
    });
  });

  console.log(`Video: ${outputPath}`);
};

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
