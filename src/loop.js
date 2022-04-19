term.isLoop = false
term.startLoop = async () => {
	term.enableRead = true
	if (term.isLoop) return

	term.isLoop = true
	while (term.enableRead) {
		await term.writePrompt()
		await term.statusBar.draw()

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

		const [ path, ...arg ] = shell(ln)[0]

		const bins = [
			fs.relpath(path, { err: false, ty: "exe" })
		]

		const paths = sto.env.PATH.split(":")
		if (! path.includes("/")) paths.forEach(base =>
			bins.unshift(fs.relpath(`${base}/${path}`, { err: false, ty: "exe" }))
		)

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
			continue
		}
		else if (! binOK.func) {
			if (binOK.bag) {
				term.writeln(`Building sandbox...`)
				const env = {}
				const info = sto.bag.list.list[binOK.bag]
				if (! info) {
					term.writeln(`Missing metadata of bag "${ chalk.green(binOK.bag) }".`)
					continue
				}
				try {
					info.perm.forEach(p => env[p] = globalThis[p])
					const sb = new Sandbox(env)
					sb.run(binOK.cont)
					const f = info.main === "default" ? env.exports : env.exports[info.main]
					binOK.func = f
				}
				catch (err) {
					term.writeln(`Failed to build bag: ${ term.formatErr(err) }`)
					console.error(err)
					continue
				}
			}
			if (! binOK.func) {
				term.writeln(`${path}: broken executable.`)
				continue
			}
		}

		term.enableRead = false
		term.isCommand = true
		try {
			await binOK.func(...arg)
		}
		catch (err) {
			console.log(err)
			term.writeln("core dumped: " + chalk.red(err.message ?? err))
		}
		term.isCommand = false
		term.enableRead = true
		await term.trigger("command-run", path, arg)
	}
	term.isLoop = false
}
term.endLoop = () => {
	term.enableRead = false
}
