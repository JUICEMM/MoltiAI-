import {Config} from '@remotion/cli/config';

Config.setConcurrency(1);
Config.setDisallowParallelEncoding(true);
Config.setRendererPort(49152);
Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
