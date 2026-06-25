import React from 'react';
import {Audio} from '@remotion/media';
import {
  AbsoluteFill,
  Easing,
  Img,
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
  image: z.string(),
  motion: z.enum(['slow_zoom_in', 'slow_zoom_out', 'pan_left', 'pan_right', 'cta_push']),
});

export const promptImagesVerticalSchema = z.object({
  prompt: z.string(),
  title: z.string(),
  tone: z.string(),
  cta: z.string(),
  brandName: z.string(),
  music: z
    .object({
      src: z.string(),
      volume: z.number().min(0).max(1),
    })
    .nullable(),
  scenes: z.array(sceneSchema).min(3).max(5),
});

export type PromptImagesVerticalProps = z.infer<typeof promptImagesVerticalSchema>;

export const promptImagesVerticalDefaultProps: PromptImagesVerticalProps = {
  prompt:
    '幫我做一支 15 秒影片，介紹這間咖啡店的手沖咖啡、安靜空間，以及適合下午工作的氛圍。',
  title: '安靜午後，從一杯手沖開始',
  tone: 'warm_lifestyle',
  cta: '今天就來坐坐',
  brandName: 'VIDGO',
  music: {
    src: 'music/default-pulse.wav',
    volume: 0.22,
  },
  scenes: [
    {
      caption: '想找一個安靜的午後角落？',
      voiceover: '想找一個安靜的午後角落？',
      image: 'sample-01.svg',
      motion: 'slow_zoom_in',
    },
    {
      caption: '手沖咖啡，現點現做',
      voiceover: '這裡的手沖咖啡，現點現做，香氣很乾淨。',
      image: 'sample-02.svg',
      motion: 'pan_left',
    },
    {
      caption: '也適合工作、閱讀、放空',
      voiceover: '安靜的座位，也很適合工作、閱讀，或只是放空。',
      image: 'sample-03.svg',
      motion: 'slow_zoom_out',
    },
    {
      caption: '15 秒，留下舒服的一段時間',
      voiceover: '今天就來坐坐，留一段舒服的時間給自己。',
      image: 'sample-04.svg',
      motion: 'cta_push',
    },
  ],
};

const secondsToFrames = (seconds: number, fps: number) => Math.round(seconds * fps);

const getSceneTiming = (index: number, totalScenes: number, fps: number) => {
  const durationSeconds = 15 / totalScenes;

  return {
    startFrame: secondsToFrames(index * durationSeconds, fps),
    durationFrames: secondsToFrames(durationSeconds, fps),
  };
};

