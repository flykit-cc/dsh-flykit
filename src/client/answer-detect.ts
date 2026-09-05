/**
 * "Has this agent just answered?" from nothing but a character counter polled
 * every couple of seconds.
 *
 * An answer is a dense burst of output followed by silence. Two things look the
 * same to a naive reading and both used to ring the chime:
 *
 * - the TUI's own startup draw — a big burst, then it waits for you;
 * - idle redraws, a few characters per poll forever. An accumulator with no
 *   time bound crosses any threshold eventually, so the chime fired again and
 *   again for as long as a terminal sat open.
 *
 * So the burst is discarded at every silent window, and the first settle only
 * arms the detector instead of reporting an answer.
 */
export interface Activity {
  /** Last character count seen. */
  seq: number
  /** Characters since the last silent window. */
  burst: number
  /** Consecutive polls with no new output. */
  quiet: number
  /** Set once the startup draw has settled. */
  armed: boolean
}

export const ANSWER_MIN_CHARS = 200
export const QUIET_POLLS = 2

export function newActivity(seq: number): Activity {
  return { seq, burst: 0, quiet: 0, armed: false }
}

/** Fold one poll into the activity. Returns true exactly once per answer. */
export function step(a: Activity, seq: number): boolean {
  let answered = false
  if (seq > a.seq) {
    a.burst += seq - a.seq
    a.quiet = 0
  } else if (++a.quiet === QUIET_POLLS) {
    const dense = a.burst >= ANSWER_MIN_CHARS
    a.burst = 0
    answered = dense && a.armed
    if (dense) a.armed = true
  }
  a.seq = seq
  return answered
}
