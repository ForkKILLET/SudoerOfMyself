perm.enable(
	"cmds.version", "cmds.logo", "cmds.sl", "cmds.blog", "cmds.fsts.ext0", "cmds.bag", "cmds.opt",
	"human.version", "human.logo", "human.sl", "human.blog", "human.fsts.ext0", "human.bag"
)

term.echo = async (s, { t, c } = {}) => {
	s = (Array.isArray(s) ? s : [ s ])
		.map(ln => chalk[c ?? "yellow"](`* ${ln}\r\n`)).join("")
	let lastCSI = ""
	for (let i = 0; i < s.length; i ++) {
		let ch = s[i]
		if (ch === "\u001B") {
			while (s[i] !== "m") ch += s[++ i]
			lastCSI = ch
			ch = ""
		}
		term.write(lastCSI + ch)
		await sleep(term.fastForward ? 5 : t ?? 120)
	}
	term.fastForward = false
	await term.statusBar.remove("ff")
}

globalThis.cmds = {
	version: async (...argv) => {
		const opt = minimist(argv, {
			stopearly: true,
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
			await axios.get(api).then(({ data: commits }) => {
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
			}).catch(err => {
				term.writeln(`version: failed to access GitHub API: ${ term.formatErr(err) }`)
			})
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
			if (typeof opt.a === "number" && opt.a < 2) return term.writeln("sl: auto-save interval is too short")
			term.autoSaveTimer = setInterval(async () => {
				sto.__save()
				term.statusBar.add("auto save", "???? ")
				await sleep(700)
				term.statusBar.remove("auto save")
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
			boolean: [ "quick", "angrily", "tremulously", "seriously", "sadly" ],
			alias: {
				q: "quick",
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
		if (opt.q) term.writeln(s)
		else await term.echo([ s ], { t: opt.angrily ? 60: undefined })
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
			
			let files = f.ty === "dir" ? Object.values(f.children) : [ f ]
			if (! opt.a) files = files.filter(({ n }) => n[0] !== ".")

			const out = files.map(({ n, ty, perm, owner }) => {
				n = fs.ls.raw({ n, ty }, opt.c, opt.F)
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

			if (opt._.length > 1) term.writeln("")
		}
	},

	cd: path => {
		const [d] = fs.relpath(path, { err: true, ty: "dir", perm: "x" })
		if (! d) return
		sto.cwd = d
		fs.updatePWD()
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
		if (opt.A) s = s.replace(/[\x00-\x1F]/g, ch => chalk.magentaBright(`<${ ("0" + ch.charCodeAt().toString(16).toUpperCase()).slice(-2) }>`))
		term.writeln(s)
		await term.trigger("cat", d, f)
	},

	"fsts.ext0": (...argv) => {
		const opt = minimist(argv, {
			stopearly: true,
			boolean: [ "result-only", "result-size-only", "buff", "expose", "diff" ],
			alias: {
				r: "result-only",
				R: "result-size-only",
				b: "buff",
				e: "expose",
				d: "diff",
				i: "with-inode"
			}
		})
		const test = opt._.join(" ")

		const xb1b = b => Array.from({ length: b }, (_, k) =>
			Array.from({ length: 31 },
				(_, i) => ("000000" + i).slice(-7)
			).join("|") + "|" + ("000" + k + "blk").slice(-7)
		).join("#") + "#$"

		const preset = {
			"1b1b": xb1b(1),
			"4b1b": xb1b(4),
			"5b1b": xb1b(5),
			"6b1b": xb1b(6),
			"cjk": "?????????????????????????????????????????????? ",
			"ansi": `This is a ${ chalk.green("green") } word.`
		}

		const l = {
			succ: s => term.writeln("=> " + chalk.greenBright("test succeeded. " + s)),
			fail: s => term.writeln("=> " + chalk.red("test failed. " + s)),
			info: s => opt.r || opt.R || term.writeln("=> " + s),
			mark: s => term.writeln("=> " + chalk.cyanBright(s))
		}
		
		let str1
		if (test[0] === "@") {
			str1 = preset[test.slice(1)]
			if (str1) l.mark(
				`test with preset ${ chalk.underline(test) }: <<<\r\n${ chalk.cyan(str1) }\r\n>>>`
			)
			else return l.fail("no such preset")
		}
		else str1 = test || "hello, ext0!"

		try {
			const efs = ext0.fs

			if (opt.e) {
				l.mark("test fs & fh will be exported to `globalThis.efs_test`, `globalThis.efs_fh{1,2}`")
				globalThis.efs_test = efs
			}

			let inode_id, block_id, inode
			console.log(opt)
			if ("i" in opt) {
				inode_id = opt.i
				if (! efs.imap_get(inode_id)) return l.fail("no such inode")
				inode = efs.inode_get()
				block_id = inode.ptr1 - 1024;
			}
			else {
				({ inode_id, block_id, inode } = efs.file_create())
				l.info(`file_create ok, inode_id: ${inode_id}, block_id: ${block_id}, inode: ${ chalk.cyan(inode.to_string(true)) }`)
			}

			const fh1 = efs.file_open(inode_id, ext0.FileHandleMode.Wn)
			if (opt.e) globalThis.efs_fh1 = fh1
			l.info(`file_open 1 ok, fh: ${ chalk.cyan(fh1.to_string(true)) }`)

			if (inode?.size) {
				l.info(`file_write jumpped, file with size: ${ inode.size }`)
			}
			else {
				efs.file_write(fh1, new TextEncoder("utf-8").encode(str1))
				l.info("file_write ok")
			}

			const fh2 = efs.file_open(inode_id, ext0.FileHandleMode.R)
			if (opt.e) globalThis.efs_fh2 = fh2
			l.info(`file_open 2 ok, fh: ${ chalk.cyan(fh1.to_string(true)) }`)

			const buff = efs.file_read(fh2)
			const str2 = new TextDecoder("utf-8").decode(buff)
			const cmp = str1 === str2

			let cmp_res = opt.d
				? "diff:\r\n" + Diff.diffChars(str1, str2).reduce((a, { added, removed, value }) => a + (
					chalk[ added ? "green" : removed ? "red" : "white" ](value)
				), "")
				: str2
			if (! opt.d) {
				if (test.match(/^@\d+b1b$/))
					cmp_res = cmp_res.replace(/[|#$]/g, ch => chalk.white(ch))
				cmp_res = chalk.cyan(cmp_res)
			}

			l[cmp ? "succ" : "fail"](
				`file_read ok, read ${cmp ? "==" : "!="} write, ` + 
				(opt.R ? `size: ${buff.length}byte(s)` : `str: <<<\r\n${ cmp_res }\r\n>>>`) +
				(opt.b ? `, buff: [${ chalk.cyan(buff) }]` : "")
			)

			if (! opt.e) {
				efs.file_close(fh1);
				efs.file_close(fh2);
			}
			l.info("file_close 1,2 ok")
		}
		catch (err) {
			console.log(err)
			l.fail(`err: ${ term.formatErr(err) }`)
		}
	},

	bag: async (cmd, ...argv) => {
		const source = "https://cdn.jsdelivr.net/gh/ForkKILLET/SOMOS@main/baglist.json"
		const purge_source = source.replace("cdn", "purge")

		const version = 1
		const cmds = {
			sync: async (...argv) => {
				const opt = minimist(argv, {
					boolean: [ "purge" ],
					alias: { p: "purge" }
				})

				if (opt.purge) {
					term.writeln(`Purging...`)
					await axios.get(purge_source).then(({ data: { id, status } }) => {
						term.writeln(status + chalk.cyan("#" + id))
					})
				}

				await axios.get(source)
					.then(({ data }) => {
						if (data.v !== version)
							return term.writeln(`Not supported bag list version "${data.v}".`)
						sto.bag.list = data
						term.writeln(`Sync'ed ${ Object.keys(data.list).length } bag(s).`)
					}).catch(err => {
						term.writeln(`Failed to sync with source: ${ term.formatErr(err) }`)
					})
			},

			add: async (...argv) => {
				const opt = minimist(argv, {})
				const [ name ] = opt._

				const info = sto.bag?.list?.list[name]
				if (! info) return term.writeln(`Unknown bag "${ chalk.green(name) }".`)
				const perms = info.perm
				term.writeln(`Bag "${ chalk.green(name) }" requires following perms: ${
					perms ? perms.map(p => chalk.yellow(p)).join(", ") : "none"
				}.`)
				term.write("Run? ")
				if (! await term.yesno(false)) return

				const srcs = info.src
				term.writeln(
					`Bag "${ chalk.green(name) }" has following sources:\r\n` +
					srcs.map((s, id) => chalk.magentaBright(id) + ". " + (
						s.ty === "gh" ? `GitHub: ${ chalk.green(s.repo) }` :
						s.ty === "url" ? `URL: ${ chalk.green(s.url) }` :
						"Unknown"
					)).join("\r\n")
				)
				term.write("Try which source? ")
				const src = srcs[+ await term.readln(true)]
				if (! src) return term.writeln("Nothing to do today UwU")

				let url
				switch (src.ty) {
					case "gh": {
						term.writeln([ "jsdelivr", "github.com raw", "??????.?????? raw" ]
							.map((g, id) => chalk.magentaBright(id) + ". " + g)
							.join("\r\n")
						)
						term.write("Use which site? ")
						url = [
							`https://cdn.jsdelivr.net/gh/${src.repo}@${src.branch ?? "main"}/${src.entry}`,
							`https://raw.github.com/${src.repo}/${src.branch ?? "main"}/${src.entry}`,
							`https://raw.??????.??????/${src.repo}/${src.branch ?? "main"}/${src.entry}`
						][+ await term.readln(true)]
						if (! url) return term.writeln("Nothing to do today UwU")
						break
					}
					case "url":
						url = src.url
						break
					default:
						return `Unknown source type ${src.ty}.`
				}

				term.writeln(`Getting source code from "${ chalk.green(url) }"...`)
				await axios.get(url).then(async ({ data }) => {
					const d_apps = fs.d([ "home", "Apps" ])
					let f_app = d_apps.children[name]
					if (f_app) {
						term.writeln("Reinstalling...")
					}
					else {
						const fileName = name.bin ?? name
						f_app = d_apps.children[fileName] = {
							n: fileName,
							ty: "exe",
							perm: 755,
							owner: sto.usrs.myself,
							bag: name,
							cont: data
						}
					}
					info.date = new Date().toJSON()
					term.writeln(`Added "${ chalk.green(name) }".`)
				}).catch(err => term.writeln(`Failed to get source code: ${ term.formatErr(err) }`))
			},

			remove: (...argv) => {
				if (! sto.bag.list) return term.writeln("Missing bag list.")

				const opt = minimist(argv, {})
				const [ name ] = opt._

				const info = sto.bag.list.list[name]
				if (! info) return term.writeln(`Unknown bag "${ chalk.green(name) }".`)
				delete fs.d([ "home", "Apps" ]).children[info.bin ?? name]
				term.writeln(`Removed "${ chalk.green(name) }".`)
			},

			list: () => {
				if (! sto.bag.list) return term.writeln("Missing bag list.")

				term.writeln(`Listing ${ Object.keys(sto.bag.list.list).length } bag(s):`)
				term.writeln(
					Object.entries(sto.bag.list.list).map(([ name, { date } ]) => (
						chalk.green(name) + " " +
						(date ? `(installed on ${ chalk.cyan(date) })` : "")
					)).join("\r\n")
				)
			}
		}
		if (! cmds[cmd]) {
			return term.writeln(`Unknown command "${cmd}".`)
		}
		await cmds[cmd](...argv)
	},

	opt: (...argl) => {
		if (argl.length === 0) {
			term.writeln(Object.entries(term.options).map(([ k, v ]) => `${k}: ${ chalk.cyan(JSON.stringify(v)) }`).join("\r\n"))
		}
		else if (argl.length === 1) {
			term.writeln(term.options[argl[0]])
		}
		else {
			sto.env[`XTERM_${ argl[0] }`] = term.options[argl[0]] = argl.slice(1).join(" ")
		}
	}
}
