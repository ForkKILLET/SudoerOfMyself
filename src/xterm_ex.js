for (const k in sto.env) {
	if (k.startsWith("XTERM_")) term.setOption(k.slice(6), sto.env[k])
}

term.writeA = s => new Promise(res => term.write(s ?? "", res))
term.writlnA = s => new Promise(res => term.writeln(s ?? "", res))

sto.env.PROMPT ??= chalk.green("'\\$ '")
term.writePrompt = async () => await term.writeA(shell(sto.env.PROMPT)[0][0])

term.delete = (c, go, back) =>
	term.write((go ? "\b".repeat(c) : "") + (back ? " ".repeat(c) + "\b".repeat(c) : ""))

term.formatErr = err => chalk.yellow(err.message ?? err)

sto.history ??= []
term.historyLn = () => {
	term.write("\r")
	term.writePrompt()
	term.delete(stringWidth(term.ln), false, true)
	term.write(
		term.ln = (term.historyIndex ? sto.history.at(- term.historyIndex) : "")
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

// TODO It's too dirty but I can't understand xterm's `moveCursor`
term.getCursor = () => [ term._core.buffer.x, term._core.buffer.y ]
term.setCursor = ([ x, y ]) => {
	term._core._inputHandler._setCursor(x, y)
}

term.readln = async once => {
	term.historyIndex = 0
	term.cursorIndex = 0
	term.ln = ""
	if (once) term.enableRead = true
	await new Promise(res => term.lnComplete = res)
	if (once) term.enableRead = false
	delete term.lnComplete
	return term.ln
}

term.yesno = async dft => {
	term.write(chalk.magentaBright(dft ? "(Y/n) " : "(y/N) "))
	const ln = (await term.readln(true)).toLowerCase()
	if (ln === "y" || ln === "yes") return true
	if (ln === "n" || ln === "no") return false
	if (ln === "") return dft
	return null
}

term.onData(async key => {
	switch (key[0]) {
		case "\u007F": // Backspace
			if (! term.enableRead) return
			if (term.completion) {
				if (term.completion.i >= 0) {
					await term.clearCompletions()
					return
				}
				else {
					term.oldCompletion = term.completion
					delete term.completion
				}
			}
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
			if (term.completion) await term.clearCompletions()

			term.writeln("")
			term.lnComplete()
			break
		case "\t": // Tab
			if (! term.enableRead || term.isCommand) return
			await term.tabComplete()
			break
		case "\u000C": // Ctrl-L
			if (! term.enableRead) return
			term.clear()
			await term.statusBar.draw();
			if (term.completion) {
				term.completion.cursor = term.getCursor()
			}
			break
		case "\u0001": // Ctrl-A
			if (term.completion?.i >= 0) {
				return
			}
			term.write("\u001B[D".repeat(stringWidth(term.lnPre)))
			term.cursorIndex = 0
			term.clearCompletions()
			break
		case "\u0005": // Ctrl-E
			if (term.completion?.i >= 0) {
				return
			}
			term.write("\u001B[C".repeat(stringWidth(term.lnPost)))
			term.cursorIndex = term.ln.length
			break
		case "\u0003": { // Ctrl-C
			if (term.completion?.i >= 0) {
				await term.clearCompletions()
				return
			}
			if (! term.isCommand) return
			const abort = abortQ.pop()
			if (abort) {
				abort()
				term.write(chalk.magentaBright("^C"))
			}
			term.clearCompletions()
			break
		}
		case "\u001A": // Ctrl-Z
			if (perm.find("ff")) {
				term.fastForward = true
				await term.statusBar.add("ff", "⏰ ")
			}
			break
		case "\u001B": // CSI
			switch (key.slice(1)) {
				case "[A":
					if (! term.enableRead || ! term.isLoop) return
					if (term.historyIndex < sto.history.length) {
						term.historyIndex ++
						term.historyLn()
					}
					break
				case "[B":
					if (! term.enableRead || ! term.isLoop) return
					if (term.historyIndex > 0) {
						term.historyIndex --
						term.historyLn()
					}
					break
				case "[D":
					if (! term.enableRead) return
					if (term.completion?.i >= 0) {
						return
					}
					if (term.cursorIndex > 0) {
						term.write(key.repeat(stringWidth(term.lnCur)))
						term.cursorIndex --
					}
					break
				case "[C":
					if (! term.enableRead) return
					if (term.completion?.i >= 0) {
						return
					}
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
					return
			}
			term.clearCompletions()
			break
		default:
			if (key < "\u0020" || (key > "\u007E" && key < "\u00A0")) {
				console.log("Key code: %d", key.charCodeAt())
				return
			}
			if (! term.enableRead) return

			if (term.completion) {
				term.oldCompletion = term.completion
				delete term.completion
			}
			await term.writeA(key + term.lnPost)
			await term.writeA("\b".repeat(stringWidth(term.lnPost)))
			term.ln = term.lnPre + key + term.lnPost
			term.cursorIndex += key.length
	}
})

term.onBell(async () => {
	await term.statusBar.add("bell", term.getOption("bellStyle") === "sound" ? "🔔 " : "🔕 ")
	await sleep(700)
	await term.statusBar.remove("bell")
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
