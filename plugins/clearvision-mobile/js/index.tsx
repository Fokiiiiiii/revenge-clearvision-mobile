import { Tokens } from '@revenge-mod/discord/common/tokens'
import { getModules } from '@revenge-mod/modules/finders'
import { createFilterGenerator } from '@revenge-mod/modules/finders/filters'
import { after } from '@revenge-mod/patcher'
import { Children, cloneElement, isValidElement } from 'react'
import { processColor, Text } from 'react-native'
import { createCssDimensions } from './dimensions'
import {
	backgroundColorFromCssImage,
	backgroundPositionFromCss,
	DefaultSettings,
	extractCssUrl,
	normalizeCssColor,
	normalizeSettings,
	parseClearVisionCss,
	shouldLinkTransparentPanels,
} from './logic'
import SettingsComponent from './settings'
import { createCssTokenTheme } from './tokens'
import type {
	Filter,
	FilterGenerator,
	FilterScopes,
} from '@revenge-mod/modules/finders/filters'
import type { FC, MemoExoticComponent, ReactElement, ReactNode } from 'react'
import type { ClearVisionThemeVariant, Settings } from './logic'

type WithMemoizedNamedExoticComponent = FilterGenerator<
	<P = object>(
		name: string,
	) => Filter<{
		Result: MemoExoticComponent<FC<P>>
		Scopes: [typeof FilterScopes.Initialized]
	}>
>
type ThemeContextModule = { ThemeContext?: { Provider?: unknown } }
type RootThemeModule = {
	RootThemeContextProvider?: (...args: unknown[]) => unknown
}
type SharedBgVideoBridge = {
	active?: boolean
	transparentPanels?: boolean
	refresh?: () => void
}
type SharedClearVisionBridge = {
	backgroundUri?: string
	backgroundColor?: string
	backgroundOverlay?: string
	originalBackgroundColors?: string[]
	panelColors?: Record<string, string>
	refresh?: () => void
	positionX?: number
	positionY?: number
	crop?: boolean
}
type ThemeValue = Record<string, unknown> & {
	theme?: string
	primaryColor?: string | null
	secondaryColor?: string | null
}

const withMemoizedNamedExoticComponent = createFilterGenerator(
	([name], _, exports) =>
		exports?.type?.length === 1 && exports.type.displayName === name,
	([name]) => `memoizedNamedExoticComponent(${name})`,
) as WithMemoizedNamedExoticComponent

const withThemeContext = createFilterGenerator(
	(_args, _scope, exports) =>
		Boolean(
			(exports as ThemeContextModule | undefined)?.ThemeContext?.Provider,
		),
	() => 'ThemeContext',
) as any

const withRootThemeProvider = createFilterGenerator(
	(_args, _scope, exports) =>
		typeof (exports as RootThemeModule | undefined)
			?.RootThemeContextProvider === 'function',
	() => 'RootThemeContextProvider',
) as any

let tokenTheme: ReturnType<typeof createCssTokenTheme> | undefined
let dimensions: ReturnType<typeof createCssDimensions> | undefined
let settings = DefaultSettings
let currentVariant: ClearVisionThemeVariant = 'dark'
let cssVariables = parseClearVisionCss(settings.customCss, currentVariant)
let themeContext: ThemeContextModule['ThemeContext']
let textDefaults: Record<string, unknown> | undefined
let originalTextDefaults: Record<string, unknown> | undefined
let hadTextDefaults = false

function videoBackgroundIsActive() {
	const bridge = (
		globalThis as typeof globalThis & {
			__revengeNextBgVideoMobile?: SharedBgVideoBridge
		}
	).__revengeNextBgVideoMobile
	return Boolean(bridge?.active && bridge.transparentPanels)
}

function themeVariant(value: unknown): ClearVisionThemeVariant {
	const theme = typeof value === 'string' ? value.toLowerCase() : 'dark'
	if (theme.includes('midnight')) return 'midnight'
	if (theme.includes('darker')) return 'darker'
	if (theme.includes('light')) return 'light'
	return 'dark'
}

