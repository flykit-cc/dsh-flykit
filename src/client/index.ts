import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Declares `ctx.slots` on the client Context, plus the root/overlay slots.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-layout/client'
// Declares `ctx.modelDirectories` (the shell's per-session model directory) and `ctx.sessions`.
import type {} from '@deepseek-ai/dsh-client-ui-model-selection/client'
import type {} from '@deepseek-ai/dsh-client-ui-session/client'
import type { ModelSelection } from '@deepseek-ai/dsh-api-session-controller/types'
import { StatusLine } from './StatusLine.tsx'
import { PanelToggle } from './PanelToggle.tsx'
import { FilePanel } from './FilePanel.tsx'
import { installStyles } from './styles.ts'
import { ModelPicker } from './ModelPicker.tsx'
import type { ModelPickerInjected } from './ModelPicker.tsx'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.effect(() => installStyles(), 'flykit: styles')
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
    { name: 'conversation.composer.dock', id: 'flykit', order: 10 },
    StatusLine,
  ))
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register(
    { name: 'conversation.session.header.utilities', id: 'flykit-panel', order: 100, label: 'flykit' },
    PanelToggle,
  ))
  ctx.slots.inject('shell.overlay', () => ctx.slots.register(
    { name: 'shell.overlay', id: 'flykit-panel', order: 10 },
    FilePanel,
  ))

  // Replace the shell's model seat with the searchable picker, over the SAME
  // directory the /model popup uses, so both stay one state.
  // The directory service reads remote.session through the caller's scope, so those injects are ours too.
  ctx.inject(['slots', 'modelDirectories', 'sessions', 'remote', 'remote.session'], (scope: ClientContext) => {
    scope.slots.inject('conversation.input.model', () => scope.slots.register({
      name: 'conversation.input.model',
      priority: -1,   // lowest renders: shadows the shipped seat instead of throwing
      inject: (sessionId): ModelPickerInjected => {
        const directory = scope.modelDirectories.directoryFor(sessionId)
        const available = scope.sessions.subagentAddress(sessionId) === undefined
        return {
          available,
          directory: directory.store,
          load: () => { if (available) directory.load().catch(() => {}) },
          select: (selection: ModelSelection) => available ? directory.select(selection).then(() => true, () => false) : Promise.resolve(false),
        }
      },
    }, ModelPicker))
  })
}
