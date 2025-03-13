import { Control, id } from '@/utils'
import { Term } from './term'

export interface GridToStringOptions {
    formatter?: (cell: string, index: number) => string
}

export interface GridOptions {
    minWidth: number
    useEqualWidth: boolean
    direction: 'row' | 'col'
    gap: number
}

export class GridDisplay {
    colWidths: number[]
    rows: number
    cols: number
    options: GridOptions

    constructor(
        public term: Term,
        public cells: string[],
        {
            minWidth = 6,
            useEqualWidth = false,
            gap = 2,
            direction = 'col',
        }: Partial<GridOptions> = {}
    ) {
        this.options = { minWidth, useEqualWidth, gap, direction }

        if (! cells.length) {
            this.rows = 0
            this.cols = 0
            this.colWidths = []
            return
        }

        if (useEqualWidth) {
            const colWidth = Math.max(minWidth, cells.map(str => term.getStringWidth(str)).max()) + gap
            const maxCols = Math.floor((term.cols + gap) / colWidth)
            this.rows = Math.ceil(cells.length / maxCols)
            this.cols = Math.ceil(cells.length / this.rows)
            this.colWidths = Array.replicate(this.cols, colWidth)
            return
        }

        const widths = cells.map(str => term.getStringWidth( str) + gap)
        const maxRows = this.calcMaxRows(widths)
        const { rows, colWidths } = Array
            .range(maxRows, 0, - 1)
            .findMap(rows => {
                const colWidths = Array
                    .range(0, Math.ceil(widths.length / rows))
                    .map(col => widths
                        .slice(col * rows, (col + 1) * rows)
                        .max()
                    )
                if (colWidths.sum() - gap > term.cols) return Control.continue
                return { rows, colWidths }
            })!
        const cols = colWidths.length

        this.rows = rows
        this.cols = cols
        this.colWidths = colWidths
    }

    private calcMaxRows(widths: number[]) {
        const { cols: termWidth } = this.term
        const sortedWidths = [ ...widths ].sort((a, b) => b - a)
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

    toString({
        formatter = id,
    }: GridToStringOptions = {}) {
        return Array
            .range(0, this.rows)
            .map(row => Array
                .range(0, this.cols)
                .map(col => {
                    const index = this.options.direction === 'col'
                        ? row + col * this.rows
                        : col + row * this.cols
                    const cell = this.cells[index]
                    return formatter((cell ?? '').padEnd(this.colWidths[col] - this.options.gap), index)
                        + (col === this.cols - 1 ? '\n' : ' '.repeat(this.options.gap))
                })
                .join('')
            )
            .join('')
    }
}
