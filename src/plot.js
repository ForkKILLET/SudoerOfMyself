export const levels = [
	term => {
		term.write("Welcome to HumanOS. Type `help` for help.")
		term.listenOnce("command-run", n => {
			if (n === "help") term.nextLevel()
		})
		term.startReading()
	},
	async term => {
		term.endReading()
		await term.echo("HELPLESS？怎么回事？？今天也不是……为什么终端上有我的想法？！", 70)
		await term.echo("虽然好像实时记录思维流也是 HumanOS 提供的服务，但应该是付费的才对……")
		await term.echo("啊啊，看着自己的想法委实很奇怪呢")
		await term.echo("不知道 help 命令什么情况，登出上网查查好了")
		term.startReading()
		term.listenOnce("command-not-found", n => {
			if ([ "logout", "exit" ].includes(n)) term.nextLevel()
		})
	},
	async term => {
		term.endReading()
		await term.echo("不能登出？！", 70)
	}
]
