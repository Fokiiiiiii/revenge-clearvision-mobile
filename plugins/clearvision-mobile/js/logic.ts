export interface Settings {
	enabled: boolean
	darkMode: boolean
	transparentPanels: boolean
	accentColor: string
	hoverColor: string
	fontFamily: string
}

export const DefaultSettings: Settings = {
	enabled: true,
	darkMode: true,
	transparentPanels: true,
	accentColor: '#2780e6',
	hoverColor: '#1e63b3',
	fontFamily: 'gg sans',
}

function color(value: unknown, fallback: string) {
	return typeof value === 'string' &&
		/^#[\da-f]{6}(?:[\da-f]{2})?$/i.test(value)
		? value
		: fallback
}

export function normalizeSettings(value: unknown): Settings {
	const source =
		value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
	const fontFamily =
		typeof source.fontFamily === 'string'
			? source.fontFamily.trim().slice(0, 60)
			: ''
	return {
		enabled:
			typeof source.enabled === 'boolean'
				? source.enabled
				: DefaultSettings.enabled,
		darkMode:
			typeof source.darkMode === 'boolean'
				? source.darkMode
				: DefaultSettings.darkMode,
		transparentPanels:
			typeof source.transparentPanels === 'boolean'
				? source.transparentPanels
				: DefaultSettings.transparentPanels,
		accentColor: color(source.accentColor, DefaultSettings.accentColor),
		hoverColor: color(source.hoverColor, DefaultSettings.hoverColor),
		fontFamily: fontFamily || DefaultSettings.fontFamily,
	}
}

export function shouldLinkTransparentPanels(
	settings: Pick<Settings, 'enabled' | 'transparentPanels'>,
	videoBackgroundActive: boolean,
) {
	return settings.enabled && settings.transparentPanels && videoBackgroundActive
}
