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
      durationInFrames={180}
      fps={12}
      width={720}
      height={1280}
      schema={promptImagesVerticalSchema}
      defaultProps={promptImagesVerticalDefaultProps}
    />
  );
};
