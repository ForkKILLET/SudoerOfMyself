import { Terminal } from "xterm"
import { WebLinksAddon } from "xterm-addon-web-links"
window.term = new Terminal({
	rows: 30,
	cols: 97,
	cursorBlink: true,
	fontFamily: "'Fira Code', consolas, monospace"
})
term.loadAddon(new WebLinksAddon)
term.open(document.getElementById("xterm"))

import chalk from "chalk"
chalk.level = 3 // true colors

import stringWidth from "string-width"
import sleep from "simple-async-sleep"
import minimist from "minimist"
import { Base64 } from "js-base64"
import * as Diff from "diff"
import pack from "../package.json"

import wasmbin from "./ext0/pkg/ext0_bg.wasm"
import wasminit, {
	init_panic_hook,
	FS, FileType, FileHandle, FileHandleMode, FileCreateOk, INode,
} from "./ext0/pkg"

const __debug = location.hostname === "localhost"
const initQ = []
initQ.push(
	wasminit(wasmbin).then(() => {
		if (__debug) init_panic_hook()
	})
)

const abortQ = []

const _fetch = fetch
fetch = async (url, opt = {}) => {
	const ac = new AbortController()
	abortQ.push(() => ac.abort())
	const res = await _fetch(url, { ...opt, signal: ac.signal })
	abortQ.pop()
	return res
}

Object.assign(window, {
	initQ,
	abortQ,
	Terminal,
	WebLinksAddon,
	chalk,
	stringWidth,
	pack,
	sleep,
	minimist,
	Base64,
	Diff,
	ext0: {
		wasmbin, wasminit,
		FS, FileType, FileHandle, FileHandleMode, FileCreateOk, INode
	}
})
