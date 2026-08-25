import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  OffthreadVideo,
  interpolate,
  Sequence,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {z} from 'zod';

const sceneSchema = z.object({
  caption: z.string(),
  voiceover: z.string(),
  src: z.string(),
  kind: z.enum(['image', 'video']),
  trimStart: z.number().min(0).default(0),
  motion: z.enum(['slow_zoom_in', 'slow_zoom_out', 'pan_left', 'pan_right', 'cta_push', 'cut']),
});

export const promptMediaVerticalSchema = z.object({
  prompt: z.string(),
  title: z.string(),
  tone: z.string(),
  cta: z.string(),
  brandName: z.string(),
  music: z.object({src: z.string(), volume: z.number().min(0).max(1)}).nullable(),
  scenes: z.array(sceneSchema).min(3).max(5),
});

export type PromptMediaVerticalProps = z.infer<typeof promptMediaVerticalSchema>;

export const promptMediaVerticalDefaultProps: PromptMediaVerticalProps = {
  prompt: 'MoltiAI 自動剪輯示範',
  title: 'AI 自動判斷素材，剪成短影音',
  tone: 'dynamic_business',
  cta: '立即了解',
  brandName: 'MoltiAI',
  music: null,
  scenes: [
    {caption: '先抓住注意力', voiceover: '', src: 'sample-01.svg', kind: 'image', trimStart: 0, motion: 'slow_zoom_in'},
    {caption: '再用素材證明', voiceover: '', src: 'sample-02.svg', kind: 'image', trimStart: 0, motion: 'pan_left'},
    {caption: '最後給明確 CTA', voiceover: '', src: 'sample-03.svg', kind: 'image', trimStart: 0, motion: 'cta_push'},
  ],
};

const sceneTiming = (index: number, total: number, fps: number) => {
  const seconds = 15 / total;
  return {from: Math.round(index * seconds * fps), duration: Math.round(seconds * fps)};
};

const motionStyle = (motion: PromptMediaVerticalProps['scenes'][number]['motion'], frame: number, duration: number): React.CSSProperties => {
  const p = interpolate(frame, [0, duration], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.bezier(0.16, 1, 0.3, 1)});
  if (motion === 'slow_zoom_out') return {transform: `scale(${1.14 - p * 0.08})`};
  if (motion === 'pan_left') return {transform: `scale(1.1) translateX(${28 - p * 56}px)`};
  if (motion === 'pan_right') return {transform: `scale(1.1) translateX(${-28 + p * 56}px)`};
  if (motion === 'cta_push') return {transform: `scale(${1.02 + p * 0.07})`};
  if (motion === 'cut') return {transform: 'scale(1.03)'};
  return {transform: `scale(${1.03 + p * 0.08})`};
};

const Caption: React.FC<{text: string; cta?: boolean}> = ({text, cta}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = interpolate(frame, [0, 0.25 * fps], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const y = interpolate(frame, [0, 0.3 * fps], [28, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{position:'absolute',left:54,right:54,bottom:cta?210:150,opacity,transform:`translateY(${y}px)`,color:'#fff',fontFamily:'Inter,"Noto Sans TC","Microsoft JhengHei",sans-serif',fontSize:text.length>20?48:cta?68:58,fontWeight:900,lineHeight:1.12,textShadow:'0 5px 24px rgba(0,0,0,.65)'}}>{text}</div>;
};

const Scene: React.FC<{scene: PromptMediaVerticalProps['scenes'][number]; index:number; total:number; duration:number}> = ({scene,index,total,duration}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const style = motionStyle(scene.motion, frame, duration);
  const mediaStyle: React.CSSProperties = {width:'100%',height:'100%',objectFit:'cover',...style};
  const isLast = index === total - 1;
  return <AbsoluteFill style={{backgroundColor:'#090b0d'}}>
    {scene.kind === 'video' ? <OffthreadVideo src={staticFile(scene.src)} startFrom={Math.round(scene.trimStart * fps)} muted style={mediaStyle}/> : <Img src={staticFile(scene.src)} style={mediaStyle}/>} 
    <AbsoluteFill style={{background:'linear-gradient(180deg,rgba(0,0,0,.05),rgba(0,0,0,.08) 45%,rgba(0,0,0,.76))'}}/>
    <div style={{position:'absolute',top:48,left:48,padding:'10px 16px',borderRadius:999,background:'rgba(0,0,0,.38)',color:'#fff',fontFamily:'Inter,sans-serif',fontSize:22,fontWeight:800}}>{index+1}/{total}</div>
    <Caption text={scene.caption} cta={isLast}/>
  </AbsoluteFill>;
};

export const PromptMediaVertical: React.FC<PromptMediaVerticalProps> = (props) => {
  const {fps} = useVideoConfig();
  const scenes = props.scenes.slice(0,5);
  return <AbsoluteFill style={{backgroundColor:'#090b0d'}}>
    {props.music ? <Audio src={staticFile(props.music.src)} loop volume={props.music.volume}/> : null}
    {scenes.map((scene,index)=>{const t=sceneTiming(index,scenes.length,fps);return <Sequence key={`${scene.src}-${index}`} from={t.from} durationInFrames={t.duration}><Scene scene={scene} index={index} total={scenes.length} duration={t.duration}/></Sequence>;})}
    <div style={{position:'absolute',left:48,right:48,bottom:48,display:'flex',justifyContent:'space-between',color:'#fff',fontFamily:'Inter,sans-serif',fontSize:22,fontWeight:800,textShadow:'0 4px 18px rgba(0,0,0,.55)'}}><span>{props.brandName}</span><span>{props.cta}</span></div>
  </AbsoluteFill>;
};
