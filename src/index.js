import { Terminal } from "xterm"
import { WebLinksAddon } from "xterm-addon-web-links"
import chalk from "chalk"
import sleep from "simple-async-sleep"
import stringWidth from "string-width"
import levelF from "./level.js"
import cmdF from "./command.js"

const term = new Terminal({
	rows: 30,
	cols: 97,
	cursorBlink: true,
	fontFamily: "'Fira Code', consolas, monospace"
})
term.loadAddon(new WebLinksAddon)

term.open(document.getElementById("xterm"))
term.writePrompt = () => term.write(term.prompt)

term.history = []
term.delete = (c, go, back) =>
	term.write((go ? "\b".repeat(c) : "") + (back ? " ".repeat(c) + "\b".repeat(c) : ""))
term.historyLn = () => {
	term.write("\r")
	term.writePrompt()
	term.delete(stringWidth(term.ln), false, true)
	term.write(
		term.ln = (term.historyIndex ? term.history.at(- term.historyIndex) : "")
	)
	term.cursorIndex = term.ln.length
}
Object.defineProperties(term, {
	lnPre: {
		get: () => term.ln.slice(0, term.cursorIndex)
	},
	lnPost: {
		get: () => term.ln.slice(term.cursorIndex)
	},
	lnPostN: {
		get: () => term.ln.slice(term.cursorIndex + 1)
	},
	lnCur: {
		get: () => term.ln[term.cursorIndex - 1]
	},
	lnCurN: {
		get: () => term.ln[term.cursorIndex]
	}
})

term.readln = async () => {
	term.writePrompt()
	if (term.history.at(-1) !== term.ln && term.ln) term.history.push(term.ln)
	term.historyIndex = 0
	term.cursorIndex = 0
	term.ln = ""
	await new Promise(res => term.lnComplete = res)
	delete term.lnComplete
	return term.ln = term.ln.trim()
}
term.onData(key => {
	switch (key[0]) {
		case "\u007F": // Backspace
			if (! term.enableRead) return
			if (term.cursorIndex > 0) {
				const i = stringWidth(term.lnCur)
				term.delete(i, true, false)
				term.cursorIndex --
				term.ln = term.lnPre + term.lnPostN
				term.write(term.lnPost + " ".repeat(i))
				term.delete(stringWidth(term.lnPost) + i, true, false)
			}
			break
		case "\r": // Enter
			if (! term.enableRead) return
			term.writeln("")
			term.lnComplete()
			break
		case "\u000C": // Ctrl-L
			if (! term.enableRead) return
			term.clear()
			break
		case "\u0001": // Ctrl-A
			term.write("\u001B[D".repeat(stringWidth(term.lnPre)))
			term.cursorIndex = 0
			break
		case "\u0005": // Ctrl-E
			term.write("\u001B[C".repeat(stringWidth(term.lnPost)))
			term.cursorIndex = term.ln.length
			break
		case "\u001A":
			if (perm.find("ff")) term.fastForward = true
			break
		case "\u001B": // CSI
			switch (key.slice(1)) {
				case "[A":
					if (! term.enableRead) return
					if (term.historyIndex < term.history.length) {
						term.historyIndex ++
						term.historyLn()
					}
					break
				case "[B":
					if (! term.enableRead) return
					if (term.historyIndex > 0) {
						term.historyIndex --
						term.historyLn()
					}
					break
				case "[D":
					if (! term.enableRead) return
					if (term.cursorIndex > 0) {
						term.write(key.repeat(stringWidth(term.lnCur)))
						term.cursorIndex --
					}
					break
				case "[C":
					if (! term.enableRead) return
					if (term.cursorIndex < term.ln.length) {
						term.write(key.repeat(stringWidth(term.lnCurN)))
						term.cursorIndex ++
					}
					break
				case "":
					term.blur()
					break
				default:
					console.log("Key ESC: %s", key.slice(1))
			}
			break
		default:
			if (key < "\u0020" || (key > "\u007E" && key < "\u00A0")) {
				console.log("Key code: %d", key.charCodeAt())
				return
			}
			if (! term.enableRead) return
			term.write(key + term.lnPost)
			term.write("\b".repeat(stringWidth(term.lnPost)))
			term.ln = term.lnPre + key + term.lnPost
			term.cursorIndex += key.length
	}
})

term.listeners = {}
term.listen = (evt, fn) => {
	const ls = term.listeners[evt] ??= []
	ls.push(fn)
	return { dispose: () => ls.splice(ls.findIndex(f => f === fn), 1) }
}
term.listenOnce = (evt, fn) => {
	const { dispose } = term.listen(evt, async (...arg) => {
		if (await fn(...arg)) dispose()
	})
	return { dispose }
}
term.trigger = async (evt, ...arg) => {
	console.log("Trigger: %s, arg:\n%o", evt, arg)
	for (const fn of term.listeners[evt] ?? []) await fn(...arg)
}

const sto = JSON.parse(localStorage.SudoerOfMyself ?? "{}")
sto.__save = () => {
	localStorage.SudoerOfMyself = JSON.stringify(sto)
}

addEventListener("beforeunload", sto.__save)

chalk.level = 1
term.prompt = chalk.green("$ ")

sto.perms ??= {}
const able = flag => (...names) => {
	const { perms } = sto
	names.forEach(n => perms[n] = flag)
	sto.perms = perms
}
const perm = {
	enable: able(true),
	disable: able(false),
	find: cmdn => sto.perms[cmdn]
}

const { cmds, fs } = cmdF({ term, perm, sto, chalk })
const levels = levelF({ term, perm, sto, cmds, chalk })

term.isReading = false
term.startReading = async () => {
	term.enableRead = true
	if (term.isReading) return

	term.isReading = true
	while (term.enableRead) {
		const ln = await term.readln()
		if (! ln) continue
		const [ cmdn, ...arg ] = ln.split(" ")
		if (! perm.find(`cmds.${cmdn}`)) {
			if (cmdn in cmds) {
				term.writeln(`${cmdn}: permission denied.`)
				await term.trigger("command-no-perm")
			}
			else {
				term.writeln(`${cmdn}: command not found.`)
				await term.trigger("command-not-found", cmdn)
			}
		}
		else {
			term.enableRead = false
			await cmds[cmdn]?.(...arg)
			term.enableRead = true
			await term.trigger("command-run", cmdn, arg)
		}
	}
	term.isReading = false
}
term.endReading = () => {
	term.enableRead = false
}

sto.level ??= 0
term.currLevel = () => levels[sto.level]?.(term, cmds)
term.nextLevel = async () => {
	await levels[++ sto.level]?.(term, cmds)
	return true
}

term.echo = async (s, { t, c } = {}) => {
	s = (Array.isArray(s) ? s : [ s ]).map(ln => `* ${ln}\r\n`).join("")
	for (let i = 0; i < s.length; i ++) {
		let ch = s[i]
		if (ch === "\u001B")
			while (s[i] !== "m") ch += s[++ i]
		term.write(chalk[c ?? "yellow"](ch))
		await sleep(term.fastForward ? 5 : t ?? 120)
	}
	term.fastForward = false
}

Object.assign(window, {
	term, perm, levels, cmds, fs, sto,
	ex: { chalk, sleep, stringWidth }
})

term.currLevel()
