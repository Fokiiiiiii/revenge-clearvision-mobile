import { parseClearVisionCss } from './logic'
import { parseCssColor, readColor, rootBackgroundTokens } from './tokens'

export function createNativeThemeColors(
	css: string,
	names: string[],
	bgActive = false,
) {
	const result: Record<string, number> = {}
	for (const mode of ['dark', 'light', 'darker', 'midnight'] as const) {
		const variables = parseClearVisionCss(css, mode)
		for (const name of new Set([
			...names,
			'EMBED_BACKGROUND',
			'EMBED_TEXT',
			'EMBED_TITLE',
			'EMBED_BORDER_COLOR',
		])) {
			const color =
				name.startsWith('EMBED_') && name !== 'EMBED_BACKGROUND'
					? parseCssColor(
							variables[`--${name.toLowerCase().replace(/_/g, '-')}`],
						)
					: readColor(name, variables)
			if (!color) continue
			const alpha =
				bgActive && rootBackgroundTokens.has(name)
					? 0
					: Math.round(color.opacity * 255)
			result[`${mode}:${name}`] =
				((alpha << 24) | parseInt(color.raw.slice(1), 16)) >>> 0
		}
		for (const [key, property] of [
			['EMBED_RADIUS', '--embed-radius'],
			['EMBED_BORDER_WIDTH', '--embed-border-width'],
		] as const) {
			const value = variables[property]?.trim()
			if (
				value &&
				/^\d*\.?\d+(?:px)?$/.test(value) &&
				parseFloat(value) <= 1024
			)
				result[`${mode}:${key}`] = parseFloat(value)
		}
	}
	return result
}
