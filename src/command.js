import pack from "../package.json"
import sleep from "simple-async-sleep"

const humanPages = {
	"": [
		"您需要什么手册页？",
		"例如，尝试使用 `human human`。"
	],
	"human": [
		"具有人工智能的、系统参考手册的接口。"
	]
}

export default ({ term, perm }) => {
	perm.enable("cmds.version", "cmds.logo")
	return {
		version: () => term.writeln(`v${pack.version}, by ${pack.author}`),
		logo: async () => {
			const $logo = document.getElementById("logo")
			$logo.style.display = "block"
			await sleep(2000)
			$logo.style.display = ""
		},
		help: () => term.writeln("You are HELPLESS. No one will help you. jaja."),
		human: async (page = "") => {
			if (perm.find(`human.${page}`))
				await term.echo(humanPages[page], { t: 0, c: "cyan" })
			else await term.writeln(`human: ${page}: page not found.`)
		}
	}
}
