import type { Context } from '@deepseek-ai/cordis'

export const name = 'flykit'
export const inject: string[] = []

/** Slice 1 needs no host code; the row exists so the client bundle is served. */
export function apply(_ctx: Context): void {}
