# 依存パッケージ

インストール前のレビュー用。バージョンはすべて `package.json` で完全一致指定（2026-09-26 時点の最新）。

## 直接依存

### 実行時（ブラウザに配信されるアプリ本体）

| パッケージ | バージョン | 用途 | 公開元 |
|---|---|---|---|
| `react` | 19.3.0 | UI | Meta（facebook/react） |
| `react-dom` | 19.3.0 | UI | Meta（facebook/react） |

### 開発・ビルド時

| パッケージ | バージョン | 用途 | 公開元 |
|---|---|---|---|
| `vite` | 8.3.1 | React アプリの開発サーバー／ビルド | vitejs |
| `@vitejs/plugin-react` | 6.1.1 | Vite の React 対応 | vitejs |
| `typescript` | 7.0.2 | 型チェック（`tsc -b`） | Microsoft |
| `@types/react`, `@types/react-dom` | 19.3.0 | 型定義 | DefinitelyTyped |
| `@types/node` | 26.6.2 | ビルドスクリプトの型定義 | DefinitelyTyped |
| `lightning-base-components` | 1.28.19-alpha | Base Components 本体・サンプル・メタデータ | Salesforce（npm 上の maintainer に `lwc-admin`）。※ `latest` タグ自体が `-alpha` 付きで配布されている |
| `@lwc/engine-dom` | 9.4.3 | LWC ランタイム（プレビューに配信） | Salesforce（salesforce/lwc） |
| `@lwc/synthetic-shadow` | 9.4.3 | synthetic shadow（プレビューに配信） | Salesforce（salesforce/lwc） |
| `@lwc/compiler` | 9.4.3 | LWC コンパイラ（Worker としてブラウザに配信） | Salesforce（salesforce/lwc） |
| `@lwc/rollup-plugin` | 9.4.3 | ランタイムビルド用 | Salesforce（salesforce/lwc） |
| `@salesforce-ux/design-system` | 2.264.1 | SLDS の CSS（プレビューに配信） | Salesforce（`salesforce-ux`） |
| `rollup` | 4.63.5 | ランタイムのビルド | rollup |
| `@rollup/plugin-replace` | 6.0.3 | `import.meta.env.SSR` などの置換 | rollup |
| `esbuild` | 0.28.2 | コンパイラ Worker のバンドル | evanw |
| `path-browserify` | 1.0.1 | Worker 内の `path` ポリフィル | browserify |
| `util` | 0.12.5 | Worker 内の `util` ポリフィル | browserify |
| `buffer` | 6.0.3 | Worker 内の `Buffer` ポリフィル | feross |

`lwc`（メタパッケージ）は使わず、必要な `@lwc/*` だけを個別に指定している。`@lwc/rollup-plugin` が既定で参照する `@lwc/wire-service` は、Base Components が使わないため入れていない（[decisions.md](./decisions.md) #13）。

## 推移的依存を含めた概要

`npm install --package-lock-only --ignore-scripts` でロックファイルだけを生成して確認した結果（**このプロジェクトには生成していない**。作業用の別ディレクトリで実行）。

- パッケージ総数: **253**（OS 別のネイティブバイナリ用 optional パッケージを含む。実際にインストールされるのはこのうち自分の OS 向けのものだけ。macOS で `npm install` した結果は 160 パッケージ）
- `npm audit`: **既知の脆弱性 0 件**
- deprecated: なし
- ライセンス: MIT 207 / Apache-2.0 23 / MPL-2.0 12 / ISC 7 / BSD-3-Clause 3 / CC-BY-4.0 1
  - MPL-2.0: `lightningcss` とそのプラットフォーム別バイナリ（Vite の依存）
  - CC-BY-4.0: `caniuse-lite`（ブラウザ対応データ。ビルド時のみ使用）
- install スクリプトを持つパッケージ:
  - `esbuild`: postinstall でプラットフォーム別バイナリを確認する。`ignore-scripts=true` でスキップされるが、バイナリは optional 依存（`@esbuild/darwin-arm64` など）として入るので通常は問題なく動く。
  - `fsevents`: macOS 用のファイル監視（Rollup/Vite の optional 依存）。v2 はビルド済みバイナリ同梱のためスクリプトなしでも動く。

## インストール手順（レビュー後）

```sh
# .npmrc で ignore-scripts=true / save-exact=true が効いている
npm install
```

- ロックファイル（`package-lock.json`）はインストール時に生成される。レビュー時にロックファイルも確認したい場合は、先に `npm install --package-lock-only` だけを実行して差分を見る方法もある（`node_modules` は作られず、パッケージのコードも実行されない）。

## ブラウザに配信されるもの

プレビュー用 iframe とコンパイラ Worker には、上記のうち `@lwc/engine-dom`、`@lwc/synthetic-shadow`、`lightning-base-components`、`@lwc/compiler`（と Babel などの推移的依存）、ポリフィル 3 種、SLDS の CSS がバンドルされて配信される。
