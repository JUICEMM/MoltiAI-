import Busboy from 'busboy';
import {createReadStream, existsSync} from 'node:fs';
import {mkdir, stat, writeFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';

const port = Number(process.env.PORT ?? 8787);
const publicBaseUrl = process.env.PUBLIC_WORKER_URL ?? `http://localhost:${port}`;
const corsOrigin = process.env.ALLOWED_ORIGIN ?? '*';

const send = (response, statusCode, body, contentType = 'application/json') => {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': corsOrigin,
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  });
  response.end(typeof body === 'string' ? body : JSON.stringify(body));
};

const safeName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '-');

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

const runRender = ({prompt, cta, images, musicMode, musicPath, outputPath}) => {
  const music =
    musicMode === 'none'
      ? 'none'
      : musicMode === 'upload' && musicPath
        ? musicPath
        : 'auto';

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === 'win32' ? 'cmd.exe' : 'node',
      process.platform === 'win32'
        ? [
            '/d',
            '/s',
            '/c',
            [
              'node',
              'scripts/create-video.mjs',
              '--prompt',
              JSON.stringify(prompt),
              '--images',
              JSON.stringify(images.join(',')),
              '--cta',
              JSON.stringify(cta),
              '--music',
              JSON.stringify(music),
              '--output',
              JSON.stringify(outputPath.replace(/\\/g, '/')),
            ].join(' '),
          ]
        : [
            'scripts/create-video.mjs',
            '--prompt',
            prompt,
            '--images',
            images.join(','),
            '--cta',
            cta,
            '--music',
            music,
            '--output',
            outputPath,
          ],
      {stdio: 'inherit', env: buildSpawnEnv()}
    );

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Render failed with exit code ${code}`));
      }
    });
  });
};

const parseMultipart = (request) => {
  return new Promise((resolve, reject) => {
    const jobId = new Date().toISOString().replace(/[:.]/g, '-');
    const incomingDir = path.join('tmp', 'incoming', jobId);
    const fields = {};
    const images = [];
    let musicPath = null;
    const pendingWrites = [];

    mkdir(incomingDir, {recursive: true})
      .then(() => {
        const busboy = Busboy({headers: request.headers});

        busboy.on('field', (name, value) => {
          fields[name] = value;
        });

        busboy.on('file', (name, file, info) => {
          const filename = safeName(info.filename || `${name}.bin`);
          const filePath = path.join(incomingDir, `${name}-${Date.now()}-${filename}`);
          const chunks = [];

          file.on('data', (chunk) => {
            chunks.push(chunk);
          });

          file.on('end', () => {
            const writePromise = writeFile(filePath, Buffer.concat(chunks)).then(() => {
              if (name === 'images') {
                images.push(filePath);
              } else if (name === 'music') {
                musicPath = filePath;
              }
            });
            pendingWrites.push(writePromise);
          });
        });

        busboy.on('error', reject);
        busboy.on('finish', async () => {
          await Promise.all(pendingWrites);
          resolve({jobId, fields, images, musicPath});
        });

        request.pipe(busboy);
      })
      .catch(reject);
  });
};

const serveFile = async (request, response) => {
  const url = new URL(request.url ?? '/', publicBaseUrl);
  const fileName = safeName(path.basename(url.pathname));
  const filePath = path.join('out', fileName);

  if (!existsSync(filePath)) {
    send(response, 404, 'Not found', 'text/plain');
    return;
  }

  const fileStat = await stat(filePath);
  response.writeHead(200, {
    'Content-Type': fileName.endsWith('.mp4') ? 'video/mp4' : 'application/octet-stream',
    'Content-Length': fileStat.size,
    'Access-Control-Allow-Origin': corsOrigin,
  });
  createReadStream(filePath).pipe(response);
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === 'OPTIONS') {
      send(response, 204, '');
      return;
    }

    const url = new URL(request.url ?? '/', publicBaseUrl);

    if (request.method === 'GET' && url.pathname === '/health') {
      send(response, 200, {ok: true});
      return;
    }

    if (request.method === 'GET' && url.pathname.startsWith('/out/')) {
      await serveFile(request, response);
      return;
    }

    if (request.method === 'POST' && url.pathname === '/render') {
      const {jobId, fields, images, musicPath} = await parseMultipart(request);
      const prompt = String(fields.prompt ?? '').trim();
      const cta = String(fields.cta ?? '立即了解').trim();
      const musicMode = String(fields.musicMode ?? 'auto').trim();

      if (prompt.length < 8) {
        send(response, 400, 'Prompt is too short.', 'text/plain');
        return;
      }

      if (images.length < 3 || images.length > 5) {
        send(response, 400, 'Please upload 3-5 images.', 'text/plain');
        return;
      }

      await mkdir('out', {recursive: true});
      const outputPath = path.join('out', `${jobId}.mp4`);
      await runRender({prompt, cta, images, musicMode, musicPath, outputPath});

      send(response, 200, {
        jobId,
        status: 'ready',
        videoUrl: `${publicBaseUrl}/out/${path.basename(outputPath)}`,
      });
      return;
    }

    send(response, 404, 'Not found', 'text/plain');
  } catch (error) {
    send(response, 500, error instanceof Error ? error.message : 'Internal error', 'text/plain');
  }
});

server.listen(port, () => {
  console.log(`MoltiAI video worker listening on ${publicBaseUrl}`);
});
