require("esbuild").buildSync({
	entryPoints: [ "src/index.js" ],
	bundle: true,
	minify: true,
	sourcemap: true,
	format: "iife",
	outfile: "docs/bundle.js",
	define: { __build: `"${new Date().toLocaleString()}"` }
})
