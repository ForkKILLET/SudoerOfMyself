export interface BootMode {
  debug: boolean
  recovery: boolean
}

export const parseBootMode = (search: string): BootMode => {
  const params = new URLSearchParams(search)
  return {
    debug: params.get('debug') === '1',
    recovery: params.get('recovery') === '1',
  }
}
