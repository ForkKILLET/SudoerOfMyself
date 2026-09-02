export interface ShellPatternPart {
  value: string
  literal: boolean
}

interface PatternCharacter {
  value: string
  active: boolean
}

const escapeRegex = (value: string) => value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&')

const compileCharacterClass = (characters: readonly PatternCharacter[]) => {
  let index = 0
  let source = ''
  if (
    characters.length > 1
    && characters[0]?.active
    && (characters[0].value === '!' || characters[0].value === '^')
  ) {
    source += '^'
    index ++
  }
  for (; index < characters.length; index ++) {
    const character = characters[index]
    if (
      character.value === '\\'
      || character.value === '['
      || character.value === ']'
      || character.value === '^'
    ) {
      source += `\\${character.value}`
    }
    else if (character.value === '-') {
      const lower = characters[index - 1]?.value.codePointAt(0)
      const upper = characters[index + 1]?.value.codePointAt(0)
      const isRange = character.active
        && index > 0
        && index < characters.length - 1
        && lower !== undefined
        && upper !== undefined
        && lower <= upper
      source += isRange ? '-' : '\\-'
    }
    else source += character.value
  }
  return source
}

const compileShellPattern = (parts: readonly ShellPatternPart[]) => {
  const characters = parts.flatMap(part => Array.from(part.value).map(value => ({
    value,
    active: ! part.literal,
  })))
  let source = '^'
  for (let index = 0; index < characters.length; index ++) {
    const character = characters[index]
    if (! character.active) {
      source += escapeRegex(character.value)
      continue
    }
    if (character.value === '*') {
      source += '[\\s\\S]*'
      continue
    }
    if (character.value === '?') {
      source += '[\\s\\S]'
      continue
    }
    if (character.value === '[') {
      let close = index + 1
      while (close < characters.length && ! (
        characters[close].active
        && characters[close].value === ']'
        && close > index + 1
      )) close ++
      if (close < characters.length) {
        source += `[${compileCharacterClass(characters.slice(index + 1, close))}]`
        index = close
        continue
      }
    }
    source += escapeRegex(character.value)
  }
  return new RegExp(source + '$', 'u')
}

export const matchesShellPattern = (
  value: string,
  pattern: readonly ShellPatternPart[],
) => compileShellPattern(pattern).test(value)
