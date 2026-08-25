import {copyFile, mkdir, stat, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

const imageExt = new Set(['.jpg','.jpeg','.png','.webp','.svg']);
const videoExt = new Set(['.mp4','.mov','.m4v','.webm']);
const musicExt = new Set(['.mp3','.wav','.m4a','.aac','.ogg']);
const motions = ['slow_zoom_in','cut','pan_left','cut','slow_zoom_out','pan_right','cta_push'];

const parseArgs = (argv) => {
  const args = {prompt:'',media:[],cta:'了解更多',brandName:'MoltiAI',output:'',music:'auto',musicVolume:0.32,noRender:false};
  for(let i=0;i<argv.length;i+=1){const a=argv[i],n=argv[i+1];
    if(a==='--prompt'){args.prompt=n??'';i++;}
    else if(a==='--media'){args.media=(n??'').split(',').map(x=>x.trim()).filter(Boolean);i++;}
    else if(a==='--cta'){args.cta=n??args.cta;i++;}
    else if(a==='--brand'){args.brandName=n??args.brandName;i++;}
    else if(a==='--output'){args.output=n??'';i++;}
    else if(a==='--music'){args.music=n??'auto';i++;}
    else if(a==='--music-volume'){args.musicVolume=Number(n??args.musicVolume);i++;}
    else if(a==='--no-render'){args.noRender=true;}
  }
  return args;
};

const clean = (s='') => String(s).replace(/\s+/g,' ').trim();
const parts = (prompt) => {
  const p=clean(prompt); const out=p.split(/[，。,.!?！？、；;：:]+/u).map(x=>x.trim()).filter(Boolean);
  return out.length>=3?out:[p,'用最有資訊量的素材快速證明重點','最後給觀眾一個明確行動'];
};
const clip=(s,n)=>clean(s).length>n?`${clean(s).slice(0,n-1)}…`:clean(s);

const ffprobe = (file) => new Promise((resolve) => {
  const child=spawn('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file]);
  let out='';
  let settled=false;
  const finish=(value)=>{if(!settled){settled=true;resolve(value);}};
  child.stdout.on('data',d=>out+=d.toString());
  child.on('error',()=>finish(0));
  child.on('exit',()=>finish(Number(out.trim())||0));
});

const rankMedia = async (files) => {
  const meta=[];
  for(const file of files){
    const ext=path.extname(file).toLowerCase();
    const kind=videoExt.has(ext)?'video':'image';
    const duration=kind==='video'?await ffprobe(file):0;
    let mb=1;
    try { mb=(await stat(file)).size/1_000_000; } catch {}
    const sizeScore=Math.min(10,Math.max(1,Math.round(mb)));
    meta.push({file,kind,duration,sizeScore});
  }
  return meta.sort((a,b)=>((b.kind==='video'&&b.duration>=1.2)?1:0)-((a.kind==='video'&&a.duration>=1.2)?1:0) || b.sizeScore-a.sizeScore);
};

const prepareMusic = async ({music,musicVolume,jobId}) => {
  if(music==='none') return null;
  const volume=Number.isFinite(musicVolume)?Math.max(0,Math.min(1,musicVolume)):0.32;
  if(!music||music==='auto') return {src:'music/default-pulse.wav',volume};
  const ext=path.extname(music).toLowerCase(); if(!musicExt.has(ext)||!existsSync(music)) throw new Error('Unsupported or missing music file.');
  const dir=path.join('public','uploads',jobId); const target=path.join(dir,`music${ext}`); await copyFile(music,target); return {src:path.posix.join('uploads',jobId,`music${ext}`),volume};
};

const buildEnv=()=>{const env={};let p='';for(const [k,v] of Object.entries(process.env)){if(k.toLowerCase()==='path'){p=p||v||'';continue;}env[k]=v;}env.Path=p;return env;};

const run=async()=>{
  const args=parseArgs(process.argv.slice(2));
  if(!args.prompt||args.media.length<3||args.media.length>8) throw new Error('Please provide --prompt and 3-8 media files.');
  for(const f of args.media){const e=path.extname(f).toLowerCase();if(!imageExt.has(e)&&!videoExt.has(e)) throw new Error(`Unsupported media type: ${f}`);if(!existsSync(f)) throw new Error(`Media not found: ${f}`);}

  const jobId=new Date().toISOString().replace(/[:.]/g,'-'); const uploadDir=path.join('public','uploads',jobId); await mkdir(uploadDir,{recursive:true}); await mkdir('out',{recursive:true});
  const ranked=await rankMedia(args.media); const chosen=ranked.slice(0,5); const copied=[];
  for(const [i,m] of chosen.entries()){const ext=path.extname(m.file).toLowerCase();const name=`media-${String(i+1).padStart(2,'0')}${ext}`;const target=path.join(uploadDir,name);await copyFile(m.file,target);copied.push({...m,src:path.posix.join('uploads',jobId,name)});}

  const text=parts(args.prompt); const total=copied.length;
  const scenes=copied.map((m,i)=>{
    const last=i===total-1; const idea=text[i]??text[text.length-1]??args.prompt; const sceneSeconds=15/total;
    const maxStart=Math.max(0,m.duration-sceneSeconds-0.15); const trimStart=m.kind==='video'?Math.min(maxStart, i===0?Math.max(0,m.duration*0.08):Math.max(0,m.duration*0.18)):0;
    return {caption:last?args.cta:(i===0?clip(idea,22):clip(idea,18)),voiceover:last?`${args.cta}。`:`${idea.replace(/[。！？.!?]+$/u,'')}。`,src:m.src,kind:m.kind,trimStart:Number(trimStart.toFixed(2)),motion:m.kind==='video'?'cut':motions[i%motions.length]};
  });

  const props={prompt:clean(args.prompt),title:clip(text[0]??args.prompt,18),tone:'autopilot_dynamic',cta:clean(args.cta),brandName:clean(args.brandName),music:await prepareMusic({music:args.music,musicVolume:args.musicVolume,jobId}),scenes};
  const propsPath=path.join('out',`${jobId}-autopilot-props.json`); const output=args.output||path.join('out',`${jobId}.mp4`); await writeFile(propsPath,`${JSON.stringify(props,null,2)}\n`,'utf8');
  if(args.noRender){console.log(JSON.stringify({propsPath,scenes},null,2));return;}
  await new Promise((resolve,reject)=>{const bin=process.platform==='win32'?path.join('node_modules','.bin','remotion.cmd'):path.join('node_modules','.bin','remotion');const rargs=['render','PromptMediaVertical',output,`--props=${propsPath}`];const cmd=process.platform==='win32'?'cmd.exe':bin;const cargs=process.platform==='win32'?['/d','/c',`${bin} ${rargs.map(x=>`"${x}"`).join(' ')}`]:rargs;const child=spawn(cmd,cargs,{stdio:'inherit',env:buildEnv()});child.on('exit',code=>code===0?resolve():reject(new Error(`Render failed with exit code ${code}`)));});
  console.log(`Video: ${output}`);
};
run().catch(e=>{console.error(e.message);process.exit(1);});
