term.isReading = false
term.startReading = async () => {
	term.enableRead = true
	if (term.isReading) return

	term.isReading = true
	while (term.enableRead) {
		const ln = await term.readln()
		if (! ln) continue
		const [ cmdn, ...arg ] = ln.split(" ")
		if (! perm.find(`cmds.${cmdn}`)) {
			if (cmdn in cmds) {
				term.writeln(`${cmdn}: permission denied.`)
				await term.trigger("command-no-perm")
			}
			else {
				term.writeln(`${cmdn}: command not found.`)
				await term.trigger("command-not-found", cmdn)
			}
		}
		else {
			term.enableRead = false
			try {
				await cmds[cmdn]?.(...arg)
			}
			catch (err) {
				console.log(err)
				term.writeln("core dumped: " + chalk.red(err.message ?? err))
			}
			term.enableRead = true
			await term.trigger("command-run", cmdn, arg)
		}
	}
	term.isReading = false
}
term.endReading = () => {
	term.enableRead = false
}

