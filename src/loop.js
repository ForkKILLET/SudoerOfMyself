const escs = {
	"n": "\n",
	"r": "\r",
	"t": "\t",
	"a": "\u0007"
}

const white = " \t"
const d8 = "01234567"
const d10 = d8 + "89"
const d16 = d10 + "abcdefABCDEF"

const preproc = ln => {
	const f = {
		esc: false,
		cesc: false,
		sq: false,
		dq: false,
		var: false
	}
	const e = () => {
		now += String.fromCharCode(parseInt(enow, f.cesc === "o" ? 8 : 16))
		f.cesc = false
		enow = ""
	}

	const tokens = []
	let now = "", enow = ""
	for (const ch of ln + "\0") {
		if (f.esc) {
			if (ch === "x" || ch === "u" || ch === "0") f.cesc = ch === "0" ? "o" : ch
			else now += escs[ch] ?? ch
			f.esc = false
			continue
		}
		if (white.includes(ch) && ! f.sq && ! f.dq) {
			tokens.push(now)
			now = ""
			continue
		}
		if (f.cesc) {
			if (enow.length < (f.cesc === "u" ? 4 : 2)) {
				if ((f.cesc === "o" ? d8 : d16).includes(ch)) {
					enow += ch
					continue
				}
				else if (f.cesc === "o") e()
				else {
					now += f.cesc + enow
					f.cesc = false
					continue
				}
			}
			else e()
		}
		if (ch === "\\") f.esc = true
		else if (ch === "'" && ! f.dq) f.sq = !! f.sq
		else if (ch === `"` && ! f.sq) f.dq = !! f.dq
		else if (ch === "~" && ! f.dq && ! f.sq) now += "/home"
		else now += ch
	}
	if (now) tokens.push(now.slice(0, -1))

	return tokens
}

term.isReading = false
term.startReading = async () => {
	term.enableRead = true
	if (term.isReading) return

	term.isReading = true
	while (term.enableRead) {
		const ln = await term.readln()
		if (! ln.trim()) continue

		const [ cmdn, ...arg ] = preproc(ln)

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
			try {
				await cmds[cmdn]?.(...arg)
			}
			catch (err) {
				console.log(err)
				term.writeln("core dumped: " + chalk.red(err.message ?? err))
			}
			term.enableRead = true
			await term.trigger("command-run", cmdn, arg)
		}
	}
	term.isReading = false
}
term.endReading = () => {
	term.enableRead = false
}
