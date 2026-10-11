type Mode = 'dark' | 'light' | 'darker' | 'midnight'
type MutableRecord = Record<string, unknown>
type ParsedColor = { raw: string; opacity: number }

const modes: readonly Mode[] = ['dark', 'light', 'darker', 'midnight']
const rootBackgroundTokens = new Set([
	'BACKGROUND_BASE_LOW',
	'BACKGROUND_BASE_LOWER',
	'BACKGROUND_BASE_LOWEST',
	'BACKGROUND_SURFACE_HIGH',
	'BACKGROUND_SURFACE_HIGHEST',
	'CHANNEL_BACKGROUND_DEFAULT',
])

const aliases: Record<string, readonly string[]> = {
	TEXT_DEFAULT: ['--text-normal', '--normal-text'],
	TEXT_STRONG: ['--text-primary', '--header-primary'],
	TEXT_SUBTLE: ['--text-secondary'],
	TEXT_MUTED: ['--text-muted', '--muted-text'],
	TEXT_LINK: ['--text-link'],
	INTERACTIVE_TEXT: ['--interactive-normal'],
	ICON_DEFAULT: ['--interactive-normal'],
	INTERACTIVE_HOVER: ['--interactive-hover'],
	ICON_HOVER: ['--interactive-hover'],
	INTERACTIVE_ACTIVE: ['--interactive-active'],
	ICON_ACTIVE: ['--interactive-active'],
	CHANNELS_DEFAULT: ['--channel-normal'],
	CHANNEL_ICON: ['--channel-normal'],
	BORDER_FOCUS: ['--focus-color'],
	TEXT_STATUS_ONLINE: ['--online-color'],
	TEXT_STATUS_IDLE: ['--idle-color'],
	TEXT_STATUS_DND: ['--dnd-color'],
	TEXT_STATUS_OFFLINE: ['--offline-color'],
	STATUS_DANGER: ['--danger-color'],
	FEEDBACK_CRITICAL: ['--text-danger'],
	TEXT_FEEDBACK_POSITIVE: ['--text-positive', '--success-color'],
}

function record(value: unknown): MutableRecord | undefined {
	return typeof value === 'object' && value !== null
		? (value as MutableRecord)
		: undefined
}

function parseChannel(value: string): number | undefined {
	const percent = value.endsWith('%')
	const number = Number(percent ? value.slice(0, -1).trim() : value.trim())
	if (!Number.isFinite(number) || number < 0 || number > (percent ? 100 : 255))
		return
	return Math.round(percent ? number * 2.55 : number)
}

function parseAlpha(value: string): number | undefined {
	const percent = value.endsWith('%')
	const number = Number(percent ? value.slice(0, -1).trim() : value.trim())
	if (!Number.isFinite(number) || number < 0 || number > (percent ? 100 : 1))
		return
	return percent ? number / 100 : number
}

function parseCssColor(value: unknown): ParsedColor | undefined {
	if (typeof value !== 'string') return
	const color = value.trim().toLowerCase()
	if (color === 'transparent') return { raw: '#000000', opacity: 0 }

	if (/^#[\da-f]{3,4}(?:[\da-f]{3,4})?$/i.test(color)) {
		let hex = color.slice(1)
		if (hex.length === 3 || hex.length === 4) {
			hex = [...hex].map(digit => digit + digit).join('')
		}
		if (hex.length !== 6 && hex.length !== 8) return
		return {
			raw: `#${hex.slice(0, 6)}`,
			opacity: hex.length === 8 ? Number.parseInt(hex.slice(6), 16) / 255 : 1,
		}
	}

	const match = color.match(/^(rgba?)\((.*)\)$/i)
	if (!match) return
	const body = match[2]!.trim()
	const parts = body.includes(',')
		? body.split(/\s*,\s*/)
		: body.replace(/\s*\/\s*/, ' ').split(/\s+/)
	if (
		(match[1]!.toLowerCase() === 'rgba' && parts.length !== 4) ||
		(parts.length !== 3 && parts.length !== 4)
	)
		return
	const channels = parts.slice(0, 3).map(parseChannel)
	if (channels.some(channel => channel === undefined)) return
	const opacity = parts.length === 4 ? parseAlpha(parts[3]!) : 1
	if (opacity === undefined) return
	return {
		raw:
			'#' +
			channels.map(channel => channel!.toString(16).padStart(2, '0')).join(''),
		opacity,
	}
}

function parsePercent(value: unknown): number | undefined {
	if (typeof value !== 'string') return
	const match = value.trim().match(/^(\d+(?:\.\d+)?)%$/)
	if (!match) return
	const percent = Number(match[1])
	return Number.isFinite(percent) && percent <= 100 ? percent / 100 : undefined
}

function tokenName(value: string) {
	return value
		.replace(/([a-z\d])([A-Z])/g, '$1_$2')
		.replace(/[^a-z\d]+/gi, '_')
		.replace(/^_|_$/g, '')
		.toUpperCase()
}

function tokenSlug(value: string) {
	return value.toLowerCase().replace(/_/g, '-')
}

