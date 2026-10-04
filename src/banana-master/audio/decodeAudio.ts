import type { AudioData } from "./audioTypes";
import { MPEGDecoder } from "mpg123-decoder";
import { resampleChannelTo48k } from "./resample";

export type DecodedAudio = { audio: AudioData; decoderWarningCount: number | null };

export async function decodeAudio(file: File): Promise<DecodedAudio> {
  if (!/\.(wav|mp3)$/i.test(file.name)) throw new Error("WAVまたはMP3を選択してください。");
  if (/\.mp3$/i.test(file.name)) {
    const decoder = new MPEGDecoder();
    await decoder.ready;
    try {
      const encoded = new Uint8Array(await file.arrayBuffer());
      let loggedWarnings = 0;
      const originalError = console.error;
      console.error = (...args: unknown[]) => {
        if (String(args[0]).startsWith("mpg123-decoder:")) loggedWarnings++;
        else originalError(...args);
      };
      let decoded;
      try { decoded = decoder.decode(encoded); } finally { console.error = originalError; }
      if (!decoded.samplesDecoded || decoded.channelData.length !== 2) throw new Error("MP3をステレオPCMへデコードできませんでした。");
      return { audio: { sampleRate: 48000,
        channels: decoded.channelData.map((channel) => resampleChannelTo48k(channel, decoded.sampleRate)) },
        decoderWarningCount: Math.max(decoded.errors.length, loggedWarnings) };
    } finally { decoder.free(); }
  }
  const context = new AudioContext({ sampleRate: 48000 });
  try {
    const decoded = await context.decodeAudioData(await file.arrayBuffer());
    if (decoded.numberOfChannels !== 2 || decoded.sampleRate !== 48000) {
      throw new Error("現在の開発版はステレオ音源の48kHz変換に対応します。");
    }
    return { audio: { sampleRate: decoded.sampleRate, channels: [decoded.getChannelData(0).slice(), decoded.getChannelData(1).slice()] },
      decoderWarningCount: null };
  } finally {
    await context.close();
  }
}
