export default ({ term, perm, sto, cmds, chalk }) => {
	const usrs = sto.usrs ??= {
		root: 0,
		myself: 1
	}
	const grps = sto.grps ??= {
		root: [ 0, [ 0 ] ],
		human: [ 1, [ 1 ] ]
	}

	const specials = {
		"cmds-to-bins": () => Object.entries(cmds).map(([ n, f ]) => ({
			n,
			ty: "exe",
			v: f.toString(),
			perm: perm.find(`cmds.${n}`) ? 755 : 750,
			owner: usrs.root
		}))
	}
	const fs = {
		ls: {
			colors: {
				dir: "cyan",
				exe: "green",
				blk: "yellow",
				chr: "yellow",
				nor: "white"
			},
			indicators: {
				dir: "/",
				exe: "*",
				blk: "#",
				chr: "%",
				nor: "",
				pip: "|",
				soc: "="
			},
			shortTypes: {
				dir: "d",
				exe: "-",
				blk: "b",
				chr: "c",
				nor: "-",
				pip: "p",
				soc: "s"
			},
			longTypes: {
				dir: "directory",
				exe: "executable",
				blk: "block device",
				chr: "character device",
				nor: "file",
				pip: "FIFO",
				soc: "socket"
			}
		},
		
		d: dir => (
			dir.reduce((a, c) => fs.children(a).find(({ n }) => n === c), sto.files)
		),
		cwd: () => (
			fs.d(sto.cwd)
		),
		children: dir => (typeof dir.children === "string"
			? specials[dir.children]()
			: dir.children
		),
		relpath: (path, err, ...tys) => {
			const base = path?.startsWith("/") ? (path = path.slice(1), []) : [].concat(sto.cwd)
			const after = path ? path.split("/") : []
			let k, c, f = fs.d(base)
			try {
				for ([ k, c ] of after.entries()) {
					if (c === ".") ;
					else if (c === "..") {
						base.pop()
						f = fs.d(base)
					}
					else {
						f = fs.children(f).find(({ n }) => n === c)
						if (! f) {
							throw "no such file or directory"
						}
						if (f.ty !== "dir" && k !== after.length - 1) {
							throw "not a directory"
						}
						base.push(c)
					}
				}

				if (tys.length && ! tys.includes(f.ty)) {
					c = base.pop() ?? ""
					throw "not a " + tys.map(ty => fs.ls.longTypes[ty]).join(" or ")
				}
				return [ base, f ]
			}
			catch (ty) {
				if (err) term.writeln([ ty + ": ", ...base, chalk.red(c), ...after.slice(k + 1) ].join("/"))
				return [ null, null ]
			}
		}
	}
	return fs
}