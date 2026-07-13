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
    speed = 1,
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
    const outputSpeed = normalizeSpeed(speed);

    let output = null;
    try {
      const audioBuffer = audioFile
        ? await decodeAudioFile(audioFile, audioContext, duration, outputSpeed)
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

      const outputDuration = duration / outputSpeed;
      const frameCount = Math.max(1, Math.ceil(outputDuration * fps));
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

  async function decodeAudioFile(file, audioContext, duration, speed) {
    if (!audioContext) {
      throw new Error("An AudioContext is required for audio rendering.");
    }
    const input = await file.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(input.slice(0));
    const frameCount = Math.max(1, Math.min(decoded.length, Math.ceil(duration * decoded.sampleRate)));
    const trimmed = frameCount === decoded.length
      ? decoded
      : copyAudioBuffer(decoded, audioContext, frameCount);
    return speed === 1 ? trimmed : timeStretchAudioBuffer(trimmed, speed, audioContext);
  }

  function copyAudioBuffer(source, audioContext, frameCount) {
    const trimmed = audioContext.createBuffer(
      source.numberOfChannels,
      frameCount,
      source.sampleRate
    );
    for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
      trimmed.copyToChannel(source.getChannelData(channel).subarray(0, frameCount), channel);
    }
    return trimmed;
  }

  function timeStretchAudioBuffer(source, speed, audioContext) {
    const fftSize = 2048;
    const analysisHop = 512;
    const synthesisHop = analysisHop / speed;
    if (!Number.isInteger(synthesisHop)) {
      throw new Error("This render speed is not supported by the pitch-preserving processor.");
    }

    const outputLength = Math.max(1, Math.ceil(source.length / speed));
    const output = audioContext.createBuffer(
      source.numberOfChannels,
      outputLength,
      source.sampleRate
    );
    const window = createHannWindow(fftSize);
    const frameCount = Math.max(1, Math.ceil(Math.max(1, source.length - 1) / analysisHop) + 1);

    for (let channel = 0; channel < source.numberOfChannels; channel += 1) {
      const input = source.getChannelData(channel);
      const rendered = new Float32Array(outputLength);
      const normalization = new Float32Array(outputLength);
      const previousPhase = new Float64Array(fftSize / 2 + 1);
      const synthesisPhase = new Float64Array(fftSize / 2 + 1);
      let hasPreviousPhase = false;

      for (let frameIndex = 0; frameIndex < frameCount; frameIndex += 1) {
        const inputOffset = frameIndex * analysisHop;
        const outputOffset = frameIndex * synthesisHop;
        const real = new Float64Array(fftSize);
        const imaginary = new Float64Array(fftSize);

        for (let index = 0; index < fftSize; index += 1) {
          const sourceIndex = inputOffset + index;
          real[index] = sourceIndex < input.length ? input[sourceIndex] * window[index] : 0;
        }
        fftInPlace(real, imaginary, false);

        for (let bin = 0; bin <= fftSize / 2; bin += 1) {
          const magnitude = Math.hypot(real[bin], imaginary[bin]);
          const phase = Math.atan2(imaginary[bin], real[bin]);
          const angularFrequency = (2 * Math.PI * bin) / fftSize;
          if (!hasPreviousPhase) {
            synthesisPhase[bin] = phase;
          } else {
            const expectedAdvance = angularFrequency * analysisHop;
            const phaseDeviation = wrapPhase(phase - previousPhase[bin] - expectedAdvance);
            synthesisPhase[bin] += angularFrequency * synthesisHop + (phaseDeviation * synthesisHop) / analysisHop;
          }
          previousPhase[bin] = phase;
          real[bin] = magnitude * Math.cos(synthesisPhase[bin]);
          imaginary[bin] = magnitude * Math.sin(synthesisPhase[bin]);
          if (bin > 0 && bin < fftSize / 2) {
            real[fftSize - bin] = real[bin];
            imaginary[fftSize - bin] = -imaginary[bin];
          }
        }
        hasPreviousPhase = true;
        fftInPlace(real, imaginary, true);

        for (let index = 0; index < fftSize; index += 1) {
          const outputIndex = outputOffset + index;
          if (outputIndex >= outputLength) break;
          rendered[outputIndex] += real[index] * window[index];
          normalization[outputIndex] += window[index] * window[index];
        }
      }

      const outputChannel = output.getChannelData(channel);
      for (let index = 0; index < outputLength; index += 1) {
        outputChannel[index] = normalization[index] > 0
          ? rendered[index] / normalization[index]
          : 0;
      }
    }
    return output;
  }

  function createHannWindow(size) {
    return Float32Array.from({ length: size }, (_, index) =>
      0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (size - 1))
    );
  }

  function wrapPhase(value) {
    const twoPi = 2 * Math.PI;
    return ((value + Math.PI) % twoPi + twoPi) % twoPi - Math.PI;
  }

  function fftInPlace(real, imaginary, inverse) {
    const size = real.length;
    for (let index = 1, reverse = 0; index < size; index += 1) {
      let bit = size >> 1;
      while (reverse & bit) {
        reverse ^= bit;
        bit >>= 1;
      }
      reverse ^= bit;
      if (index < reverse) {
        [real[index], real[reverse]] = [real[reverse], real[index]];
        [imaginary[index], imaginary[reverse]] = [imaginary[reverse], imaginary[index]];
      }
    }

    for (let length = 2; length <= size; length <<= 1) {
      const angle = (inverse ? 2 : -2) * Math.PI / length;
      const half = length >> 1;
      for (let offset = 0; offset < size; offset += length) {
        for (let index = 0; index < half; index += 1) {
          const phase = angle * index;
          const factorReal = Math.cos(phase);
          const factorImaginary = Math.sin(phase);
          const even = offset + index;
          const odd = even + half;
          const productReal = real[odd] * factorReal - imaginary[odd] * factorImaginary;
          const productImaginary = real[odd] * factorImaginary + imaginary[odd] * factorReal;
          real[odd] = real[even] - productReal;
          imaginary[odd] = imaginary[even] - productImaginary;
          real[even] += productReal;
          imaginary[even] += productImaginary;
        }
      }
    }

    if (inverse) {
      for (let index = 0; index < size; index += 1) {
        real[index] /= size;
        imaginary[index] /= size;
      }
    }
  }

  function normalizeSpeed(speed) {
    const value = Number(speed);
    if (value === 1 || value === 2) return value;
    throw new Error("Only 1x and 2x render speeds are available in this test build.");
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
