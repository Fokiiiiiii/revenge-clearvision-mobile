import { expect, test } from 'bun:test'
import { createElement, Fragment } from 'react'
import {
	notificationBadgeProps,
	notificationBadgeTree,
	unreadIndicatorTree,
	replaceUnreadIndicator,
	replaceUnreadRenderer,
} from '../plugins/clearvision-mobile/js/notifications'

const Badge = () => null
const Indicator = () => null
const Replacement = () => null

test('notification CSS preserves counts, accessibility and handlers while styling badge and mask', () => {
	const onLayout = () => {}
	const props = {
		value: 12,
		maxValue: 99,
		hideCount: false,
		unreadIndicator: true,
		accessibilityLabel: '12 mentions',
		onLayout,
		style: { height: 16 },
		textStyle: { minWidth: 10 },
	}
	const css = {
		'--mention-badge-background': '#aa95d4',
		'--mention-badge-text': '#1b122c',
		'--mention-badge-size': '24px',
		'--mention-badge-font-size': '14px',
		'--notification-dot-color': '#aa95d4',
	}
	const next = notificationBadgeProps(props, css)
	expect(next.value).toBe(12)
	expect(next.maxValue).toBe(99)
	expect(next.hideCount).toBe(false)
	expect(next.unreadIndicator).toBe(true)
	expect(next.accessibilityLabel).toBe(props.accessibilityLabel)
	expect(next.onLayout).toBe(onLayout)
	expect(next.style).toEqual([
		props.style,
		{ backgroundColor: '#aa95d4', height: 24, minWidth: 24, borderRadius: 12 },
	])
	expect(next.textStyle).toEqual([
		props.textStyle,
		{ color: '#1b122c', lineHeight: 24, fontSize: 14 },
	])
	expect(notificationBadgeProps({ value: 12 }, css, true).maskStyle).toEqual([
		undefined,
		{ minWidth: 30, height: 30, borderRadius: 15 },
	])
	expect(props.style).toEqual({ height: 16 })
})

test('unset or invalid notification CSS leaves original props and badge tree unchanged', () => {
	const props = { value: 4, style: { height: 16 } }
	const tree = createElement(Badge, props)
	expect(notificationBadgeProps(props, {})).toBe(props)
	expect(
		notificationBadgeProps(props, {
			'--mention-badge-size': '0px',
			'--mention-badge-font-size': '200px',
			'--mention-badge-background': 'invalid',
		}),
	).toBe(props)
	expect(notificationBadgeTree(tree, Badge, {})).toBe(tree)
})

test('styles the locally captured Badge inside MaskedBadge without replacing handlers', () => {
	const onLayout = () => {}
	const tree = createElement(
		'View',
		{ pointerEvents: 'none', onLayout },
		createElement(Badge, {
			key: 'badge',
			value: 3,
			hideCount: false,
			accessibilityLabel: '3 mentions',
		}),
	)
	const next = notificationBadgeTree(tree, Badge, {
		'--mention-badge-background': '#aa95d4',
	}) as typeof tree
	expect(next.props.onLayout).toBe(onLayout)
	expect(next.props.pointerEvents).toBe('none')
	const child = next.props.children as ReturnType<typeof createElement>
	expect(child.props.value).toBe(3)
	expect(child.props.hideCount).toBe(false)
	expect(child.props.style).toEqual([undefined, { backgroundColor: '#aa95d4' }])
})

test('unread and selected indicators retain layout animation, status and pointer behavior', () => {
	const layout = () => {}
	const tree = createElement('AnimatedView', {
		style: { top: 30, left: -4, height: 8, width: 8 },
		layout,
		pointerEvents: 'none',
	})
	const css = {
		'--server-unread-color': '#ddd0ff',
		'--server-selected-color': '#aa95d4',
		'--server-unread-width': '10px',
		'--server-unread-height': '12px',
		'--server-selected-height': '36px',
	}
	const unread = unreadIndicatorTree(tree, css, false) as typeof tree
	const selected = unreadIndicatorTree(tree, css, true) as typeof tree
	expect(unread.props.style).toEqual([
		tree.props.style,
		{
			backgroundColor: '#ddd0ff',
			width: 10,
			left: -5,
			borderRadius: 5,
			height: 12,
			marginTop: -6,
		},
	])
	expect(selected.props.style).toEqual([
		tree.props.style,
		{
			backgroundColor: '#aa95d4',
			width: 10,
			left: -5,
			borderRadius: 5,
			height: 36,
			marginTop: -18,
		},
	])
	expect(selected.props.layout).toBe(layout)
	expect(selected.props.pointerEvents).toBe('none')
	expect(unreadIndicatorTree(tree, {}, false)).toBe(tree)
})

test('replaces captured indicator and render callbacks only inside their own returned tree', () => {
	const handler = () => {}
	const oldRender = () => null
	const newRender = () => null
	const tree = createElement(
		Fragment,
		null,
		createElement(Indicator, {
			key: 'unread',
			selected: true,
			cleanUp: handler,
		}),
		createElement('TransitionGroup', { renderItem: oldRender, items: ['a'] }),
	)
	const replaced = replaceUnreadIndicator(
		tree,
		Indicator,
		Replacement,
	) as typeof tree
	const children = replaced.props.children as Array<
		ReturnType<typeof createElement>
	>
	expect(children[0]!.type).toBe(Replacement)
	expect(children[0]!.props.selected).toBe(true)
	expect(children[0]!.props.cleanUp).toBe(handler)
	const updated = replaceUnreadRenderer(
		replaced,
		oldRender,
		newRender,
	) as typeof tree
	const group = (
		updated.props.children as Array<ReturnType<typeof createElement>>
	)[1]!
	expect(group.props.renderItem).toBe(newRender)
	expect(group.props.items).toEqual(['a'])
})
