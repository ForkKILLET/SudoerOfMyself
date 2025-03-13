import { createCommand } from '@/sys0/program'

export const mkdir = createCommand('mkdir', '<DIRECTORY...>', 'Create the DIRECTORY(ies), if they do not already exist.')
    .help('help')
    .option('parent', '--parent, -p', 'boolean', 'Create parent directories as needed')
    .option('verbose', '--verbose, -v', 'boolean', 'Print a message for each created directory')
    .program(async ({ proc, options }, ...paths) => {
        const { ctx } = proc
        proc.staticName = 'mkdir'

        if (! paths.length) {
            throw 'Missing operand'
        }
        const errs: string[] = []

        for (const path of paths) {
            try {
                ctx.fs.mkdirU(path)
                if (options.verbose) {
                    proc.log(`Created directory '${path}'`)
                }
            }
            catch (err) {
                errs.push(err as string)
            }
        }

        if (errs.length) {
            proc.error(errs)
            return 1
        }

        return 0
    })
