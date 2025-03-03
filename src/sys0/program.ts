import { Process } from './proc'

export type Program = (proc: Process, ...argv: string[]) => number | Promise<number>

export const wrapProgram = (program: Program): Program => {
    const wrapped: Program = async (proc, name, ...args) => {
        try {
            return await program(proc, name, ...args)
        }
        catch (err) {
            if (typeof err === 'number') {
                return err
            }
            if (typeof err === 'string' || Array.isArray(err)) {
                proc.error(err)
                return 1
            }
            throw err
        }
    }
    const source = `wrapProgram(${program.toString()})\n`
    wrapped.toString = () => source
    return wrapped
}