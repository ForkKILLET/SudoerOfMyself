import stripAnsi from 'strip-ansi'
import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PS1,
  DEFAULT_PS2,
  renderPrompt,
} from '@/programs/hsh/prompt'

describe('hsh prompt rendering', () => {
  it('renders the default prompts from PS1 and PS2 values', () => {
    const context = {
      env: { HOME: '/home/sudoer', PWD: '/home/sudoer/memory' },
    }

    expect(stripAnsi(renderPrompt(DEFAULT_PS1, context))).toBe('~/memory $ ')
    expect(stripAnsi(renderPrompt(DEFAULT_PS2, context))).toBe('> ')
  })

  it('renders path, identity, shell, job, and counter escapes', () => {
    const prompt = String.raw`\w|\W|\u|\h|\H|\s|\j|\!|\#|\$`

    expect(renderPrompt(prompt, {
      env: {
        HOME: '/home/sudoer',
        HOSTNAME: 'human.local',
        PWD: '/home/sudoer/memory',
        USER: 'sudoer',
        0: '/bin/hsh',
      },
      jobs: 2,
      historyNumber: 8,
      commandNumber: 5,
    })).toBe('~/memory|memory|sudoer|human|human.local|hsh|2|8|5|$')
  })

  it('renders control, non-printing, octal, and time escapes', () => {
    const prompt = String.raw`\[\e[31m\]x\[\e[0m\]|\\|\101|\d|\D{%Y-%m-%d}|\t|\T|\@|\A`
    const now = new Date(2026, 8, 2, 15, 4, 5)

    expect(renderPrompt(prompt, { env: {}, now })).toBe(
      '\x1B[31mx\x1B[0m|\\|A|Wed Sep 2|2026-09-02|15:04:05|03:04:05|03:04 pm|15:04',
    )
  })

  it('uses a root prompt marker only when USER is root', () => {
    expect(renderPrompt(String.raw`\$`, { env: { USER: 'root' } })).toBe('#')
  })
})
