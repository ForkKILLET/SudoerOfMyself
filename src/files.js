export const usrs = {
	root: 0,
	myself: 1
}

export const grps = {
	root: [ 0, [ 0 ] ],
	human: [ 1, [ 1 ] ]
}

export const fs = {
	ty: "dir",
	children: [
		{
			n: "bin",
			ty: "dir",
			perm: 777,
			owner: usrs.root
		},
		{
			n: "sbin",
			ty: "dir",
			perm: 700,
			owner: usrs.root
		},
		{
			n: "home",
			ty: "dir",
			perm: 755,
			owner: usrs.myself
		},
		{
			n: "dev",
			ty: "dir",
			perm: 755,
			owner: usrs.root,
			children: [
				{
					n: "tty",
					ty: "special"
				},
				{
					n: "brain",
					ty: "special"
				}
			]
		},
		{
			n: "lost+found",
			ty: "dir",
			perm: 700,
			owner: usrs.root
		}
	]
}
