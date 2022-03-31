const handler  = {
	has: () => true,
	get: (tar, k) => {
		if (k === Symbol.unscopables) return undefined
		return tar[k]
	}
}

Function.prototype.constructor = null
Object.getPrototypeOf(async () => {}).constructor = null
Object.getPrototypeOf(function *() {}).constructor = null
Object.getPrototypeOf(async function *() {}).constructor = null

globalThis.Sandbox = class {
	constructor(env) {
		this.safeEnv = new Proxy(env, handler)
	}

	run(code) {
		if (code.includes("import")) throw new SyntaxError("Sandbox eval mustn't import.")
		const env = this.safeEnv
		return new Function("env", `
			with (env) {
				return (function () {
					"use strict";
					${code};
				})()
			}`
		)(env)
	}
}
