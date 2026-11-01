import { cloneElement, createElement, isValidElement } from 'react'
import { normalizeCssColor } from './logic'
import type { ComponentType, ReactElement, ReactNode } from 'react'

type Props = Record<string, unknown>
type Css = Record<string, string>
type Style = Record<string, string | number>

function length(css: Css, name: string, min: number, max: number) {
	const value = css[name]?.trim()
	if (!value || !/^\d*\.?\d+(?:px)?$/.test(value)) return
	const parsed = parseFloat(value)
	return Number.isFinite(parsed) && parsed >= min && parsed <= max
		? parsed
		: undefined
}

function color(css: Css, name: string) {
	return normalizeCssColor(css[name], '') || undefined
}

function badgeSize(css: Css) {
	const size = length(css, '--mention-badge-size', 16, 48)
	const font = length(css, '--mention-badge-font-size', 8, 28)
	return size !== undefined || font !== undefined
		? Math.max(size ?? 16, (font ?? 0) + 4)
		: undefined
}

export function notificationBadgeProps(
	props: Props,
	css: Css,
	masked = false,
): Props {
	const style: Style = {},
		textStyle: Style = {},
		dotStyle: Style = {}
	const size = badgeSize(css)
	const radius = length(css, '--mention-badge-radius', 0, 24)
	if (masked) {
		if (size === undefined && radius === undefined) return props
		if (size !== undefined) {
			style.minWidth = size + 6
			style.height = size + 6
		}
		style.borderRadius = (radius ?? (size ?? 16) / 2) + 3
		return { ...props, maskStyle: [props.maskStyle, style] }
	}
	const background = color(css, '--mention-badge-background')
	const foreground = color(css, '--mention-badge-text')
	const border = color(css, '--mention-badge-border')
	const width = length(css, '--mention-badge-border-width', 0, 4)
	const font = length(css, '--mention-badge-font-size', 8, 28)
	const dot = color(css, '--notification-dot-color')
	const dotSize = length(css, '--notification-dot-size', 2, 16)
	if (background) style.backgroundColor = background
	if (foreground) textStyle.color = foreground
	if (border) style.borderColor = border
	if (width !== undefined) style.borderWidth = width
	if (size !== undefined) {
		style.height = size
		style.minWidth = size
		style.borderRadius = radius ?? size / 2
		textStyle.lineHeight = size
	} else if (radius !== undefined) style.borderRadius = radius
	if (font !== undefined) textStyle.fontSize = font
	if (dot) dotStyle.backgroundColor = dot
	if (dotSize !== undefined) {
		dotStyle.width = dotSize
		dotStyle.height = dotSize
		dotStyle.borderRadius = dotSize / 2
	}
	if (
		!Object.keys(style).length &&
		!Object.keys(textStyle).length &&
		!Object.keys(dotStyle).length
	)
		return props
	return {
		...props,
		...(Object.keys(style).length ? { style: [props.style, style] } : {}),
		...(Object.keys(textStyle).length
			? { textStyle: [props.textStyle, textStyle] }
			: {}),
		...(Object.keys(dotStyle).length
			? { dotStyle: [props.dotStyle, dotStyle] }
			: {}),
	}
}

function mapElements(
	node: ReactNode,
	transform: (node: ReactElement<Props>) => ReactElement<Props>,
	depth = 0,
): ReactNode {
	if (depth > 16) return node
	if (Array.isArray(node)) {
		let changed = false
		const next = node.map(child => {
			const value = mapElements(child, transform, depth + 1)
			changed ||= value !== child
			return value
		})
		return changed ? next : node
	}
	if (!isValidElement<Props>(node)) return node
	let element = transform(node)
	if (element.props.children !== undefined) {
		const children = mapElements(
			element.props.children as ReactNode,
			transform,
			depth + 1,
		)
		if (children !== element.props.children)
			element = cloneElement(element, { children })
	}
	return element
}

export function notificationBadgeTree(
	tree: ReactNode,
	badgeType: unknown,
	css: Css,
) {
	return mapElements(tree, node => {
		if (node.type !== badgeType) return node
		const props = notificationBadgeProps(node.props, css)
		return props === node.props ? node : cloneElement(node, props)
	})
}

export function unreadIndicatorTree(
	tree: ReactNode,
	css: Css,
	selected: boolean,
) {
	if (!isValidElement<Props>(tree)) return tree
	const style: Style = {}
	const fill = color(
		css,
		selected ? '--server-selected-color' : '--server-unread-color',
	)
	const width = length(css, '--server-unread-width', 2, 16)
	const height = length(
		css,
		selected ? '--server-selected-height' : '--server-unread-height',
		4,
		64,
	)
	const radius = length(css, '--server-unread-radius', 0, 32)
	if (fill) style.backgroundColor = fill
	if (width !== undefined) {
		style.width = width
		style.left = -width / 2
		style.borderRadius = radius ?? width / 2
	} else if (radius !== undefined) style.borderRadius = radius
	if (height !== undefined) {
		style.height = height
		style.marginTop = -height / 2
	}
	return Object.keys(style).length
		? cloneElement(tree, { style: [tree.props.style, style] })
		: tree
}

export function replaceUnreadIndicator(
	tree: ReactNode,
	original: unknown,
	replacement: ComponentType<Props>,
) {
	return mapElements(tree, node =>
		node.type === original
			? createElement(replacement, { ...node.props, key: node.key })
			: node,
	)
}

export function replaceUnreadRenderer(
	tree: ReactNode,
	original: unknown,
	replacement: (...args: unknown[]) => ReactNode,
) {
	return mapElements(tree, node => {
		if (node.props.renderItem === original)
			return cloneElement(node, { renderItem: replacement })
		if (node.props.component === original)
			return cloneElement(node, { component: replacement })
		return node
	})
}
