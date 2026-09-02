export const DEFAULT_PS1 = String.raw`\[\e[94m\]\w\[\e[39m\] \[\e[92m\]\$\[\e[39m\] `
export const DEFAULT_PS2 = String.raw`\[\e[92m\]>\[\e[39m\] `

export const DEFAULT_PROFILE = [
  `PS1='${DEFAULT_PS1}'`,
  `PS2='${DEFAULT_PS2}'`,
  'HISTFILE=$HOME/.hsh_history',
  'HISTSIZE=1000',
  'SAVEHIST=1000',
  '',
].join('\n')
