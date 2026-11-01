import { parseCssColor } from './tokens'

export interface Settings {
	customCss: string
}

export const DefaultSettings: Settings = {
	customCss: '',
}

export function normalizeCssColor(value: unknown, fallback: string) {
	const parsed = parseCssColor(value)
	if (!parsed || typeof value !== 'string') return fallback
	const normalized = value.trim()
	if (normalized.toLowerCase() === 'transparent') return 'transparent'
	if (/^#|^rgba?\(/i.test(normalized) && !/[%/]/.test(normalized))
		return normalized
	return `${parsed.raw}${Math.round(parsed.opacity * 255)
		.toString(16)
		.padStart(2, '0')}`
}

export function normalizeSettings(value: unknown): Settings {
	const source =
		value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
	if (typeof source.customCss === 'string')
		return { customCss: source.customCss.slice(0, 100_000) }

	const legacy: string[] = []
	const accentColor = normalizeCssColor(source.accentColor, '')
	const hoverColor = normalizeCssColor(source.hoverColor, '')
	if (accentColor && accentColor !== '#2780e6')
		legacy.push(`--main-color: ${accentColor};`)
	if (hoverColor && hoverColor !== '#1e63b3')
		legacy.push(`--hover-color: ${hoverColor};`)
	if (typeof source.fontFamily === 'string') {
		const font = source.fontFamily
			.replace(/[^\w\s,'"-]/g, '')
			.trim()
			.slice(0, 80)
		if (font && font !== 'gg sans') legacy.push(`--main-font: ${font};`)
	}
	return {
		customCss: legacy.length ? `:root {\n\t${legacy.join('\n\t')}\n}` : '',
	}
}

export type ClearVisionThemeVariant = 'light' | 'dark' | 'darker' | 'midnight'

const sharedCssDefaults: Record<string, string> = {
	'--main-color': '#2780e6',
	'--button-text': '#ffffff',
	'--hover-color': '#1e63b3',
	'--success-color': '#43b581',
	'--warning-color': '#fff',
	'--danger-color': '#982929',
	'--info-color': '#fff',
	'--online-color': '#43b581',
	'--idle-color': '#faa61a',
	'--dnd-color': '#982929',
	'--streaming-color': '#593695',
	'--offline-color': '#808080',
	'--background-shading-percent': '100%',
	'--background-image':
		'url(https://clearvision.github.io/images/sapphire.jpg)',
	'--background-position': 'center',
	'--background-size': 'cover',
	'--background-attachment': 'fixed',
	'--background-filter': 'saturate(1)',
	'--user-popout-image': 'var(--background-image)',
	'--user-popout-position': 'var(--background-position)',
	'--user-popout-size': 'var(--background-size)',
	'--user-popout-attachment': 'var(--background-attachment)',
	'--user-popout-filter': 'var(--background-filter)',
	'--user-modal-image': 'var(--background-image)',
	'--user-modal-position': 'var(--background-position)',
	'--user-modal-size': 'var(--background-size)',
	'--user-modal-attachment': 'var(--background-attachment)',
	'--user-modal-filter': 'var(--background-filter)',
	'--home-icon': 'url(https://clearvision.github.io/icons/discord.svg)',
	'--home-size': 'cover',
	'--main-font':
		"'gg sans', Whitney, 'Helvetica Neue', Helvetica, Arial, sans-serif",
	'--code-font':
		"Consolas, 'gg mono', 'Liberation Mono', Menlo, Courier, monospace",
	'--channel-normal': '#d1d4dc',
	'--channel-muted': '#969db5',
	'--channel-hover': '#f0eff8',
	'--channel-selected': '#faf9ff',
	'--channel-selected-bg': 'var(--main-color)',
	'--channel-unread': 'var(--main-color)',
	'--channel-unread-hover': 'var(--hover-color)',
	'--focus-color': 'var(--main-color)',
}

const variantCssDefaults: Record<
	ClearVisionThemeVariant,
	Record<string, string>
> = {
	light: {
		'--background-shading': 'rgba(252,252,252,0.3)',
		'--card-shading': 'rgba(252,252,252,0.3)',
		'--popout-shading': 'rgba(252,252,252,0.7)',
		'--modal-shading': 'rgba(252,252,252,0.5)',
		'--input-shading': 'rgba(0,0,0,0.3)',
		'--normal-text': '#36363c',
		'--muted-text': '#75757e',
	},
	dark: {
		'--background-shading': 'rgba(0,0,0,0.4)',
		'--card-shading': 'rgba(0,0,0,0.2)',
		'--popout-shading': 'rgba(0,0,0,0.6)',
		'--modal-shading': 'rgba(0,0,0,0.4)',
		'--input-shading': 'rgba(255,255,255,0.05)',
		'--normal-text': '#d8d8db',
		'--muted-text': '#aeaeb4',
	},
	darker: {
		'--background-shading': 'rgba(0,0,0,0.6)',
		'--card-shading': 'rgba(0,0,0,0.3)',
		'--popout-shading': 'rgba(0,0,0,0.7)',
		'--modal-shading': 'rgba(0,0,0,0.5)',
		'--input-shading': 'rgba(255,255,255,0.05)',
		'--normal-text': '#fbfbfb',
		'--muted-text': '#94949c',
	},
	midnight: {
		'--background-shading': 'rgba(0,0,0,0.8)',
		'--card-shading': 'rgba(0,0,0,0.4)',
		'--popout-shading': 'rgba(0,0,0,0.8)',
		'--modal-shading': 'rgba(0,0,0,0.6)',
		'--input-shading': 'rgba(255,255,255,0.05)',
		'--normal-text': '#dcdcde',
		'--muted-text': '#86868e',
	},
}

function selectorMatchesVariant(
	selector: string,
	variant: ClearVisionThemeVariant,
) {
	return selector.split(',').some(part => {
		const themes = [
			...part.matchAll(/\.theme-(light|dark|darker|midnight)(?![\w-])/gi),
		]
		return themes.at(-1)?.[1]?.toLowerCase() === variant
	})
}

function resolveCssVariables(variables: Record<string, string>) {
	function expand(value: string, seen: Set<string>, depth = 0): string {
		if (depth > 32) return ''
		let output = '',
			cursor = 0
		const pattern = /var\(/gi
		for (let match = pattern.exec(value); match; match = pattern.exec(value)) {
			let end = pattern.lastIndex,
				nesting = 1
			for (; end < value.length && nesting; end++) {
				if (value[end] === '(') nesting++
				if (value[end] === ')') nesting--
			}
			if (nesting) break
			const content = value.slice(pattern.lastIndex, end - 1)
			const comma = content.indexOf(',')
			const name = (comma < 0 ? content : content.slice(0, comma)).trim()
			const fallback =
				comma < 0
					? value.slice(match.index, end)
					: content.slice(comma + 1).trim()
			const replacement =
				variables[name] !== undefined && !seen.has(name)
					? expand(variables[name]!, new Set(seen).add(name), depth + 1)
					: comma < 0
						? fallback
						: expand(fallback, seen, depth + 1)
			output = (output + value.slice(cursor, match.index) + replacement).slice(
				0,
				100_000,
			)
			cursor = end
			pattern.lastIndex = end
		}
		return (output + value.slice(cursor)).slice(0, 100_000)
	}
	return Object.fromEntries(
		Object.entries(variables).map(([name, value]) => [
			name,
			expand(value, new Set([name])),
		]),
	)
}

export function extractCssUrl(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined
	const match = value.match(/url\(\s*(?:'([^']+)'|"([^"]+)"|([^)'"]+))\s*\)/i)
	const uri = match?.[1] ?? match?.[2] ?? match?.[3]?.trim()
	return uri && /^(?:https?:|file:|content:)/i.test(uri) ? uri : undefined
}

export function backgroundColorFromCssImage(
	value: unknown,
	fallback = '#090c18',
) {
	if (typeof value !== 'string') return fallback
	const gradient = value.match(/linear-gradient\([^)]*\)/i)?.[0]
	const colorValue = gradient?.match(
		/rgba?\([^)]*\)|#[\da-f]{3,8}\b|\b(?:red|yellow|white|black|blue|green|purple)\b/i,
	)?.[0]
	return normalizeCssColor(colorValue, fallback)
}

export function backgroundPositionFromCss(value: unknown) {
	const tokens =
		typeof value === 'string' ? value.trim().toLowerCase().split(/\s+/) : []
	const axisValue = (token: string | undefined, axis: 'x' | 'y') => {
		if (!token || token === 'center') return 50
		if (token === 'left' && axis === 'x') return 0
		if (token === 'right' && axis === 'x') return 100
		if (token === 'top' && axis === 'y') return 0
		if (token === 'bottom' && axis === 'y') return 100
		if (token.endsWith('%')) {
			const number = Number(token.slice(0, -1))
			return Number.isFinite(number) ? Math.min(100, Math.max(0, number)) : 50
		}
		return 50
	}
	const first = tokens[0]
	const second = tokens[1]
	if (tokens.length < 2 && (first === 'top' || first === 'bottom'))
		return { x: 50, y: axisValue(first, 'y') }
	return { x: axisValue(first, 'x'), y: axisValue(second, 'y') }
}

export function parseClearVisionCss(
	css: string,
	variant: ClearVisionThemeVariant = 'dark',
): Record<string, string> {
	const variables = {
		...sharedCssDefaults,
		...(variantCssDefaults[variant] ?? variantCssDefaults.dark),
	}
	const important = new Set<string>()
	const source = css.slice(0, 100_000).replace(/\/\*[\s\S]*?\*\//g, '')
	function assign(name: string, value: string) {
		const priority = /\s*!important$/i.test(value)
		if (important.has(name) && !priority) return
		variables[name] = value.trim().replace(/\s*!important$/i, '')
		if (priority) important.add(name)
	}
	for (const [, rawSelector, body] of source.matchAll(
		/([^{}]+)\{([^{}]*)\}/g,
	)) {
		const selector = rawSelector.trim()
		const isRoot = selector.split(',').some(part => part.includes(':root'))
		const matchesTheme = selectorMatchesVariant(selector, variant)
		const embed = /\.(?:embed|embedFull|cv-embed)(?:\b|_)/.test(selector)
		const button = /\.(?:button|cv-button)(?:\b|_)/.test(selector)
		const settings = /\.(?:settings|cv-settings)(?:\b|_)/.test(selector)
		if (!isRoot && !matchesTheme && !(embed || button || settings)) continue
		if (/\.theme-/.test(selector) && !matchesTheme) continue
		if (embed || button || settings) {
			const prefix = embed ? 'embed' : button ? 'button' : 'settings'
			const properties: Record<string, string> = {
				background: 'background',
				'background-color': 'background',
				color: 'text',
				'border-color': 'border-color',
				'border-width': 'border-width',
				'border-radius': 'radius',
			}
			for (const [, property, value] of body.matchAll(
				/(?:^|;)\s*([\w-]+)\s*:\s*([^;{}]+)/g,
			)) {
				if (properties[property])
					assign(`--${prefix}-${properties[property]}`, value)
			}
		} else {
			for (const [, name, value] of body.matchAll(
				/(--[\w-]+)\s*:\s*([^;{}]+)\s*;?/g,
			))
				assign(name, value)
		}
	}
	return resolveCssVariables(variables)
}

export function shouldLinkTransparentPanels(
	_settings: Settings,
	videoBackgroundActive: boolean,
) {
	return videoBackgroundActive
}
