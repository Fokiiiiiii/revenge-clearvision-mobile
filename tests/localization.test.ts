import { describe, expect, test } from 'bun:test'
import { translate } from '../plugins/clearvision-mobile/js/translation'

describe('ClearVision Japanese messages', () => {
	test('uses Japanese for Japanese Discord locales and English otherwise', () => {
		expect(translate('ja', 'enableThemeColors', 'Enable theme colors')).toBe(
			'テーマカラーを有効化',
		)
		expect(translate('ja-JP', 'enableThemeColors', 'Enable theme colors')).toBe(
			'テーマカラーを有効化',
		)
		expect(translate('en-US', 'enableThemeColors', 'Enable theme colors')).toBe(
			'Enable theme colors',
		)
	})
})
