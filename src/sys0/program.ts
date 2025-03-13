import chalk from 'chalk'
import { Process } from './proc'
import { mapOrNull, prop } from '@/utils'
import { Awaitable } from '@/utils/types'

export type Program = (proc: Process, ...argv: string[]) => Awaitable<number>

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

export type BasicOptionType = 'string' | 'integer' | 'number'
export type OptionType = 'boolean' | BasicOptionType | `${BasicOptionType}[]`
export type ParseOptionType<S extends OptionType> =
    S extends 'string' ? string :
    S extends 'integer' ? number :
    S extends 'number' ? number :
    S extends 'boolean' ? boolean :
    S extends `${infer I extends OptionType}[]` ? ParseOptionType<I>[] :
    never

export interface Argv<O> {
    proc: Process
    name: string
    options: Partial<O>
}

export type OptionName = string

export type OptionActionWhenUnknown = 'throw' | 'ignore' | 'make-arg'

export class Command<O = {}> {
    private optionTypes: Record<OptionName, OptionType> = {}
    private optionDescriptions: Record<OptionName, string> = {}
    private optionLongForms: Record<OptionName, string> = {}
    private optionShortForms: Record<OptionName, string> = {}
    private longOptions: Record<string, OptionName> = {}
    private shortOptions: Record<string, OptionName> = {}
    private helpOption: string | null = null
    private usageMessage: string | null = null
    private actionWhenUnknownOption: OptionActionWhenUnknown = 'throw'

    constructor(public name: string, public args: string, public description = '') {}

    whenUnknownOption(action: OptionActionWhenUnknown) {
        this.actionWhenUnknownOption = action
        return this
    }

    option<K extends string, S extends OptionType>(
        name: K, format: string, typeDef: S, description = '',
    ): Command<O & Record<K, ParseOptionType<S>>> {
        const that = this as Command<O & Record<K, ParseOptionType<S>>>
        const forms = format.split(',').map(str => str.trim())
        forms.forEach(form => {
            if (form.startsWith('--')) {
                const longForm = form.slice(2)
                that.longOptions[longForm] = name
                this.optionLongForms[name] = longForm
            }
            else if (form.startsWith('-')) {
                const shortForm = form.slice(1)
                that.shortOptions[shortForm] = name
                this.optionShortForms[name] = shortForm
            }
            else {
                throw `option: Invalid option format: '${form}'`
            }
        })
        that.optionTypes[name] = typeDef
        that.optionDescriptions[name] = description
        return that
    }

    usage(message: string) {
        this.usageMessage = message
        return this
    }
    
    help<K extends string>(
        name: K, format = '--help', description = 'Show this help message'
    ) {
        this.helpOption = name
        return this.option(name, format, 'boolean', description)
    }

    private runHelp(proc: Process) {
        const title = chalk.bold.cyanBright
        const { stdio } = proc

        if (this.description) stdio.writeLn(`${this.description}\n`)

        stdio.writeLn(`${title('Usage:')} ${this.name} ${this.args}`)
        if (this.usageMessage) stdio.writeLn(this.usageMessage)
        stdio.writeLn('')

        const optionNames = Object.keys(this.optionTypes)
        if (optionNames.length) {
            stdio.writeLn(title('Options:'))
            const maxShortOptionLength = Object.keys(this.shortOptions).map(prop('length')).max()
            const maxLongOptionLength = Object.keys(this.longOptions).map(prop('length')).max()
            optionNames.forEach(name => {
                const shortForm = this.optionShortForms[name]
                const longForm = this.optionLongForms[name]
                stdio.writeLn(
                    `${(mapOrNull(shortForm, form => `-${form}`) ?? '').padStart(maxShortOptionLength + 3)}` +
                    (shortForm && longForm ? ', ': '  ') +
                    `${(mapOrNull(longForm, form => `--${form}`) ?? '').padEnd(maxLongOptionLength + 2)}` +
                    `  ${this.optionDescriptions[name]}`
                )
            })
        }

        return 0
    }

    program(handler: (argv: Argv<O>, ...args: string[]) => Awaitable<number>): Program {
        return wrapProgram(async (proc, name, ...rawArgs) => {
            const options: Record<string, any> = {}
            const args: string[] = []
            let optionFinished = false
            let i = 0
            const validateOption = (name: string, type: BasicOptionType, arg: string) => {
                if (type === 'string') return arg
                if (type === 'number') {
                    const value = Number(arg)
                    if (isNaN(value)) throw `Option ${name} requires a number`
                    return value
                }
                if (type === 'integer') {
                    const value = Number(arg)
                    if (isNaN(value) || ! Number.isInteger(value)) throw `Option ${name} requires an integer`
                    return value
                }
            }

            while (i < rawArgs.length) {
                const arg = rawArgs[i ++]

                if (! optionFinished && arg === '--') {
                    optionFinished = true
                    continue
                }

                if (optionFinished || ! arg.startsWith('-') || arg.length === 1) {
                    args.push(arg)
                    continue
                }
                let booleanValue = true
                let optionName: string
                if (arg.startsWith('--')) {
                    if (arg.startsWith('--no-')) {
                        booleanValue = false
                        optionName = this.longOptions[arg.slice(5)]
                    }
                    else {
                        optionName = this.longOptions[arg.slice(2)]
                    }
                }
                else {
                    optionName = this.shortOptions[arg.slice(1)]
                }

                if (! optionName) {
                    switch (this.actionWhenUnknownOption) {
                    case 'throw':
                        throw `Unknown option: ${arg}`
                    case 'ignore':
                        continue
                    case 'make-arg':
                        args.push(arg)
                        continue
                    }
                }
                const optionType = this.optionTypes[optionName]

                if (optionType === 'boolean') {
                    if (optionName === this.helpOption) {
                        return this.runHelp(proc)
                    }

                    options[optionName] = booleanValue
                    continue
                }

                if (i === args.length) throw `Option ${arg} requires an argument`
                
                const optionArg = rawArgs[i ++]
                if (optionType.endsWith('[]')) {
                    const arr = options[optionName] ??= []
                    arr.push(validateOption(`${optionName}[${arr.length}]`, optionType.slice(0, - 2) as BasicOptionType, optionArg))
                }
                else {
                    options[optionName] = validateOption(optionName, optionType as BasicOptionType, optionArg)
                }
            }

            return handler({ proc, name, options: options as Partial<O> }, ...args)
        })
    }
}

export const createCommand = (name: string, args: string, description?: string) =>
    new Command(name, args, description)