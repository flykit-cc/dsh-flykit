// Minimal ambient types for the `ws` package (no bundled or @types typings ship).
// Only the surface apps-proxy.ts uses is declared.
declare module 'ws' {
  import type { Duplex } from 'node:stream'
  import type { IncomingMessage } from 'node:http'

  export class WebSocket {
    static readonly CONNECTING: number
    static readonly OPEN: number
    static readonly CLOSING: number
    static readonly CLOSED: number
    readonly readyState: number
    constructor(url: string, options?: { perMessageDeflate?: boolean; origin?: string; headers?: Record<string, string> })
    send(data: unknown, cb?: (err?: Error) => void): void
    close(): void
    on(event: string, listener: (...args: any[]) => void): this
  }

  export class WebSocketServer {
    constructor(options?: { noServer?: boolean })
    handleUpgrade(request: IncomingMessage, socket: Duplex, head: Buffer, callback: (ws: WebSocket) => void): void
  }
}
