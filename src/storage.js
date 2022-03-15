window.sto = JSON.parse(localStorage.SudoerOfMyself ?? "{}")

sto.__save = () => {
	localStorage.SudoerOfMyself = JSON.stringify(sto)
}

addEventListener("beforeunload", sto.__save)
