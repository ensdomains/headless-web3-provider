import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src'],
	format: ['esm'],
	bundle: false,
	dts: true,
})
