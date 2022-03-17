window.sto = JSON.parse(localStorage.SudoerOfMyself ?? "{}")

sto.__save = () => {
	localStorage.SudoerOfMyself = JSON.stringify(sto)
}

sto.env ??= {}

addEventListener("beforeunload", sto.__save)
