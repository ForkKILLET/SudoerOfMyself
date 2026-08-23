export interface Env {
  [key: string]: string
}

export const createEnv = (env: Env): Env => ({ ...env })

export const getEnv = (env: Env, name: string) => env[name] ?? ''

export const isEnvName = (name: string) => /^[A-Za-z_][A-Za-z0-9_]*$/.test(name)
