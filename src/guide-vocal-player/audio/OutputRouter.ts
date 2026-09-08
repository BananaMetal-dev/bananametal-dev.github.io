export type OutputKind = 'monitor' | 'stream'

export class OutputRouter {
  readonly supported = typeof HTMLMediaElement !== 'undefined' && 'setSinkId' in HTMLMediaElement.prototype
  private readonly elements = new Map<OutputKind, HTMLAudioElement>()

  attach(kind: OutputKind, stream: MediaStream): HTMLAudioElement {
    const element = document.createElement('audio')
    element.autoplay = true
    element.srcObject = stream
    element.setAttribute('aria-hidden', 'true')
    element.style.display = 'none'
    document.body.appendChild(element)
    this.elements.set(kind, element)
    void element.play().catch(() => undefined)
    return element
  }

  async setDevice(kind: OutputKind, deviceId?: string): Promise<void> {
    const element = this.elements.get(kind)
    if (!element || !deviceId || !element.setSinkId) return
    await element.setSinkId(deviceId)
  }

  dispose(): void {
    this.elements.forEach((element) => {
      element.pause()
      element.srcObject = null
      element.remove()
    })
    this.elements.clear()
  }
}
