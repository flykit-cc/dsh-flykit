/** A soft two-note chime from the Web Audio API: no asset, no network. */
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

// A falling fifth reads as "finished" rather than "look at me". Sine partials
// through a low-pass have no bite, and the peak gain is deliberately near the
// floor of audible — this fires while you are reading something else.
const NOTES = [
  { hz: 587.33, at: 0 },      // D5
  { hz: 392.00, at: 0.13 },   // G4
] as const
const PEAK = 0.045
const TAIL = 0.9

export function chime(): void {
  try {
    unlock()
    if (ctx === null) return
    const t0 = ctx.currentTime

    // One filter for both notes: rolls off the harsh upper harmonics that made
    // the old triangle wave read as an alarm.
    const tone = ctx.createBiquadFilter()
    tone.type = 'lowpass'
    tone.frequency.value = 1_400
    tone.Q.value = 0.5
    tone.connect(ctx.destination)

    for (const { hz, at } of NOTES) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = hz
      const start = t0 + at
      // A 40ms fade in, not an instant onset: a hard edge is what clicks.
      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.exponentialRampToValueAtTime(PEAK, start + 0.04)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + TAIL)
      osc.connect(gain).connect(tone)
      osc.start(start)
      osc.stop(start + TAIL + 0.05)
    }
  } catch { /* no audio device: the blink still shows */ }
}
