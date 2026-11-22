/**
 * Decodes a browser-recorded audio Blob (webm/ogg/mp4) using Web AudioContext
 * and encodes it as a lightweight 16kHz mono 16-bit PCM RIFF/WAVE Blob (`audio/wav`).
 * Fixes GapGPT / OpenAI Whisper errors like "webm duration parsing requires full EBML parser".
 */

function writeAsciiString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

function encodeMonoPcm16ToWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataByteLength = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataByteLength);
  const view = new DataView(buffer);

  // RIFF chunk descriptor
  writeAsciiString(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataByteLength, true);
  writeAsciiString(view, 8, 'WAVE');

  // fmt sub-chunk
  writeAsciiString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeAsciiString(view, 36, 'data');
  view.setUint32(40, dataByteLength, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    const int16 = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    view.setInt16(offset, int16, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function mixDownAndResampleLinear(audioBuffer: AudioBuffer, targetSampleRate: number): Float32Array {
  const channelCount = Math.max(1, audioBuffer.numberOfChannels);
  const srcLen = audioBuffer.length;
  const mono = new Float32Array(srcLen);

  for (let ch = 0; ch < channelCount; ch++) {
    const chData = audioBuffer.getChannelData(ch);
    for (let i = 0; i < srcLen; i++) {
      mono[i] += chData[i] / channelCount;
    }
  }

  if (audioBuffer.sampleRate === targetSampleRate) {
    return mono;
  }

  const ratio = audioBuffer.sampleRate / targetSampleRate;
  const outLen = Math.max(1, Math.round(srcLen / ratio));
  const resampled = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcPos = i * ratio;
    const idx0 = Math.floor(srcPos);
    const idx1 = Math.min(srcLen - 1, idx0 + 1);
    const frac = srcPos - idx0;
    resampled[i] = mono[idx0] * (1 - frac) + mono[idx1] * frac;
  }
  return resampled;
}

export async function encodeAudioBlobToMono16kWav(inputBlob: Blob): Promise<Blob> {
  const TARGET_RATE = 16000;
  const AudioCtx =
    typeof window !== 'undefined'
      ? window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;

  if (!AudioCtx) {
    throw new Error('مرورگر از Web AudioContext برای تبدیل صدا به WAV پشتیبانی نمی‌کند.');
  }

  const arrayBuffer = await inputBlob.arrayBuffer();
  const audioCtx = new AudioCtx();
  try {
    const decoded = await audioCtx.decodeAudioData(arrayBuffer.slice(0));
    let mono16k: Float32Array;

    if (typeof OfflineAudioContext !== 'undefined') {
      try {
        const frameCount = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE));
        const offline = new OfflineAudioContext(1, frameCount, TARGET_RATE);
        const src = offline.createBufferSource();
        src.buffer = decoded;
        src.connect(offline.destination);
        src.start(0);
        const rendered = await offline.startRendering();
        mono16k = rendered.getChannelData(0);
      } catch {
        mono16k = mixDownAndResampleLinear(decoded, TARGET_RATE);
      }
    } else {
      mono16k = mixDownAndResampleLinear(decoded, TARGET_RATE);
    }

    return encodeMonoPcm16ToWavBlob(mono16k, TARGET_RATE);
  } finally {
    try {
      await audioCtx.close();
    } catch {
      // ignore close error
    }
  }
}
