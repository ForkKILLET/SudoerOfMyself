export interface EditorShortcut {
  key: string
  label: string
}

export type EditorShortcutSlot = EditorShortcut | null

// Column-major pairs keep related commands on the same two-row panel.
export const NANO_SHORTCUTS: readonly EditorShortcutSlot[] = [
  { key: '^G', label: 'Help' },
  { key: '^X', label: 'Exit' },
  { key: '^O', label: 'Write' },
  null,
  { key: '^F', label: 'Search' },
  null,
  { key: '^K', label: 'Cut' },
  { key: '^U', label: 'Paste' },
  null,
  null,
  { key: '^C', label: 'Position' },
  { key: '^/', label: 'Go To' },
  { key: 'M-U', label: 'Undo' },
  { key: 'M-E', label: 'Redo' },
  { key: 'M-A', label: 'Set Mark' },
  { key: 'M-6', label: 'Copy' },
]

// Search prompt entries are column-major to match nano's two-row footer.
export const NANO_SEARCH_SHORTCUTS: readonly EditorShortcut[] = [
  { key: '^G', label: 'Help' },
  { key: '^C', label: 'Cancel' },
]

// The blank upper slot places Cancel below the empty second column, as in nano.
export const NANO_EXIT_SHORTCUTS: readonly EditorShortcutSlot[] = [
  { key: 'Y', label: 'Yes' },
  { key: 'N', label: 'No' },
  null,
  { key: '^C', label: 'Cancel' },
]

export const NANO_HELP = [
  'HumanOS nano help',
  '',
  '^ means Ctrl; M- means Alt (Meta).',
  'Type or paste text to edit. Changes stay in memory until you write the file.',
  '',
  'FILES',
  '^O          Write the buffer; edit the filename to save as another file.',
  '^X          Exit; a modified buffer asks whether to save or discard.',
  '',
  'FIND AND NAVIGATE',
  '^F / ^W     Search forward for literal, case-sensitive text; wraps at EOF.',
  '            ^W may be reserved by the browser; ^F works in a normal tab.',
  'M-W         Find the next occurrence. Empty search reuses the last query.',
  '^/          Go to line or line,column (both start at 1).',
  '^C          Show current line and character column.',
  'Arrows      Move the cursor. ^B/^P/^N also move left/up/down.',
  'Home / ^A   Start of line. End / ^E: end of line.',
  'PgUp / ^Y   Page up. PgDn / ^V: page down.',
  'Ctrl+Home   Start of file. Ctrl+End: end of file.',
  'M-< / M->   Also move to start/end of file.',
  'Ctrl+Left   Previous word. Ctrl+Right: next word.',
  'M-#         Toggle line numbers. Start with nano -l / --linenumbers to enable.',
  '',
  'EDITING',
  '^6 / M-A    Set or unset the mark; move the cursor to select text.',
  '^K          Cut a selection, or a whole line when no mark is set. Line cuts append.',
  'M-6         Copy a whole line without removing it. With a mark, copy the selection.',
  '^U          Insert the cut buffer at the cursor (not the system clipboard).',
  'M-U / ^Z    Undo. M-E / ^R: redo.',
  'Backspace   Delete backward. Delete / ^D: delete forward.',
  'Enter / Tab Insert a newline or tab.',
  '',
  'PROMPTS',
  'Left/Right, Home/End, Backspace/Delete edit prompt text.',
  '^A/^E move to the start/end; ^U clears the prompt.',
  'Enter accepts. ^C or Escape cancels.',
  '',
  'HELP',
  'Up/Down or PgUp/PgDn scroll this page; Home/End jump to its ends.',
  '^X, ^G, ^C or Escape returns to the unchanged editing buffer.',
] as const
