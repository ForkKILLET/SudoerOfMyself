term.getCompletions = ln => {
	const [ tokens, flag ] = shell(ln)
	if (tokens.length === 1) { // Complete command name.
		const [ base, now ] = tokens[0].split(/\/(?!.*\/)/)
		const [, f] = fs.relpath(base, { err: false, ty: "dir" })
		if (! f) return null

		return Object.assign(
			Object.entries(f.children).filter(([n]) => (
				(! now || n.startsWith(now)) &&
				(n[0] !== "." || now[0] === ".")
			)).map(([ n, { ty } ]) => ({
				raw: n + (ty === "dir" ? "/" : ""),
				disp: fs.ls.raw({ n, ty }, true, true)
			})),
			{ root: now, flag },
		)
	}
}

term.clearCompletions = async (old = false) => {
	const c = old ? term.oldCompletion : term.completion
	if (! c) return
	delete term.completion

	const cursor = term.getCursor()
	await term.writeA((
		"\r\n" + " ".repeat(c.colNum * c.maxWidth + (c.colNum - 1) * c.colPadding)
	).repeat(c.rowNum))
	await term.setCursor(cursor)
}

term.drawCompletions = async coms => {
	const maxWidth = coms.reduce((a, c) => Math.max(a, c[2] = stringWidth(c.disp)), 0)
	const colPadding = 3
	const colNum = (term.options.cols + colPadding) / (maxWidth + colPadding) | 0
	const cursor = term.getCursor()

	let out = "", rowNum = 0
	for (const [ i, com ] of coms.entries()) {
		out += (i % colNum
			? " ".repeat(maxWidth - coms[i - 1][2] + colPadding)
			: (++ rowNum, "\r\n")
		) + com.disp
	}
	await term.writeA(out)
	await term.setCursor(cursor)

	term.completion = {
		list: coms,
		cursor,
		colNum,
		rowNum,
		maxWidth,
		colPadding,
		i: -1
	}
}

term.useComplete = async s => {
	await term.writeA(s)
	term.ln += s
	console.log(s)
	term.cursorIndex += s.length
}

term.tabComplete = async () => {
	const c = term.completion
	if (c) {
		const getCompletionPos = i => {
			const x = (i % c.colNum) * (c.maxWidth + c.colPadding)
			const y = c.cursor[1] + (i / c.colNum | 0) + 1
			return [ x, y ]
		}

		if (c.i >= 0) {
			await term.setCursor(getCompletionPos(c.i))
			await term.writeA(c.list[c.i].disp)
			await term.setCursor(c.cursor)
			await term.writeA(" ".repeat(c.maxWidth))
			term.ln = c.ln
			term.cursorIndex -= c.list[c.i].raw.length - c.commonPrefix.length
		}

		if (++ c.i === c.list.length) c.i = 0
		await term.setCursor(getCompletionPos(c.i))
		await term.writeA(chalk.inverse(c.list[c.i].disp))
		await term.setCursor(c.cursor)
		await term.useComplete(c.list[c.i].raw.slice(c.commonPrefix.length))

		return
	}

	if (term.oldCompletion) {
		await term.clearCompletions(true)
		delete term.oldCompletion
	}

	const ln = term.ln
	const coms = term.getCompletions(ln)

	if (! coms?.length) return // TODO bell

	let commonPrefix
	if (coms.length === 1) commonPrefix = coms[0].raw
	else {
		commonPrefix = ""
		const l = coms.length
		for (let i = 0; ; i ++) {
			let ch = coms[0].raw[i], j = 1
			for (; j < l; j ++) if (coms[j].raw[i] !== ch) break
			if (j < l) break
			commonPrefix += ch
		}
	}
	// now.startsWith(commonPrefix) !

	if (coms.length > 1) {
		await term.drawCompletions(coms)
		term.completion.ln ??= ln
		term.completion.commonPrefix = commonPrefix
	}

	await term.useComplete(commonPrefix.slice(coms.root?.length))
}
