import {Composition} from 'remotion';
import {
  PromptImagesVertical,
  promptImagesVerticalDefaultProps,
  promptImagesVerticalSchema,
} from './PromptImagesVertical';

export const RemotionRoot = () => {
  return (
    <Composition
      id="PromptImagesVertical"
      component={PromptImagesVertical}
      durationInFrames={450}
      fps={30}
      width={1080}
      height={1920}
      schema={promptImagesVerticalSchema}
      defaultProps={promptImagesVerticalDefaultProps}
    />
  );
};
