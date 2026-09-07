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
 *
 * "Silent" tolerates a trickle: a status line with a clock in it redraws every
 * second (~160 chars per poll, measured on Claude Code), so waiting for zero
 * output would wait for ever.
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
  /** Drop the next burst: a resize made the TUI redraw, and a redraw is not an answer. */
  discard: boolean
}

export const ANSWER_MIN_CHARS = 400
/** A poll that brings fewer characters than this is idle redraw, not output. */
// ponytail: fixed threshold; measure per terminal if some TUI idles hotter than this.
export const IDLE_MAX_CHARS = 300
export const QUIET_POLLS = 2

/**
 * Output already on screen at first sight is history, not a startup draw still to
 * come: after a page reload, or when the poll first lists a terminal that has
 * finished drawing. Arming from it is what lets the very next answer ring.
 */
export function newActivity(seq: number): Activity {
  return { seq, burst: 0, quiet: 0, armed: seq >= ANSWER_MIN_CHARS, discard: false }
}

/** Fold one poll into the activity. Returns true exactly once per answer. */
export function step(a: Activity, seq: number): boolean {
  let answered = false
  if (seq - a.seq >= IDLE_MAX_CHARS) {
    a.burst += seq - a.seq
    a.quiet = 0
  } else if (++a.quiet === QUIET_POLLS) {
    const dense = a.burst >= ANSWER_MIN_CHARS
    a.burst = 0
    answered = dense && a.armed && !a.discard
    a.discard = false
    if (dense) a.armed = true
  }
  a.seq = seq
  return answered
}
