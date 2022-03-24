const { usrs } = sto

const specials = {
	bins: () => Object.entries(cmds).reduce((a, [ n, func ]) => (a[n] = {
		n,
		ty: "exe",
		cont: func.toString(),
		func,
		perm: perm.find(`cmds.${n}`) ? 755 : 750,
		owner: usrs.root
	}, a), {}),
	history: () => sto.history.join("\r\n")
}

const files = {
	ty: "dir",
	children: {
		bin: {
			ty: "dir",
			perm: 755,
			owner: usrs.root,
			children: specials.bins
		},
		home: {
			ty: "dir",
			perm: 755,
			owner: usrs.myself,
			children: {
				Memories: {
					ty: "dir",
					perm: 750,
					owner: usrs.myself,
					children: {
						"before_human.mem": {
							ty: "nor",
							perm: 750,
							owner: usrs.myself,
							cont: [
"[2099/07/?? 星期四 上午 ?] 花 ￥9980 买了 HumanOS 测试版，￥19 优惠券真不错。这玩意能大幅提高我的工作效率。把大脑挂载成 HumanFS 然后通过终端访问，真是不敢相信。", 
"[2099/07/?? 星期日 下午 ?] 安装服务居然要另行付费，怎么敢的呀。根据我这几天的考证，戴上头盔跑一下安装脚本就完事，绝无危险。",
"[2099/07/?? 星期五 下午 ?] 我的怂真是超出我的想象。再等几个月免费领正式版不香吗。",
"[2099/07/?? 星期五 晚上 ?] 我是傻逼，论文给删了，9902 年了怎么还有人不记得备份。",
"[2099/07/?? 星期五 晚上 ?] 或许我能从记忆里把它导出来。干了兄弟们。先戴头盔……诶对……文档里怎么没说有一键安装，纯纯**……网速好慢……我草什么东西?????????????????????????",
"[2099/07/13 星期五 晚上 23:30:05] 成了……是终端，好"
							].join("\r\n")
						}
					}
				},
				".history": {
					ty: "nor",
					perm: 750,
					owner: usrs.myself,
					cont: specials.history
				}
			}
		},
		dev: {
			ty: "dir",
			perm: 755,
			owner: usrs.root,
			children: {
				tty: {
					ty: "chr",
					perm: 666,
					owner: usrs.root
				},
				brain: {
					ty: "blk",
					perm: 660,
					owner: usrs.root
				},
				bd0: {
					ty: "blk",
					perm: 660,
					owner: usrs.root
				}
			}
		},
		"lost+found": {
			ty: "dir",
			perm: 700,
			owner: usrs.root,
			children: {
				".test_bad_file": {}
			}
		}
	}
}


const merge = (ds, db) => {
	if (typeof db.children === "string") {
		ds.children = db.children
		return
	}
	for (const [ n, fb ] of Object.entries(db.children)) {
		let fs = ds[n]
		if (fs === undefined) { // Note: `null` for deleted builtin files.
			ds.children[n] = fs = {}
			for (const attr in fb) {
				if (typeof fb[attr] === "function") Object.defineProperty(fs, attr, {
					get: () => fb[attr]()
				})
				else fs[attr] = fb[attr]
			}
			fs.n = fb.n = n
		} 
		if (fb.ty === "dir" && typeof fb.children !== "function") {
			merge(fs, fb)
		}
	}
}


if (typeof sto.files?.children !== "object" || Array.isArray(sto.files.children)) {
	sto.files = { ty: "dir", children: {} }
}
merge(sto.files, files)
