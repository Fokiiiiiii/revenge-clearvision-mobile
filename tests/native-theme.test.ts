import { expect, test } from 'bun:test'
import { createNativeThemeColors } from '../plugins/clearvision-mobile/js/native-theme'
import { parseClearVisionCss } from '../plugins/clearvision-mobile/js/logic'
import { createCssTokenTheme } from '../plugins/clearvision-mobile/js/tokens'

test('maps the modern Discord button, settings, input and embed roles', () => {
	const names = [
		'CONTROL_PRIMARY_BACKGROUND_DEFAULT',
		'CONTROL_PRIMARY_TEXT_DEFAULT',
		'TABLEROW_BACKGROUND_DEFAULT',
		'INPUT_BACKGROUND_DEFAULT',
		'MOBILE_EMBED_BACKGROUND_DEFAULT',
	]
	const token = () =>
		Object.fromEntries(
			['dark', 'light', 'darker', 'midnight'].map(mode => [
				mode,
				{ raw: 'ORIGINAL', opacity: 1 },
			]),
		)
	const tokens = {
		SemanticColor: Object.fromEntries(names.map(name => [name, token()])),
		RawColor: { ORIGINAL: '#323339' },
	}
	const theme = createCssTokenTheme(tokens)
	expect(
		theme.apply(
			parseClearVisionCss(
				':root { --main-color: #aa55ff; --button-text: #ffffff; --card-shading: rgba(10,20,30,0.4); --input-shading: rgba(20,30,40,0.5); --embed-background: rgba(30,40,50,0.25); }',
			),
			false,
		),
	).toBe(5)
	expect(
		tokens.SemanticColor.MOBILE_EMBED_BACKGROUND_DEFAULT.dark.opacity,
	).toBe(0.25)
	theme.restore()
	expect(tokens.SemanticColor.CONTROL_PRIMARY_BACKGROUND_DEFAULT.dark.raw).toBe(
		'ORIGINAL',
	)
})

test('uses the same CSS and per-theme colors for native UI with Android ARGB order', () => {
	const colors = createNativeThemeColors(
		':root { --main-color: #aa55ff; --embed-background: rgba(30,40,50,0.25); } .theme-light { --embed-background: #ffffff80; }',
		['EMBED_BACKGROUND', 'CONTROL_PRIMARY_BACKGROUND_DEFAULT'],
	)
	expect(colors['dark:EMBED_BACKGROUND']).toBe(0x401e2832)
	expect(colors['light:EMBED_BACKGROUND']).toBe(0x80ffffff)
	expect(colors['dark:CONTROL_PRIMARY_BACKGROUND_DEFAULT']).toBe(0xffaa55ff)
	expect(
		createNativeThemeColors('', ['BACKGROUND_BASE_LOWEST'], true)[
			'dark:BACKGROUND_BASE_LOWEST'
		]! >>> 24,
	).toBe(0)
	expect(
		createNativeThemeColors(':root { --discord-unused-role: invalid; }', [
			'UNUSED_ROLE',
		])['dark:UNUSED_ROLE'],
	).toBeUndefined()
})

test('accepts V7-style HSL, modern RGB, nested var fallbacks and embed rules', () => {
	const css = parseClearVisionCss(
		':root { --accent: hsl(270 100% 50% / 50%); --main-color: var(--missing, var(--accent)); } .embed { background-color: rgb(10 20 30 / 25%); color: #abc; border-radius: 12px; }',
	)
	expect(css['--main-color']).toBe('hsl(270 100% 50% / 50%)')
	expect(css['--embed-background']).toBe('rgb(10 20 30 / 25%)')
	expect(css['--embed-text']).toBe('#abc')
	expect(css['--embed-radius']).toBe('12px')
	expect(
		createNativeThemeColors(
			':root { --main-color: hsl(240 100% 50% / 50%); }',
			['CONTROL_PRIMARY_BACKGROUND_DEFAULT'],
		)['dark:CONTROL_PRIMARY_BACKGROUND_DEFAULT'],
	).toBe(0x800000ff)
	expect(
		createNativeThemeColors(
			'.embed { border-radius: 12.5px; border-width: 2px; }',
			[],
		)['dark:EMBED_RADIUS'],
	).toBe(12.5)
	expect(
		parseClearVisionCss(
			':root { --main-color: red !important; } :root { --main-color: blue; }',
		)['--main-color'],
	).toBe('red')
})
