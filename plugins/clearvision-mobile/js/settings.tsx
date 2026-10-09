import Page from '@revenge-mod/components/Page'
import { Design } from '@revenge-mod/discord/design'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import { useTranslator } from './localization'
import { normalizeSettings } from './logic'
import type { PluginSettingsComponent } from '@revenge-mod/plugins/types'
import type { ComponentProps } from 'react'
import type { Settings } from './logic'

type Props = ComponentProps<PluginSettingsComponent<{ jsonStorage: Settings }>>
const { Stack, TableRowGroup, TableSwitchRow, TextInput } = Design

export default function SettingsComponent({ api }: Props) {
	const settings = api.jsonStorage.use(value => value)!
	const t = useTranslator()
	const [accentColor, setAccentColor] = useState(settings.accentColor)
	const [hoverColor, setHoverColor] = useState(settings.hoverColor)
	const [fontFamily, setFontFamily] = useState(settings.fontFamily)
	return (
		<Page>
			<ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
				<Stack spacing={16}>
					<TableRowGroup title={t('clearVisionTitle', 'ClearVision Mobile')}>
						<TableSwitchRow
							label={t('enableThemeColors', 'Enable theme colors')}
							value={settings.enabled}
							onValueChange={(value: boolean) =>
								void api.jsonStorage.set({ enabled: value })
							}
						/>
						<TableSwitchRow
							label={t('useDarkTheme', 'Use dark theme')}
							value={settings.darkMode}
							onValueChange={(value: boolean) =>
								void api.jsonStorage.set({ darkMode: value })
							}
						/>
						<TableSwitchRow
							label={t(
								'transparentPanelsWithBgVideo',
								'Transparent panels when BgVideo is active',
							)}
							value={settings.transparentPanels}
							onValueChange={(value: boolean) =>
								void api.jsonStorage.set({ transparentPanels: value })
							}
						/>
						<TextInput
							label={t('accentColor', 'Accent color')}
							defaultValue={accentColor}
							onChange={setAccentColor}
							onBlur={() =>
								void api.jsonStorage.set({
									accentColor: normalizeSettings({ accentColor }).accentColor,
								})
							}
							returnKeyType="done"
						/>
						<TextInput
							label={t('hoverColor', 'Hover color')}
							defaultValue={hoverColor}
							onChange={setHoverColor}
							onBlur={() =>
								void api.jsonStorage.set({
									hoverColor: normalizeSettings({ hoverColor }).hoverColor,
								})
							}
							returnKeyType="done"
						/>
						<TextInput
							label={t('fontFamily', 'Font family')}
							defaultValue={fontFamily}
							onChange={setFontFamily}
							onBlur={() =>
								void api.jsonStorage.set({
									fontFamily: normalizeSettings({ fontFamily }).fontFamily,
								})
							}
							returnKeyType="done"
						/>
					</TableRowGroup>
				</Stack>
			</ScrollView>
		</Page>
	)
}
