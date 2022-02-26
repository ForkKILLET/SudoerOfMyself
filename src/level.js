export default ({ term, perm, chalk }) => [
	async () => {
		term.writeln("Welcome to HumanOS. Type `help` for help.")
		perm.enable("cmds.help")
		term.listenOnce("command-run", async n => {
			if (n === "help") return await term.nextLevel()
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
		term.listenOnce("command-not-found", async n => {
			if ([ "logout", "exit" ].includes(n)) return await term.nextLevel()
		})
	},
	async () => {
		term.endReading()
		await term.echo(chalk.bold("不能登出？！"), { t: 60 })
		await term.echo([
			"User，你好像遇到了麻烦？",
			"我是具有人工智能的、系统参考手册的接口 `human`",
			"要是你问我和 `man` 什么关系……可能我是他的无性别 HumanOS 特供版？",
			"噢说回正题，不能登出就说明，你可能不幸地，呃，已经变成植物人了",
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
		term.listenOnce("command-run", async (n, [ page ]) => {
			if (n === "human" && page === "human") return await term.nextLevel()
		})
		term.startReading()
	},
	async () => {
		term.endReading()
		await term.echo([
			"User，很高兴我们能用命令行的方式交流了。",
			"这很酷！当然，作为 `human`，我也能像人类那样谈话。",
			"而我的优点在于只要你按下 `Ctrl + Z` 我就会加快语速。",
			"毕竟谁会喜欢一个磨磨唧唧的命令行工具呢？",
			"说回正题，你的大脑受了损伤，导致我的算力很受限。",
			"……不太好意思地说，我现在和人工智障没什么两样。",
			"但你还是可以通过 `echo` 和我对话的！"
		], { c: "cyan", t: 80 })
		perm.enable("cmds.echo", "human.echo", "ff")

		let echo_time = 0
		term.listenOnce("echo", async (text, { angrily }) => {
			console.log(text)
			await term.echo([
				(text
					.replace(/[!?]/g, c => ({ "!": "！", "?": "？" } [c]))
					.replace(/[你我]/g, c => ({ "你": "我", "我": "你" } [c]))
					.replace(/吗？/g, "。")
					.replace(/？$/, "？我也不知道。")
				+ (angrily ? "……怎么了 User，不要生气呢~" : ""))
				|| "User，你怎么不说话啦"
			], { c: "cyan", t: 80 })
			if (++ echo_time === 4) {
				return await term.nextLevel()
			}
		})
		term.startReading()
	},
	async () => {
		term.endReading()

		await term.echo([
			"我是不是很聪明呢！！",
			"好吧，我承认我只是临时找了一个沙雕字符串替换的包。",
			"因为你的大脑情况实在太糟糕了……",
			"我们应该试着修复一下，扫描扫描文件啥的"
		], { c: "cyan", t: 80 })
		term.writeln("WIP")

		term.startReading()
	}
]
