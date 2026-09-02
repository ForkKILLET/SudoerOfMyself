import { chalk } from '@/utils/color'
import type { Process } from './proc'
import { mapOrNull } from '@/utils'
import { Awaitable } from '@/utils/types'
import { UserError } from '@/utils/errors'
import { ProgramResult } from './process_exit'

export type Program = (proc: Process, ...argv: string[]) => Awaitable<ProgramResult>

export const wrapProgram = (program: Program): Program => {
  const wrapped: Program = async (proc, name, ...args) => {
    try {
      return await program(proc, name, ...args)
    }
    catch (err) {
      if (err instanceof UserError) {
        proc.error(err.message)
        return 1
      }
      throw err
    }
  }
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
type OptionValue = boolean | string | number | Array<string | number>

export class Command<O = Record<never, never>> {
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
    forms.forEach((form) => {
      if (form.startsWith('--')) {
        const longForm = form.slice(2)
        that.longOptions[longForm] = name
        this.optionLongForms[name] = longForm
      }
      else if (form.startsWith('-')) {
        const shortForm = form.slice(1)
        if (shortForm.length !== 1) {
          throw new UserError(`option: Short option must be one character: '${form}'`)
        }
        that.shortOptions[shortForm] = name
        this.optionShortForms[name] = shortForm
      }
      else {
        throw new UserError(`option: Invalid option format: '${form}'`)
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
    name: K, format = '--help', description = 'Show this help message',
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
      const maxShortOptionLength = Math.max(0, ...Object.keys(this.shortOptions).map(value => value.length))
      const maxLongOptionLength = Math.max(0, ...Object.keys(this.longOptions).map(value => value.length))
      optionNames.forEach((name) => {
        const shortForm = this.optionShortForms[name]
        const longForm = this.optionLongForms[name]
        stdio.writeLn(
          `${(mapOrNull(shortForm, form => `-${form}`) ?? '').padStart(maxShortOptionLength + 3)}` +
          (shortForm && longForm ? ', ' : '  ') +
          `${(mapOrNull(longForm, form => `--${form}`) ?? '').padEnd(maxLongOptionLength + 2)}` +
          `  ${this.optionDescriptions[name]}`,
        )
      })
    }

    return 0
  }

  program(handler: (argv: Argv<O>, ...args: string[]) => Awaitable<ProgramResult>): Program {
    return wrapProgram(async (proc, name, ...rawArgs) => {
      const options: Record<string, OptionValue> = {}
      const args: string[] = []
      let optionFinished = false
      let i = 0
      const validateOption = (name: string, type: BasicOptionType, arg: string): string | number => {
        if (type === 'string') return arg
        if (type === 'number') {
          const value = Number(arg)
          if (Number.isNaN(value)) throw new UserError(`Option ${name} requires a number`)
          return value
        }
        if (type === 'integer') {
          const value = Number(arg)
          if (Number.isNaN(value) || ! Number.isInteger(value)) {
            throw new UserError(`Option ${name} requires an integer`)
          }
          return value
        }
        throw new Error(`Unsupported option type: ${type}`)
      }
      interface ParsedOption {
        name: OptionName
        type: OptionType
        value?: string
        booleanValue?: boolean
      }
      const applyOption = (option: ParsedOption) => {
        if (option.type === 'boolean') {
          const value = option.booleanValue ?? true
          if (option.name === this.helpOption && value) return true
          options[option.name] = value
          return false
        }

        const optionArg = option.value
        if (optionArg === undefined) throw new Error('Parsed option argument is missing')
        if (option.type.endsWith('[]')) {
          const currentValue = options[option.name]
          const arr = Array.isArray(currentValue) ? currentValue : []
          options[option.name] = arr
          arr.push(validateOption(
            `${option.name}[${arr.length}]`,
            option.type.slice(0, - 2) as BasicOptionType,
            optionArg,
          ))
        }
        else {
          options[option.name] = validateOption(option.name, option.type as BasicOptionType, optionArg)
        }
        return false
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
        if (arg.startsWith('--')) {
          let booleanValue = true
          let optionName: string
          if (arg.startsWith('--no-')) {
            booleanValue = false
            optionName = this.longOptions[arg.slice(5)]
          }
          else {
            optionName = this.longOptions[arg.slice(2)]
          }
          if (! optionName) {
            switch (this.actionWhenUnknownOption) {
              case 'throw':
                throw new UserError(`Unknown option: ${arg}`)
              case 'ignore':
                continue
              case 'make-arg':
                args.push(arg)
                continue
            }
          }
          const optionType = this.optionTypes[optionName]

          if (optionType === 'boolean') {
            if (applyOption({ name: optionName, type: optionType, booleanValue })) {
              return this.runHelp(proc)
            }
            continue
          }
          if (! booleanValue) throw new UserError(`Unknown option: ${arg}`)
          if (i === rawArgs.length) throw new UserError(`Option ${arg} requires an argument`)

          applyOption({ name: optionName, type: optionType, value: rawArgs[i ++] })
          continue
        }

        const cluster = arg.slice(1)
        const parsed: ParsedOption[] = []
        let makeArgument = false
        let consumeNextArgument = false

        for (let clusterIndex = 0; clusterIndex < cluster.length; clusterIndex ++) {
          const shortForm = cluster[clusterIndex]
          const optionName = this.shortOptions[shortForm]
          if (! optionName) {
            switch (this.actionWhenUnknownOption) {
              case 'throw':
                throw new UserError(`Unknown option: -${shortForm}`)
              case 'ignore':
                continue
              case 'make-arg':
                makeArgument = true
                break
            }
          }
          if (makeArgument) break

          const optionType = this.optionTypes[optionName]
          if (optionType === 'boolean') {
            parsed.push({ name: optionName, type: optionType })
            continue
          }

          const attachedValue = cluster.slice(clusterIndex + 1)
          if (attachedValue) {
            parsed.push({ name: optionName, type: optionType, value: attachedValue })
          }
          else {
            if (i === rawArgs.length) throw new UserError(`Option -${shortForm} requires an argument`)
            parsed.push({ name: optionName, type: optionType, value: rawArgs[i] })
            consumeNextArgument = true
          }
          break
        }

        if (makeArgument) {
          args.push(arg)
          continue
        }
        if (consumeNextArgument) i ++

        for (const option of parsed) {
          if (applyOption(option)) return this.runHelp(proc)
        }
      }

      return handler({ proc, name, options: options as Partial<O> }, ...args)
    })
  }
}

export const createCommand = (name: string, args: string, description?: string) =>
  new Command(name, args, description)
