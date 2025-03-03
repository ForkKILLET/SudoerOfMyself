import { Control } from '@/utils'
import { Term } from './term'

export const calcMaxRows = (term: Term, widths: number[]) => {
    const { cols: termWidth } = term
    const sortedWidths = [...widths].sort((a, b) => b - a)
    let width = 0
    let col = 0
    for (const w of sortedWidths) {
        width += w
        if (width > termWidth) break
        col ++
    }
    col ||= 1
    return Math.ceil(widths.length / col)
}

export const LIST_GAP = 2

export const displayList = (term: Term, strs: string[]) => {
    if (! strs.length) return ''
    const widths = strs.map(str => term.getStringWidth(str) + LIST_GAP)
    const maxRows = calcMaxRows(term, widths)
    const { rows, colWidths } = Array
        .range(maxRows, 0, - 1)
        .findMap(rows => {
            const colWidths = Array
                .range(0, Math.ceil(widths.length / rows))
                .map(col => widths
                    .slice(col * rows, (col + 1) * rows)
                    .max()
                )
            if (colWidths.sum() - LIST_GAP > term.cols) return Control.continue
            return { rows, colWidths }
        })!
    const cols = colWidths.length
    return Array
        .range(0, rows)
        .map(row => Array
            .range(0, cols)
            .map(col => {
                const index = row + col * rows
                return (strs[index] ?? '').padEnd(colWidths[col] - LIST_GAP)
                    + (col === cols - 1 ? '\n' : ' '.repeat(LIST_GAP))
            })
            .join('')
        )
        .join('')
}