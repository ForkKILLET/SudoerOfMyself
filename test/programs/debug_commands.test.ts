import { describe, expect, it } from 'vitest'
import { cpu_burn } from '@/programs/cpu_burn'
import { fs_format } from '@/programs/fs_format'
import { fs_inodemap } from '@/programs/fs_inodemap'
import { hsh_tokenize } from '@/programs/hsh_tokenize'
import {
  BUILTINS,
  getInstalledNativeProgramNames,
  help,
} from '@/programs'
import type { Process } from '@/sys0/proc'

const DEBUG_COMMANDS = ['cpu_burn', 'fs_format', 'fs_inodemap', 'hsh_tokenize']

describe('debug commands', () => {
  it('installs debug commands only when debug mode is enabled', () => {
    const regular = getInstalledNativeProgramNames()
    const debug = getInstalledNativeProgramNames(true)

    DEBUG_COMMANDS.forEach((command) => {
      expect(regular).not.toContain(command)
      expect(debug).toContain(command)
    })
    expect(BUILTINS).not.toHaveProperty('hsh_tokenize')
    expect(regular).toContain('help')
  })

  it('provides help for every debug command', async () => {
    let output = ''
    const process = {
      stdio: {
        writeLn: (line: string) => {
          output += `${line}\n`
        },
      },
    } as unknown as Process

    for (const [name, program] of [
      ['cpu_burn', cpu_burn],
      ['fs_format', fs_format],
      ['fs_inodemap', fs_inodemap],
      ['hsh_tokenize', hsh_tokenize],
    ] as const) {
      output = ''
      await program(process, name, '--help')
      expect(output).toContain(`Usage:`)
      expect(output).toContain(name)
      expect(output).toContain('--help')
    }
  })

  it('lists builtins and the programs installed in PATH', async () => {
    let output = ''
    const process = {
      cwd: '/home',
      env: { PATH: '/bin' },
      ctx: {
        exec: {
          listInPath: () => ['touch', 'fs_format'],
        },
      },
      stdio: {
        writeLn: (line: string) => {
          output += `${line}\n`
        },
      },
    } as unknown as Process

    await help(process, 'help')

    expect(output).toContain('Shell builtins:')
    expect(output).toContain('Programs:')
    expect(output).toContain('fs_format')
    expect(output).toContain('Use "help PROGRAM" for detailed usage.')
  })
})
