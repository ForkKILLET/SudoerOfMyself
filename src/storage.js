window.sto = JSON.parse(localStorage.SudoerOfMyself ?? "{}")

sto.__save = () => {
	localStorage.SudoerOfMyself = JSON.stringify(sto)
}

sto.env ??= {}

initJobs.push(async () => new Promise((res, rej) => {
	const openReq = indexedDB.open("SudoerOfMyself", 1)
	openReq.onerror = rej
	openReq.onsuccess = db => {
		window.idb = db
		res()
	}
	openReq.onupgradeneeded = evt => {
		evt.target.result
	}
}))

addEventListener("beforeunload", sto.__save)
