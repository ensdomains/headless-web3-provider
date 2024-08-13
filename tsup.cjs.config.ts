import { defineConfig } from 'tsup'

export default defineConfig({
	entry: ['src'],
	format: ['cjs'],
	dts: false,
})
