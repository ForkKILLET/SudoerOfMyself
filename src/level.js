const tone = {
	human: { c: "cyan", t: 80 },
	me: {
		vfast: { t: 60 },
		fast: { t: 70 },
		hurry: { t: 100 },
		shocked: { t: 400 }
	}
}

globalThis.levels = [
	async () => {
		term.writeln("Welcome to HumanOS. Type `help` for help.")
		perm.enable("cmds.help")
		term.listenOnce("command-run", async n => {
			if (n === "help") return await term.nextLevel()
		})
		term.startLoop()
	},
	async () => {
		term.endLoop()
		await term.echo(chalk.bold("HELPLESS？怎么回事？？") + "今天也不是……为什么终端上有我的想法？！", tone.me.vfast)
		await term.echo([
			"虽然好像实时记录思维流也是 HumanOS 提供的服务，但应该是额外付费的才对……",
			"啊啊，看着自己的想法委实很奇怪呢",
			"不知道 `help` 命令什么情况，登出上网查查好了"
		])
		term.startLoop()

		let t = 0
		term.listenOnce("command-not-found", async n => {
			if ([ "logout", "exit" ].includes(n)) return await term.nextLevel()
			else if (++ t === 4) {
				term.endLoop()
				await term.echo("……登出命令，好像有一个是 `logout` 吧，怎么连这也忘了")
				term.startLoop()
			}
		})
	},
	async () => {
		term.endLoop()
		await term.echo(chalk.bold("不能登出？！"), tone.me.vfast)
		await term.echo([
			"User，你好像遇到了麻烦？",
			"我是具有人工智能的、系统参考手册的接口 `human`",
			"要是你问我和 `man` 什么关系……可能我是他的无性别 HumanOS 特供版？",
			"噢说回正题，不能登出就说明，你可能不幸地，呃，已经变成植物人了",
			"然后你的一缕意识被保存在了终端中",
			"……从这个角度来看你还是很幸运的",
			"有什么问题使用 `human` 命令我就会出现哦"
		], tone.human)
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
		term.startLoop()
	},
	async () => {
		term.endLoop()
		await term.echo([
			"User，很高兴我们能用命令行的方式交流了",
			"这很酷！当然，作为 `human`，我也能像人类那样谈话",
			"而我的优点在于只要你按下 `Ctrl + Z` 我就会加快语速",
			"毕竟谁会喜欢一个磨磨唧唧的命令行工具呢？",
			"说回正题，你的大脑受了损伤，导致我的算力很受限",
			"……不太好意思地说，我现在和人工智障没什么两样",
			"但你还是可以通过 `echo` 和我对话的！"
		], tone.human)
		perm.enable("cmds.echo", "human.echo", "ff", "af")

		af.enable()
		term.listenOnce("af", async time => {
			if (time >= 4) return await term.nextLevel()
		})

		term.startLoop()
	},
	async () => {
		term.endLoop()

		await term.echo([
			"我是不是很聪明呢！！",
			"好吧，我承认我只是临时找了一个字符串替换的程序",
			"要是你觉得人工智障还挺好玩的话，说一声 Hi Human 就会唤醒我哦",
			"我也不想这么沙雕，但你的大脑情况实在太糟糕了……",
			"我们应该试着检查一下系统的情况"
		], tone.human)
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
		], tone.me.hurry)

		perm.enable(
			"cmds.ls", "cmds.cat", "cmds.cd", "cmds.pwd",
			"human.ls", "human.cat", "human.cd", "human.pwd"
		)

		term.listenOnce("cat", async d => {
			if (fs.same(d, [ "home", "Memories", "before_human.mem" ])) return await term.nextLevel()
		})

		term.startLoop()
	},
	async () => {
		term.endLoop()
		await term.echo([
			"看来这是我进入 HumanOS 前一段时间的记忆，被系统扫描出来了。",
			"最后一条的时候已经成功安装 HumanOS，所以有系统时间，其他是我印象中的，只记得大概。似乎很合理。",
			"可是疑点也很多，比如那些问号。安装系统的过程中肯定有些意外，看样子是因为我没有按照文档操作。",
			chalk.dim("还有不记得备份……我是这种人吗。不会吧不会吧。"),
			"而且，安装前的记忆" + chalk.bold("不可能") + "只有一份。也许只是损坏了。",
			"读这记忆文件的过程中，感觉有些熟悉。但又不完全熟悉，调动不出情感。",
		], tone.me.hurry)
		await term.echo([
			"User，这是正常状况。但找回的记忆会随着时间回到原本的位置的。",
			"也许记忆文件只是损坏了，我们需要检查硬盘——"
		], tone.human)
		await term.echo([
			chalk.bold("jaja!"),
			"检查硬盘是吧。然后我就可以查你的新手册，用新的命令了是吧。",
			"我猜会是 `fsck` 或者 `mount`，对吧？",
			"这个系统的问题" + chalk.bold("绝对和你有关！"),
			"先是 `help` 给我搁那 jaja，然后我用命令居然还要听你指挥，否则就 permission denied！",
			"你这 `human` 不管是有人在操控，或者真是人工智障犯了病，最好现在……",
			chalk.dim("噢坏了，如果是有人操作我不就激怒他了吗、、完了这怎么也给 `echo` 了"),
		], tone.me.fast)
		await term.echo([
			"User，我是安装脚本默认开启的人工智能助手，负责引导 User 了解系统的操作方法，避免危险操作。",
			"看来这造成了误会，呃，ごめんなさい？总之你先冷静一下。",
			"对于记忆文件中的一键安装我并不了解，但看来是有问题的。",
			"你的记忆丢失似乎仅限于具体的事件，而概念性的东西没有遗失，终端也玩得很溜……",
			"但是完全不了解我，这就说明那个一键安装没跟你介绍、就把你整昏厥了。",
			"所以，来检查脑子吧。"
		], tone.human)
		await term.echo([ "？？？" ], tone.me.shocked)
		await term.echo([
			"你应该知道你的大脑已经挂载成 HumanFS 了吧。不用慌的，慌也没用。"
		], tone.human)
		sto.env.PROMPT = `"` + chalk.blueBright("$PWD") + chalk.green(" \\$ ") + `"`

		await term.nextLevel()
	},
	async () => {
		term.startLoop()
	}
]

sto.level ??= 0
term.nextLevel = async () => {
	await levels[++ sto.level]?.(term, cmds)
	return true
}

initQ.push(async () => await levels[sto.level]?.(term, cmds))
