import { expect, mock, test } from 'bun:test'

const textDefaults = { style: { fontSize: 16 } }
const Text = { defaultProps: textDefaults as unknown }
const token = () => ({
	dark: { raw: 'ORIGINAL', opacity: 1 },
	light: { raw: 'ORIGINAL', opacity: 1 },
	darker: { raw: 'ORIGINAL', opacity: 1 },
	midnight: { raw: 'ORIGINAL', opacity: 1 },
})
const Tokens = {
	SemanticColor: { TEXT_DEFAULT: token(), BACKGROUND_BASE_LOWEST: token() },
	RawColor: { ORIGINAL: '#323339' },
	default: { radii: {}, space: {} },
}
mock.module('@revenge-mod/discord/common/tokens', () => ({ Tokens }))
mock.module('@revenge-mod/modules/finders', () => ({
	getModules: () => () => {},
}))
mock.module('@revenge-mod/modules/finders/filters', () => ({
	createFilterGenerator: () => () => ({}),
}))
mock.module('@revenge-mod/patcher', () => ({ after: () => () => {} }))
mock.module('../plugins/clearvision-mobile/js/settings', () => ({
	default: () => null,
}))
mock.module('react-native', () => ({
	Text,
	processColor: (color: string) => {
		if (color === 'transparent') return 0
		if (color.startsWith('#')) return 0xff000000 | parseInt(color.slice(1), 16)
		const parts = color.match(/[\d.]+/g)?.map(Number)
		return parts && parts.length >= 3
			? ((Math.round((parts[3] ?? 1) * 255) << 24) |
					(parts[0]! << 16) |
					(parts[1]! << 8) |
					parts[2]!) >>>
					0
			: undefined
	},
}))

test('CSS storage updates use the cache and publish readable shading without resetting the theme', async () => {
	const refresh = mock(() => {})
	const shared = globalThis as typeof globalThis & {
		__revengeNextBgVideoMobile?: unknown
		__revengeNextClearVisionMobile?: {
			panelColors: Record<string, string>
			backgroundOverlay: string
			refresh: () => void
		}
	}
	shared.__revengeNextBgVideoMobile = {
		active: true,
		transparentPanels: true,
		refresh,
	}
	const oldFactory = Reflect.get(globalThis, 'plugin')
	Reflect.set(globalThis, 'plugin', (configuration: unknown) => configuration)
	const plugin = (await import('../plugins/clearvision-mobile/js/index'))
		.default
	if (oldFactory === undefined) Reflect.deleteProperty(globalThis, 'plugin')
	else Reflect.set(globalThis, 'plugin', oldFactory)
	let stored = {
		customCss:
			':root { --normal-text: #abcdef; --background-shading: rgba(7,11,26,0.68); --card-shading: rgba(16,20,39,0.64); --input-shading: rgba(10,15,33,0.74); --header-shading: rgba(10,15,33,0.46); --member-list-shading: rgba(9,14,31,0.22); --member-card-shading: rgba(21,27,48,0.38); }',
	}
	let notify: (value?: unknown) => void = () => {}
	const disposers: Array<() => void> = []
	await plugin.start!({
		cleanup: (callback: () => void) => disposers.push(callback),
		jsonStorage: {
			get: async () => stored,
			get cache() {
				return stored
			},
			subscribe: (listener: typeof notify) => {
				notify = listener
				return () => {}
			},
		},
	} as never)
	try {
		expect(
			(Tokens.RawColor as Record<string, string>)[
				Tokens.SemanticColor.TEXT_DEFAULT.dark.raw
			],
		).toBe('#abcdef')
		expect(Tokens.SemanticColor.BACKGROUND_BASE_LOWEST.dark.opacity).toBe(0)
		expect(shared.__revengeNextClearVisionMobile?.panelColors.card).toStartWith(
			'rgba(16,20,39,',
		)
		expect(
			shared.__revengeNextClearVisionMobile?.panelColors.input,
		).toStartWith('rgba(10,15,33,')
		expect(
			shared.__revengeNextClearVisionMobile?.backgroundOverlay,
		).toStartWith('rgba(7,11,26,')
		expect(
			shared.__revengeNextClearVisionMobile?.panelColors.header,
		).toStartWith('rgba(10,15,33,')
		expect(
			shared.__revengeNextClearVisionMobile?.panelColors.memberList,
		).toStartWith('rgba(9,14,31,')
		expect(
			shared.__revengeNextClearVisionMobile?.panelColors.memberCard,
		).toStartWith('rgba(21,27,48,')
		stored = {
			customCss:
				':root { --normal-text: #fedcba; --background-shading: rgba(5,8,23,0.73); }',
		}
		notify({ unrelatedDelta: true })
		expect(
			(Tokens.RawColor as Record<string, string>)[
				Tokens.SemanticColor.TEXT_DEFAULT.dark.raw
			],
		).toBe('#fedcba')
		expect(
			shared.__revengeNextClearVisionMobile?.backgroundOverlay,
		).toStartWith('rgba(5,8,23,')
		expect(refresh.mock.calls.length).toBeGreaterThanOrEqual(2)
	} finally {
		for (const dispose of disposers.reverse()) dispose()
		shared.__revengeNextBgVideoMobile = undefined
	}
	expect(shared.__revengeNextClearVisionMobile).toBeUndefined()
	expect(Tokens.SemanticColor.TEXT_DEFAULT.dark).toEqual({
		raw: 'ORIGINAL',
		opacity: 1,
	})
	expect(Tokens.RawColor).toEqual({ ORIGINAL: '#323339' })
	expect(Text.defaultProps).toBe(textDefaults)
	Reflect.deleteProperty(Text, 'defaultProps')
	const secondDisposers: Array<() => void> = []
	await plugin.start!({
		cleanup: (callback: () => void) => secondDisposers.push(callback),
		jsonStorage: {
			get: async () => stored,
			get cache() {
				return stored
			},
			subscribe: (listener: typeof notify) => {
				notify = listener
				return () => {}
			},
		},
	} as never)
	notify({ unrelatedDelta: true })
	for (const dispose of secondDisposers.reverse()) dispose()
	expect(Object.hasOwn(Text, 'defaultProps')).toBe(false)
	Text.defaultProps = textDefaults
})
