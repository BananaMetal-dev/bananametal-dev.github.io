// Evaluation-rate conversion without integer clipping or peak normalization.
const sinc = (x: number) => x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
function gcd(a: number, b: number): number { while (b) [a, b] = [b, a % b]; return a; }

export function resampleChannelTo48k(source: Float32Array, sourceRate: number): Float32Array {
  if (sourceRate === 48000) return source.slice();
  if (!Number.isInteger(sourceRate) || sourceRate <= 0) throw new Error("無効な入力サンプルレートです。");
  const count = Math.round(source.length * 48000 / sourceRate), target = new Float32Array(count);
  const radius = 12, cutoff = Math.min(1, 48000 / sourceRate), divisor = gcd(sourceRate, 48000);
  const numerator = sourceRate / divisor, denominator = 48000 / divisor;
  const kernels = Array.from({ length: denominator }, (_, phase) => Float64Array.from({ length: radius * 2 }, (_, index) => {
    const distance = phase / denominator - (index - radius + 1);
    return cutoff * sinc(distance * cutoff) * sinc(distance / radius);
  }));
  for (let i = 0; i < count; i++) {
    const scaled = i * numerator, center = Math.floor(scaled / denominator), weights = kernels[scaled % denominator];
    let sum = 0, weight = 0;
    for (let index = 0; index < radius * 2; index++) {
      const tap = center + index - radius + 1;
      if (tap < 0 || tap >= source.length) continue;
      const kernel = weights[index]; sum += source[tap] * kernel; weight += kernel;
    }
    target[i] = weight ? sum / weight : 0;
  }
  return target;
}
