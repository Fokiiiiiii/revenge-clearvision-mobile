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
| チャンネル一覧の見出し、下のバー | `--card-shading`、`--input-shading` |
| メニュー、ポップアップ、モーダル | `--popout-shading`、`--modal-shading` |
| 暗い膜の強さの倍率 | `--background-shading-percent` |
| 共通Textの既定フォント | `--main-font` |

BgVideoが動いているとき、画面全体の暗い膜を背景動画の上に1枚だけ描画します。チャンネル一覧の見出しと下の操作バーには別のパネル色を適用します。カード・入力欄・モーダルの背景まで一律に透明化しません。

## Discordの全テーマ色を個別に指定

色の名前を小文字のハイフン区切りにし、先頭に `--discord-` を付けます。Discord 348010で確認した409種類すべてを、この形式で個別指定できます。将来追加された色も起動時に列挙します。

例: `TEXT_LINK` は `--discord-text-link`、`BORDER_SUBTLE` は `--discord-border-subtle`、`INTERACTIVE_BACKGROUND_SELECTED` は `--discord-interactive-background-selected` です。個別指定をClearVisionの共通変数より優先します。

対応する色指定は `#rgb`、`#rgba`、`#rrggbb`、`#rrggbbaa`、`rgb()`、`rgba()`、`transparent`。無効な値は適用しません。

## 角丸と余白

`--discord-radius-none/xs/sm/md/lg/xl/xxl/round` で8種類の角丸を調整します。余白は `--discord-space-px-0`、`--discord-space-px-4`、`--discord-space-px-8` など、実際の20種類のspace tokenに対応します。

値には0以上の数値、または数値と `px` を指定します。AndroidではReact Nativeの論理ピクセルとして扱います。初期化時に数値をコピーする部品では再起動が必要です。

## Fuji Night

[fuji-night.css](../presets/fuji-night.css) は、紫・青の藤、白い光、赤い提灯の動画用です。淡い紫のアクセント、明るい本文・補助文字、濃紺の半透明パネルを設定しています。動画URLの変更やダウンロードはこのCSSでは行いません。

## 対応の範囲

Android DiscordのReact Native UIをテーマAPIへ対応付ける実装です。PCのDOM・クラス名を対象とする任意のCSS規則、`@import`先のWeb用CSS、Webフォントの自動ダウンロードを実行するCSSエンジンではありません。宣言を含むCSSはそのまま保存し、対応する変数を読み取ります。`--code-font` とPC用の `text-shadow` 規則は未接続です。

プラグイン停止時には変更した色・角丸・余白を復元し、追加した内部色を削除します。
