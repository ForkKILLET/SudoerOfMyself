globalThis.humanPages = {
	"": [
		"您需要什么手册页？",
		"例如，尝试使用 `human human`。"
	],
	version: [
		"显示 SudoerOfMyself 的版本。",
		"`version --dependence | -d` 显示 npm 依赖",
		"`version --log | -l`        显示 git 日志，来源 GitHub API"
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
		"连接文件并在标准输出上输出。",
		"`cat --show-all | -A` 以 16 进制码的形式显示控制字符。"
	],
	sl: [
		"Save/Load",
		"`sl --save | -s`                     手动存档。（不是必要的，关闭标签页时会自动存档）",
		"`sl --auto-save | -a [ second=10 ]`  每 second 秒自动存档一次。",
		"`sl --export | -e`                   导出存档为任人摆布的 JSON。",
		"`sl --export-clip | -E`              导出存档到剪贴板。",
		"`sl --import | -i < JSON >`          从 JSON 导入存档。",
		"`sl --import-clip | -I`              从剪贴板导入存档。（火狐等浏览器可能不支持）",
		"`sl --locomotive | -l`               （懂的都懂）",
		"`sl --base64 | -b`                   与导入/导出操作连用，使用 base64 编码。"
	],
	blog: [
		"Blog Viewer of OIer Space",
		"`blog --posts | -p <blog>`           列出所有博客文章",
		"`blog --category=<category> <blog>`  列出标签下的博文",
		"`blog --categories | -c <blog>`      列出所有博客标签",
		"`blog <blog> <post>`                 查看博客文章"
	],
	"fsts.ext0": [
		"测试 ext0 文件系统（保存于 indexedDB）",
		"`fsts.ext0 [@preset | str='Hello, ext0!' ]`  测试预设 preset 或字符串 str",
		"`fsts.ext0 --result-only | -r`               只显示测试结果",
		"`fsts.ext0 --result-size-only | -R`          只显示测试结果中字符串大小",
		"`fsts.ext0 --buff | -b`                      以 Uint8Array 形式显示读出的缓冲区",
		"`fsts.ext0 --expose | -e`                    将临时文件系统对象暴露到 javascript 全局",
		"`fsts.ext0 --diff | -d`                      以 diff 显示测试结果",
		"`fsts.ext0 --with-inode | -i`                指定存在的 inode 并测试其指向的文件内容",
		"",
		"预设：",
		"`1b1b`: 1 block + 1 byte 用于测试 inode 中 block ptr 能否工作",
		"`4b1b`: 4 block + 1 byte 用于测试 inode 中 block ptr 正好用完时能否正常工作",
		"`5b1b`: 5 block + 1 byte 用于测试 inode 中 block ptr 用完后能否开辟 ptr node",
		"`6b1b`: 6 block + 1 byte 用于测试 ptr node 中能否继续加入 block ptr",
		"`cjk`:  测试中日韩字符和 emoji",
		"`ansi`: 测试 ANSI 转义"
	],
	bag: [
		"专用于 HumanOS 的软件`包`管理器",
		"`bag sync`                      同步软件包列表",
		"          `--purge | -p`        更新 jsDelivr 远端缓存",
		"`bag add`                       添加软件包",
		"`bag remove`                    删除软件包",
		"`bag list`                      显示软件包列表"
	]
}
