import { describe, expect, test } from 'bun:test'
import {
	backgroundColorFromCssImage,
	backgroundPositionFromCss,
	DefaultSettings,
	extractCssUrl,
	normalizeSettings,
	parseClearVisionCss,
	shouldLinkTransparentPanels,
} from '../plugins/clearvision-mobile/js/logic'

describe('ClearVision settings', () => {
	test('normalizes custom CSS and migrates legacy color settings', () => {
		expect(
			normalizeSettings({ customCss: ':root { --main-color: red; }' }),
		).toEqual({
			customCss: ':root { --main-color: red; }',
		})
		const migrated = normalizeSettings({
			accentColor: '#112233',
			hoverColor: 'invalid',
			fontFamily: '  system  ',
		})
		expect(migrated.customCss).toContain('--main-color: #112233;')
		expect(migrated.customCss).toContain('--main-font: system;')
		expect(migrated.customCss).not.toContain('--hover-color')
		expect(normalizeSettings(null)).toEqual(DefaultSettings)
	})

	test('links transparent panels to an active BgVideo background', () => {
		expect(shouldLinkTransparentPanels(DefaultSettings, true)).toBe(true)
		expect(shouldLinkTransparentPanels(DefaultSettings, false)).toBe(false)
	})

	test('reads background images and gradient colors', () => {
		expect(
			extractCssUrl(
				'linear-gradient(135deg, #000, #111), url("https://cdn.example/image.webp")',
			),
		).toBe('https://cdn.example/image.webp')
		expect(
			backgroundColorFromCssImage(
				'radial-gradient(circle, #000 0%, transparent 46%), linear-gradient(135deg, rgba(9,12,24,0.88) 0%, rgba(6,9,21,0.92) 55%)',
			),
		).toBe('rgba(9,12,24,0.88)')
		expect(backgroundPositionFromCss('30% 20%')).toEqual({ x: 30, y: 20 })
		expect(backgroundPositionFromCss('center')).toEqual({ x: 50, y: 50 })
	})
})

describe('ClearVision CSS variables', () => {
	test('reads root and selected theme values and resolves var references while ignoring imports', () => {
		const css = `@import url("https://clearvision.github.io/ClearVision-v7/main.css");
:root {
  --main-color: #aa95d4;
  --hover-color: #c1b0e4;
  --background-image: radial-gradient(circle, rgba(147,128,208,0.20) 0%, rgba(0,0,0,0) 46%);
  --user-popout-image: var(--background-image);
}
:is(.theme-dark,.theme-light .theme-dark) {
  --background-shading: rgba(6,10,22,0.74);
  --normal-text: #eeedf4;
}
:is(.theme-darker,.theme-light .theme-darker) {
  --normal-text: #abcdef;
}`
		const parsed = parseClearVisionCss(css, 'dark')
		expect(parsed['--main-color']).toBe('#aa95d4')
		expect(parsed['--hover-color']).toBe('#c1b0e4')
		expect(parsed['--background-shading']).toBe('rgba(6,10,22,0.74)')
		expect(parsed['--normal-text']).toBe('#eeedf4')
		expect(parsed['--user-popout-image']).toBe(parsed['--background-image'])
	})
})
