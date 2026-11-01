# ClearVision Mobile

Revenge Next / Discord Android用のカスタムCSSテーマ。v1.1.1はJSとnative pluginの両方を含み、Discord348.10の409 semantic colors、28寸法tokens、218 native color rolesへ対応しています。背景・文字・枠線・角丸と、メンション数バッジ／サーバーの未読・選択マークを調整できます。

インストール用Repository URL:

`https://raw.githubusercontent.com/Fokiiiiiii/revenge-clearvision-mobile/main/plugin-dist`

設定のカスタムCSS欄へ `:root` と `.theme-*` の変数を追加します。HSL、RGBA、空白区切りRGB、入れ子の `var()` fallback、`!important`、`.embed` の対応規則を利用できます。対応項目とサンプルは [CSSリファレンス](docs/css-reference.md)、既存の動画テーマ例は [Fuji Night CSS](presets/fuji-night.css) を参照してください。

既に色をコピーして描画する部品は「CSSを保存してネイティブUIを再読み込み」で更新します。Discord348.10 / Revenge Next build228 / RevengeXposed1.9.4-cachefix.1で、埋め込みの半透明・枠線・角丸、通知badgeの色・寸法、未読マークの色・寸法を実機確認しました。既存CSSは保持して追加しています。

検証はBun38 tests、TypeScript、native input validation tests、完全な配布ZIPのCIビルド。JSだけのbuildは `bun install` → `bun run build`、native入り配布物はJDK25 / Android SDK37 / 対応するRevenge API1.2.1を用意し `bash ./gradlew packageAllPlugins`。同じ手順をGitHub Actionsへ定義しています。

PCのDOMセレクター・擬似要素・Webフォント取得などの対応範囲はCSSリファレンスに記載しています。初期化時に値をコピーする部品や、Discord更新で変化する描画経路は実機確認が必要です。
