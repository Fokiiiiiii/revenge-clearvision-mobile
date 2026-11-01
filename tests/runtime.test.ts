import { expect, mock, test } from 'bun:test'
import { createElement } from 'react'

const textDefaults = { style: { fontSize: 16 } }
const Text = { defaultProps: textDefaults as unknown }
const token = () => ({
	dark: { raw: 'ORIGINAL', opacity: 1 },
	light: { raw: 'ORIGINAL', opacity: 1 },
	darker: { raw: 'ORIGINAL', opacity: 1 },
	midnight: { raw: 'ORIGINAL', opacity: 1 },
})
const Tokens = {
	SemanticColor: { TEXT_DEFAULT: token(), BACKGROUND_BASE_LOWEST: token() },
	RawColor: { ORIGINAL: '#323339' },
	default: { radii: {}, space: {} },
}
mock.module('@revenge-mod/discord/common/tokens', () => ({ Tokens }))
const nativeCalls: Array<{ name: string; args: unknown[] }> = []
mock.module('@revenge-mod/modules/native', () => ({
	callNativeMethodSync: (name: string, args: unknown[]) => {
		nativeCalls.push({ name, args })
		return name === 'clearvision.describe'
			? { tokens: ['EMBED_BACKGROUND', 'TEXT_DEFAULT'], hooks: 3 }
			: { colors: 8, hooks: 3 }
	},
}))
mock.module('@revenge-mod/modules/finders', () => ({
	getModules: () => () => {},
}))
mock.module('@revenge-mod/modules/finders/filters', () => ({
	createFilterGenerator: () => () => ({}),
}))
const notificationPress = () => {}
const notificationStyle = {
	borderRadius: 16,
	padding: 12,
	backgroundColor: '#393a41',
}
const notificationModule = {
	NotificationPressable: () =>
		createElement(
			'AnimatedView',
			{
				style: {
					transform: [{ scale: 1 }],
					backgroundColor: '#393a41',
					borderRadius: 16,
				},
			},
			createElement(
				'PressableHighlight',
				{
					style: notificationStyle,
					onPress: notificationPress,
					accessibilityRole: 'button',
				},
				createElement('Text', { style: { color: '#f4f1ff' } }, 'CSS test'),
			),
		),
}
const originalBadge = (props: Record<string, unknown>) =>
	createElement('Badge', props)
const badgeModule = {
	default: originalBadge,
	MaskedBadge: (props: Record<string, unknown>) =>
		createElement(
			'Mask',
			{ style: props.maskStyle },
			createElement(originalBadge, props),
		),
}
const originalMasked = badgeModule.MaskedBadge
const originalIndicator = (props: Record<string, unknown>) =>
	createElement('AnimatedView', {
		pointerEvents: 'none',
		style: { height: 8, width: 8 },
	})
const originalRenderer = (props: Record<string, unknown>) =>
	createElement(originalIndicator, props)
const originalWrapper = () =>
	createElement('TransitionGroup', { renderItem: originalRenderer, items: [] })
const unreadModule = {
	default: originalWrapper,
	UnreadIndicator: originalIndicator,
	renderUnreadIndicator: originalRenderer,
}
const originalNotification = notificationModule.NotificationPressable
mock.module('@revenge-mod/discord/utils/modules/finders', () => ({
	getModuleWithImportedPath: (path: string, found: (module: any) => void) => {
		found(
			path.includes('/Badge/native/Badge')
				? badgeModule
				: path.includes('GuildsBarAnimatedItemWrapper')
					? unreadModule
					: notificationModule,
		)
		return () => {}
	},
}))
mock.module('@revenge-mod/patcher', () => ({
	before: (
		target: Record<string, any>,
		key: string,
		callback: (args: unknown[]) => unknown[],
	) => {
		const original = target[key]
		target[key] = (...args: unknown[]) => original(...callback(args))
		return () => {
			target[key] = original
		}
	},
	instead: (
		target: Record<string, any>,
		key: string,
		callback: (
			args: unknown[],
			original: (...args: unknown[]) => unknown,
		) => unknown,
	) => {
		const original = target[key]
		target[key] = (...args: unknown[]) => callback(args, original)
		return () => {
			target[key] = original
		}
	},
	after: (
		target: Record<string, any>,
		key: string,
		callback: (result: any) => any,
	) => {
		const original = target[key]
		target[key] = (...args: unknown[]) => callback(original(...args))
		return () => {
			target[key] = original
		}
	},
}))
mock.module('../plugins/clearvision-mobile/js/settings', () => ({
	default: () => null,
}))
mock.module('react-native', () => ({
	Text,
	processColor: (color: string) => {
		if (color === 'transparent') return 0
		if (color.startsWith('#')) return 0xff000000 | parseInt(color.slice(1), 16)
		const parts = color.match(/[\d.]+/g)?.map(Number)
		return parts && parts.length >= 3
			? ((Math.round((parts[3] ?? 1) * 255) << 24) |
					(parts[0]! << 16) |
					(parts[1]! << 8) |
					parts[2]!) >>>
					0
			: undefined
	},
}))

