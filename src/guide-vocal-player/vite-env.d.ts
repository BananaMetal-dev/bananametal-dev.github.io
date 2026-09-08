/// <reference types="vite/client" />

interface HTMLMediaElement {
  setSinkId?: (sinkId: string) => Promise<void>
}
