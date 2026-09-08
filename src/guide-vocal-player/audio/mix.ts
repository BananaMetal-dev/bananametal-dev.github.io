export function linearGuideGains(guideLevel: number): { on: number; off: number } {
  const guide = Math.min(1, Math.max(0, guideLevel))
  return { on: guide, off: 1 - guide }
}
