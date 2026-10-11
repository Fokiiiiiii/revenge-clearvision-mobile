import { describe, expect, test } from 'bun:test'
import { createCssTokenTheme } from '../plugins/clearvision-mobile/js/tokens'

const modes = ['dark', 'light', 'darker', 'midnight'] as const
type Mode = (typeof modes)[number]
type ColorDef = { raw: string; opacity: number }
type GradientDef = { color: string; opacity: number }
type SemanticDef = Record<Mode, ColorDef> & {
	gradient: { dark: GradientDef; light: GradientDef }
}
type TokenSet = {
	Tokens: {
		SemanticColor: Record<string, SemanticDef>
		RawColor: Record<string, string>
	}
	default: {
		colors: { BACKGROUND_BASE_LOWEST: string }
		internal: {
			resolveSemanticColor: (
				mode: Mode,
				token: string,
				vars: Record<string, unknown>,
			) => string
		}
	}
}

function slug(name: string) {
	return name.replace(/_/g, '-').toLowerCase()
}

function customRawKey(name: string, mode: Mode) {
	return (
		'REVENGE_CV_CSS_' +
		mode.toUpperCase() +
		'_' +
		slug(name).replace(/-/g, '_').toUpperCase()
	)
}

function makeDefinition(index: number): SemanticDef {
	return {
		dark: { raw: `BASE_D_${index}`, opacity: 0.41 },
		light: { raw: `BASE_L_${index}`, opacity: 0.42 },
		darker: { raw: `BASE_DR_${index}`, opacity: 0.43 },
		midnight: { raw: `BASE_M_${index}`, opacity: 0.44 },
		gradient: {
			dark: { color: `GRAD_D_${index}`, opacity: 0.31 },
			light: { color: `GRAD_L_${index}`, opacity: 0.32 },
		},
	}
}

function makeTokens(names: string[]): TokenSet {
	const SemanticColor = Object.fromEntries(
		names.map((name, index) => [name, makeDefinition(index)]),
	) as Record<string, SemanticDef>
	const RawColor: Record<string, string> = {}
	names.forEach((_, index) => {
		RawColor[`BASE_D_${index}`] = '#101010'
		RawColor[`BASE_L_${index}`] = '#111111'
		RawColor[`BASE_DR_${index}`] = '#121212'
		RawColor[`BASE_M_${index}`] = '#131313'
		RawColor[`GRAD_D_${index}`] = '#202020'
		RawColor[`GRAD_L_${index}`] = '#212121'
	})
	const tokens = { Tokens: { SemanticColor, RawColor } } as TokenSet
	tokens.default = {
		colors: { BACKGROUND_BASE_LOWEST: 'BACKGROUND_BASE_LOWEST' },
		internal: {
			resolveSemanticColor(mode, token) {
				const def = SemanticColor[token]![mode]
				const raw = RawColor[def.raw]!
				const alpha = Math.round(def.opacity * 255)
					.toString(16)
					.padStart(2, '0')
				return def.opacity === 1 ? raw : raw + alpha
			},
		},
	}
	return tokens
}

function colorOf(tokens: TokenSet, name: string, mode: Mode = 'dark') {
	const raw = tokens.Tokens.SemanticColor[name]![mode].raw
	return tokens.Tokens.RawColor[raw]
}