const getMotionStyle = (
  motion: PromptImagesVerticalProps['scenes'][number]['motion'],
  localFrame: number,
  durationFrames: number
): React.CSSProperties => {
  const easedProgress = interpolate(localFrame, [0, durationFrames], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  if (motion === 'slow_zoom_out') {
    return {transform: `scale(${1.16 - easedProgress * 0.1})`};
  }

  if (motion === 'pan_left') {
    return {transform: `scale(1.12) translateX(${36 - easedProgress * 72}px)`};
  }

  if (motion === 'pan_right') {
    return {transform: `scale(1.12) translateX(${-36 + easedProgress * 72}px)`};
  }

  if (motion === 'cta_push') {
    return {transform: `scale(${1.03 + easedProgress * 0.08})`};
  }

  return {transform: `scale(${1.04 + easedProgress * 0.1})`};
};

const Caption: React.FC<{text: string; isCta?: boolean}> = ({text, isCta}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const opacity = interpolate(frame, [0, 0.35 * fps], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const y = interpolate(frame, [0, 0.35 * fps], [36, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  const fontSize = text.length > 18 ? 56 : isCta ? 72 : 66;

  return (
    <div
      style={{
        position: 'absolute',
        left: 72,
        right: 72,
        bottom: isCta ? 236 : 178,
        opacity,
        transform: `translateY(${y}px)`,
        color: '#fffaf1',
        fontFamily:
          'Inter, "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", Arial, sans-serif',
        fontSize,
        fontWeight: 800,
        lineHeight: 1.12,
        letterSpacing: 0,
        textShadow: '0 6px 28px rgba(0, 0, 0, 0.48)',
      }}
    >
      {text}
    </div>
  );
};

const Scene: React.FC<{
  scene: PromptImagesVerticalProps['scenes'][number];
  index: number;
  totalScenes: number;
  durationFrames: number;
}> = ({scene, index, totalScenes, durationFrames}) => {
  const frame = useCurrentFrame();
  const motionStyle = getMotionStyle(scene.motion, frame, durationFrames);
  const fadeIn = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const fadeOut = interpolate(frame, [durationFrames - 12, durationFrames], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const isLast = index === totalScenes - 1;

  return (
    <AbsoluteFill style={{backgroundColor: '#10120f', opacity: Math.min(fadeIn, fadeOut)}}>
      <Img
        src={staticFile(scene.image)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          ...motionStyle,
        }}
      />
      <AbsoluteFill
        style={{
          background:
            'linear-gradient(180deg, rgba(16,18,15,0.12) 0%, rgba(16,18,15,0.18) 42%, rgba(16,18,15,0.82) 100%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 72,
          left: 72,
          padding: '18px 24px',
          border: '1px solid rgba(255, 250, 241, 0.34)',
          color: '#fffaf1',
          fontFamily: 'Inter, Arial, sans-serif',
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: 0,
          backgroundColor: 'rgba(19, 23, 20, 0.34)',
        }}
      >
        {index + 1}/{totalScenes}
      </div>
      <Caption text={scene.caption} isCta={isLast} />
    </AbsoluteFill>
  );
};

export const PromptImagesVertical: React.FC<PromptImagesVerticalProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const scenes = props.scenes.slice(0, 5);
  const titleOpacity = interpolate(frame, [0, fps, 2 * fps], [1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{backgroundColor: '#10120f'}}>
      {props.music ? (
        <Audio
          src={staticFile(props.music.src)}
          loop
          volume={(audioFrame) =>
            interpolate(
              audioFrame,
              [0, 0.6 * fps, 14 * fps, 15 * fps],
              [0, props.music?.volume ?? 0.2, props.music?.volume ?? 0.2, 0],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
              }
            )
          }
        />
      ) : null}

      {scenes.map((scene, index) => {
        const timing = getSceneTiming(index, scenes.length, fps);

        return (
          <Sequence
            key={`${scene.image}-${index}`}
            from={timing.startFrame}
            durationInFrames={timing.durationFrames}
          >
            <Scene
              scene={scene}
              index={index}
              totalScenes={scenes.length}
              durationFrames={timing.durationFrames}
            />
          </Sequence>
        );
      })}

      <AbsoluteFill
        style={{
          justifyContent: 'center',
          padding: 72,
          opacity: titleOpacity,
          background:
            'linear-gradient(180deg, rgba(16,18,15,0.42), rgba(16,18,15,0.62))',
        }}
      >
        <div
          style={{
            color: '#fffaf1',
            fontFamily:
              'Inter, "Noto Sans TC", "Microsoft JhengHei", "PingFang TC", Arial, sans-serif',
            fontSize: 84,
            fontWeight: 900,
            lineHeight: 1.05,
            letterSpacing: 0,
            maxWidth: 880,
            textShadow: '0 8px 32px rgba(0, 0, 0, 0.46)',
          }}
        >
          {props.title}
        </div>
      </AbsoluteFill>

      <div
        style={{
          position: 'absolute',
          left: 72,
          right: 72,
          bottom: 72,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          color: '#fffaf1',
          fontFamily: 'Inter, Arial, sans-serif',
          fontSize: 28,
          fontWeight: 700,
          letterSpacing: 0,
          textShadow: '0 4px 18px rgba(0, 0, 0, 0.42)',
        }}
      >
        <span>{props.brandName}</span>
        <span>{props.cta}</span>
      </div>
    </AbsoluteFill>
  );
};
