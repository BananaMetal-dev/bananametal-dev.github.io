(() => {
  "use strict";

  const api = window.Mediabunny;

  function isSupported(format = "webm", hasAudio = false) {
    return Boolean(
      api?.Output &&
      (format === "mp4" ? api?.Mp4OutputFormat : api?.WebMOutputFormat) &&
      api?.BufferTarget &&
      api?.CanvasSource &&
      api?.AudioBufferSource &&
      window.VideoEncoder &&
      window.VideoFrame &&
      (!hasAudio || window.AudioEncoder)
    );
  }

  async function render({
    format = "webm",
    canvas,
    width,
    height,
    fps,
    duration,
    audioFile = null,
    audioContext = null,
    drawFrame,
    onProgress,
    shouldCancel = () => false
  }) {
    if (!isSupported(format, Boolean(audioFile))) {
      throw new Error("WebCodecs is not available.");
    }
    if (typeof drawFrame !== "function") {
      throw new Error("A frame renderer is required.");
    }

    let output = null;
    try {
      const audioBuffer = audioFile
        ? await decodeAudioFile(audioFile, audioContext, duration)
        : null;
      const target = new api.BufferTarget();
      const isMp4 = format === "mp4";
      output = new api.Output({
        format: isMp4 ? new api.Mp4OutputFormat() : new api.WebMOutputFormat(),
        target
      });
      const videoSource = new api.CanvasSource(canvas, {
        codec: isMp4 ? "avc" : "vp9",
        bitrate: Math.min(12_000_000, Math.max(2_000_000, width * height * fps * 0.08))
      });
      output.addVideoTrack(videoSource, { frameRate: fps });

      let audioSource = null;
      if (audioBuffer) {
        audioSource = new api.AudioBufferSource({
          codec: isMp4 ? "aac" : "opus",
          bitrate: 128_000
        });
        output.addAudioTrack(audioSource);
      }

      await output.start();
      if (audioSource) {
        await audioSource.add(audioBuffer);
        audioSource.close();
        onProgress?.({ ratio: 0.1, phase: "audio" });
      }

      const frameCount = Math.max(1, Math.ceil(duration * fps));
      const frameDuration = 1 / fps;
      for (let index = 0; index < frameCount; index += 1) {
        if (shouldCancel()) {
          throw createAbortError();
        }
        const timestamp = index * frameDuration;
        drawFrame(canvas, timestamp, audioBuffer);
        await videoSource.add(timestamp, frameDuration);
        onProgress?.({
          ratio: audioBuffer ? 0.1 + (index + 1) / frameCount * 0.9 : (index + 1) / frameCount,
          phase: "video",
          timestamp
        });
        if (index % 8 === 0) {
          await yieldToBrowser();
        }
      }

      videoSource.close();
      await output.finalize();
      if (!target.buffer) {
        throw new Error("WebM output buffer is empty.");
      }
      return {
        blob: new Blob([target.buffer], { type: isMp4 ? "video/mp4" : "video/webm" }),
        duration: frameCount * frameDuration
      };
    } catch (error) {
      if (output && output.state !== "finalized" && output.state !== "canceled") {
        await output.cancel().catch(() => undefined);
      }
      throw error;
    }
  }

  async function decodeAudioFile(file, audioContext, duration) {
    if (!audioContext) {
      throw new Error("An AudioContext is required for audio rendering.");
    }
    const input = await file.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(input.slice(0));
    const frameCount = Math.max(1, Math.min(decoded.length, Math.ceil(duration * decoded.sampleRate)));
    if (frameCount === decoded.length) return decoded;

    const trimmed = audioContext.createBuffer(
      decoded.numberOfChannels,
      frameCount,
      decoded.sampleRate
    );
    for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
      trimmed.copyToChannel(decoded.getChannelData(channel).subarray(0, frameCount), channel);
    }
    return trimmed;
  }

  function createAbortError() {
    const error = new Error("Render canceled.");
    error.name = "AbortError";
    return error;
  }

  function yieldToBrowser() {
    return new Promise((resolve) => window.setTimeout(resolve, 0));
  }

  window.BananaMetalWebCodecsRenderer = {
    isSupported,
    render
  };
})();
