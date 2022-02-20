export default ({ term, perm, chalk }) => [
	() => {
		term.write("Welcome to HumanOS. Type `help` for help.")
		perm.enable("cmds.help", "cmds.version")
		term.listenOnce("command-run", n => {
			if (n === "help") return term.nextLevel()
		})
		term.startReading()
	},
	async () => {
		term.endReading()
		await term.echo(chalk.bold("HELPLESS？怎么回事？？") + "今天也不是……为什么终端上有我的想法？！", { t: 60 })
		await term.echo([
			"虽然好像实时记录思维流也是 HumanOS 提供的服务，但应该是额外付费的才对……",
			"啊啊，看着自己的想法委实很奇怪呢",
			"不知道 `help` 命令什么情况，登出上网查查好了"
		])
		term.startReading()
		term.listenOnce("command-not-found", n => {
			if ([ "logout", "exit" ].includes(n)) return term.nextLevel()
		})
	},
	async () => {
		term.endReading()
		await term.echo(chalk.bold("不能登出？！"), { t: 60 })
		await term.echo([
			"User，您好像遇到了麻烦？",
			"我是具有人工智能的、系统参考手册的接口 `human`",
			"要是你问我和 `man` 什么关系……可能我是他的无性别 HumanOS 特供版？",
			"噢说回正题，不能登出就说明，你可能不幸的，呃，已经变成植物人了",
			"然后你的一缕意识被保存在了终端中",
			"……从这个角度来看你还是很幸运的",
			"有什么问题使用 `human` 命令我就会出现哦"
		], { c: "cyan", t: 80 })
		await term.echo([
			"植物人……我之前在家……在家……在家……好痛！",
			chalk.bold("什么也想不起来了"),
			"寄！",
			"至少可以肯定的是我死在家里，这比在大街上被人捅死安全多了"
		])
		perm.enable("cmds.human", "human.", "human.human")
		term.listenOnce("command-run", (n, [ page ]) => {
			if (n === "human" && page === "human") return term.nextLevel()
		})
		term.startReading()
	},
	async () => {
		term.endReading()
		term.writeln("WIP")
		term.startReading()
	}
]
