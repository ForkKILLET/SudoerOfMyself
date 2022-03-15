import { Terminal } from "xterm"
import { WebLinksAddon } from "xterm-addon-web-links"
import chalk from "chalk"
import stringWidth from "string-width"
import pack from "../package.json"
import sleep from "simple-async-sleep"
import minimist from "minimist"
import { Base64 } from "js-base64"

Object.assign(window, {
	Terminal,
	WebLinksAddon,
	chalk,
	stringWidth,
	pack,
	sleep,
	minimist,
	Base64
})
