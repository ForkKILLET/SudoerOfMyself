import { Terminal } from "xterm"
import chalk from "chalk"
import sleep from "simple-async-sleep"
import levelF from "./level.js"
import cmdF from "./command.js"

const term = new Terminal({
	rows: 30,
	cols: 97,
	cursorBlink: true,
	fontFamily: "'Fira Code', consolas, monospace"
})

term.open(document.getElementById("xterm"))
term.writePrompt = () => term.write("\n\r" + term.prompt)

term.readln = async () => {
	if (term.lnComplete) throw `"lnComplete" listener already exists.`
	term.writePrompt()
	term.ln = ""
	await new Promise(res => term.lnComplete = res)
	delete term.lnComplete
	return term.ln
}
term.onData(key => {
	if (! term.enableRead) return
	switch (key) {
	case "\u007F": // Backspace
		if (term._core.buffer.x > term.promptLength) {
            term.write("\b \b")
			term.ln = term.ln.slice(0, -1)
        }
		break
	case "\r": // Enter
		term.writeln("")
		term.lnComplete()
		break
	case "\u000c": // Ctrl-L
		term.clear()
		break
	default:
		if (key < "\u0020" || (key > "\u007B" && key < "\u00a0")) {
			console.log(key.charCodeAt())
			return
		}
		term.write(key)
		term.ln += key
		break
	}
})

term.listeners = {}
term.listen = (evt, fn) => {
	const ls = term.listeners[evt] ??= []
	ls.push(fn)
	return { dispose: () => ls.splice(ls.findIndex(f => f === fn), 1) }
}
term.listenOnce = (evt, fn) => {
	const { dispose } = term.listen(evt, (...arg) => {
		if (fn(...arg)) dispose()
	})
	return { dispose }
}
term.trigger = (evt, ...arg) => term.listeners[evt]?.forEach(f => f(...arg))

const sto = new Proxy(localStorage, {
	get: (_, k) => JSON.parse(localStorage.getItem(k)),
	set: (_, k, v) => localStorage.setItem(k, JSON.stringify(v)),
	deleteProperty: (_, k) => localStorage.removeItem(k)
})

chalk.level = 1
term.prompt = chalk.green("Ψ ")
term.promptLength = 2

sto.perms ??= {}
const xable = flag => (...names) => {
	const { perms } = sto
	names.forEach(n => perms[n] = flag)
	sto.perms = perms
}
const perm = {
	enable: xable(true),
	disable: xable(false),
	find: cmdn => sto.perms[cmdn]
}

const cmds = cmdF({ term, perm, chalk })
const levels = levelF({ term, perm, cmds, chalk })

term.startReading = async() => {
	term.enableRead = true
	while (term.enableRead) {
		const ln = await term.readln()
		const [ cmdn, ...arg ] = ln.split(" ")
		if (! perm.find(`cmds.${cmdn}`)) {
			term.writeln(`${cmdn}: command not found.`)
			term.trigger("command-not-found", cmdn)
		}
		else {
			await cmds[cmdn](...arg)
			term.trigger("command-run", cmdn, arg)
		}
	}
}
term.endReading = () => term.enableRead = false

sto.level ??= 0
term.currLevel = () => levels[sto.level]?.(term, cmds)
term.nextLevel = () => (levels[++ sto.level]?.(term, cmds), true)

term.echo = async (s, { t, c } = {}) => {
	s = (Array.isArray(s) ? s : [ s ]).map(ln => `* ${ln}\n\r`).join("")
	for (let i = 0; i < s.length; i ++) {
		let ch = s[i]
		if (ch === "\u001B")
			while (s[i] !== "m") ch += s[++ i]
		term.write(chalk[c ?? "yellow"](ch))
		await sleep(t ?? 120)
	}
}

term.currLevel()

Object.assign(window, { term, perm, chalk, levels, cmds, sto })
