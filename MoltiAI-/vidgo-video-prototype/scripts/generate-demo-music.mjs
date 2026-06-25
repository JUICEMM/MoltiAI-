import {mkdir, writeFile} from 'node:fs/promises';
import path from 'node:path';

const sampleRate = 44100;
const seconds = 15;
const samples = sampleRate * seconds;
const channels = 1;
const bytesPerSample = 2;
const dataBytes = samples * channels * bytesPerSample;
const buffer = Buffer.alloc(44 + dataBytes);

let offset = 0;
const writeAscii = (value) => {
  buffer.write(value, offset, 'ascii');
  offset += value.length;
};
const writeUInt32 = (value) => {
  buffer.writeUInt32LE(value, offset);
  offset += 4;
};
const writeUInt16 = (value) => {
  buffer.writeUInt16LE(value, offset);
  offset += 2;
};

writeAscii('RIFF');
writeUInt32(36 + dataBytes);
writeAscii('WAVE');
writeAscii('fmt ');
writeUInt32(16);
writeUInt16(1);
writeUInt16(channels);
writeUInt32(sampleRate);
writeUInt32(sampleRate * channels * bytesPerSample);
writeUInt16(channels * bytesPerSample);
writeUInt16(16);
writeAscii('data');
writeUInt32(dataBytes);

for (let i = 0; i < samples; i += 1) {
  const t = i / sampleRate;
  const beat = Math.exp(-8 * (t % 0.5));
  const tone = Math.sin(2 * Math.PI * 220 * t) * 0.16 + Math.sin(2 * Math.PI * 330 * t) * 0.07;
  const pulse = Math.sin(2 * Math.PI * 55 * t) * 0.2 * beat;
  const fade = Math.min(1, t / 0.7, (seconds - t) / 1);
  const value = Math.max(-1, Math.min(1, (tone + pulse) * fade));
  buffer.writeInt16LE(Math.round(value * 32767), offset);
  offset += 2;
}

const outputDir = path.join('public', 'music');
const outputPath = path.join(outputDir, 'default-pulse.wav');
await mkdir(outputDir, {recursive: true});
await writeFile(outputPath, buffer);
console.log(outputPath);
