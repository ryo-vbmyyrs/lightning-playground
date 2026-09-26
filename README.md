# Lightning Playground

Lightning Base Components（`lightning-input` など）を Salesforce 組織なしでブラウザ上で試せるプレイグラウンドです。
廃止された公式 Component Library のプレイグラウンドの代替を目指しています。

- 公式サンプル（`lightning-base-components` 同梱の `__examples__`）を選んで編集できます。
- 編集内容をブラウザ内でコンパイルし、iframe でプレビューします（サーバー不要）。

## 必要環境

- Node.js 22.18 以上（ビルドスクリプトの `.ts` を直接実行するため）

## 使い方

```sh
npm install        # 依存パッケージは docs/dependencies.md を参照
npm run dev        # アセット生成 (npm run assets) → Vite 開発サーバー起動
```

| コマンド | 内容 |
|---|---|
| `npm run assets` | LWC ランタイム・コンパイラ Worker・サンプル一覧を `public/generated/` に生成 |
| `npm run dev` | アセット生成 + 開発サーバー |
| `npm run build` | 型チェック + アセット生成 + 本番ビルド（`dist/`） |
| `npm run typecheck` | 型チェックのみ |

設計の詳細は [docs/](./docs/README.md) を参照してください。
