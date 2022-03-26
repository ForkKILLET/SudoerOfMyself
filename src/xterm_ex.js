sto.env.PROMPT ??= chalk.green("'\\$ '")
term.writePrompt = () => term.write(shell(sto.env.PROMPT)[0])

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

term.readln = async () => {
	term.writePrompt()
	if (sto.history.at(-1) !== term.ln && term.ln?.trim()) {
		// TODO move to <~/.config/history.conf>
		if (term.ln.length < 64) {
			sto.history.push(term.ln)
		}
		if (sto.history.length == 128) {
			sto.history.shift()
		}
	}
	term.historyIndex = 0
	term.cursorIndex = 0
	term.ln = ""
	await new Promise(res => term.lnComplete = res)
	delete term.lnComplete
	return term.ln
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
		case "\u0003": // Ctrl-C
			const abort = abortQ.pop()
			if (abort) {
				abort()
				term.write(chalk.whiteBright("^C"))
			}
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
					if (term.historyIndex < sto.history.length) {
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
