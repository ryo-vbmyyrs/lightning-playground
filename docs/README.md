# ドキュメント

Lightning Base Components（`lightning-input` などの標準 LWC）を Salesforce プラットフォーム外で試せるプレイグラウンドの設計メモです。
公式 Component Library にあったプレイグラウンドが廃止されたため、その代替を目指しています。

| ドキュメント | 内容 |
|---|---|
| [research.md](./research.md) | 事前調査の結果（プラットフォーム外で動かせるか、ハマりどころ） |
| [architecture.md](./architecture.md) | 全体構成とデータの流れ |
| [decisions.md](./decisions.md) | 設計判断の記録（なぜそうしたか） |
| [dependencies.md](./dependencies.md) | 依存パッケージ一覧とインストール前レビュー用の情報、ライセンス |

## 現在のステータス（2026-09-26）

- 試作版が動作する状態。`npm install` → `npm run dev` で起動できる。
- 動作確認済み: サンプルの表示、コードの編集とプレビューへの反映、コンパイルエラーの表示（ファイル名・行・列）、`console.log` の転送、Reset。
- カタログに載っている 61 コンポーネント／228 サンプルは、ヘッドレス Chrome で全件描画を確認済み（[decisions.md](./decisions.md) #12）。
- 既知の課題: Base Components 内部の実装に対する LWC の開発モード警告（「native shadow では壊れる」という synthetic-aria 警告）が、多くのサンプルで Console に表示される。