function fontFamilyFromCss(value: string | undefined) {
	const quoted = value?.trim().match(/^(['"])(.*?)\1/)
	const family = quoted?.[2] ?? value?.split(',')[0]?.trim()
	return family || 'ggsans-Normal, NotoSans-Normal'
}

function applyTokenTheme() {
	const bg = (
		globalThis as typeof globalThis & {
			__revengeNextBgVideoMobile?: SharedBgVideoBridge
		}
	).__revengeNextBgVideoMobile
	tokenTheme?.apply(cssVariables, Boolean(bg?.active && bg.transparentPanels))
	dimensions?.apply(cssVariables)
}

function panelShade(name: string) {
	const color = normalizeCssColor(cssVariables[name], 'transparent')
	const value = processColor(color)
	if (typeof value !== 'number') return color
	const percentage = parseFloat(
		cssVariables['--background-shading-percent'] ?? '100',
	)
	const scale = Number.isFinite(percentage)
		? Math.max(0, Math.min(1, percentage / 100))
		: 1
	return `rgba(${(value >>> 16) & 255},${(value >>> 8) & 255},${value & 255},${((value >>> 24) / 255) * scale})`
}

function updateClearVisionBridge() {
	applyTokenTheme()
	const position = backgroundPositionFromCss(
		cssVariables['--background-position'],
	)
	const backgroundUri = extractCssUrl(cssVariables['--background-image'])
	const bridge: SharedClearVisionBridge = {
		backgroundUri,
		backgroundColor: backgroundColorFromCssImage(
			cssVariables['--background-image'],
		),
		backgroundOverlay: panelShade('--background-shading'),
		panelColors: {
			background: panelShade('--background-shading'),
			card: panelShade('--card-shading'),
			input: panelShade('--input-shading'),
			popout: panelShade('--popout-shading'),
			modal: panelShade('--modal-shading'),
			header: panelShade('--header-shading'),
			statusBar: panelShade('--statusbar-shading'),
			memberList: panelShade('--member-list-shading'),
			memberCard: panelShade('--member-card-shading'),
		},
		refresh: applyTokenTheme,
		originalBackgroundColors: tokenTheme?.originalBackgroundColors,
		positionX: position.x,
		positionY: position.y,
		crop: cssVariables['--background-size']?.toLowerCase() !== 'contain',
	}
	;(
		globalThis as typeof globalThis & {
			__revengeNextClearVisionMobile?: SharedClearVisionBridge
		}
	).__revengeNextClearVisionMobile = bridge
	;(
		globalThis as typeof globalThis & {
			__revengeNextBgVideoMobile?: SharedBgVideoBridge
		}
	).__revengeNextBgVideoMobile?.refresh?.()
}

function updateTextDefaults() {
	const textComponent = Text as unknown as {
		defaultProps?: Record<string, unknown>
	}
	if (!textDefaults) {
		originalTextDefaults = textComponent.defaultProps
		hadTextDefaults = Object.hasOwn(textComponent, 'defaultProps')
	}
	textDefaults = {
		...originalTextDefaults,
		style: [
			originalTextDefaults?.style,
			{
				fontFamily: fontFamilyFromCss(cssVariables['--main-font']),
				color: normalizeCssColor(
					cssVariables['--text-normal'] ?? cssVariables['--normal-text'],
					'#d8d8db',
				),
			},
		],
	}
	try {
		textComponent.defaultProps = textDefaults
	} catch {}
}

function transformThemeTree(node: ReactNode, depth = 0): ReactNode {
	if (depth > 16 || !isValidElement(node)) return node
	const element = node as ReactElement<{
		children?: ReactNode
		value?: unknown
	}>
	if (themeContext?.Provider && element.type === themeContext.Provider) {
		const value = element.props.value as ThemeValue | undefined
		if (value) {
			const nextVariant = themeVariant(value.theme)
			if (nextVariant !== currentVariant) {
				currentVariant = nextVariant
				cssVariables = parseClearVisionCss(settings.customCss, currentVariant)
				updateTextDefaults()
				updateClearVisionBridge()
			}
			return cloneElement(element, {
				value: {
					...value,
					primaryColor: normalizeCssColor(
						cssVariables['--main-color'],
						'#2780e6',
					),
					secondaryColor: normalizeCssColor(
						cssVariables['--hover-color'],
						'#1e63b3',
					),
					successColor: normalizeCssColor(
						cssVariables['--success-color'],
						'#43b581',
					),
					warningColor: normalizeCssColor(
						cssVariables['--warning-color'],
						'#ffffff',
					),
					dangerColor: normalizeCssColor(
						cssVariables['--danger-color'],
						'#982929',
					),
					infoColor: normalizeCssColor(cssVariables['--info-color'], '#ffffff'),
					onlineColor: normalizeCssColor(
						cssVariables['--online-color'],
						'#43b581',
					),
					idleColor: normalizeCssColor(cssVariables['--idle-color'], '#faa61a'),
					dndColor: normalizeCssColor(cssVariables['--dnd-color'], '#982929'),
					streamingColor: normalizeCssColor(
						cssVariables['--streaming-color'],
						'#593695',
					),
					offlineColor: normalizeCssColor(
						cssVariables['--offline-color'],
						'#808080',
					),
					textColor: normalizeCssColor(
						cssVariables['--text-normal'] ?? cssVariables['--normal-text'],
						'#d8d8db',
					),
					mutedTextColor: normalizeCssColor(
						cssVariables['--text-muted'] ?? cssVariables['--muted-text'],
						'#aeaeb4',
					),
					channelNormalColor: normalizeCssColor(
						cssVariables['--channel-normal'],
						'#d1d4dc',
					),
					channelMutedColor: normalizeCssColor(
						cssVariables['--channel-muted'],
						'#969db5',
					),
					channelHoverColor: normalizeCssColor(
						cssVariables['--channel-hover'],
						'#f0eff8',
					),
					channelSelectedColor: normalizeCssColor(
						cssVariables['--channel-selected'],
						'#faf9ff',
					),
					channelSelectedBackgroundColor: normalizeCssColor(
						cssVariables['--channel-selected-bg'],
						'rgba(39,128,230,0.18)',
					),
					channelUnreadColor: normalizeCssColor(
						cssVariables['--channel-unread'],
						'#2780e6',
					),
					channelUnreadHoverColor: normalizeCssColor(
						cssVariables['--channel-unread-hover'],
						'#1e63b3',
					),
					focusColor: normalizeCssColor(
						cssVariables['--focus-color'],
						'#2780e6',
					),
				},
			})
		}
	}

	const children = Children.toArray(element.props.children)
	let changed = false
	const nextChildren = children.map(child => {
		const next = transformThemeTree(child, depth + 1)
		if (next !== child) changed = true
		return next
	})
	return changed ? cloneElement(element, { children: nextChildren }) : element
}

function patchSurface(name: string, cleanup: (cleanup: () => unknown) => void) {
	cleanup(
		getModules(withMemoizedNamedExoticComponent(name), component => {
			cleanup(
				after(component, 'type', tree => {
					if (!isValidElement(tree)) return tree
					const element = tree as ReactElement<{ style?: unknown }>
					if (!('style' in element.props)) return tree
					const transparent = shouldLinkTransparentPanels(
						settings,
						videoBackgroundIsActive(),
					)
					const token =
						name === 'ChatView' ? '--background-shading' : '--input-shading'
					const fallback = transparent
						? 'rgba(24, 26, 32, 0.38)'
						: 'rgba(32, 34, 37, 0.92)'
					const backgroundColor =
						name === 'ChatView' && !transparent
							? backgroundColorFromCssImage(
									cssVariables['--background-image'],
									normalizeCssColor(cssVariables[token], fallback),
								)
							: normalizeCssColor(cssVariables[token], fallback)
					return cloneElement(element, {
						style: [element.props.style, { backgroundColor }],
					})
				}),
			)
		}),
	)
}

export default plugin<{ jsonStorage: Settings }>({
	jsonStorage: { load: true, default: DefaultSettings },
	async start({ cleanup, jsonStorage }) {
		settings = normalizeSettings(await jsonStorage.get())
		tokenTheme = createCssTokenTheme(Tokens)
		dimensions = createCssDimensions(Tokens)
		cssVariables = parseClearVisionCss(settings.customCss, currentVariant)
		updateTextDefaults()
		updateClearVisionBridge()
		console.info(
			'[ClearVision] CSS mappings ready',
			tokenTheme.count,
			tokenTheme.mappings,
			dimensions.count,
		)
		cleanup(
			jsonStorage.subscribe(() => {
				settings = normalizeSettings(jsonStorage.cache)
				cssVariables = parseClearVisionCss(settings.customCss, currentVariant)
				updateTextDefaults()
				updateClearVisionBridge()
			}),
		)
		cleanup(() => {
			const textComponent = Text as unknown as {
				defaultProps?: Record<string, unknown>
			}
			try {
				if (textDefaults) {
					if (hadTextDefaults) textComponent.defaultProps = originalTextDefaults
					else Reflect.deleteProperty(textComponent, 'defaultProps')
				}
			} catch {}
			tokenTheme?.restore()
			tokenTheme = undefined
			dimensions?.restore()
			dimensions = undefined
			textDefaults = undefined
			originalTextDefaults = undefined
			hadTextDefaults = false
			;(
				globalThis as typeof globalThis & {
					__revengeNextClearVisionMobile?: SharedClearVisionBridge
				}
			).__revengeNextClearVisionMobile = undefined
			;(
				globalThis as typeof globalThis & {
					__revengeNextBgVideoMobile?: SharedBgVideoBridge
				}
			).__revengeNextBgVideoMobile?.refresh?.()
		})

		cleanup(
			getModules(withThemeContext(), exports => {
				themeContext = (exports as ThemeContextModule).ThemeContext
			}),
		)
		cleanup(
			getModules(withRootThemeProvider(), module => {
				cleanup(
					after(module, 'RootThemeContextProvider', tree =>
						transformThemeTree(tree),
					),
				)
			}),
		)
		patchSurface('ChatView', cleanup)
		patchSurface('ChatInput', cleanup)
		patchSurface('ChatInputRightActions', cleanup)
		cleanup(() => {
			themeContext = undefined
		})
	},
	SettingsComponent,
})
