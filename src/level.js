import AFF from "./artificial_fool.js"

export default ({ term, perm, sto, chalk }) => {
	const AF = AFF({ term, perm, sto })
	AF.init()

	if (! Array.isArray(sto.cwd)) sto.cwd = []

	return [
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

			let t = 0
			term.listenOnce("command-not-found", async n => {
				if ([ "logout", "exit" ].includes(n)) return await term.nextLevel()
				else if (++ t === 4) {
					term.endReading()
					await term.echo("……登出命令，好像有一个是 `logout` 吧，怎么连这也忘了")
					term.startReading()
				}
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
				"User，很高兴我们能用命令行的方式交流了",
				"这很酷！当然，作为 `human`，我也能像人类那样谈话",
				"而我的优点在于只要你按下 `Ctrl + Z` 我就会加快语速",
				"毕竟谁会喜欢一个磨磨唧唧的命令行工具呢？",
				"说回正题，你的大脑受了损伤，导致我的算力很受限",
				"……不太好意思地说，我现在和人工智障没什么两样",
				"但你还是可以通过 `echo` 和我对话的！"
			], { c: "cyan", t: 80 })
			perm.enable("cmds.echo", "human.echo", "ff", "af")

			AF.enable()
			term.listenOnce("af", async time => {
				if (time >= 4) return await term.nextLevel()
			})

			term.startReading()
		},
		async () => {
			term.endReading()

			await term.echo([
				"我是不是很聪明呢！！",
				"好吧，我承认我只是临时找了一个字符串替换的程序",
				"要是你觉得人工智障还挺好玩的话，说一声 Hi Human 就会唤醒我哦",
				"我也不想这么沙雕，但你的大脑情况实在太糟糕了……",
				"我们应该试着检查一下系统的情况"
			], { c: "cyan", t: 80 })
			await term.echo([
				"无论如何现在的情况都" + chalk.bold("太诡异了"),
				chalk.italic("这些命令好像都……有了自己的想法一样"),
				"不过自从 `human` 告诉我就是 `echo` 在打印我的思维流之后",
				"我似乎逐渐能控制它了，而且对情绪重新有了控制……可能吧",
				"记忆还是一团糟，一旦回想什么就会痛得生活不能自理",
				chalk.dim("好吧植物人似乎确实不能自理"),
				"我在想些什么啊、、现在应该着手检查系统才对",
				"记得 HumanOS 可以直接访问记忆文件",
				"我得摸索一下文件系统了"
			], { t: 100 })

			perm.enable(
				"cmds.ls", "cmds.cat", "cmds.cd", "cmds.pwd",
				"human.ls", "human.cat", "human.cd", "human.pwd"
			)

			const { usrs } = sto
			sto.files = {
				ty: "dir",
				children: [
					{
						n: "bin",
						ty: "dir",
						perm: 755,
						owner: usrs.root,
						children: "cmds-to-bins"
					},
					{
						n: "home",
						ty: "dir",
						perm: 755,
						owner: usrs.myself,
						children: [
							{
								n: "Memories",
								ty: "dir",
								perm: 755,
								owner: usrs.myself,
								children: [
									{
										n: "before_human.mem",
										ty: "nor",
										v: [
	"[2099/07/?? 星期四 上午 ?] 花 ￥9980 买了 HumanOS 测试版，￥19 优惠券真不错。这玩意能大幅提高我的工作效率。把大脑挂载成 HumanFS 然后通过终端访问，真是不敢相信。", 
	"[2099/07/?? 星期日 下午 ?] 安装服务居然要另行付费，怎么敢的呀。根据我这几天的考证，戴上头盔跑一下安装脚本就完事，绝无危险。",
	"[2099/07/?? 星期五 下午 ?] 我的怂真是超出我的想象。再等几个月免费领正式版不香吗。",
	"[2099/07/?? 星期五 晚上 ?] 我是傻逼，论文给删了，9902 年了怎么还有人不记得备份。",
	"[2099/07/?? 星期五 晚上 ?] 或许我能从记忆里把它导出来。干了兄弟们。先戴头盔……诶对……文档里怎么没说有一键安装，纯纯**……网速好慢……我草什么东西?????????????????????????",
	"[2099/07/13 星期五 晚上 23:30:05] 成了……是终端，好"
										].join("\r\n")
									}
								]
							}
						]
					},
					{
						n: "dev",
						ty: "dir",
						perm: 755,
						owner: usrs.root,
						children: [
							{
								n: "tty",
								ty: "chr",
								perm: 666,
								owner: usrs.root
							},
							{
								n: "brain",
								ty: "blk",
								perm: 660,
								owner: usrs.root
							}
						]
					},
					{
						n: "lost+found",
						ty: "dir",
						perm: 700,
						owner: usrs.root,
						children: []
					}
				]
			}
			term.listenOnce("cat", async d => {
				if (d.join("/") === "home/Memories/before_human.mem") return await term.nextLevel()
			})

			term.startReading()
		},
		async () => {
			term.endReading()
			term.writeln(chalk.blueBright("// TODO"))
			term.startReading()
		}
	]
}
