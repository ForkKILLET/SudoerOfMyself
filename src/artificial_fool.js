export default ({ term, perm, sto }) => {
	const AF = {
		enable: () => sto.afOn = true,
		disable: () => sto.afOn = false,
		init: () => {
			term.listen("echo", async (text, opt) => {
				if (! perm.find("af")) return
				if (text.toLowerCase() === "hi human") {
					AF.enable()
					text = "Hi User"
				}
				else if (text.toLowerCase() === "bye human") {
					AF.disable()
					text = "Bye User"
				}
				else if (! sto.afOn) return
				sto.afTime ??= 0
				await term.echo([
					(text
						.replace(/[!?]/g, c => ({ "!": "！", "?": "？" } [c]))
						.replace(/[你我]/g, c => ({ "你": "我", "我": "你" } [c]))
						.replace(/吗？/g, "。")
						.replace(/？$/, "？我也不知道。")
					+ (opt.angrily ? "……怎么了 User，不要生气呢~" : ""))
					+ (opt.tremulously ? "……克服恐惧最好的方式就是面对它！" : "")
					+ (opt.seriously ? "……啊对对对！" : "")
					+ (opt.sadly ? " ( ´・ω・)ノ(._.`)" : "")
					|| "User，你怎么不说话啦"
				], { c: "cyan", t: 80 })
				await term.trigger("af", ++ sto.afTime)
			})
		}
	}
	AF.init()
	return AF
}