function shadingAlias(name: string): string | undefined {
	if (
		name.startsWith('BACKGROUND_BASE') ||
		name.startsWith('BACKGROUND_SURFACE') ||
		name === 'CHANNEL_BACKGROUND_DEFAULT'
	)
		return '--background-shading'
	if (name.startsWith('CARD_BACKGROUND') || name.startsWith('BACKGROUND_CARD'))
		return '--card-shading'
	if (
		name.startsWith('MODAL_BACKGROUND') ||
		name.startsWith('BACKGROUND_MODAL')
	)
		return '--modal-shading'
	if (
		(name.startsWith('POPOUT_') || name.startsWith('MENU_')) &&
		/(^|_)(BACKGROUND|BG)(_|$)/.test(name)
	)
		return '--popout-shading'
	if (name === 'CHAT_INPUT_BACKGROUND' || name === 'CHANNELTEXTAREA_BACKGROUND')
		return '--input-shading'
}

function isShadingToken(name: string) {
	return shadingAlias(name) !== undefined
}

function readColor(
	name: string,
	vars: Record<string, string>,
): ParsedColor | undefined {
	const direct = parseCssColor(vars[`--discord-${tokenSlug(name)}`])
	if (direct) return direct
	const names =
		aliases[name] ??
		[shadingAlias(name)].filter((value): value is string => Boolean(value))
	for (const alias of names) {
		const color = parseCssColor(vars[alias])
		if (color) return color
	}
	return
}

function customRawName(mode: Mode, name: string) {
	return (
		'REVENGE_CV_CSS_' +
		mode.toUpperCase() +
		'_' +
		tokenSlug(name).replace(/-/g, '_').toUpperCase()
	)
}

type Snapshot = {
	target: MutableRecord
	key: string
	hadOwn: boolean
	value: unknown
}

export function createCssTokenTheme(tokens: unknown) {
	const root = record(tokens)
	const rootDefault = record(root?.default)
	const namespace = record(root?.Tokens) ?? record(rootDefault?.Tokens) ?? root
	const semantic =
		record(namespace?.SemanticColor) ?? record(root?.SemanticColor)
	const rawColors = record(namespace?.RawColor) ?? record(root?.RawColor)
	const definitions = Object.entries(semantic ?? {})
	const snapshots: Snapshot[] = []
	let captured = new WeakMap<object, Set<string>>()
	let appliedMappings = 0

	function set(target: MutableRecord, key: string, value: unknown) {
		let keys = captured.get(target)
		if (!keys) captured.set(target, (keys = new Set()))
		if (!keys.has(key)) {
			keys.add(key)
			snapshots.push({
				target,
				key,
				hadOwn: Object.getOwnPropertyDescriptor(target, key) !== undefined,
				value: target[key],
			})
		}
		target[key] = value
	}

	function restore() {
		for (let index = snapshots.length - 1; index >= 0; index--) {
			const snapshot = snapshots[index]!
			if (snapshot.hadOwn) snapshot.target[snapshot.key] = snapshot.value
			else delete snapshot.target[snapshot.key]
		}
		snapshots.length = 0
		captured = new WeakMap()
		appliedMappings = 0
	}

	function apply(vars: Record<string, string>, bgActive: boolean) {
		restore()
		const values = record(vars) as Record<string, string> | undefined
		if (!values) return 0
		const percent = parsePercent(values['--background-shading-percent']) ?? 1
		let changedCount = 0

		try {
			for (const [name, value] of definitions) {
				const key = tokenName(name)
				const definition = record(value)
				const color = readColor(key, values)
				const transparentRoot = bgActive && rootBackgroundTokens.has(key)
				if (!definition || (!color && !transparentRoot)) continue

				let changed = false
				for (const mode of modes) {
					const modeDefinition = record(definition[mode])
					if (!modeDefinition) continue
					const gradient = record(definition.gradient)
					const gradientMode =
						mode === 'dark' || mode === 'light'
							? record(gradient?.[mode])
							: undefined

					if (color && rawColors) {
						const rawName = customRawName(mode, key)
						set(rawColors, rawName, color.raw)
						set(modeDefinition, 'raw', rawName)
						const opacity = color.opacity * (isShadingToken(key) ? percent : 1)
						set(modeDefinition, 'opacity', transparentRoot ? 0 : opacity)
						if (
							gradientMode &&
							Object.getOwnPropertyDescriptor(gradientMode, 'color') !==
								undefined
						)
							set(gradientMode, 'color', rawName)
						if (
							gradientMode &&
							Object.getOwnPropertyDescriptor(gradientMode, 'opacity') !==
								undefined
						)
							set(gradientMode, 'opacity', transparentRoot ? 0 : opacity)
						changed = true
					} else if (transparentRoot) {
						set(modeDefinition, 'opacity', 0)
						if (
							gradientMode &&
							Object.getOwnPropertyDescriptor(gradientMode, 'opacity') !==
								undefined
						)
							set(gradientMode, 'opacity', 0)
						changed = true
					}
				}
				if (changed) changedCount++
			}
		} catch (error) {
			restore()
			throw error
		}

		appliedMappings = changedCount
		return changedCount
	}

	return {
		apply,
		restore,
		count: definitions.length,
		get mappings() {
			return appliedMappings
		},
	}
}
