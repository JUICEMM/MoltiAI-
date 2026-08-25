import {Composition} from 'remotion';
import {
  PromptImagesVertical,
  promptImagesVerticalDefaultProps,
  promptImagesVerticalSchema,
} from './PromptImagesVertical';
import {
  PromptMediaVertical,
  promptMediaVerticalDefaultProps,
  promptMediaVerticalSchema,
} from './PromptMediaVertical';

export const RemotionRoot = () => {
  return <>
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
    <Composition
      id="PromptMediaVertical"
      component={PromptMediaVertical}
      durationInFrames={360}
      fps={24}
      width={720}
      height={1280}
      schema={promptMediaVerticalSchema}
      defaultProps={promptMediaVerticalDefaultProps}
    />
  </>;
};
