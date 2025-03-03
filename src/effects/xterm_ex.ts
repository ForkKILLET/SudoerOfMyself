declare module '@xterm/xterm' {
    interface Terminal {
        _core: {
            unicodeService: {
                _activeProvider: {
                    wcwidth: (ucs: number) => 0 | 1 | 2
                }
            }
        }
    }
}
