term.statusBar = {
	status: [ [ "device", __mobile ? "📱 " : "💻 " ] ],
	lastWidth: 0,
	draw: async () => {
		const sb = term.statusBar
		const cursor = term.getCursor()
		const s = " " + sb.status.map(s => s[1]).join("") + " "

		const width = stringWidth(s)
		term.setCursor([ term.getOption("cols") - sb.lastWidth, 0 ])
		await term.writeA(" ".repeat(sb.lastWidth))
		term.setCursor([ term.getOption("cols") - width, 0 ])
		sb.lastWidth = width

		await term.writeA(chalk.whiteBright.bgMagenta(s))
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
