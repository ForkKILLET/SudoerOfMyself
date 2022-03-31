sto.perms ??= {}
const able = flag => (...names) => {
	const { perms } = sto
	names.forEach(n => perms[n] = flag)
	sto.perms = perms
}
globalThis.perm = {
	enable: able(true),
	disable: able(false),
	find: cmdn => sto.perms[cmdn]
}
