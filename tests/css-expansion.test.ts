import { expect, test } from 'bun:test'
import { parseClearVisionCss } from '../plugins/clearvision-mobile/js/logic'
import { createNativeThemeColors } from '../plugins/clearvision-mobile/js/native-theme'

test('memoizes repeated dependencies and limits expanded CSS values', () => {
	const declarations = ['--x0: a;']
	for (let i = 1; i <= 24; i++)
		declarations.push(`--x${i}: var(--x${i - 1})var(--x${i - 1});`)
	const start = performance.now()
	const result = parseClearVisionCss(`:root { ${declarations.join(' ')} }`)
	expect(result['--x24']?.length).toBe(100_000)
	expect(
		parseClearVisionCss(`:root { ${declarations.toReversed().join(' ')} }`)[
			'--x24'
		],
	).toBe(result['--x24'])
	expect(performance.now() - start).toBeLessThan(1000)
})

test('cyclic variables are invalid and outer fallbacks still work', () => {
	const result = parseClearVisionCss(
		':root { --a: var(--b); --b: var(--a, red); --main-color: var(--a, #abc); }',
	)
	expect(result['--a']).toBeUndefined()
	expect(result['--b']).toBeUndefined()
	expect(result['--main-color']).toBe('#abc')
})

test('native shading uses the same percentage multiplier as JS tokens', () => {
	const result = createNativeThemeColors(
		':root { --input-shading: rgba(10,20,30,0.8); --background-shading-percent: 50%; }',
		['INPUT_BACKGROUND_DEFAULT'],
	)
	expect(result['dark:INPUT_BACKGROUND_DEFAULT']).toBe(0x660a141e)
})

test('invalid variable names cannot read object prototype properties', () => {
	expect(
		parseClearVisionCss(':root { --main-color: var(toString); }')[
			'--main-color'
		],
	).toBeUndefined()
	expect(
		parseClearVisionCss(':root { --main-color: var(constructor, red); }')[
			'--main-color'
		],
	).toBe('red')
})
