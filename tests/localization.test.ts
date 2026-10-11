import { describe, expect, test } from 'bun:test'
import { translate } from '../plugins/clearvision-mobile/js/translation'

describe('ClearVision Japanese messages', () => {
	test('uses Japanese for Japanese Discord locales and English otherwise', () => {
		expect(translate('ja', 'customCss', 'Custom CSS')).toBe('カスタムCSS')
		expect(
			translate(
				'ja-JP',
				'customCssDescription',
				'Paste ClearVision CSS variables.',
			),
		).toContain(':root')
		expect(translate('en-US', 'customCss', 'Custom CSS')).toBe('Custom CSS')
	})
})
