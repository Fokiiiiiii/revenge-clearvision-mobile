import { getModules } from '@revenge-mod/modules/finders'
import { createFilterGenerator } from '@revenge-mod/modules/finders/filters'
import { after } from '@revenge-mod/patcher'
import { Children, cloneElement, isValidElement } from 'react'
import { Text } from 'react-native'
import {
	DefaultSettings,
	normalizeSettings,
	shouldLinkTransparentPanels,
} from './logic'
import SettingsComponent from './settings'
import type {
	Filter,
	FilterGenerator,
	FilterScopes,
} from '@revenge-mod/modules/finders/filters'
import type { FC, MemoExoticComponent, ReactElement, ReactNode } from 'react'
import type { Settings } from './logic'

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
type SharedBgVideoBridge = { active?: boolean; transparentPanels?: boolean }
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

let settings = DefaultSettings
let themeContext: ThemeContextModule['ThemeContext']
let textDefaults: Record<string, unknown> | undefined
let originalTextDefaults: Record<string, unknown> | undefined

function videoBackgroundIsActive() {
	const bridge = (
		globalThis as typeof globalThis & {
			__revengeNextBgVideoMobile?: SharedBgVideoBridge
		}
	).__revengeNextBgVideoMobile
	return Boolean(bridge?.active)
}

function updateTextDefaults() {
	if (!settings.enabled) {
		if (textDefaults)
			(
				Text as unknown as { defaultProps?: Record<string, unknown> }
			).defaultProps = originalTextDefaults
		textDefaults = undefined
		return
	}
	const textComponent = Text as unknown as {
		defaultProps?: Record<string, unknown>
	}
	originalTextDefaults ??= textComponent.defaultProps
	textDefaults = {
		...originalTextDefaults,
		style: [originalTextDefaults?.style, { fontFamily: settings.fontFamily }],
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
	if (
		themeContext?.Provider &&
		element.type === themeContext.Provider &&
		settings.enabled
	) {
		const value = element.props.value as ThemeValue | undefined
		if (value) {
			return cloneElement(element, {
				value: {
					...value,
					theme: settings.darkMode ? 'dark' : value.theme,
					primaryColor: settings.accentColor,
					secondaryColor: settings.hoverColor,
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
					if (!settings.enabled || !isValidElement(tree)) return tree
					const element = tree as ReactElement<{ style?: unknown }>
					if (!('style' in element.props)) return tree
					const transparent = shouldLinkTransparentPanels(
						settings,
						videoBackgroundIsActive(),
					)
					const backgroundColor = transparent
						? 'rgba(24, 26, 32, 0.38)'
						: 'rgba(32, 34, 37, 0.92)'
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
		updateTextDefaults()
		cleanup(
			jsonStorage.subscribe(value => {
				settings = normalizeSettings(value)
				updateTextDefaults()
			}),
		)
		cleanup(() => {
			const textComponent = Text as unknown as {
				defaultProps?: Record<string, unknown>
			}
			if (textDefaults) textComponent.defaultProps = originalTextDefaults
			textDefaults = undefined
			originalTextDefaults = undefined
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
