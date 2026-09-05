import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Declares `ctx.slots` on the client Context, plus the root/overlay slots.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
import { StatusLine } from './StatusLine.tsx'
import { FilesButton } from './FilesButton.tsx'
import { FilePanel } from './FilePanel.tsx'
import { installStyles } from './styles.ts'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => installStyles(), 'flykit: styles')
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
    { name: 'conversation.composer.dock', id: 'flykit', order: 10 },
    StatusLine,
  ))
  ctx.slots.inject('conversation.input.right', () => ctx.slots.register(
    { name: 'conversation.input.right', id: 'flykit-files', order: 10, label: 'Files' },
    FilesButton,
  ))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'flykit-files', order: 10 },
    FilePanel,
  ))
}
