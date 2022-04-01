term.isTTY = false
term.startTTY = async () => {
	term.enableRead = true
	if (term.isTTY) return

	term.isTTY = true
	while (term.enableRead) {
		term.writePrompt()
		const ln = await term.readln()
		if (sto.history.at(-1) !== term.ln && term.ln?.trim()) {
			// TODO move to <~/.config/history.conf>
			if (term.ln.length < 64) {
				sto.history.push(term.ln)
			}
			if (sto.history.length == 128) {
				sto.history.shift()
			}
		}
		if (! ln.trim()) continue

		const [ path, ...arg ] = shell(ln)

		const bins = [ fs.relpath(path, { err: false, ty: "exe" }) ]
		if (! path.includes("/")) bins.unshift(fs.relpath("/bin/" + path, { err: false, ty: "exe" })) // TODO $PATH

		let noPerm = false, binOK
		for (const [, bin] of bins) {
			if (! bin) continue
			if (fs.hasPerm("x", bin)) {
				binOK = bin
				break
			}
			else {
				noPerm = true
				continue
			}
		}

		if (! binOK) {
			if (noPerm) {
				term.writeln(`${path}: permission denied.`)
				await term.trigger("command-no-perm")
			}
			else {
				term.writeln(`${path}: command not found.`)
				await term.trigger("command-not-found", path)
			}
		}
		else if (! binOK.func) {
			term.writeln(`${path}: broken executable.`)
		}
		else {
			term.isTTY = term.enableRead = false
			try {
				await binOK.func(...arg)
			}
			catch (err) {
				console.log(err)
				term.writeln("core dumped: " + chalk.red(err.message ?? err))
			}
			term.isTTY = term.enableRead = true
			await term.trigger("command-run", path, arg)
		}
	}
	term.isTTY = false
}
term.endTTY = () => {
	term.enableRead = false
}