describe('ClearVision semantic CSS tokens', () => {
	test('maps all 409 semantic tokens by their direct CSS slug in all four modes', () => {
		const names = Array.from(
			{ length: 409 },
			(_, index) => `SYNTHETIC_TOKEN_${index}`,
		)
		const tokens = makeTokens(names)
		const theme = createCssTokenTheme(tokens)
		const vars = Object.fromEntries(
			names.map((name, index) => [
				`--discord-${slug(name)}`,
				`#${index.toString(16).padStart(6, '0')}`,
			]),
		)

		expect(theme.count).toBe(409)
		expect(theme.apply(vars, false)).toBe(409)
		expect(theme.mappings).toBe(409)
		names.forEach((name, index) => {
			const expected = `#${index.toString(16).padStart(6, '0')}`
			modes.forEach(mode => expect(colorOf(tokens, name, mode)).toBe(expected))
		})
	})

	test('matches the measured native semantic resolver contract', () => {
		const tokens = makeTokens(['BACKGROUND_BASE_LOWEST'])
		const def = tokens.Tokens.SemanticColor.BACKGROUND_BASE_LOWEST!
		def.dark = { raw: 'NEUTRAL_73', opacity: 1 }
		tokens.Tokens.RawColor.NEUTRAL_73 = '#2c2d32'
		const theme = createCssTokenTheme(tokens)
		expect(theme.originalBackgroundColors).toContain('#2c2d32')
		const baseline = [...theme.originalBackgroundColors]

		theme.apply(
			{ '--discord-background-base-lowest': 'rgba(24, 32, 57, 0.73)' },
			false,
		)

		expect(
			tokens.default.internal.resolveSemanticColor(
				'dark',
				tokens.default.colors.BACKGROUND_BASE_LOWEST,
				{},
			),
		).toBe('#182039ba')
		expect(theme.originalBackgroundColors).toEqual(baseline)

		theme.restore()

		expect(def.dark).toEqual({ raw: 'NEUTRAL_73', opacity: 1 })
		expect(tokens.Tokens.RawColor.NEUTRAL_73).toBe('#2c2d32')
	})
	test('accepts hex, rgb, rgba, and transparent colors with their alpha', () => {
		const values = [
			['#abc', '#aabbcc', 1],
			['#abcd', '#aabbcc', 0xdd / 255],
			['#123456', '#123456', 1],
			['#12345678', '#123456', 0x78 / 255],
			['rgb(1, 2, 3)', '#010203', 1],
			['rgba(1, 2, 3, 0.4)', '#010203', 0.4],
			['transparent', '#000000', 0],
		] as const
		const names = values.map((_, index) => `COLOR_${index}`)
		const tokens = makeTokens(names)
		const theme = createCssTokenTheme(tokens)

		theme.apply(
			Object.fromEntries(
				values.map(([value], index) => [
					`--discord-${slug(names[index]!)}`,
					value,
				]),
			),
			false,
		)
		values.forEach(([, expected, opacity], index) => {
			const def = tokens.Tokens.SemanticColor[names[index]!]!
			expect(colorOf(tokens, names[index]!)).toBe(expected)
			expect(def.dark.opacity).toBeCloseTo(opacity)
		})
	})

	test('maps ClearVision aliases and gives direct semantic slugs priority', () => {
		const names = [
			'TEXT_DEFAULT',
			'TEXT_STRONG',
			'TEXT_SUBTLE',
			'TEXT_MUTED',
			'TEXT_LINK',
			'INTERACTIVE_TEXT',
			'ICON_DEFAULT',
			'INTERACTIVE_HOVER',
			'ICON_HOVER',
			'INTERACTIVE_ACTIVE',
			'ICON_ACTIVE',
			'CHANNELS_DEFAULT',
			'CHANNEL_ICON',
			'BORDER_FOCUS',
			'TEXT_STATUS_ONLINE',
			'TEXT_STATUS_IDLE',
			'TEXT_STATUS_DND',
			'TEXT_STATUS_OFFLINE',
			'STATUS_DANGER',
			'FEEDBACK_CRITICAL',
			'TEXT_FEEDBACK_POSITIVE',
		]
		const tokens = makeTokens(names)
		const theme = createCssTokenTheme(tokens)
		theme.apply(
			{
				'--text-normal': '#111111',
				'--normal-text': '#121212',
				'--discord-text-default': '#abcdef',
				'--header-primary': '#222222',
				'--text-secondary': '#333333',
				'--muted-text': '#444444',
				'--text-link': '#555555',
				'--interactive-normal': '#666666',
				'--interactive-hover': '#777777',
				'--interactive-active': '#888888',
				'--channel-normal': '#999999',
				'--focus-color': '#aaaaaa',
				'--online-color': '#00aa00',
				'--idle-color': '#aabb00',
				'--dnd-color': '#bb0000',
				'--offline-color': '#bbbbbb',
				'--danger-color': '#cc0000',
				'--text-danger': '#dd0000',
				'--text-positive': '#00cc88',
				'--success-color': '#00dd99',
			},
			false,
		)

		expect(colorOf(tokens, 'TEXT_DEFAULT')).toBe('#abcdef')
		expect(colorOf(tokens, 'TEXT_STRONG')).toBe('#222222')
		expect(colorOf(tokens, 'TEXT_SUBTLE')).toBe('#333333')
		expect(colorOf(tokens, 'TEXT_MUTED')).toBe('#444444')
		expect(colorOf(tokens, 'TEXT_LINK')).toBe('#555555')
		expect(colorOf(tokens, 'INTERACTIVE_TEXT')).toBe('#666666')
		expect(colorOf(tokens, 'ICON_DEFAULT')).toBe('#666666')
		expect(colorOf(tokens, 'INTERACTIVE_HOVER')).toBe('#777777')
		expect(colorOf(tokens, 'ICON_HOVER')).toBe('#777777')
		expect(colorOf(tokens, 'INTERACTIVE_ACTIVE')).toBe('#888888')
		expect(colorOf(tokens, 'ICON_ACTIVE')).toBe('#888888')
		expect(colorOf(tokens, 'CHANNELS_DEFAULT')).toBe('#999999')
		expect(colorOf(tokens, 'CHANNEL_ICON')).toBe('#999999')
		expect(colorOf(tokens, 'BORDER_FOCUS')).toBe('#aaaaaa')
		expect(colorOf(tokens, 'TEXT_STATUS_ONLINE')).toBe('#00aa00')
		expect(colorOf(tokens, 'TEXT_STATUS_IDLE')).toBe('#aabb00')
		expect(colorOf(tokens, 'TEXT_STATUS_DND')).toBe('#bb0000')
		expect(colorOf(tokens, 'TEXT_STATUS_OFFLINE')).toBe('#bbbbbb')
		expect(colorOf(tokens, 'STATUS_DANGER')).toBe('#cc0000')
		expect(colorOf(tokens, 'FEEDBACK_CRITICAL')).toBe('#dd0000')
		expect(colorOf(tokens, 'TEXT_FEEDBACK_POSITIVE')).toBe('#00cc88')
	})

	test('ignores invalid colors without changing tokens or RawColor', () => {
		const tokens = makeTokens(['TEXT_DEFAULT'])
		const theme = createCssTokenTheme(tokens)
		const originalSemantic = structuredClone(tokens.Tokens.SemanticColor)
		const originalRaw = { ...tokens.Tokens.RawColor }

		theme.apply({ '--discord-text-default': 'hsl(220 20% 30%)' }, false)

		expect(tokens.Tokens.SemanticColor).toEqual(originalSemantic)
		expect(tokens.Tokens.RawColor).toEqual(originalRaw)
		expect(theme.mappings).toBe(0)
	})

	test('applies the shading percent as a multiplier of color alpha', () => {
		const tokens = makeTokens([
			'BACKGROUND_BASE_HIGH',
			'CARD_BACKGROUND_PRIMARY',
			'MODAL_BACKGROUND_PRIMARY',
		])
		const theme = createCssTokenTheme(tokens)

		theme.apply(
			{
				'--background-shading-percent': '92%',
				'--background-shading': 'rgba(24, 32, 57, 0.73)',
				'--card-shading': '#182039ba',
				'--modal-shading': 'rgb(24 32 57)',
			},
			false,
		)

		expect(
			tokens.Tokens.SemanticColor.BACKGROUND_BASE_HIGH!.dark.opacity,
		).toBeCloseTo(0.73 * 0.92)
		expect(
			tokens.Tokens.SemanticColor.CARD_BACKGROUND_PRIMARY!.dark.opacity,
		).toBeCloseTo((0xba / 255) * 0.92)
		expect(
			tokens.Tokens.SemanticColor.MODAL_BACKGROUND_PRIMARY!.dark.opacity,
		).toBeCloseTo(0.92)
	})

	test('maps card, modal, popout, menu, and input shading families', () => {
		const names = [
			'BACKGROUND_SURFACE_LOW',
			'CHANNEL_BACKGROUND_DEFAULT',
			'CARD_BACKGROUND_PRIMARY',
			'BACKGROUND_CARD_SECONDARY',
			'MODAL_BACKGROUND_PRIMARY',
			'BACKGROUND_MODAL_SECONDARY',
			'POPOUT_BACKGROUND_PRIMARY',
			'MENU_BG',
			'CHAT_INPUT_BACKGROUND',
			'CHANNELTEXTAREA_BACKGROUND',
		]
		const tokens = makeTokens(names)
		const theme = createCssTokenTheme(tokens)

		theme.apply(
			{
				'--background-shading': '#111111',
				'--card-shading': '#222222',
				'--modal-shading': '#333333',
				'--popout-shading': '#444444',
				'--input-shading': '#555555',
			},
			false,
		)

		expect(colorOf(tokens, 'BACKGROUND_SURFACE_LOW')).toBe('#111111')
		expect(colorOf(tokens, 'CHANNEL_BACKGROUND_DEFAULT')).toBe('#111111')
		expect(colorOf(tokens, 'CARD_BACKGROUND_PRIMARY')).toBe('#222222')
		expect(colorOf(tokens, 'BACKGROUND_CARD_SECONDARY')).toBe('#222222')
		expect(colorOf(tokens, 'MODAL_BACKGROUND_PRIMARY')).toBe('#333333')
		expect(colorOf(tokens, 'BACKGROUND_MODAL_SECONDARY')).toBe('#333333')
		expect(colorOf(tokens, 'POPOUT_BACKGROUND_PRIMARY')).toBe('#444444')
		expect(colorOf(tokens, 'MENU_BG')).toBe('#444444')
		expect(colorOf(tokens, 'CHAT_INPUT_BACKGROUND')).toBe('#555555')
		expect(colorOf(tokens, 'CHANNELTEXTAREA_BACKGROUND')).toBe('#555555')
	})
	test('makes the six root backgrounds transparent with BgVideo active, while modal shading remains', () => {
		const roots = [
			'BACKGROUND_BASE_LOW',
			'BACKGROUND_BASE_LOWER',
			'BACKGROUND_BASE_LOWEST',
			'BACKGROUND_SURFACE_HIGH',
			'BACKGROUND_SURFACE_HIGHEST',
			'CHANNEL_BACKGROUND_DEFAULT',
		]
		const names = [
			...roots,
			'BACKGROUND_BASE_HIGH',
			'CARD_BACKGROUND_PRIMARY',
			'MODAL_BACKGROUND_PRIMARY',
		]
		const tokens = makeTokens(names)
		const theme = createCssTokenTheme(tokens)

		theme.apply(
			{
				'--background-shading': 'rgba(24, 32, 57, 0.8)',
				'--card-shading': 'rgba(24, 32, 57, 0.6)',
				'--modal-shading': 'rgba(24, 32, 57, 0.4)',
			},
			true,
		)

		roots.forEach(name => {
			const def = tokens.Tokens.SemanticColor[name]!
			modes.forEach(mode => expect(def[mode].opacity).toBe(0))
			expect(def.gradient.dark.opacity).toBe(0)
			expect(def.gradient.light.opacity).toBe(0)
		})
		expect(
			tokens.Tokens.SemanticColor.BACKGROUND_BASE_HIGH!.dark.opacity,
		).toBeCloseTo(0.8)
		expect(
			tokens.Tokens.SemanticColor.CARD_BACKGROUND_PRIMARY!.dark.opacity,
		).toBeCloseTo(0.6)
		expect(
			tokens.Tokens.SemanticColor.MODAL_BACKGROUND_PRIMARY!.dark.opacity,
		).toBeCloseTo(0.4)
	})

	test('restores all four modes, gradients, and pre-existing RawColor keys exactly', () => {
		const tokens = makeTokens(['TEXT_DEFAULT'])
		const key = customRawKey('TEXT_DEFAULT', 'dark')
		tokens.Tokens.RawColor[key] = '#123456'
		const originalSemantic = structuredClone(tokens.Tokens.SemanticColor)
		const originalRaw = { ...tokens.Tokens.RawColor }
		const theme = createCssTokenTheme(tokens)

		theme.apply({ '--discord-text-default': 'rgba(24, 32, 57, 0.73)' }, false)
		expect(tokens.Tokens.SemanticColor.TEXT_DEFAULT!.gradient.dark.color).toBe(
			key,
		)
		expect(
			tokens.Tokens.SemanticColor.TEXT_DEFAULT!.gradient.dark.opacity,
		).toBeCloseTo(0.73)
		expect(tokens.Tokens.SemanticColor.TEXT_DEFAULT!.gradient.light.color).toBe(
			customRawKey('TEXT_DEFAULT', 'light'),
		)

		theme.restore()

		expect(tokens.Tokens.SemanticColor).toEqual(originalSemantic)
		expect(tokens.Tokens.RawColor).toEqual(originalRaw)
		expect(theme.mappings).toBe(0)
	})

	test('restores the prior apply before applying new settings', () => {
		const tokens = makeTokens(['TEXT_DEFAULT', 'TEXT_STRONG'])
		const theme = createCssTokenTheme(tokens)
		const originalTextDefault = structuredClone(
			tokens.Tokens.SemanticColor.TEXT_DEFAULT,
		)

		theme.apply({ '--discord-text-default': '#abcdef' }, false)
		expect(
			Object.getOwnPropertyDescriptor(
				tokens.Tokens.RawColor,
				customRawKey('TEXT_DEFAULT', 'dark'),
			) !== undefined,
		).toBe(true)

		theme.apply({ '--discord-text-strong': '#123456' }, false)

		expect(tokens.Tokens.SemanticColor.TEXT_DEFAULT).toEqual(
			originalTextDefault,
		)
		expect(
			Object.getOwnPropertyDescriptor(
				tokens.Tokens.RawColor,
				customRawKey('TEXT_DEFAULT', 'dark'),
			) !== undefined,
		).toBe(false)
		expect(colorOf(tokens, 'TEXT_STRONG')).toBe('#123456')
		expect(theme.mappings).toBe(1)
	})
})
