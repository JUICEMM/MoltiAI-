import Busboy from 'busboy';
import {createReadStream, existsSync} from 'node:fs';
import {mkdir, stat, writeFile, readFile} from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import {spawn} from 'node:child_process';

const port=Number(process.env.PORT??8787); const legacyPort=port+1;
const publicBaseUrl=process.env.PUBLIC_WORKER_URL??`http://localhost:${port}`;
const corsOrigin=process.env.ALLOWED_ORIGIN??'*';
const legacy=spawn(process.execPath,['scripts/worker-server.mjs'],{stdio:'inherit',env:{...process.env,PORT:String(legacyPort),PUBLIC_WORKER_URL:publicBaseUrl}});
process.on('exit',()=>legacy.kill());

const cors=(req)=>corsOrigin==='*'?'*':(req.headers.origin||corsOrigin.split(',')[0]);
const send=(req,res,status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type.startsWith('text/')?`${type}; charset=utf-8`:type,'Access-Control-Allow-Origin':cors(req),'Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type'});res.end(typeof body==='string'?body:JSON.stringify(body));};
const safe=(s='file.bin')=>s.replace(/[^a-zA-Z0-9._-]/g,'-');
const imageExt=new Set(['.jpg','.jpeg','.png','.webp','.svg']); const videoExt=new Set(['.mp4','.mov','.m4v','.webm']);

const parseMultipart=(req)=>new Promise((resolve,reject)=>{const jobId=new Date().toISOString().replace(/[:.]/g,'-');const dir=path.join('tmp','incoming',jobId);const fields={};const media=[];let musicPath=null;const writes=[];mkdir(dir,{recursive:true}).then(()=>{const b=Busboy({headers:req.headers});b.on('field',(n,v)=>fields[n]=v);b.on('file',(name,file,info)=>{const filePath=path.join(dir,`${name}-${Date.now()}-${safe(info.filename)}`);const chunks=[];file.on('data',c=>chunks.push(c));file.on('end',()=>writes.push(writeFile(filePath,Buffer.concat(chunks)).then(()=>{if(name==='images'||name==='media') media.push(filePath); else if(name==='music') musicPath=filePath;})));});b.on('error',reject);b.on('finish',async()=>{await Promise.all(writes);resolve({jobId,fields,media,musicPath});});req.pipe(b);}).catch(reject);});

const renderAutopilot=({prompt,cta,media,musicMode,musicPath,outputPath})=>new Promise((resolve,reject)=>{const music=musicMode==='none'?'none':musicMode==='upload'&&musicPath?musicPath:'auto';const child=spawn(process.execPath,['scripts/create-autopilot-ffmpeg.mjs','--prompt',prompt,'--media',media.join(','),'--cta',cta,'--music',music,'--output',outputPath],{stdio:'inherit',env:{...process.env}});child.on('exit',c=>c===0?resolve():reject(new Error(`Autopilot render failed with exit code ${c}`)));});

const renderLegacy=async({prompt,cta,media,musicMode,musicPath})=>{const fd=new FormData();fd.set('prompt',prompt);fd.set('cta',cta);fd.set('musicMode',musicMode);for(const file of media){const bytes=await readFile(file);const type=path.extname(file).toLowerCase()==='.svg'?'image/svg+xml':'image/png';fd.append('images',new Blob([bytes],{type}),path.basename(file));}if(musicMode==='upload'&&musicPath){const bytes=await readFile(musicPath);fd.set('music',new Blob([bytes],{type:'audio/mpeg'}),path.basename(musicPath));}return fetch(`http://127.0.0.1:${legacyPort}/render`,{method:'POST',body:fd});};

const proxy=async(req,res)=>{const target=`http://127.0.0.1:${legacyPort}${req.url}`;const chunks=[];for await(const c of req) chunks.push(c);const body=chunks.length?Buffer.concat(chunks):undefined;const r=await fetch(target,{method:req.method,headers:{...req.headers,host:`127.0.0.1:${legacyPort}`},body});const buf=Buffer.from(await r.arrayBuffer());res.writeHead(r.status,{'Content-Type':r.headers.get('content-type')||'application/octet-stream','Access-Control-Allow-Origin':cors(req)});res.end(buf);};

const server=http.createServer(async(req,res)=>{try{if(req.method==='OPTIONS'){send(req,res,204,'');return;}const url=new URL(req.url??'/',publicBaseUrl);
  if(req.method==='GET'&&url.pathname==='/health'){send(req,res,200,{ok:true,autopilot:true,renderer:'ffmpeg',legacyPort});return;}
  if(req.method==='POST'&&url.pathname==='/render'){
    const {jobId,fields,media,musicPath}=await parseMultipart(req);const prompt=String(fields.prompt??'').trim();const cta=String(fields.cta??'立即了解').trim();const musicMode=String(fields.musicMode??'auto').trim();
    if(prompt.length<8){send(req,res,400,'Prompt is too short.','text/plain');return;}
    if(media.length<3||media.length>8){send(req,res,400,'Please upload 3-8 image/video files.','text/plain');return;}
    const unsupported=media.filter(f=>{const e=path.extname(f).toLowerCase();return !imageExt.has(e)&&!videoExt.has(e);}); if(unsupported.length){send(req,res,400,'Unsupported media type.','text/plain');return;}
    const hasVideo=media.some(f=>videoExt.has(path.extname(f).toLowerCase()));
    if(!hasVideo && media.length<=5){const legacyResponse=await renderLegacy({prompt,cta,media,musicMode,musicPath});const body=Buffer.from(await legacyResponse.arrayBuffer());res.writeHead(legacyResponse.status,{'Content-Type':legacyResponse.headers.get('content-type')||'application/json','Access-Control-Allow-Origin':cors(req)});res.end(body);return;}
    await mkdir('out',{recursive:true});const outputPath=path.join('out',`${jobId}.mp4`);await renderAutopilot({prompt,cta,media,musicMode,musicPath,outputPath});send(req,res,200,{jobId,status:'ready',mode:'autopilot-ffmpeg',media:media.length,videoUrl:`${publicBaseUrl}/out/${path.basename(outputPath)}`});return;
  }
  if(req.method==='GET'&&url.pathname.startsWith('/out/')){const fp=path.join('out',safe(path.basename(url.pathname)));if(existsSync(fp)){const s=await stat(fp);res.writeHead(200,{'Content-Type':'video/mp4','Content-Length':s.size,'Access-Control-Allow-Origin':cors(req)});createReadStream(fp).pipe(res);return;}}
  await proxy(req,res);
}catch(e){send(req,res,500,e instanceof Error?e.message:'Internal error','text/plain');}});
server.listen(port,()=>console.log(`MoltiAI autopilot worker listening on ${publicBaseUrl}`));
