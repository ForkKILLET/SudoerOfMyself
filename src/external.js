const initQ = []
const abortQ = []

import { Terminal } from "xterm"
import { WebLinksAddon } from "xterm-addon-web-links"
globalThis.term = new Terminal({
	rows: 30,
	cols: 97,
	cursorBlink: true,
	fontFamily: `"Fira Code", consolas, monospace`,
	bellStyle: "none"
})
term.loadAddon(new WebLinksAddon)
term.open(document.getElementById("xterm"))
term.focus()

import chalk from "chalk"
chalk.level = 3 // true colors

import stripAnsi from "strip-ansi"
const stringWidth = s => [ ...stripAnsi(s) ].reduce((a, c) => (
	a + term._core._inputHandler._unicodeService.wcwidth(c.charCodeAt())
), 0)

import sleep from "simple-async-sleep"
import minimist from "minimist"
import { Base64 } from "js-base64"
import * as Diff from "diff"
import _axios from "axios"
const axios = new Proxy(_axios, {
	get: (_, k) => (url, opt) => {
		const ac = new AbortController()
		abortQ.push(() => ac.abort())
		return _axios[k](url, {
			...opt,
			signal: ac.signal
		}).finally(() => abortQ.pop)
	}
})

import cmpSemVer from "semver-compare"

import pack from "../package.json"

import wasmbin from "./ext0_file_system/pkg/ext0_bg.wasm"
import wasminit, {
	init_panic_hook,
	FS, FileType, FileHandle, FileHandleMode, FileCreateOk, INode,
} from "./ext0_file_system/pkg"

const __debug = location.hostname === "localhost"
const __mobile = ("ontouchstart" in document.documentElement && /mobi/i.test(navigator.userAgent))

initQ.push(async () =>
	await wasminit(wasmbin).then(() => {
		if (__debug) init_panic_hook()
	})
)

Object.assign(globalThis, {
	initQ, abortQ,
	Terminal, WebLinksAddon,
	chalk,
	stripAnsi, stringWidth,
	pack,
	sleep,
	minimist,
	Base64,
	Diff,
	axios,
	cmpSemVer,
	ext0: {
		wasmbin, wasminit,
		FS, FileType, FileHandle, FileHandleMode, FileCreateOk, INode
	},
	__debug, __mobile
})
