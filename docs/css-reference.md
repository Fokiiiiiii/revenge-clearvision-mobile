# カスタムCSSの対応

設定はカスタムCSS欄だけで行います。`:root`、`.theme-light`、`.theme-dark`、`.theme-darker`、`.theme-midnight` の変数宣言と `var()` 参照を読み取ります。

## よく使う変数

| 調整する部分 | CSS変数 |
| --- | --- |
| 基本色、押下色、フォーカス | `--main-color`、`--hover-color`、`--focus-color` |
| 本文、見出し、補助文字、リンク | `--normal-text`、`--text-primary`、`--text-secondary`、`--muted-text`、`--text-link` |
| チャンネル名、未読、選択状態 | `--channel-normal`、`--channel-muted`、`--channel-unread`、`--channel-selected`、`--channel-selected-bg` |
| ボタンとアイコンの文字色 | `--interactive-normal`、`--interactive-hover`、`--interactive-active`、`--interactive-muted` |
| オンライン、離席、取り込み中 | `--online-color`、`--idle-color`、`--dnd-color`、`--offline-color` |
| 動画全体の暗い膜 | `--background-shading` |
| チャンネルヘッダーとステータスバー | `--header-shading`、`--statusbar-shading` |
| ユーザー一覧の画面とカード | `--member-list-shading`、`--member-card-shading` |
| 新着メッセージのアプリ内通知バナー | `--notification-shading` |
| チャンネル一覧の見出し、下のバー | `--card-shading`、`--input-shading` |
| メニュー、ポップアップ、モーダル | `--popout-shading`、`--modal-shading` |
| 暗い膜の強さの倍率 | `--background-shading-percent` |
| 共通Textの既定フォント | `--main-font` |

BgVideoが動いているとき、画面全体の暗い膜を背景動画の上に1枚だけ描画します。チャンネル一覧の見出しと下の操作バーには別のパネル色を適用します。カード・入力欄・モーダルの背景まで一律に透明化しません。

## Discordの全テーマ色を個別に指定

色の名前を小文字のハイフン区切りにし、先頭に `--discord-` を付けます。Discord 348010で確認した409種類すべてを、この形式で個別指定できます。将来追加された色も起動時に列挙します。

例: `TEXT_LINK` は `--discord-text-link`、`BORDER_SUBTLE` は `--discord-border-subtle`、`INTERACTIVE_BACKGROUND_SELECTED` は `--discord-interactive-background-selected` です。個別指定をClearVisionの共通変数より優先します。

対応する色指定は `#rgb`、`#rgba`、`#rrggbb`、`#rrggbbaa`、`rgb()`、`rgba()`、`hsl()`、`hsla()`、CSSの色名です。空白区切り、RGBの百分率、アルファの `/` 指定、入れ子の `var()` fallback、`!important` も扱います。無効な値は適用しません。

## 角丸と余白

`--discord-radius-none/xs/sm/md/lg/xl/xxl/round` で8種類の角丸を調整します。余白は `--discord-space-px-0`、`--discord-space-px-4`、`--discord-space-px-8` など、実際の20種類のspace tokenに対応します。

値には0以上の数値、または数値と `px` を指定します。AndroidではReact Nativeの論理ピクセルとして扱います。初期化時に数値をコピーする部品では再起動が必要です。

## Fuji Night

[fuji-night.css](../presets/fuji-night.css) は、紫・青の藤、白い光、赤い提灯の動画用です。淡い紫のアクセント、明るい本文・補助文字、濃紺の半透明パネルを設定しています。動画URLの変更やダウンロードはこのCSSでは行いません。

## 対応の範囲

Android DiscordのReact Native UIをテーマAPIへ対応付ける実装です。PCのDOM・クラス名を対象とする任意のCSS規則、`@import`先のWeb用CSS、Webフォントの自動ダウンロードを実行するCSSエンジンではありません。宣言を含むCSSはそのまま保存し、対応する変数を読み取ります。`--code-font` とPC用の `text-shadow` 規則は未接続です。

