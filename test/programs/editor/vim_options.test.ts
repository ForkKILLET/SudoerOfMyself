import { describe, expect, it } from 'vitest'
import { setVimOptions, VIM_DEFAULT_OPTIONS } from '@/programs/editor/vim_options'

describe('vim set options', () => {
  it('lists defaults and changes aliases and negated options together', () => {
    const options = { ...VIM_DEFAULT_OPTIONS }
    expect(setVimOptions(options, '')).toBe('nonumber  hlsearch  wrap  cursorline')
    setVimOptions(options, 'nu nohls nowrap')
    expect(options).toEqual({ number: true, hlsearch: false, wrap: false, cursorline: true })
    expect(setVimOptions(options, 'nu? hlsearch? wrap?')).toBe('number  nohlsearch  nowrap')
  })

  it('toggles and resets boolean options', () => {
    const options = { ...VIM_DEFAULT_OPTIONS }
    setVimOptions(options, 'invnu wrap! hls! nocul')
    expect(options).toEqual({ number: true, hlsearch: false, wrap: false, cursorline: false })
    setVimOptions(options, 'nu& wrap& hls& cul&')
    expect(options).toEqual(VIM_DEFAULT_OPTIONS)
  })

  it.each(['number unknown', 'number=1', 'constructor', 'wrap=off', 'nonumber!'])(
    'rejects %s without partially applying the command', (command) => {
      const options = { ...VIM_DEFAULT_OPTIONS }
      expect(() => setVimOptions(options, command)).toThrow('Unknown option')
      expect(options).toEqual(VIM_DEFAULT_OPTIONS)
    },
  )
})
