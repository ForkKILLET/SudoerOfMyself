import { Terminal } from "xterm"
import chalk from "chalk"
import sleep from "simple-async-sleep"
import { levels } from "./plot.js"

const term = new Terminal({
	rows: 30,
	cols: 97,
	cursorBlink: true,
	fontFamily: "'Fira Code', consolas, monospace"
})

term.open(document.getElementById("xterm"))
term.writePrompt = () => term.write("\r\n" + term.prompt)

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
	const { dispose } = term.listen(evt, (...arg) => { fn(...arg); dispose() })
}
term.trigger = (evt, ...arg) => term.listeners[evt]?.forEach(f => f(...arg))

const sto = new Proxy(localStorage, {
	get: (_, k) => JSON.parse(localStorage.getItem(k)),
	set: (_, k, v) => localStorage.setItem(k, JSON.stringify(v)),
	deleteProperty: (_, k) => localStorage.removeItem(k)
})

const commands = {
	help: () => term.writeln("You are HELPLESS. No one will help you. jaja.")
}

chalk.level = 1
term.prompt = chalk.green("Ψ ")
term.promptLength = 2

term.startReading = async() => {
	term.enableRead = true
	while (term.enableRead) {
		const ln = await term.readln()
		const [ cmdn, ...arg ] = ln.split(" ")
		const cmd = commands[cmdn]
		if (! cmd) {
			term.writeln(`${cmdn}: command not found.`)
			term.trigger("command-not-found", cmdn)
		}
		else {
			cmd(...arg)
			term.trigger("command-run", cmdn, arg)
		}
	}
}
term.endReading = () => term.enableRead = false

sto.level ??= -1
term.currLevel = () => levels[sto.level](term)
term.nextLevel = () => levels[++ sto.level]?.(term)

term.echo = async (s, t = 120) => {
	for (const c of [ ...`* ${s}\r\n` ]) {
		term.write(chalk.yellow(c))
		await sleep(t)
	}
}

term.currLevel()

Object.assign(window, { term, chalk, levels, sto })
