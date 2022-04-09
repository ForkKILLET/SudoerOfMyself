term.statusBar = {
	status: [ [ "device", __mobile ? "📱 " : "💻 " ] ],
	lastX: 0,
	draw: async () => {
		const cursor = term.getCursor()
		term.setCursor([ 0, term.options.rows - 1 ])
		await term.writeA(
			chalk.whiteBright.bgMagenta(" " + term.statusBar.status.map(s => s[1]).join("") + " ")
		)
		const dx = term.statusBar.lastX - (term.statusBar.lastX = term.getCursor()[0])
		if (dx > 0) await term.writeA(" ".repeat(dx))
		term.setCursor(cursor)
	},
	add: async (name, display) => {
		const sb = term.statusBar
		if (! sb.status.find(s => s[0] === name)) sb.status.push([ name, display ])
		await sb.draw()
	},
	remove: async name => {
		const sb = term.statusBar
		const index = sb.status.findIndex(s => s[0] === name)
		if (index >= 0) {
			sb.status.splice(index, 1)
			await sb.draw()
		}
	}
}