test('CSS storage updates use the cache and publish readable shading without resetting the theme', async () => {
	const refresh = mock(() => {})
	const shared = globalThis as typeof globalThis & {
		__revengeNextBgVideoMobile?: unknown
		__revengeNextClearVisionMobile?: {
			panelColors: Record<string, string>
			backgroundOverlay: string
			refresh: () => void
		}
	}
	shared.__revengeNextBgVideoMobile = {
		active: true,
		transparentPanels: true,
		refresh,
	}
	const oldFactory = Reflect.get(globalThis, 'plugin')
	Reflect.set(globalThis, 'plugin', (configuration: unknown) => configuration)
	const plugin = (await import('../plugins/clearvision-mobile/js/index'))
		.default
	if (oldFactory === undefined) Reflect.deleteProperty(globalThis, 'plugin')
	else Reflect.set(globalThis, 'plugin', oldFactory)
	let stored = {
		customCss:
			':root { --normal-text: #abcdef; --background-shading: rgba(7,11,26,0.68); --card-shading: rgba(16,20,39,0.64); --input-shading: rgba(10,15,33,0.74); --header-shading: rgba(10,15,33,0.46); --member-list-shading: rgba(9,14,31,0.22); --member-card-shading: rgba(21,27,48,0.38); --notification-shading: rgba(10,15,33,0.92); --mention-badge-background: #aa95d4; --mention-badge-size: 20px; --server-unread-color: #ddd0ff; }',
	}
	let notify: (value?: unknown) => void = () => {}
	const disposers: Array<() => void> = []
	plugin.preInit!({
		cleanup: (callback: () => void) => disposers.push(callback),
	} as never)
	await plugin.start!({
		cleanup: (callback: () => void) => disposers.push(callback),
		jsonStorage: {
			get: async () => stored,
			get cache() {
				return stored
			},
			subscribe: (listener: typeof notify) => {
				notify = listener
				return () => {}
			},
		},
	} as never)
	try {
		const badge = badgeModule.default({
			value: 7,
			accessibilityLabel: '7 mentions',
		})
		expect(badge.props.value).toBe(7)
		expect(badge.props.style).toEqual([
			undefined,
			{
				backgroundColor: '#aa95d4',
				height: 20,
				minWidth: 20,
				borderRadius: 10,
			},
		])
		const masked = badgeModule.MaskedBadge({ value: 7 })
		expect(masked.props.style).toEqual([
			undefined,
			{ minWidth: 26, height: 26, borderRadius: 13 },
		])
		expect((masked.props.children as any).props.style).toEqual([
			undefined,
			{
				backgroundColor: '#aa95d4',
				height: 20,
				minWidth: 20,
				borderRadius: 10,
			},
		])
		const rendered = unreadModule.renderUnreadIndicator({
			selected: false,
		}) as any
		const indicator = rendered.type(rendered.props)
		expect(indicator.props.style).toEqual([
			{ height: 8, width: 8 },
			{ backgroundColor: '#ddd0ff' },
		])
		const group = unreadModule.default() as any
		expect(group.props.renderItem).not.toBe(originalRenderer)
		expect(
			nativeCalls.some(
				call =>
					call.name === 'clearvision.apply' &&
					(call.args[0] as Record<string, number>)['dark:EMBED_BACKGROUND'] ===
						0xa3101427,
			),
		).toBe(true)
		const banner = notificationModule.NotificationPressable()
		const pressable = banner.props.children
		expect(pressable.props.style).toEqual([
			notificationStyle,
			{ backgroundColor: 'rgba(10,15,33,0.9215686274509803)' },
		])
		expect(pressable.props.onPress).toBe(notificationPress)
		expect(pressable.props.children.props.style).toEqual({ color: '#f4f1ff' })
		expect(banner.props.style).toEqual([
			{
				transform: [{ scale: 1 }],
				backgroundColor: '#393a41',
				borderRadius: 16,
			},
			{ backgroundColor: 'transparent' },
		])
		expect(
			(Tokens.RawColor as Record<string, string>)[
				Tokens.SemanticColor.TEXT_DEFAULT.dark.raw
			],
		).toBe('#abcdef')
		expect(Tokens.SemanticColor.BACKGROUND_BASE_LOWEST.dark.opacity).toBe(0)
		expect(shared.__revengeNextClearVisionMobile?.panelColors.card).toStartWith(
			'rgba(16,20,39,',
		)
		expect(
			shared.__revengeNextClearVisionMobile?.panelColors.input,
		).toStartWith('rgba(10,15,33,')
		expect(
			shared.__revengeNextClearVisionMobile?.backgroundOverlay,
		).toStartWith('rgba(7,11,26,')
		expect(
			shared.__revengeNextClearVisionMobile?.panelColors.header,
		).toStartWith('rgba(10,15,33,')
		expect(
			shared.__revengeNextClearVisionMobile?.panelColors.memberList,
		).toStartWith('rgba(9,14,31,')
		expect(
			shared.__revengeNextClearVisionMobile?.panelColors.memberCard,
		).toStartWith('rgba(21,27,48,')
		stored = {
			customCss:
				':root { --normal-text: #fedcba; --background-shading: rgba(5,8,23,0.73); }',
		}
		notify({ unrelatedDelta: true })
		expect(
			notificationModule.NotificationPressable().props.children.props.style,
		).toBe(notificationStyle)
		expect(
			(Tokens.RawColor as Record<string, string>)[
				Tokens.SemanticColor.TEXT_DEFAULT.dark.raw
			],
		).toBe('#fedcba')
		expect(
			shared.__revengeNextClearVisionMobile?.backgroundOverlay,
		).toStartWith('rgba(5,8,23,')
		expect(refresh.mock.calls.length).toBeGreaterThanOrEqual(2)
		const nativeCount = nativeCalls.filter(
			call => call.name === 'clearvision.apply',
		).length
		shared.__revengeNextClearVisionMobile?.refresh()
		expect(
			nativeCalls.filter(call => call.name === 'clearvision.apply').length,
		).toBe(nativeCount + 1)
	} finally {
		for (const dispose of disposers.reverse()) dispose()
		shared.__revengeNextBgVideoMobile = undefined
	}
	expect(badgeModule.default).toBe(originalBadge)
	expect(badgeModule.MaskedBadge).toBe(originalMasked)
	expect(unreadModule.UnreadIndicator).toBe(originalIndicator)
	expect(unreadModule.renderUnreadIndicator).toBe(originalRenderer)
	expect(unreadModule.default).toBe(originalWrapper)
	expect(nativeCalls.at(-1)).toEqual({ name: 'clearvision.apply', args: [{}] })
	expect(notificationModule.NotificationPressable).toBe(originalNotification)
	expect(shared.__revengeNextClearVisionMobile).toBeUndefined()
	expect(Tokens.SemanticColor.TEXT_DEFAULT.dark).toEqual({
		raw: 'ORIGINAL',
		opacity: 1,
	})
	expect(Tokens.RawColor).toEqual({ ORIGINAL: '#323339' })
	expect(Text.defaultProps).toBe(textDefaults)
	Reflect.deleteProperty(Text, 'defaultProps')
	const secondDisposers: Array<() => void> = []
	await plugin.start!({
		cleanup: (callback: () => void) => secondDisposers.push(callback),
		jsonStorage: {
			get: async () => stored,
			get cache() {
				return stored
			},
			subscribe: (listener: typeof notify) => {
				notify = listener
				return () => {}
			},
		},
	} as never)
	notify({ unrelatedDelta: true })
	for (const dispose of secondDisposers.reverse()) dispose()
	expect(Object.hasOwn(Text, 'defaultProps')).toBe(false)
	Text.defaultProps = textDefaults
})
