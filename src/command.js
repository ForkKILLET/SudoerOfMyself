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
	]
}

export default ({ term, perm, chalk }) => {
	perm.enable("cmds.version", "cmds.logo", "human.version", "human.logo")

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
			if (opt.angrily) s = chalk.bold(s)
			if (opt.tremulously) s = chalk.italic(s)
			if (opt.seriously) s = chalk.underline(s)
			if (opt.sadly) s = chalk.dim(s)
			await term.echo([ s ], { t: opt.angrily ? 60: undefined })
			await term.trigger("echo", s_, opt)
		},

		pwd: () => {
			term.writeln(sto.cwd)
		}
	}
}
