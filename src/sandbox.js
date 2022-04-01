Function.prototype.constructor = null
Object.getPrototypeOf(async () => {}).constructor = null
Object.getPrototypeOf(function *() {}).constructor = null
Object.getPrototypeOf(async function *() {}).constructor = null

globalThis.Sandbox = class {
	constructor(env) {
		env.export = v => this.exports = v
		Object.assign(env, { Object, Array, Math, String, Number, Symbol, Promise, env })
		this.safeEnv = new Proxy(env, {
			has: () => true,
			get: (tar, k) => {
				if (k === Symbol.unscopables) return undefined
				return tar[k]
			},
			set: (_, k, v) => {
				if (k === "exports") this.exports = v
			}
		})
	}

	run(code) {
		if (code.includes("import")) throw new SyntaxError("Sandbox eval mustn't import.")
		const env = this.safeEnv
		new Function("env", `
			with (env) {
				(function () {
					"use strict";
					${code};
				})()
			}`
		)(env)
		return this.exports
	}
}
