export default {
	"": [
		"您需要什么手册页？",
		"例如，尝试使用 `human human`。"
	],
	version: [
		"显示 SudoerOfMyself 的版本。",
		"`version --dependence | -d` 显示依赖"
	],
	logo: [
		"显示 SudoerOfMyself 的图标。"
	],
	human: [
		"具有人工智能的、系统参考手册的接口。"
	],
	echo: [
		"显示一行思想。",
		"`echo --angrily | -a`      生气地想",
		"`echo --tremulously | -t`  发抖地想",
		"`echo --seriously | -S`    严肃地想",
		"`echo --sadly | -s`        伤心地想"
	],
	pwd: [
		"显示出当前工作目录的名称。"
	],
	ls: [
		"列出目录内容。",
		"`-a | --all`      列出所有文件，包括以 `.` 开头的隐含文件。",
		"`-l | --long`     除每个文件名外，增加显示文件类型、权限、所有者名。",
		"`-c | --color`    使用颜色区别文件类别。",
		"`-F | --classify` 在每个文件名后附上一个字符以说明该文件的类型。",
		"                `*` 表示普通的可执行文件；`/` 表示目录；`@` 表示符号链接；`|` 表示管道 (FIFO)；",
		"                `=` 表示套接字 (socket) ；`#` 表示块设备；`%` 表示字符设备；什么也没有则表示普通文件。"
	],
	cd: [
		"改变当前的工作目录。"
	],
	cat: [
		"连接文件并在标准输出上输出。"
	],
	sl: [
		"Save/Load",
		"`sl --save | -s`                  手动存档（会在关闭标签页时自动存档）",
		"`sl --auto-save | -a [ second ]`  每 second 秒自动存档一次，默认为 10",
		"`sl --export | -e`                导出存档为任人摆布的 JSON",
		"`sl --export-clip | -E`           导出存档到剪贴板",
		"`sl --import | -i < JSON >`       从 JSON 导入存档",
		"`sl --import-clip | -I`           从剪贴板导入存档（部分浏览器可能不支持）",
		"`sl --locomotive | -l`            懂的都懂"
	]
}
