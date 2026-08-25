import {mkdir, writeFile, readFile, copyFile, stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';

const imageExt = new Set(['.jpg','.jpeg','.png','.webp','.svg']);
const videoExt = new Set(['.mp4','.mov','.m4v','.webm']);
const musicExt = new Set(['.mp3','.wav','.m4a','.aac','.ogg']);
const SEGMENT_SECONDS = 3;
const WIDTH = 480;
const HEIGHT = 854;
const FPS = 24;

const parseArgs=(argv)=>{const a={prompt:'',media:[],cta:'立即了解',brand:'MoltiAI',output:'',music:'auto'};for(let i=0;i<argv.length;i++){const k=argv[i],v=argv[i+1];if(k==='--prompt'){a.prompt=v??'';i++;}else if(k==='--media'){a.media=(v??'').split(',').map(x=>x.trim()).filter(Boolean);i++;}else if(k==='--cta'){a.cta=v??a.cta;i++;}else if(k==='--brand'){a.brand=v??a.brand;i++;}else if(k==='--output'){a.output=v??'';i++;}else if(k==='--music'){a.music=v??'auto';i++;}}return a;};
const clean=(s='')=>String(s).replace(/\s+/g,' ').trim();
const splitText=(s)=>{const x=clean(s).split(/[，。,.!?！？、；;：:]+/u).map(v=>v.trim()).filter(Boolean);return x.length?x:[clean(s)];};
const clip=(s,n)=>clean(s).length>n?`${clean(s).slice(0,n-1)}…`:clean(s);
const run=(cmd,args,{capture=false}={})=>new Promise((resolve,reject)=>{const p=spawn(cmd,args,{stdio:capture?['ignore','pipe','pipe']:'inherit'});let out='';let err='';if(capture){p.stdout.on('data',d=>out+=d.toString());p.stderr.on('data',d=>err+=d.toString());}p.on('error',reject);p.on('exit',code=>code===0?resolve(out.trim()):reject(new Error(`${cmd} exited ${code}${err?`: ${err.slice(-600)}`:''}`)));});
const probe=async(file)=>{try{return Number(await run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',file],{capture:true}))||0;}catch{return 0;}};
const esc=(s)=>String(s).replace(/\\/g,'\\\\').replace(/:/g,'\\:').replace(/'/g,"\\'").replace(/,/g,'\\,').replace(/%/g,'\\%');

const renderSegment=async({file,kind,index,text,dir,duration})=>{
  const out=path.join(dir,`seg-${String(index+1).padStart(2,'0')}.mp4`);
  const caption=clip(text,22);
  const common=`scale=${WIDTH}:${HEIGHT}:force_original_aspect_ratio=increase,crop=${WIDTH}:${HEIGHT},fps=${FPS},setsar=1,format=yuv420p`;
  const draw=`drawbox=x=0:y=690:w=${WIDTH}:h=164:color=black@0.42:t=fill,drawtext=text='${esc(caption)}':fontcolor=white:fontsize=34:font='DejaVu Sans':x=(w-text_w)/2:y=720:box=0:shadowcolor=black@0.7:shadowx=2:shadowy=2`;
  if(kind==='video'){
    const maxStart=Math.max(0,duration-SEGMENT_SECONDS-0.05);const start=Math.min(maxStart,index===0?Math.max(0,duration*0.05):Math.max(0,duration*0.18));
    await run('ffmpeg',['-y','-ss',String(start),'-i',file,'-t',String(SEGMENT_SECONDS),'-an','-vf',`${common},${draw}`,'-c:v','libx264','-preset','ultrafast','-crf','25','-movflags','+faststart',out]);
  }else{
    await run('ffmpeg',['-y','-loop','1','-i',file,'-t',String(SEGMENT_SECONDS),'-vf',`${common},zoompan=z='min(zoom+0.0009,1.08)':d=${SEGMENT_SECONDS*FPS}:s=${WIDTH}x${HEIGHT}:fps=${FPS},${draw}`,'-an','-c:v','libx264','-preset','ultrafast','-crf','25','-movflags','+faststart',out]);
  }
  return out;
};

const main=async()=>{
  const args=parseArgs(process.argv.slice(2));
  if(clean(args.prompt).length<8) throw new Error('Prompt is too short.');
  if(args.media.length<3||args.media.length>8) throw new Error('Please provide 3-8 media files.');
  for(const f of args.media){if(!existsSync(f)) throw new Error(`Media not found: ${f}`);const e=path.extname(f).toLowerCase();if(!imageExt.has(e)&&!videoExt.has(e)) throw new Error(`Unsupported media type: ${f}`);}
  const job=Date.now().toString(36);const work=path.join('tmp','autopilot',job);await mkdir(work,{recursive:true});await mkdir('out',{recursive:true});
  const meta=[];for(const file of args.media){const ext=path.extname(file).toLowerCase();const kind=videoExt.has(ext)?'video':'image';const duration=kind==='video'?await probe(file):0;const bytes=(await stat(file)).size;meta.push({file,kind,duration,bytes});}
  const usable=meta.filter(m=>m.kind==='image'||m.duration>=0.8).sort((a,b)=>(b.kind==='video'?1:0)-(a.kind==='video'?1:0)||b.bytes-a.bytes).slice(0,5);
  if(usable.length<3) throw new Error('Not enough usable media.');
  const parts=splitText(args.prompt);const segments=[];
  for(let i=0;i<usable.length;i++){const m=usable[i];const t=i===usable.length-1?args.cta:(parts[i]??parts[parts.length-1]??args.prompt);segments.push(await renderSegment({...m,index:i,text:t,dir:work}));}
  const list=path.join(work,'concat.txt');await writeFile(list,segments.map(f=>`file '${path.resolve(f).replace(/'/g,"'\\''")}'`).join('\n'),'utf8');
  const silent=path.join(work,'silent.mp4');await run('ffmpeg',['-y','-f','concat','-safe','0','-i',list,'-c','copy',silent]);
  const output=args.output||path.join('out',`${job}.mp4`);
  if(args.music==='none'||!args.music||args.music==='auto'){
    await copyFile(silent,output);
  }else{
    const ext=path.extname(args.music).toLowerCase();if(!musicExt.has(ext)||!existsSync(args.music)) throw new Error('Unsupported or missing music file.');
    await run('ffmpeg',['-y','-i',silent,'-stream_loop','-1','-i',args.music,'-filter_complex','[1:a]volume=0.20,afade=t=in:st=0:d=0.4,afade=t=out:st=14:d=1[a]','-map','0:v','-map','[a]','-t','15','-c:v','copy','-c:a','aac','-shortest',output]);
  }
  console.log(JSON.stringify({ok:true,mode:'autopilot-ffmpeg',output,media:usable.map(x=>({kind:x.kind,duration:x.duration}))}));
};
main().catch(e=>{console.error(e instanceof Error?e.message:String(e));process.exit(1);});
