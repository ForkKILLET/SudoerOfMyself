Function.prototype.constructor = null
Object.getPrototypeOf(async () => {}).constructor = null
Object.getPrototypeOf(function *() {}).constructor = null
Object.getPrototypeOf(async function *() {}).constructor = null

const safeCallback = f => (cb, ...arg) => {
	if (typeof cb !== "function") throw new TypeError("Callback should be a function.")
	return f(cb, ...arg)
}
const safeTimeout = safeCallback(setTimeout)
const safeInterval = safeCallback(setInterval)

globalThis.Sandbox = class {
	constructor(env) {
		env.export = v => this.exports = v
		Object.assign(env, {
			Object, Array, Math, String, Number, Symbol, Promise,
			setTimeout: safeTimeout, setInterval: safeInterval, clearTimeout, clearInterval,
			env
		})
		this.safeEnv = new Proxy(env, {
			has: () => true,
			get: (tar, k) => {
				if (k === Symbol.unscopables) return undefined
				const v = tar[k]
				if (k.startsWith("__")) delete tar[k]
				return v
			},
			set: (tar, k, v) => {
				if (k === "exports") this.exports = v
				tar[k] = v
				return true
			}
		})
	}

	run(code) {
		if (code.includes("import")) throw new SyntaxError("Sandbox eval mustn't import.")
		const env = this.safeEnv
		env.__code = code
		env.__Function = Function
		new Function("env", `
			with (env) {
				env.__Function("env", "\\"use strict\\";\\n" + env.__code)(env)
			}
		`)(env)
		return this.exports
	}
}
