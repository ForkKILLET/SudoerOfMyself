export interface Env {
    [key: string]: string
}

export const createEnv = (env: Env): Env => new Proxy(env, {
    get(target, prop) {
        return Reflect.get(target, prop) ?? ''
    }
})