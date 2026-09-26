# 設計判断の記録

新しい判断は末尾に追記する。覆した場合は元の項目に「→ 置き換え: #N」と追記する。

---

## #1 LWR ではなく素の LWC OSS を使う（2026-09-26）

- LWR はサーバー（ルーティング・SSR・モジュール配信）を含むフレームワーク。プレイグラウンドはサーバー不要の静的 SPA にしたいので過剰。
- 必要なのは「Base Components をビルドしたランタイム」と「ブラウザ内コンパイラ」だけで、どちらも `@lwc/*` パッケージで足りる。

## #2 クライアントは React + TypeScript + Vite（2026-09-26）

- 要件（React / TypeScript）に従う。バンドラーは React + TS の標準的な選択肢として Vite。
- ただし **LWC 関連のビルドは Vite に載せない**（#3）。Vite は React のシェルだけを扱う。

## #3 LWC ランタイムとコンパイラは事前ビルドして public/ に置く（2026-09-26）

- 事前調査の PoC で動作確認済みの組み合わせ（Rollup + `@lwc/rollup-plugin`、esbuild + Node ポリフィル）をそのまま使う。
- Vite 8 は Rolldown ベースで、`@lwc/rollup-plugin` や Node 向けパッケージのバンドルが同じように動く保証がない。LWC 部分を Vite から切り離すことで、Vite のバージョンアップの影響を受けにくくする。
- 代償: `npm run dev` の前に毎回アセット生成が走る（`npm run assets`）。ランタイムを変更しないなら 2 回目以降は `npx vite` だけでもよい。

## #4 synthetic shadow + ゲート差し替えを採用（native shadow は不採用）（2026-09-26）

- Salesforce 本番（Lightning Experience）は synthetic shadow で動いているため、そちらに合わせるほうが「本番と同じ見た目・挙動」を確認するという目的に合う。
- synthetic shadow ならページ全体に読み込んだ SLDS の CSS がユーザーのテンプレート内にも効く。サンプルコードは `slds-m-top_medium` などのユーティリティクラスを前提にしているため、native shadow ではサンプルの見た目が崩れる。
- 問題になるのは `bc.260.enableComboboxElementInternals` ゲートだけ（`attachInternals` を使うのは `baseCombobox` のみ。調査時に grep で確認）。`scripts/paths.ts` の `closedGates` で closed に差し替える。
- 将来 native shadow も試せるように切り替え可能にする余地はある（→ #10）。

## #5 プレビューは sandbox なしの srcdoc iframe（2026-09-26）

- sandbox 属性を付けると origin が opaque になり、ランタイム（`public/generated/runtime`）の読み込みに CORS が必要になる。
- 実行されるのは閲覧者自身が書いたコードだけなので、試作段階では許容する。
- **将来、コードを URL などで共有する機能を入れる場合は見直しが必要**（他人のコードが playground の origin で動くため）。その際は別 origin からのランタイム配信 + sandbox を検討する。

## #6 ユーザーコードは data: URL で import map に載せる（2026-09-26）

- blob: URL と違って解放（revoke）の管理が要らない。
- import map のキーと値の完全一致で解決されるので、相対 import は Worker 側でバンドル内のモジュール名に書き換える。

## #7 エディタは試作段階では textarea（2026-09-26）

- 依存パッケージを増やさずにレビューの負担を減らすため。Tab キーでのインデント挿入だけ実装。
- シンタックスハイライトや補完が欲しくなったら CodeMirror 6 または Monaco を検討する（Monaco は大きいので CodeMirror が第一候補）。

## #8 依存パッケージはバージョン固定 + install scripts 無効（2026-09-26）

- インストール前にレビューするため、`package.json` はすべて完全一致のバージョン指定。`.npmrc` で `save-exact=true`。
- `.npmrc` の `ignore-scripts=true` で、依存パッケージの install スクリプトを実行しない。詳細は [dependencies.md](./dependencies.md)。
- 副作用: `ignore-scripts` は `npm run` の `pre*`/`post*` フックも無効にするため、npm scripts ではフックを使わず明示的に連結している。

## #9 ビルドスクリプトも TypeScript（Node の型ストリッピング）（2026-09-26）

