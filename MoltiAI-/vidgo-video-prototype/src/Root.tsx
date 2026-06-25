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
      durationInFrames={120}
      fps={8}
      width={480}
      height={854}
      schema={promptImagesVerticalSchema}
      defaultProps={promptImagesVerticalDefaultProps}
    />
  );
};
