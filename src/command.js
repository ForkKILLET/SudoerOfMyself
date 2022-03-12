import pack from "../package.json"
import sleep from "simple-async-sleep"
import minimist from "minimist"

const humanPages = {
	"": [
		"您需要什么手册页？",
		"例如，尝试使用 `human human`。"
	],
	"human": [
		"具有人工智能的、系统参考手册的接口。"
	],
	"echo": [
		"显示一行思想。",
		"`echo --angrily | -a`      生气地想",
		"`echo --tremulously | -t`  发抖地想",
		"`echo --seriously | -S`    严肃地想",
		"`echo --sadly | -s`        伤心地想"
	],
	"version": [
		"显示 SudoerOfMyself 的版本。",
		"`version --dependence | -d` 显示依赖"
	],
	"logo": [
		"显示 SudoerOfMyself 的图标。"
	],
	"s/l": [
		"Save/Load",
		"`s/l --save | -s`                  手动存档（会在关闭标签页时自动存档）",
		"`s/l --auto-save | -a [ second ]`  每 second 秒自动存档一次，默认为 10",
		"`s/l --export | -e`                导出存档为任人摆布的 JSON",
		"`s/l --export-clip | -E`           导出存档到剪贴板",
		"`s/l --import | -i < JSON >`       从 JSON 导入存档",
		"`s/l --import-clip | -I`           从剪贴板导入存档（部分浏览器可能不支持）"
	]
}

export default ({ term, perm, chalk }) => {
	perm.enable("cmds.version", "cmds.logo", "cmds.s/l", "human.version", "human.logo", "human.s/l")

	return {
		version: (...argv) => {
			const opt = minimist(argv, {
				stopEarly: true,
				boolean: [ "dependence" ],
				alias: {
					d: "dependence"
				}
			})
			term.writeln(
				`v${ pack.version }, by ${ chalk.yellow(pack.author.split(" ")[0]) }, on ${ chalk.cyan(__build) },\n\r` +
				`at ${ chalk.green(pack.repository.url) }`
				+ (opt.dependence ? `, with:\n\r${
					[ "dependencies", "devDependencies" ].map(g =>
						chalk.underline(g) + "\n\r" + Object.entries(pack[g]).map(([ n, v ]) => n + " " + chalk.cyan(v)).join("\n\r")
					).join("\n\r")
				}` : "")
			)
		},

		logo: async () => {
			const $logo = document.getElementById("logo")
			$logo.style.display = "block"
			await sleep(2000)
			$logo.style.display = ""
		},

		"s/l": async (...argv) => {
			const opt = minimist(argv, {
				stopEarly: true,
				boolean: [ "save", "export", "export-clip", "import-clip" ],
				string: [ "import" ],
				alias: {
					s: "save",
					a: "auto-save",
					e: "export",
					E: "export-clip",
					i: "import",
					I: "import-clip",
				}
			})

			const op = opt.s + ("a" in opt) + opt.e + opt.E + opt.I + ("i" in opt)
			if (op === 0) return term.writeln("s/l: no operation specified")
			if (op > 1) return term.writeln("s/l: only one operation may be used at a time")

			if (opt.s) sto.__save()
			if ("a" in opt) {
				if (term.autoSaveTimer) {
					clearInterval(term.autoSaveTimer)
					term.writeln("s/l: old auto-saver killed")
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
					return term.writeln("s/l: failed to access clipboard")
				}
				term.writeln("s/l: exported to clipboard")
			}
			if ("i" in opt || opt.I) {
				let s = opt.i
				if (opt.I) {
					try {
						s = await navigator.clipboard.readText()
					}
					catch {
						return term.writeln("s/l: failed to access clipboard")
					}
				}
				try {
					const new_sto = JSON.parse(s)
					for (const k in sto) {
						if (! k.startsWith("__")) delete sto[k]
					}
					for (const k in new_sto) {
						if (! k.startsWith("__")) sto[k] = new_sto[k]
					}
					if (opt.I) term.writeln("s/l: imported from clipboard")
					history.go()
				}
				catch (err) {
					term.writeln(`s/l: ${ err.message.slice(12) }`)
				}
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
			term.writeln(sto.cwd)
		}
	}
}
