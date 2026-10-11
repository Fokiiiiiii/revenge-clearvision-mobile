import { expect, test } from 'bun:test'
import { normalizeCssColor } from '../plugins/clearvision-mobile/js/logic'

test('rejects malformed hex and RGB arity before passing a color to React Native', () => {
	for (const value of ['#12345', '#1234567', 'rgba(1,2,3)', 'rgb(1,2,3,0.5)'])
		expect(normalizeCssColor(value, 'transparent')).toBe('transparent')
	for (const value of [
		'#123',
		'#1234',
		'#123456',
		'#12345678',
		'rgb(1,2,3)',
		'rgba(1,2,3,0.5)',
	])
		expect(normalizeCssColor(value, 'transparent')).toBe(value)
})
