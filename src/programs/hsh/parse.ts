import { Env } from '@/sys0/env'

const ESCAPES: Record<string, string> = {
	'n': '\n',
	'r': '\r',
	't': '\t',
	'a': '\x07',
	'e': '\x1B',
}

namespace CHARS {
    export const white = [...' \t\r\n']
    export const d8 = [...'01234567']
    export const d10 = [...d8, ...'89']
    export const d16 = [...d10, ...'abcdefABCDEF']
    export const letter = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ']
	export const senv = [...d10, '?']
    export const env = [...letter, ...d10, '_']
}

export const is = <K extends keyof typeof CHARS>(kind: K, ch: string) => CHARS[kind].includes(ch)

export type HshToken =
	| HshTokenText
	| HshTokenRedirect

export type HshTokenText = {
	type: 'text'
	content: string
}

export type HshTokenRedirect = {
	type: 'redirect'
	mode: 'write' | 'append'
}

export const tokenize = (line: string, env: Env) => {
	const tokens: HshToken[] = []
	let isEsc = false
	let isNesc = false as false | 'x' | 'u' | 'o'
	let isSq = false
	let isDq = false
	let isVar = false
	let isWh = true
	let now = ''
    let enow = ''
    let vnow = ''
	let i = 0

	const consumeNow = () => {
		if (! now) return
		tokens.push({ type: 'text', content: now })
		now = ''
	}

	const consumeEnow = () => {
		now += String.fromCharCode(parseInt(enow, isNesc === 'o' ? 8 : 16))
		isNesc = false
		enow = ''
	}

	while (true) {
		let ch = line[i ++] ?? '\0'

		if (isEsc) {
			if (ch === 'x' || ch === 'u' || ch === '0') isNesc = ch === '0' ? 'o' : ch
			else now += ESCAPES[ch] ?? ch
			isEsc = false
			continue
		}
		if (isNesc) {
			if (enow.length < (isNesc === 'u' ? 4 : 2)) {
				if (is(isNesc === 'o' ? 'd8' : 'd16', ch)) {
					enow += ch
					continue
				}
				else if (isNesc === 'o') consumeEnow()
				else {
					now += isNesc + enow
					isNesc = false
					continue
				}
			}
			else consumeEnow()
		}
		if (isVar) {
			if (! vnow.length) {
				if (is('senv', ch)) {
					now += env[ch]
					isVar = false
					continue
				}
				else if (is('env', ch)) {
					vnow += ch
					continue
				}
				else {
					now += '$'
					isVar = false
				}
			}
			else {
				if (is('env', ch)) {
					vnow += ch
					continue
				}
				else {
					now += env[vnow]
					isVar = false
					vnow = ''
				}
			}
		}
		if (ch === '\0') break
		if (is('white', ch) && ! isSq && ! isDq) {
			if (isWh) continue
			consumeNow()
			isWh = true
			continue
		}
		else isWh = false
		if (! isDq && ! isSq && ch === '>') {
			consumeNow()
			if (line[i] === '>') {
				i ++
				tokens.push({ type: 'redirect', mode: 'append' })
			}
			else {
				tokens.push({ type: 'redirect', mode: 'write' })
			}
		}
		else if (ch === '\\' && ! isSq) isEsc = true
		else if (ch === '\'' && ! isDq) isSq = ! isSq
		else if (ch === '"' && ! isSq) isDq = ! isDq
		else if (! isDq && ! isSq && ch === '~')  now += '/home'
		else if (! isSq && ch === '$') isVar = true
		else now += ch
	}
	if (now) tokens.push({ type: 'text', content: now })

	return tokens
}

export interface HshAstScript {
	commands: HshAstCommand[]
}

export interface HshAstCommand {
	name: string
	args: string[]
	input?:
		| { type: 'readFrom', path: string }
	output?:
		| { type: 'writeTo', path: string }
		| { type: 'appendTo', path: string }
}

export const parse = (tokens: HshToken[]): HshAstScript => {
	const script: HshAstScript = {
		commands: []
	}

	while (tokens.length) {
		const name = tokens[0].type === 'redirect'
			? 'cat'
			: (tokens.shift() as HshTokenText).content

		const command: HshAstCommand = {
			name,
			args: [],
		}

		while (tokens.length) {
			const token = tokens.shift()!
			if (token.type === 'redirect') {
				const target = tokens.shift()
				if (! target) throw 'Expected redirect target, got end of input'
				if (target.type !== 'text') throw 'Expected redirect target, got ' + target.type
				command.output = {
					type: `${token.mode}To`,
					path: target.content
				}
			}
			else {
				command.args.push(token.content)
			}
		}

		script.commands.push(command)
	}

	return script
}