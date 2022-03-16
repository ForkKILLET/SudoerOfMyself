perm.enable(
	"cmds.version", "cmds.logo", "cmds.sl",
	"human.version", "human.logo", "human.sl"
)

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

window.cmds = {
	version: async (...argv) => {
		const opt = minimist(argv, {
			stopEarly: true,
			boolean: [ "dependence", "log" ],
			alias: {
				d: "dependence",
				l: "log"
			}
		})
		term.writeln(
			`v${ pack.version }, by ${ chalk.yellow(pack.author.split(" ")[0]) }, on ${ chalk.cyan(__build) },\r\n` +
			`at ${ chalk.green(pack.repository.url) }`
			+ (opt.d ? `, with:\r\n${
				[ "dependencies", "devDependencies" ].map(g =>
					chalk.underline(g) + "\r\n" + Object.entries(pack[g]).map(([ n, v ]) => n + " " + chalk.cyan(v)).join("\r\n")
				).join("\r\n")
			}` : "")
		)
		if (opt.l) {
			const api = `https://api.github.com/repos/${ pack.repository.url.match(/(\w+\/\w+)(.git)?$/)[1] }/commits`
			console.log("Fetch: %s", api)
			try {
				const commits = await (await fetch(api)).json()
				term.writeln("git log from GitHub API:\r\n" + commits.map(({
					sha,
					commit: { author: { name, email, date }, message }
				}, i) =>
					`* ` + chalk.yellow(`commit ${sha}\r\n`) + [
						`Author: ${name} <${email}>`,
						`Date:   ${date}`,
						"",
						...message.split(/\r\n|\r|\n/).map(ln => "    " + ln),
						""
					].map(ln =>
						(i === commits.length - 1 ? "  " : chalk.red("| ")) + ln
					).join("\r\n")
				).join("\r\n"))
			}
			catch (err) {
				console.log(err)
				term.writeln("version: failed to access GitHub API.")
			}
		}
	},

	logo: async () => {
		const $logo = document.getElementById("logo")
		$logo.style.display = "block"
		await sleep(2000)
		$logo.style.display = ""
	},

	sl: async (...argv) => {
		const opt = minimist(argv, {
			stopEarly: true,
			boolean: [ "save", "export", "export-clip", "import", "import-clip", "locomotive", "base64" ],
			alias: {
				s: "save",
				a: "auto-save",
				e: "export",
				E: "export-clip",
				i: "import",
				I: "import-clip",
				b: "base64",
				l: "locomotive"
			}
		})

		const op = opt.s + ("a" in opt) + opt.e + opt.E + opt.I + opt.i + opt.l
		if (op === 0) return term.writeln("sl: no operation specified")
		if (op > 1) return term.writeln("sl: only one operation may be used at a time")

		if (opt.s) sto.__save()
		if ("a" in opt) {
			if (term.autoSaveTimer) {
				clearInterval(term.autoSaveTimer)
				term.writeln("sl: old auto-saver killed")
			}
			term.autoSaveTimer = setInterval(() => {
				sto.__save()
				console.log("Auto saved") // TODO show in terminal
			}, (opt.a === true ? 10 : opt.a) * 1000)
		}
		if (opt.e || opt.E) {
			let s = JSON.stringify(sto)
			if (opt.b) s = Base64.encode(s)
			if (opt.e) term.writeln(chalk.blueBright(s))
			else {
				try {
					await navigator.clipboard.writeText(s)
				}
				catch {
					return term.writeln("sl: failed to access clipboard")
				}
				term.writeln("sl: exported to clipboard")
			}
		}
		if (opt.i || opt.I) {
			let s = opt._.join(" ")
			if (opt.I) {
				try {
					s = await navigator.clipboard.readText()
				}
				catch {
					return term.writeln("sl: failed to access clipboard")
				}
			}
			if (opt.b) s = Base64.decode(s)
			try {
				const stoN = JSON.parse(s)
				for (const k in sto) {
					if (! k.startsWith("__")) delete sto[k]
				}
				for (const k in stoN) {
					if (! k.startsWith("__")) sto[k] = stoN[k]
				}
				if (opt.I) term.writeln("sl: imported from clipboard")
				history.go()
			}
			catch (err) {
				term.writeln(`sl: ${ err.message.slice(12) }`)
			}
		}
		if (opt.l) {
			term.clear()
			term.write(String.raw`
			                  (@@) (  ) (@)  ( )  @@    ()    @     O     @     O
             (   )
         (@@@@)      +-------------------<<
      (    )         | ${ chalk.green("Sudoer Of Myself") } <<
                     +-------------------<<
    (@@@)            |
     ++      +------ |___                 ____________________ ____________________
     ||      |+-+ |  |   \@@@@@@@@@@@     |  ___ ___ ___ ___ | |  ___ ___ ___ ___ |
   /---------|| | |  |    \@@@@@@@@@@@@@_ |  |_| |_| |_| |_| | |  |_| |_| |_| |_| |
  + ========  +-+ |  |                  | |__________________| |__________________|
 _|--/~\------/~\-+  |__________________| |__________________| |__________________|
//// \O========O/       (O)       (O)        (O)        (O)       (O)        (O)

// There's no money for animation. Sponsor us XD
`.replaceAll("\n", "\r\n")
			)
		}
	},

	help: () => term.writeln("You are HELPLESS. No one will help you. jaja."),

	human: async (page = "") => {
		if (perm.find(`human.${page}`))
			await term.echo(humanPages[page].map(
				ln => ln.replace(/`(.+?)`/g, s => chalk.underline(s.slice(1, -1)))
			), { t: 0, c: "cyan" })
		else await term.writeln(`human: ${page}: page not found.`)
	},

	echo: async (...argv) => {
		const opt = minimist(argv, {
			stopEarly: true,
			boolean: [ "angrily", "tremulously", "seriously", "sadly" ],
			alias: {
				a: "angrily",
				t: "tremulously",
				S: "seriously",
				s: "sadly"
			}
		})
		let s_ = opt._.join(" "), s = s_
		if (opt.a) s = chalk.bold(s)
		if (opt.t) s = chalk.italic(s)
		if (opt.S) s = chalk.underline(s)
		if (opt.s) s = chalk.dim(s)
		await term.echo([ s ], { t: opt.angrily ? 60: undefined })
		await term.trigger("echo", s_, opt)
	},

	pwd: () => {
		term.writeln("/" + sto.cwd.join("/"))
	},

	ls: (...argv) => {
		const usrsE = Object.entries(sto.usrs)
		const unWidths = []
		unWidths[-1] = 1
		const unWidthMax = usrsE.reduce((a, c) => Math.max(a, unWidths[c[1]] = stringWidth(c[0])), 0)

		const opt = minimist(argv, {
			boolean: [ "color", "classify", "long", "all" ],
			alias: {
				a: "all",
				c: "color",
				F: "classify",
				l: "long"
			}
		})

		if (! opt._.length) opt._.push("")
		for (const path of opt._) {
			if (opt._.length > 1) term.writeln(path + ":")

			const [, f] = fs.relpath(path, { err: true, perm: "r" })
			if (! f) return
			if (f.ty === "dir") {
				let childrenR = Object.values(f.children)
				if (! opt.a) childrenR = childrenR.filter(({ n }) => n[0] !== ".")
				const out = childrenR.map(({ ty, n, perm, owner }) => {
					if (opt.c) n = chalk[fs.ls.colors[ty]]?.(n) ?? n
					if (opt.F) n += fs.ls.indicators[ty] ?? "?"
					if (opt.l) {
						const p = [ ..."rwx".repeat(3) ], o = parseInt(perm, 8)
						if (typeof perm === "number") {
							for (let b = 0; b <= 8; b ++) if (! (o & 1 << (8 - b))) p[b] = "-"
						}
						else p.forEach((_, i) => p[i] = "?")
						const [ un, uid ] = usrsE.find(([, un]) => un === owner) ?? [ "?", -1 ]
						n = (fs.ls.shortTypes[ty] ?? "?") + p.join("") + " " + un + " ".repeat(unWidthMax - unWidths[uid] + 1) + n
					}
					return n
				}).join(opt.l ? "\r\n" : "  ")
				term.write(out + (out ? "\r\n" : ""))
			}
			else term.writeln(f.n)

			if (opt._.length > 1) term.writeln("")
		}
	},

	cd: path => {
		const [d] = fs.relpath(path, { err: true, ty: "dir", perm: "x" })
		if (d) sto.cwd = d
	},

	cat: async (...argv) => {
		const opt = minimist(argv, {
			boolean: [ "show-all" ],
			alias: {
				A: "show-all"
			}
		})

		const path = opt._.join(" ")
		const [d, f] = fs.relpath(path, { err: true, ty: [ "nor", "exe" ], perm: "r" })
		if (! f) return

		let s = f.cont ?? ""
		if (opt.A) s = s.replace(/[\x00-\x1F]/g, ch => chalk.blueBright(`<${ ("0" + ch.charCodeAt().toString(16).toUpperCase()).slice(-2) }>`))
		term.writeln(s)
		await term.trigger("cat", d, f)
	},

	bag: () => {}
}
