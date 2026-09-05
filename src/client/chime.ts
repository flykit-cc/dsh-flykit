/** A short two-note chime from the Web Audio API: no asset, no network. */
let ctx: AudioContext | null = null

/**
 * Browsers only start audio inside a user gesture. The context is created and
 * resumed on the first click or key anywhere, so a later chime from a poll
 * callback is allowed to sound.
 */
function unlock(): void {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {}
}
if (typeof document !== 'undefined') {
  for (const ev of ['pointerdown', 'keydown'] as const) document.addEventListener(ev, unlock, { capture: true, passive: true })
}

export function chime(): void {
  try {
    unlock()
    if (ctx === null) return
    const t0 = ctx.currentTime
    for (const [i, freq] of [[0, 659.25], [1, 987.77]] as const) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      const start = t0 + i * 0.16
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(0.28, start + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45)
      osc.connect(gain).connect(ctx.destination)
      osc.start(start)
      osc.stop(start + 0.5)
    }
  } catch { /* no audio device: the blink still shows */ }
}
