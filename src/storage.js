window.sto = JSON.parse(localStorage.SudoerOfMyself ?? "{}")

sto.__save = () => new Promise((res, rej) => {
	localStorage.SudoerOfMyself = JSON.stringify(sto)

	if (sto.__idb instanceof IDBDatabase && ext0.fs) {
		const putReq = sto.__idb.transaction("fs", "readwrite").objectStore("fs").put({
			id: 1,
			raw: ext0.fs.to_raw()
		})
		putReq.onsuccess = () => {
			console.log("EFS: saved fs to indexedDB")
			res()
		}
		putReq.onerror = rej
	}
})

sto.env ??= {}

initQ.push(new Promise((res, rej) => {
	const openReq = indexedDB.open("SudoerOfMyself", 1)
	openReq.onerror = rej
	openReq.onupgradeneeded = evt => {
		const idb = evt.target.result
		if (! idb.objectStoreNames.contains("fs")) {
			idb.createObjectStore("fs", { keyPath: "id" })
		}
	}
	openReq.onsuccess = evt => {
		const idb = sto.__idb = evt.target.result
		const getReq = idb.transaction("fs", "readonly").objectStore("fs").get(1)
		getReq.onsuccess = evt => {
			const fsRes = evt.target.result
			if (fsRes?.raw) {
				ext0.fs = ext0.FS.from_raw(fsRes.raw)
				console.log("EFS: loaded fs from indexedDB")
			}
			else {
				ext0.fs = new ext0.FS()
				console.log("EFS: created new fs")
				idb.transaction("fs", "readwrite").objectStore("fs").add({
					id: 1,
					raw: ext0.fs.to_raw()
				})
			}
			res()
		}
		getReq.onerror = rej
	}
}))

addEventListener("beforeunload", sto.__save)
