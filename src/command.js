import pack from "../package.json"
import sleep from "simple-async-sleep"
import stringWidth from "string-width"
import minimist from "minimist"
import humanPages from "./human_pages.js"
import fsF from "./file_system.js"

export default ({ term, perm, sto, chalk }) => {
	perm.enable("cmds.version", "cmds.logo", "cmds.sl", "human.version", "human.logo", "human.sl")

	const cmds = {
		version: (...argv) => {
			const opt = minimist(argv, {
				stopEarly: true,
				boolean: [ "dependence" ],
				alias: {
					d: "dependence"
				}
			})
			term.writeln(
				`v${ pack.version }, by ${ chalk.yellow(pack.author.split(" ")[0]) }, on ${ chalk.cyan(__build) },\r\n` +
				`at ${ chalk.green(pack.repository.url) }`
				+ (opt.dependence ? `, with:\r\n${
					[ "dependencies", "devDependencies" ].map(g =>
						chalk.underline(g) + "\r\n" + Object.entries(pack[g]).map(([ n, v ]) => n + " " + chalk.cyan(v)).join("\r\n")
					).join("\r\n")
				}` : "")
			)
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
				boolean: [ "save", "export", "export-clip", "import-clip", "locomotive" ],
				string: [ "import" ],
				alias: {
					s: "save",
					a: "auto-save",
					e: "export",
					E: "export-clip",
					i: "import",
					I: "import-clip",
					l: "locomotive"
				}
			})

			const op = opt.s + ("a" in opt) + opt.e + opt.E + opt.I + ("i" in opt) + opt.l
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
			if (opt.e) term.writeln(chalk.blueBright(JSON.stringify(sto)))
			if (opt.E) {
				try {
					await navigator.clipboard.writeText(JSON.stringify(sto))
				}
				catch {
					return term.writeln("sl: failed to access clipboard")
				}
				term.writeln("sl: exported to clipboard")
			}
			if ("i" in opt || opt.I) {
				let s = opt.i
				if (opt.I) {
					try {
						s = await navigator.clipboard.readText()
					}
					catch {
						return term.writeln("sl: failed to access clipboard")
					}
				}
				try {
					console.log(s)
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
                    (@@) (  ) (@)  ( )  @@    ()    @     O     @     O      @
               (   )
           (@@@@)
        (    )

      (@@@)
     ++      +------ ____                 ____________________ ____________________
     ||      |+-+ |  |   \@@@@@@@@@@@     |  ___ ___ ___ ___ | |  ___ ___ ___ ___ |
   /---------|| | |  |    \@@@@@@@@@@@@@_ |  |_| |_| |_| |_| | |  |_| |_| |_| |_| |
  + ========  +-+ |  |                  | |__________________| |__________________|
 _|--O========O~\-+  |__________________| |__________________| |__________________|
//// \_/      \_/       (O)       (O)        (O)        (O)       (O)        (O)

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
			const unWidthMax = usrsE.reduce((a, c) => Math.max(a, unWidths[c[1]] = stringWidth(c[0])), 0)

			const opt = minimist(argv, {
				boolean: [ "color", "classify", "long" ],
				alias: {
					c: "color",
					F: "classify",
					l: "long"
				}
			})

			if (! opt._.length) opt._.push("")
			for (const path of opt._) {
				if (opt._.length > 1) term.writeln(path + ":")

				const [, f] = fs.relpath(path, true)
				if (! f) return
				if (f.ty === "dir") {
					const out = fs.children(f).map(({ ty, n, perm, owner }) => {
						if (opt.c) n = chalk[fs.ls.colors[ty]](n)
						if (opt.F) n += fs.ls.indicators[ty]
						if (opt.l) {
							let p = [ ..."rwx".repeat(3) ], o = parseInt(perm, 8)
							for (let b = 0; b <= 8; b ++) if (! (o & 1 << (8 - b))) p[b] = "-"
							let u = usrsE.find(u => u[1] === owner)
							n = fs.ls.shortTypes[ty] + p.join("") + " " + u[0] + " ".repeat(unWidthMax - unWidths[u[1]] + 1) + n
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
			const [d] = fs.relpath(path, true, "dir")
			if (d) sto.cwd = d
		},

		cat: async path => {
			const [d, f] = fs.relpath(path, true, "nor", "exe")
			if (! f) return
			console.log(f)
			term.writeln(f.v)
			await term.trigger("cat", d, f)
		},

		bag: () => {}
	}

	const fs = fsF({ term, perm, sto, cmds, chalk })

	return { fs, cmds }
}
