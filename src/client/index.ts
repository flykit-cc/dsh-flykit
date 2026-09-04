import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-conversation/client'
// Declares `ctx.slots` on the client Context.
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'

export const inject = ['slots']

export function apply(ctx: ClientContext): void {
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register(
    { name: 'conversation.composer.dock', id: 'flykit', order: 10 },
    () => 'flykit',
  ))
}