プラグイン停止時にはJSの色・角丸・余白を復元し、追加した内部色を削除します。ネイティブのhookも解除します。既に色をコピーして描画している部品の更新には再読み込みが必要です。

## v1.1 のネイティブUIと部品別CSS

配布ZIPにはJSと `plugin.jar` の両方が含まれます。Discord 348.10 の `AshTheme`・`DarkTheme`・`OnyxTheme`・`LightTheme` と実験版テーマの色getterを列挙し、同じ `--discord-...` 変数をネイティブ側にも接続します。埋め込みはネイティブの `getEmbedBackground()` と `EmbedView.setEmbed-Km7rQmo` の描画経路へ接続します。リソースIDを返す `getEmbedBackgroundColor()` は色の上書き対象にしません。

```css
:root {
  --main-color: hsl(270 45% 70%);
  --button-background: var(--main-color);
  --button-hover: #927ac5;
  --button-text: #ffffff;
  --button-secondary-background: rgba(16, 20, 39, 0.55);
  --settings-background: rgba(16, 20, 39, 0.55);
  --settings-hover: rgba(32, 38, 60, 0.65);
  --embed-title: #e0d6ff;
}

.embed {
  background-color: rgb(16 20 39 / 45%);
  color: #ddd8ee;
  border-color: rgba(170, 149, 212, 0.4);
  border-width: 1px;
  border-radius: 12px;
}

.theme-light .embed {
  background-color: rgb(250 248 255 / 65%);
  color: #292437;
}
```

埋め込みは `.embed` / `.embedFull` / `.cv-embed` の `background-color`、`color`、`border-color`、`border-width`、`border-radius` に対応します。変数で指定する場合はそれぞれ `--embed-background`、`--embed-text`、`--embed-border-color`、`--embed-border-width`、`--embed-radius` です。寸法はAndroidの論理pxで、0〜1024を受け付けます。タイトルは `--embed-title` で独立して指定できます。

`.button` / `.cv-button` の背景色・文字色は共通ボタン変数へ、`.settings` / `.cv-settings` の背景色は設定行の変数へ対応します。これらはAndroid向けの部品名です。デスクトップのDOM・任意の複合セレクター・擬似要素・animation・layout全般の解釈は対象外です。V7の `@import` は保存したまま実行せず、変数宣言を利用します。

設定変更で色と表示中の埋め込みへ反映します。初期化時に色をコピーするボタン・画面は「CSSを保存してネイティブUIを再読み込み」で更新します。既存のCSSとプラグイン保存領域を維持します。

## メンション通知・サーバー一覧のマーク（v1.1.1）

```css
:root {
  --mention-badge-background: var(--main-color);
  --mention-badge-text: #1b122c;
  --mention-badge-size: 20px;
  --mention-badge-font-size: 12px;
  --mention-badge-radius: 10px;
  --mention-badge-border: rgba(255, 255, 255, 0.3);
  --mention-badge-border-width: 1px;
  --notification-dot-color: var(--main-color);
  --notification-dot-size: 8px;
  --server-unread-color: #d8c7ff;
  --server-selected-color: var(--main-color);
  --server-unread-width: 8px;
  --server-unread-height: 10px;
  --server-selected-height: 36px;
  --server-unread-radius: 4px;
  --mention-background: rgba(170, 149, 212, 0.2);
  --mention-foreground: var(--text-link, var(--normal-text));
}
```

メンション数バッジは16〜48px、文字は8〜28px。文字だけを大きくした場合はバッジとmaskも拡大します。通知dotは2〜16px、サーバーの未読マーク幅は2〜16px、高さは4〜64pxです。範囲外の値は適用しません。未設定の項目は元の表示を維持します。

対象は実機で確認した `design/void/Badge/native/Badge.tsx` のBadge/MaskedBadgeと、`GuildsBarAnimatedItemWrapper` のUnreadIndicator/renderUnreadIndicatorです。初期import時にhookし、module内に保持された描画関数にもスタイルを適用します。数字・既読/未読状態・通知設定・クリックやアクセシビリティの動作は保持します。CSSによる外観変更は、通知のミュートや既読化ではありません。
