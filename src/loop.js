term.isReading = false
term.startReading = async () => {
	term.enableRead = true
	if (term.isReading) return

	term.isReading = true
	while (term.enableRead) {
		const ln = await term.readln()
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
			term.enableRead = false
			try {
				await binOK.func(...arg)
			}
			catch (err) {
				console.log(err)
				term.writeln("core dumped: " + chalk.red(err.message ?? err))
			}
			term.enableRead = true
			await term.trigger("command-run", path, arg)
		}
	}
	term.isReading = false
}
term.endReading = () => {
	term.enableRead = false
}
