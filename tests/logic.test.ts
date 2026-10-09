import { describe, expect, test } from 'bun:test'
import {
	DefaultSettings,
	normalizeSettings,
	shouldLinkTransparentPanels,
} from '../plugins/clearvision-mobile/js/logic'

describe('ClearVision settings', () => {
	test('normalizes invalid values and preserves chosen palette', () => {
		expect(
			normalizeSettings({
				accentColor: '#112233',
				hoverColor: 'invalid',
				fontFamily: '  system  ',
			}),
		).toEqual({
			...DefaultSettings,
			accentColor: '#112233',
			fontFamily: 'system',
		})
	})

	test('links transparent panels to an active BgVideo background', () => {
		expect(shouldLinkTransparentPanels(DefaultSettings, true)).toBe(true)
		expect(shouldLinkTransparentPanels(DefaultSettings, false)).toBe(false)
		expect(
			shouldLinkTransparentPanels(
				{ ...DefaultSettings, transparentPanels: false },
				true,
			),
		).toBe(false)
	})
})
