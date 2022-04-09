if (__mobile) {
	let tid = null
	term.element.addEventListener("touchstart", () => {
		tid = setTimeout(async () => {
			tid = null
			await term.tryFastForward()
		}, 700)
	})

	const cancel = () => clearTimeout(tid)
	term.element.addEventListener("touchend", cancel)
	term.element.addEventListener("touchmove", cancel)
}
