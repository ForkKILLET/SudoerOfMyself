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

export const parse = (line: string, env: Env) => {
	const state = {
		esc: false,
		nesc: false as false | 'x' | 'u' | 'o',
		sq: false,
		dq: false,
		var: false,
		wh: true,
	}
	const finishNesc = () => {
		now += String.fromCharCode(parseInt(enow, state.nesc === 'o' ? 8 : 16))
		state.nesc = false
		enow = ''
	}

	const tokens = []
	let now = ''
    let enow = ''
    let vnow = ''
	for (const ch of line.trimStart() + '\0') {
		if (state.esc) {
			if (ch === 'x' || ch === 'u' || ch === '0') state.nesc = ch === '0' ? 'o' : ch
			else now += ESCAPES[ch] ?? ch
			state.esc = false
			continue
		}
		if (state.nesc) {
			if (enow.length < (state.nesc === 'u' ? 4 : 2)) {
				if (is(state.nesc === 'o' ? 'd8' : 'd16', ch)) {
					enow += ch
					continue
				}
				else if (state.nesc === 'o') finishNesc()
				else {
					now += state.nesc + enow
					state.nesc = false
					continue
				}
			}
			else finishNesc()
		}
		if (state.var) {
			if (! vnow.length) {
				if (is('senv', ch)) {
					now += env[ch]
					state.var = false
					continue
				}
				else if (is('env', ch)) {
					vnow += ch
					continue
				}
				else {
					now += '$'
					state.var = false
				}
			}
			else {
				if (is('env', ch)) {
					vnow += ch
					continue
				}
				else {
					now += env[vnow]
					state.var = false
					vnow = ''
				}
			}
		}
		if (ch === '\0') break
		if (is('white', ch) && ! state.sq && ! state.dq) {
			if (state.wh) continue
			tokens.push(now)
			now = ''
			state.wh = true
			continue
		}
		else state.wh = false
		if (ch === '\\' && ! state.sq) state.esc = true
		else if (ch === '\'' && ! state.dq) state.sq = ! state.sq
		else if (ch === '"' && ! state.sq) state.dq = ! state.dq
		else if (! state.dq && ! state.sq && ch === '~')  now += '/home'
		else if (! state.sq && ch === '$') state.var = true
		else now += ch
	}
	if (now) tokens.push(now)

	return { tokens, state }
}