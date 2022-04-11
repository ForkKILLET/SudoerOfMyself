if (! Array.isArray(sto.cwd)) sto.cwd = []

const usrs = sto.usrs ??= {
	root: 0,
	myself: 1
}
const grps = sto.grps ??= {
	root: [ 0, [ 0 ] ],
	human: [ 1, [ 1 ] ]
}

globalThis.fs = {
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
		},
		raw: ({ n, ty }, c, F) => {
			if (c) n = chalk[fs.ls.colors[ty]]?.(n) ?? n
			if (F) n += fs.ls.indicators[ty] ?? "?"
			return n
		}
	},
	
	d: dir => (
		dir.reduce((a, c) => a.children[c], sto.files)
	),
	same: (d1, d2) => (
		d1.every((n, i) => n === d2[i])
	),
	cwd: () => (
		fs.d(sto.cwd)
	),
	relpath: (path, { err, ty, perm }) => {
		const base = path?.startsWith("/") ? [] : [].concat(sto.cwd)
		const slashEnd = path?.endsWith("/")
		const after = path ? path.split("/").filter(f => f) : []
		let k, c, f = fs.d(base)
		try {
			for ([ k, c ] of after.entries()) {
				if (c === ".") ;
				else if (c === "..") {
					base.pop()
					f = fs.d(base)
				}
				else {
					f = f.children[c]
					if (! f) {
						throw "no such file or directory"
					}
					if (f.ty !== "dir" && (k !== after.length - 1 || slashEnd)) {
						throw "not a directory"
					}
					if (
						k !== after.length - 1 && ! fs.hasPerm("x", f) ||
						k === after.length - 1 && perm && ! fs.hasPerm(perm, f)
					) throw "permission denied"
					base.push(c)
				}
			}

			if (typeof ty === "string") ty = [ ty ]
			if (Array.isArray(ty) && ! ty.includes(f.ty)) {
				c = base.pop() ?? ""
				throw "not a " + ty.map(t => fs.ls.longTypes[t]).join(" or ")
			}
			return [ base, f ]
		}
		catch (errTy) {
			if (err) {
				if (slashEnd) after.push("")
				term.writeln([ errTy + ": ", ...base, chalk.red(c), ...after.slice(k + 1) ].join("/"))
			}
			return [ null, null ]
		}
	},
	cwdPretty: () => (
		(sto.cwd[0] === "home"
			? [ "~", ...sto.cwd.slice(1) ]
			: [ "", ...sto.cwd ]
		).join("/")
	),
	updatePWD: () => {
		sto.env.PWD = "/" + sto.cwd.join("/")
	},
	hasPerm: (ty, { owner, perm }) => {
		ty = "rwx".indexOf(ty)
		let p = parseInt(perm, 8)
		if (owner === usrs.myself) {
			p = (p & 0b111 << 6) >> 6
		}
		// TODO group perm
		else {
			p = p & 0b111
		}
		return p & 1 << (2 - ty)
	}
}

fs.updatePWD()
