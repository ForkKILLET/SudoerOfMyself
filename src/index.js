import "./external.js"
import "./storage.js"
import "./sandbox.js"
import "./shell.js"
import "./tab_complete.js"
import "./xterm_ex.js"
import "./mobile.js";
import "./status_bar.js"
import "./perm.js"
import "./jsfs_file_system.js"
import "./human_pages.js"
import "./command.js"
import "./artificial_fool.js"
import "./file_builtin.js"
import "./loop.js"
import "./level.js"

(async () => {
	while (initQ.length) await initQ.shift()()
})()