- Node 22.18 以降は `.ts` を型ストリッピングでそのまま実行できるため、ts-node / tsx などを追加せずに済む。
- 制約: enum や namespace などの「消せない構文」は使えない（`tsconfig.node.json` の `erasableSyntaxOnly` で検出）。相対 import には `.ts` 拡張子が必要。
- `scripts/shims/` の数行のファイルだけは、Rollup / esbuild にそのまま渡すため JS のまま。
- `tsconfig.node.json` のモジュール解決は `NodeNext` ではなく `bundler`（`module: preserve`）にした。`@rollup/plugin-replace` の型定義が `NodeNext` では CommonJS 扱いになり、実行時は問題なく呼べる default export が「呼び出せない」と誤判定されるため（動作確認時に判明）。

## #10 将来の native shadow 対応メモ（未着手）（2026-09-26）

現時点では synthetic shadow のみ対応する。将来プレビューを synthetic / native で切り替えられるようにする場合のメモ。
Salesforce は native への段階的な移行を進めているため、「native にすると見た目や挙動がどう変わるか」を確認できる機能には実用的な価値がある。

### モードに依存している箇所

| 箇所 | 内容 | 切り替え時の対応 |
|---|---|---|
| `src/app/lib/previewDocument.ts` の `bootstrap` | `await import('@lwc/synthetic-shadow')` の 1 行。LWC は synthetic-shadow が読み込まれていれば synthetic、なければ native で動く | この import を条件付きにし、モードを `buildPreviewDocument()` のオプションとして渡す。プレビューは毎回新しい iframe を作るので、実行ごとにモードを変えても状態は混ざらない |
| `scripts/paths.ts` の `closedGates` | synthetic で動かない機能ゲートをビルド時に OFF に固定している | ゲート OFF のままでも native は動くので、ランタイムは 1 つのビルドを両モードで共用できる。native を本番と完全に同じ挙動にしたい場合は、ランタイムをモード別に 2 つビルドする |

### 変更が不要な部分

- Base Components: `*.lbc.synthetic.css` と `*.lbc.native.css` を両方同梱し、実行時のモードに応じて使い分ける。事前調査の PoC で、同じビルド方式のまま native で正しく描画されることを確認済み。
- コンパイラ Worker: ユーザーコードのコンパイル結果はモードに依存しない。
- カタログ・エディタなどの UI（モード選択の UI を追加する以外）。

### 設計上の課題

native ではページ全体に読み込んだ SLDS の CSS がユーザーのテンプレート内に効かない。公式サンプルは SLDS のユーティリティクラスを前提にしているため、そのままでは見た目が崩れる。対応方針は機能の目的に応じて決める。

- ユーザーコンポーネントの shadow root に SLDS の CSS を自動注入する（`adoptedStyleSheets` など）
- 「native では崩れる」こと自体を移行時の確認ポイントとしてそのまま見せる

## #11 `npm run assets` の生成物は git 管理対象外にする（2026-09-26）

`public/generated/`（ランタイム・コンパイラ Worker・カタログ・SLDS）と `.generated/`（ビルド中間ファイル）は `.gitignore` で除外する。ソースではなくビルド成果物として扱う。

- **再生成できる**: 入力はバージョン固定の依存パッケージとビルドスクリプトだけなので、`npm install && npm run assets` で誰でも同じものを作れる。
- **サイズが大きい**: アイコンのチャンクが各 1MB 前後、コンパイラ Worker が約 2.6MB、SLDS の CSS と画像で数 MB になる。
- **差分がレビューできない**: minify 済みのコードやハッシュ付きのチャンク名は、再生成のたびにまとめて変わる。
- **食い違いを防ぐ**: コミットすると「パッケージを更新したのに生成物が古いまま」が起こりうる。毎回生成すれば、常にインストール済みのバージョンと一致する。

代償と対応:

- 生成物がないと動かない → `npm run dev` / `npm run build` の中で `npm run assets` を自動実行する（`ignore-scripts` の影響で `pre*` フックは使えないため明示的に連結、#8 参照）。
- デプロイ先でも Node によるビルドが必要（GitHub Pages などに置く場合は CI でビルドする）。

ビルド工程なしでリポジトリをそのまま静的ホスティングしたい、などの事情が出てきたら見直す。

## #12 サンプル一覧はプラットフォームでサポートされたコンポーネントだけにする（2026-09-26）

`lightning-base-components` には `__examples__` を持つコンポーネントが 75 個あるが、カタログには次の両方を満たす **61 個**（サンプル 228 件）だけを載せる。

- パッケージの `lwc.expose` に含まれている（パッケージ外から import できる公開モジュール）
- `.js-meta.xml` に `<support>GA</support>` または `<support>BETA</support>` がある（Salesforce 上でサポートされている）。BETA はサイドバーにバッジを表示する。

