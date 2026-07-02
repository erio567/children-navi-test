# Step by step こども発達ナビゲーター認定試験アプリ

APIキーを使用しない、ブラウザだけで動く認定試験アプリです。

## ファイル構成

- `index.html` アプリ本体
- `styles.css` デザイン
- `app.js` 試験、採点、認定証、保存処理
- `questions.js` 問題バンク40問
- `assets/logo.png` ロゴ画像
- `assets/top.png` TOP画面画像
- `google-apps-script/Code.gs` Googleスプレッドシート保存用サンプル

## ローカルでの確認方法

`index.html` をダブルクリックするとブラウザで開けます。

## サーバーへのアップロード方法

このフォルダ内のファイルを、レンタルサーバーや静的サイトホスティングにそのままアップロードします。
受講生に `index.html` のURLを案内してください。

## APIキーについて

このアプリのHTML、CSS、JavaScriptには、OpenAI APIキー、Google APIキー、アクセストークン、秘密鍵、パスワードを含めていません。
Googleスプレッドシートに保存する場合も、APIキーではなくGoogle Apps ScriptのWebアプリURLを使います。

## 再受験管理について

再受験回数は `localStorage` に保存しています。
これは同じ端末・同じブラウザ内の簡易管理です。厳密な本人確認や不正防止にはなりません。

## Googleスプレッドシート保存の設定

1. Googleスプレッドシートを作成します。
2. 拡張機能 > Apps Script を開きます。
3. `google-apps-script/Code.gs` の内容を貼り付けます。
4. `SPREADSHEET_ID` にスプレッドシートIDを入れます。
5. デプロイ > 新しいデプロイ > ウェブアプリとして公開します。
6. 発行されたWebアプリURLを `app.js` の `CONFIG.appsScriptUrl` に入れます。

## ロゴ画像の差し替え

`assets/logo.png` を同じ名前の画像で置き換えると差し替えられます。

## 認定番号の開始番号の変更

フロントエンドのみの場合、認定番号はブラウザ内の `localStorage` で簡易発行されます。
正式運用で連番の重複を避ける場合は、Google Apps Script側で認定番号を発行してください。
開始番号は `Code.gs` の `START_NUMBER` で変更できます。

## 認定証の保存

- PDF保存：ブラウザの印刷機能から「PDFに保存」を選びます。
- 画像保存：認定証画面の「画像保存」ボタンを使います。
