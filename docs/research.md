# 事前調査：Salesforce 外で Base Components を動かす

調査日: 2026-09-26 / 対象: `lightning-base-components@1.28.19-alpha`, `lwc@9.4.3`

## 結論

**動かせる。LWR は不要。** OSS の LWC コンパイラ／エンジンと、Salesforce 公式の npm パッケージ `lightning-base-components` を組み合わせれば、`lightning-input` などが SLDS スタイル付きで描画できる（使い捨ての PoC でヘッドレス Chrome のスクリーンショットにより確認）。

## 使えるパッケージ

| パッケージ | 役割 |
|---|---|
| `lightning-base-components` | 公式 Base Components のソース（MIT）。約 70 種を収録 |
| `@lwc/engine-dom`, `@lwc/synthetic-shadow` | ブラウザ上の LWC ランタイム |
| `@lwc/compiler`, `@lwc/rollup-plugin` | LWC のコンパイラと Rollup 連携 |
| `@salesforce-ux/design-system` | SLDS の CSS |
| `lwr` | ルーティング・SSR などを持つサーバー寄りのメタフレームワーク。プレイグラウンドには過剰なので**不採用** |

パッケージに含まれない（組織データ依存の）コンポーネント: `lightning-record-*-form`, `lightning-input-field`, `lightning-output-field`, `lightning-file-upload`, `lightning-input-rich-text`, `lightning-map` など。

## プレイグラウンドに有用な同梱物

- **`src/lightning/<component>/__examples__/`**: 旧 Component Library のサンプル（75 コンポーネント／255 サンプル）。そのままプレイグラウンドの初期コードに使える。
- **`metadata/raptor.json`**: 各コンポーネントのプロパティ名・スロット名。ただし型や選択肢の情報はない。
- 各コンポーネントの `.d.ts`（型情報）。

## ハマりどころ（検証済み）

1. **`import.meta.env.SSR` が 179 箇所ある。** Vite 前提の書き方で、置換しないと実行時に `Cannot read properties of undefined (reading 'SSR')` で落ちる → ビルド時に `false` へ置換する。
2. **README には「synthetic shadow が必須」とあるが、そのままでは combobox が壊れる。**
   `@salesforce/gate/*`（機能ゲート）が全部「open」のスタブになっており、`bc.260.enableComboboxElementInternals` が有効になって `attachInternals()` を呼ぶ。これは synthetic shadow 下で `attachInternals API is not supported in synthetic shadow` 例外になる。
   - 回避策 A: synthetic shadow を使わず native shadow で動かす → 全部正しく描画される（各コンポーネントが `.lbc.native.css` を同梱しているため）。
   - 回避策 B: synthetic shadow のまま、該当ゲートだけ closed に差し替える → これも正しく描画される。
   - ゲートの差し替えは `lwc.config.json` のモジュール指定では効かない（パッケージ内部の import はパッケージ自身のマッピングが優先される）。Rollup の `resolveId` プラグインで横取りする必要がある。
3. **`@lwc/compiler` はブラウザで動く。** ただし Node 前提なので esbuild でバンドルする際に `path` → `path-browserify`、`util` → `util`、`Buffer` → `buffer` を当て、`fs` などは空スタブにする必要がある。gzip 後 約 680KB。
4. アイコンは SVG テンプレートが JS に内包されるため、未使用でも utility/standard で各 1MB 前後のチャンクになる（遅延読み込みされる）。
