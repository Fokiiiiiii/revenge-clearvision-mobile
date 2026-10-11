type MutableRecord = Record<string, unknown>
type DimensionEntry = { target: MutableRecord; key: string; css: string }
type Snapshot = {
	target: MutableRecord
	key: string
	descriptor: PropertyDescriptor
}

function record(value: unknown): MutableRecord | undefined {
	return typeof value === 'object' && value !== null
		? (value as MutableRecord)
		: undefined
}

function slug(value: string) {
	return value
		.replace(/([a-z\d])([A-Z])/g, '$1-$2')
		.replace(/_/g, '-')
		.toLowerCase()
}

function parseDimension(value: unknown): number | undefined {
	if (typeof value !== 'string') return
	const match = value.trim().match(/^(\+?(?:\d+\.?\d*|\.\d+))\s*(?:px)?$/i)
	if (!match) return
	const number = Number(match[1])
	return Number.isFinite(number) && number >= 0 ? number : undefined
}

export function createCssDimensions(tokens: unknown) {
	const root = record(tokens)
	const namespace = record(root?.Tokens) ?? root
	const defaults =
		record(namespace?.default) ?? record(root?.default) ?? namespace
	const radii = record(defaults?.radii)
	const space = record(defaults?.space)
	const entries: DimensionEntry[] = [
		...Object.keys(radii ?? {}).map(key => ({
			target: radii!,
			key,
			css: `--discord-radius-${slug(key)}`,
		})),
		...Object.keys(space ?? {}).map(key => ({
			target: space!,
			key,
			css: `--discord-space-${slug(key)}`,
		})),
	]
	const snapshots: Snapshot[] = []
	let captured = new WeakMap<object, Set<string>>()

	function restore() {
		for (let index = snapshots.length - 1; index >= 0; index--) {
			const snapshot = snapshots[index]!
			Object.defineProperty(snapshot.target, snapshot.key, snapshot.descriptor)
		}
		snapshots.length = 0
		captured = new WeakMap()
	}

	function apply(vars: Record<string, string>) {
		restore()
		const values = record(vars)
		if (!values) return 0
		let changed = 0

		try {
			for (const { target, key, css } of entries) {
				const value = parseDimension(values[css])
				const descriptor = Object.getOwnPropertyDescriptor(target, key)
				if (
					value === undefined ||
					!descriptor?.writable ||
					typeof descriptor.value !== 'number' ||
					Object.isFrozen(target)
				)
					continue

				let keys = captured.get(target)
				if (!keys) captured.set(target, (keys = new Set()))
				if (!keys.has(key)) {
					keys.add(key)
					snapshots.push({ target, key, descriptor })
				}
				target[key] = value
				changed++
			}
		} catch (error) {
			restore()
			throw error
		}

		return changed
	}

	return {
		apply,
		restore,
		count: entries.length,
		metaTokenCSS: entries.map(entry => entry.css),
	}
}
