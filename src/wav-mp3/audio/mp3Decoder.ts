import { MPEGDecoder } from "mpg123-decoder";
import { writePcm16Wav } from "./wavWriter";

export async function decodeMp3ToWav(buffer: Uint8Array): Promise<Uint8Array> {
  const decoder = new MPEGDecoder();
  await decoder.ready;
  try {
    const decoded = decoder.decode(buffer);
    if (decoded.channelData.length < 1 || decoded.channelData.length > 2) throw new Error("Only mono and stereo MP3 files are supported.");
    if (!decoded.sampleRate || !decoded.samplesDecoded) throw new Error("The MP3 decoder returned no audio.");
    return writePcm16Wav(decoded.channelData, decoded.sampleRate);
  } finally {
    decoder.free();
  }
}
