import normalizeColor from '@react-native/normalize-colors'

type Mode = 'dark' | 'light' | 'darker' | 'midnight'
type MutableRecord = Record<string, unknown>
type ParsedColor = { raw: string; opacity: number }

const modes: readonly Mode[] = ['dark', 'light', 'darker', 'midnight']
export const rootBackgroundTokens = new Set([
	'BACKGROUND_BASE_LOW',
	'BACKGROUND_BASE_LOWER',
	'BACKGROUND_BASE_LOWEST',
	'BACKGROUND_SURFACE_HIGH',
	'BACKGROUND_SURFACE_HIGHEST',
	'CHANNEL_BACKGROUND_DEFAULT',
])

const aliases: Record<string, readonly string[]> = {
	INTERACTIVE_TEXT_DEFAULT: [
		'--interactive-text-default',
		'--interactive-normal',
		'--normal-text',
	],
	INTERACTIVE_TEXT_HOVER: [
		'--interactive-text-hover',
		'--interactive-hover',
		'--normal-text',
	],
	INTERACTIVE_TEXT_ACTIVE: [
		'--interactive-text-active',
		'--interactive-active',
		'--normal-text',
	],
	INTERACTIVE_ICON_DEFAULT: ['--interactive-normal', '--normal-text'],
	INTERACTIVE_ICON_ACTIVE: ['--interactive-active', '--normal-text'],
	INTERACTIVE_ICON_HOVER: ['--interactive-hover', '--normal-text'],
	ICON_STRONG: ['--text-primary', '--normal-text'],
	ICON_SUBTLE: ['--muted-text'],
	ICON_MUTED: ['--interactive-muted', '--muted-text'],
	TEXT_BRAND: ['--main-color'],
	ICON_BRAND: ['--main-color'],
	BACKGROUND_BRAND: ['--main-color'],
	INPUT_TEXT_DEFAULT: ['--normal-text'],
	INPUT_PLACEHOLDER_TEXT_DEFAULT: ['--muted-text'],
	INPUT_ICON_DEFAULT: ['--interactive-normal', '--normal-text'],
	TABLEROW_ICON_COLOR_DEFAULT: ['--interactive-normal', '--normal-text'],
	TAB_LABEL_TEXT_DEFAULT: ['--muted-text'],
	TAB_LABEL_TEXT_FOCUSED: ['--main-color'],
	MOBILE_TEXT_HEADING_PRIMARY: ['--text-primary', '--normal-text'],
	CONTROL_PRIMARY_BACKGROUND_DEFAULT: ['--button-background', '--main-color'],
	CONTROL_PRIMARY_BACKGROUND_ACTIVE: ['--button-hover', '--hover-color'],
	CONTROL_PRIMARY_BORDER_DEFAULT: ['--button-border', '--main-color'],
	CONTROL_PRIMARY_BORDER_ACTIVE: ['--button-border', '--hover-color'],
	CONTROL_PRIMARY_TEXT_DEFAULT: ['--button-text'],
	CONTROL_SECONDARY_BACKGROUND_DEFAULT: [
		'--button-secondary-background',
		'--card-shading',
	],
	CONTROL_SECONDARY_BACKGROUND_ACTIVE: [
		'--button-secondary-hover',
		'--input-shading',
	],
	CONTROL_SECONDARY_TEXT_DEFAULT: ['--button-secondary-text', '--normal-text'],
	CONTROL_EXPRESSIVE_BACKGROUND_DEFAULT: [
		'--button-background',
		'--main-color',
	],
	CONTROL_EXPRESSIVE_TEXT_DEFAULT: ['--button-text'],
	CHAT_INPUT_SEND_BUTTON_ACTIVE_BACKGROUND: ['--main-color'],
	CHAT_INPUT_SEND_BUTTON_ICON_ACTIVE_TINT: ['--button-text'],
	CHECKBOX_BACKGROUND_SELECTED_DEFAULT: ['--main-color'],
	SWITCH_BACKGROUND_SELECTED_DEFAULT: ['--main-color'],
	TOGGLEBUTTON_BACKGROUND_SELECTED: ['--main-color'],
	EMBED_BACKGROUND: ['--embed-background', '--card-shading'],
	EMBED_BACKGROUND_ALTERNATE: ['--embed-background', '--card-shading'],
	MOBILE_EMBED_BACKGROUND_DEFAULT: ['--embed-background', '--card-shading'],
	MOBILE_THREAD_EMBED_BACKGROUND: ['--embed-background', '--card-shading'],
	TABLEROW_BACKGROUND_DEFAULT: ['--settings-background', '--card-shading'],
	TABLEROW_BACKGROUND_PRESSED: ['--settings-hover', '--input-shading'],
	TEXT_DEFAULT: ['--text-normal', '--normal-text'],
	TEXT_STRONG: ['--text-primary', '--header-primary', '--normal-text'],
	TEXT_SUBTLE: ['--text-secondary', '--muted-text'],
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

export function parseCssColor(value: unknown): ParsedColor | undefined {
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

	if (/^[a-z]+$/.test(color)) {
		const rgba = normalizeColor(color)
		if (rgba !== null)
			return {
				raw: `#${(rgba >>> 8).toString(16).padStart(6, '0')}`,
				opacity: (rgba & 255) / 255,
			}
	}
	const hsl = color.match(/^hsla?\((.*)\)$/i)
	if (hsl) {
		const parts = hsl[1]!.trim().split(/\s*[,/]\s*|\s+/)
		if (parts.length !== 3 && parts.length !== 4) return
		const hue = parts[0]!.match(/^([+-]?(?:\d*\.)?\d+)(deg|grad|rad|turn)?$/)
		if (!hue || !parts.slice(1, 3).every(part => /^\d*\.?\d+%$/.test(part)))
			return
		const angle =
			Number(hue[1]) *
			({ deg: 1, grad: 0.9, rad: 180 / Math.PI, turn: 360 }[hue[2] || 'deg'] ??
				1)
		const alpha = parts.length === 4 ? parseAlpha(parts[3]!) : 1
		if (!Number.isFinite(angle) || alpha === undefined) return
		const rgba = normalizeColor(
			`hsla(${angle},${parts[1]},${parts[2]},${alpha})`,
		)
		if (rgba !== null)
			return {
				raw: `#${(rgba >>> 8).toString(16).padStart(6, '0')}`,
				opacity: alpha,
			}
		return
	}

	const match = color.match(/^(rgba?)\((.*)\)$/i)
	if (!match) return
	const body = match[2]!.trim()
	const parts = body.includes(',')
		? body.split(/\s*,\s*/)
		: body.replace(/\s*\/\s*/, ' ').split(/\s+/)
	if (parts.length !== 3 && parts.length !== 4) return
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

export function parsePercent(value: unknown): number | undefined {
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
	if (
		name === 'TABLEROW_BACKGROUND_DEFAULT' ||
		name === 'TABLEROW_BACKGROUND_PRESSED'
	)
		return '--settings-background'
	if (
		name === 'MOBILE_ACTIONSHEET_BACKGROUND' ||
		name === 'MOBILE_EXPRESSION_PICKER_BACKGROUND_DEFAULT'
	)
		return '--popout-shading'
	if (name === 'MOBILE_ALERT_BACKGROUND_DEFAULT') return '--modal-shading'
	if (
		name === 'BG_SURFACE_RAISED' ||
		name === 'BACKGROUND_SECONDARY_ALT' ||
		name === 'TAB_BAR_BACKGROUND' ||
		name === 'PANEL_BG'
	)
		return '--card-shading'
	if (
		name === 'INPUT_BACKGROUND_DEFAULT' ||
		name.startsWith('MOBILE_CHATINPUT_BACKGROUND') ||
		name === 'REDESIGN_CHAT_INPUT_BACKGROUND' ||
		name === 'SHARE_CHAT_INPUT_BACKGROUND'
	)
		return '--input-shading'
	if (name === 'CHAT_INPUT_BACKGROUND' || name === 'CHANNELTEXTAREA_BACKGROUND')
		return '--input-shading'
}

export function isShadingToken(name: string) {
	return shadingAlias(name) !== undefined
}

export function readColor(
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
	const originalBackgroundColors: string[] = []
	const defaults = record(namespace?.default) ?? rootDefault
	const internal = record(defaults?.internal)
	const colors = record(defaults?.colors)
	if (typeof internal?.resolveSemanticColor === 'function') {
		for (const name of rootBackgroundTokens)
			for (const mode of modes) {
				try {
					const value = Reflect.apply(internal.resolveSemanticColor, internal, [
						mode,
						colors?.[name],
						{},
					])
					if (typeof value === 'string') originalBackgroundColors.push(value)
				} catch {}
			}
	}
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
		originalBackgroundColors,
		get mappings() {
			return appliedMappings
		},
	}
}