理由:

- 除外した 14 個は、非公開モジュール（`calendar`, `primitiveOverlay` など）か、プラットフォーム外専用のコンポーネント（`dialog`, `popup`, `context` など）。プラットフォーム外専用のものは「Salesforce 上で使えるコンポーネントを試す」という目的に合わない。旧 Component Library が載せていたのもサポート対象のものだけ。
- 全サンプルを実際に動かしたところ、失敗した 17 件はすべて除外対象のコンポーネントだった。非公開モジュールの import や、別サンプルのバンドル（`context/provider` など）への参照が原因で、動かすには追加の仕組みが必要になる。

## #13 LWC ランタイムのビルド設定（2026-09-26）

動作確認時に判明した点に合わせて、`scripts/build-runtime.ts` を次のように設定した。

- **エントリはパッケージの `lwc.expose` にある公開モジュールだけ**（118 個）。非公開モジュール（`primitive*`, `*Utils` など）は LWC のモジュール解決がパッケージ外からの参照を拒否するため、エントリにできない。公開モジュールから内部的に使われる分は通常どおりバンドルされる。
- **`defaultModules` から `@lwc/wire-service` を外す**。`@lwc/rollup-plugin` は既定で `@lwc/engine-dom` / `@lwc/synthetic-shadow` / `@lwc/wire-service` を解決しようとするが、Base Components は wire service を使わないので、依存パッケージを増やさないために外した（事前調査の PoC では `lwc` メタパッケージ経由で入っていたため問題にならなかった）。
- **`enableDynamicComponents: true`**。一部のモジュール（`multiColumnSortingModal` など）が `lwc:is`（動的コンポーネント）を使っているため。Salesforce 上でも使える機能なので、ブラウザ内コンパイラ（ユーザーコード）でも同じく有効にしている。
- 既知の制限: `lightning/navigation`（`force/navigation` に依存）、`lightning/barcodeScanner`（`lightning/mobileCapabilities` に依存）、`lightning/primitiveFigure`（非公開の `lightning/primitiveUtils` に依存）は、依存先がパッケージに含まれないため読み込むとエラーになる。プラットフォーム専用機能なので、プレイグラウンドでは対応しない。

## #14 ライセンス対応（2026-09-27）

リポジトリを public にしたため、ライセンス面の対応を入れた。

- **このプロジェクト自身のコードは MIT**（ルートの `LICENSE`）。
- **ビルド成果物に `THIRD_PARTY_NOTICES.txt` を含める**。`npm run build` で `dist/THIRD_PARTY_NOTICES.txt` が出力される。
  - 対象は、実際に配信物に入るパッケージだけ。各アセットのビルド（Rollup の `moduleIds`、esbuild の `metafile`、SLDS のコピー、カタログ）が使ったパッケージを `.generated/bundled-packages/` に記録し、Vite のビルドでアプリ本体（React など）のモジュールと合わせて集計する（`scripts/licenses.ts`）。
  - ライセンスファイルを同梱していないパッケージは、ビルドを失敗させる。`scripts/licenses/` にライセンス文を置き、`vendoredLicenses` に登録して対応する（現在は `@salesforce-ux/design-system` と `isarray`）。
- リポジトリ自体には Salesforce のコードや画像を含めない（#11 のとおり生成物は git 管理対象外）。再配布になるのはビルド成果物を公開したときだけ。

理由:

- `lightning-base-components` は `package.json` 上は `MIT` だが、同梱の `LICENSE.txt` は Salesforce 独自の Terms of Use で、「複製物には規約を含めること」が条件になっている。
- SLDS のアイコン・画像は CC BY-ND 4.0 で、クレジットの表示が必要になる。改変も禁止されているので、`slds/images` は加工せずにそのままコピーしている。
- MIT / BSD / ISC / Apache-2.0 / CC-BY-4.0 はいずれも著作権表示やライセンス文の同梱が必要。バンドルするとファイル先頭のコメントが消えることがあるので、全文をまとめて置く。

注意:

- **Salesforce Sans フォントは配信しない**。フォントのライセンス（salesforce-ux/licenses の `LICENSE-font.txt`）は Salesforce プラットフォーム上のアプリでの利用に限られる。現在の SLDS パッケージにはフォントが入っておらず、CSS からの参照もない。
- 「Salesforce」「Lightning」は Salesforce の商標なので、公式と誤解されないようにする（`THIRD_PARTY_NOTICES.txt` の冒頭に非公式である旨を記載）。

