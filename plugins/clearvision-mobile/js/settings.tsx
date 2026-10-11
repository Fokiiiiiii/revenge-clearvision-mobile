import Page from '@revenge-mod/components/Page'
import { Design } from '@revenge-mod/discord/design'
import { useState } from 'react'
import { ScrollView } from 'react-native'
import { useTranslator } from './localization'
import type { PluginSettingsComponent } from '@revenge-mod/plugins/types'
import type { ComponentProps } from 'react'
import type { Settings } from './logic'

type Props = ComponentProps<PluginSettingsComponent<{ jsonStorage: Settings }>>
const { Stack, TableRowGroup, TextInput } = Design

export default function SettingsComponent({ api }: Props) {
	const settings = api.jsonStorage.use(value => value)!
	const t = useTranslator()
	const [customCss, setCustomCss] = useState(settings.customCss)
	return (
		<Page>
			<ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
				<Stack spacing={16}>
					<TableRowGroup title={t('clearVisionTitle', 'ClearVision Mobile')}>
						<TextInput
							label={t('customCss', 'Custom CSS')}
							description={t(
								'customCssDescription',
								'Paste ClearVision CSS variables. :root and .theme-* variables are applied on Android.',
							)}
							placeholder={':root { --main-color: #aa95d4; }'}
							value={customCss}
							onChange={setCustomCss}
							onBlur={() =>
								void api.jsonStorage.set({
									customCss: customCss.slice(0, 100_000),
								})
							}
							multiline
							maxLength={100_000}
							style={{ height: 280 }}
							returnKeyType="default"
						/>
					</TableRowGroup>
				</Stack>
			</ScrollView>
		</Page>
	)
}
