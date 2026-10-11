import { describe, expect, test } from 'bun:test'
import { createCssDimensions } from '../plugins/clearvision-mobile/js/dimensions'

const initialRadii = {
	none: 0,
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 24,
	xxl: 32,
	round: 2147483647,
}
const initialSpace = {
	PX_0: 0,
	PX_4: 4,
	PX_6: 6,
	PX_8: 8,
	PX_10: 10,
	PX_12: 12,
	PX_16: 16,
	PX_20: 20,
	PX_24: 24,
	PX_26: 26,
	PX_30: 30,
	PX_32: 32,
	PX_40: 40,
	PX_48: 48,
	PX_64: 64,
	PX_80: 80,
	PX_96: 96,
	PX_128: 128,
	PX_160: 160,
	PX_192: 192,
}
type DimensionSet = {
	default: {
		radii: Record<string, number>
		space: Record<string, number>
		extra: string
	}
}

function makeTokens(): DimensionSet {
	return {
		default: {
			radii: { ...initialRadii },
			space: { ...initialSpace },
			extra: 'keep',
		},
	}
}

function cssName(group: 'radius' | 'space', key: string) {
	return `--discord-${group}-${key.toLowerCase().replace(/_/g, '-')}`
}

describe('ClearVision dimension CSS tokens', () => {
	test('generates names from all 8 radii and 20 spacing keys and applies each value', () => {
		const tokens = makeTokens()
		const theme = createCssDimensions(tokens)
		const vars: Record<string, string> = {}
		for (const [key, value] of Object.entries(tokens.default.radii))
			vars[cssName('radius', key)] = `${String(value + 1)}px`
		for (const [key, value] of Object.entries(tokens.default.space))
			vars[cssName('space', key)] = String(value + 1)

		expect(theme.count).toBe(28)
		expect(theme.metaTokenCSS).toHaveLength(28)
		expect(theme.metaTokenCSS).toContain('--discord-radius-md')
		expect(theme.metaTokenCSS).toContain('--discord-space-px-8')
		expect(theme.apply(vars)).toBe(28)
		for (const [key, value] of Object.entries(initialRadii))
			expect(tokens.default.radii[key]).toBe(value + 1)
		for (const [key, value] of Object.entries(initialSpace))
			expect(tokens.default.space[key]).toBe(value + 1)
	})

	test('maps the measured radius and spacing examples', () => {
		const tokens = makeTokens()
		const theme = createCssDimensions(tokens)

		theme.apply({
			'--discord-radius-md': '14px',
			'--discord-space-px-8': '10px',
		})

		expect(tokens.default.radii.md).toBe(14)
		expect(tokens.default.space.PX_8).toBe(10)
	})

	test('accepts finite non-negative numbers with or without px', () => {
		const tokens = makeTokens()
		const theme = createCssDimensions(tokens)

		expect(
			theme.apply({
				'--discord-radius-xs': '5.5px',
				'--discord-space-px-6': '7.25',
			}),
		).toBe(2)
		expect(tokens.default.radii.xs).toBe(5.5)
		expect(tokens.default.space.PX_6).toBe(7.25)
	})

	test('does not cap round values', () => {
		const tokens = makeTokens()
		const theme = createCssDimensions(tokens)

		theme.apply({ '--discord-radius-round': '3000000000px' })

		expect(tokens.default.radii.round).toBe(3000000000)
		theme.restore()
		expect(tokens.default.radii.round).toBe(2147483647)
	})

	test('ignores invalid and missing CSS values', () => {
		const tokens = makeTokens()
		const before = structuredClone(tokens)
		const theme = createCssDimensions(tokens)

		expect(
			theme.apply({
				'--discord-radius-md': '-1px',
				'--discord-radius-lg': 'Infinitypx',
				'--discord-radius-xl': 'NaN',
				'--discord-space-px-8': '1em',
			}),
		).toBe(0)
		expect(tokens).toEqual(before)
	})

	test('skips frozen groups but still applies writable groups', () => {
		const tokens = makeTokens()
		Object.freeze(tokens.default.radii)
		const theme = createCssDimensions(tokens)

		expect(
			theme.apply({
				'--discord-radius-md': '14px',
				'--discord-space-px-8': '10px',
			}),
		).toBe(1)
		expect(tokens.default.radii.md).toBe(12)
		expect(tokens.default.space.PX_8).toBe(10)

		theme.restore()
		expect(tokens.default.space.PX_8).toBe(8)
	})

	test('skips readonly properties without blocking other mappings', () => {
		const tokens = makeTokens()
		Object.defineProperty(tokens.default.radii, 'md', { writable: false })
		const theme = createCssDimensions(tokens)

		expect(
			theme.apply({
				'--discord-radius-md': '14px',
				'--discord-space-px-8': '10px',
			}),
		).toBe(1)
		expect(tokens.default.radii.md).toBe(12)
		expect(tokens.default.space.PX_8).toBe(10)
	})

	test('restores previous apply before applying new settings and restores on stop', () => {
		const tokens = makeTokens()
		const theme = createCssDimensions(tokens)

		theme.apply({ '--discord-radius-md': '14px' })
		theme.apply({ '--discord-space-px-8': '10px' })

		expect(tokens.default.radii.md).toBe(12)
		expect(tokens.default.space.PX_8).toBe(10)
		expect(tokens.default.extra).toBe('keep')

		theme.restore()

		expect(tokens.default).toEqual({
			radii: initialRadii,
			space: initialSpace,
			extra: 'keep',
		})
	})

	test('handles a missing token namespace as an empty theme', () => {
		const theme = createCssDimensions(undefined)

		expect(theme.count).toBe(0)
		expect(theme.metaTokenCSS).toEqual([])
		expect(theme.apply({ '--discord-radius-md': '14px' })).toBe(0)
		theme.restore()
	})
})
