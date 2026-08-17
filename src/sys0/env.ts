export interface Env {
  [key: string]: string
}

export const createEnv = (env: Env): Env => ({ ...env })

export const getEnv = (env: Env, name: string) => env[name] ?? ''
