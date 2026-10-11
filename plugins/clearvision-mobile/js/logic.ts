export interface Settings {
	customCss: string
}

export const DefaultSettings: Settings = {
	customCss: '',
}

export function normalizeCssColor(value: unknown, fallback: string) {
	if (typeof value !== 'string') return fallback
	const normalized = value.trim()
	if (/^#(?:[\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i.test(normalized))
		return normalized
	const named: Record<string, string> = {
		black: '#000000',
		blue: '#0000ff',
		green: '#008000',
		purple: '#800080',
		red: '#ff0000',
		white: '#ffffff',
		yellow: '#ffff00',
		transparent: 'transparent',
	}
	if (named[normalized.toLowerCase()]) return named[normalized.toLowerCase()]
	const match = normalized.match(/^rgba?\(([^)]+)\)$/i)
	if (!match) return fallback
	const parts = match[1]
		.split(',')
		.map(part => Number(part.trim().replace(/%$/, '')))
	if (
		parts.length !== (normalized.toLowerCase().startsWith('rgba') ? 4 : 3) ||
		parts
			.slice(0, 3)
			.some(value => !Number.isFinite(value) || value < 0 || value > 255) ||
		(parts.length === 4 &&
			(!Number.isFinite(parts[3]) || parts[3] < 0 || parts[3] > 1))
	)
		return fallback
	return normalized
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
	function resolve(name: string, seen: Set<string>): string {
		const value = variables[name]
		if (value === undefined || seen.has(name)) return value ?? ''
		const nextSeen = new Set(seen).add(name)
		return value.replace(
			/var\(\s*(--[\w-]+)\s*(?:,\s*([^)]*))?\)/gi,
			(match, dependency: string, fallback?: string) =>
				variables[dependency] === undefined
					? fallback?.trim() || match
					: resolve(dependency, nextSeen),
		)
	}
	return Object.fromEntries(
		Object.keys(variables).map(name => [name, resolve(name, new Set())]),
	) as Record<string, string>
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
	const source = css.slice(0, 100_000).replace(/\/\*[\s\S]*?\*\//g, '')
	for (const [, rawSelector, body] of source.matchAll(
		/([^{}]+)\{([^{}]*)\}/g,
	)) {
		const selector = rawSelector.trim()
		const isRoot = selector.split(',').some(part => part.includes(':root'))
		if (!isRoot && !selectorMatchesVariant(selector, variant)) continue
		for (const [, name, rawValue] of body.matchAll(
			/(--[\w-]+)\s*:\s*([^;{}]+)\s*;?/g,
		)) {
			variables[name] = rawValue.trim().replace(/\s*!important$/i, '')
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
