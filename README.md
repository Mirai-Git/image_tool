# binary_image — ブラウザ向け移植仕様書

本ドキュメントは、もともと `image_tool_20250406.py` として存在している画像処理ロジックを、GitHub Pages 上で動作する HTML/TypeScript/CSS ベースのアプリケーションへ移植するための仕様書です。

対象読者: 私（ローカルで動かし、必要なら改変するエンジニア）

日付: 2025-10-22

## 目的

- Python スクリプトで実装されているコア画像処理（バイナリ化や独自処理）を、ブラウザで同等に動作するよう TypeScript に移植する。  
- 最終成果は GitHub Pages でホストできる静的サイトとする。

## 前提条件と制約

- ブラウザ（Chromium/Firefox/Safari/Edge）の標準 Web API のみで動作すること。外部ネイティブバイナリは使用不可。  
- 大きな画像（数千ピクセル四方）に対しては処理時間が長くなるため、重い処理は WebWorker に分離することを推奨。  
- TypeScript を使用し、型定義で入出力を明確にする。

## 高レベル要件

必須要件:
- 画像ファイル（PNG, JPEG, BMP 等）をブラウザで読み込めること。  
- Python 実装と互換性のある「バイナリ化」ロジックを再現すること（同じ入力に対して同等の出力を生成する）。  
- 結果をブラウザ上で表示し、画像としてダウンロードできること。  

望ましい（オプション）要件:
- ドラッグ＆ドロップによる画像入力、プレビュー、ズーム、戻る/やり直し。  
- WebWorker を使ったバックグラウンド処理。  
- 小さなユニットテスト（Jest + ts-jest 等）でコア関数を検証。

## 入出力（契約: TypeScript インタフェース）

基本的なデータ形状（例）:

// PixelRGBA / BinaryMatrix / ProcessOptions の説明
interface PixelRGBA {
	r: number; // 0-255
	g: number;
	b: number;
	a: number;
}

// バイナリ（0/1）で表現した結果
type BinaryMatrix = Uint8ClampedArray; // width*height 長の配列、0 or 1

interface ProcessOptions {
	threshold?: number; // バイナリ化の閾値（0-255）
	invert?: boolean; // 出力を反転するか
}

関数契約（コア）例:

function binarize(imageData: ImageData, opts: ProcessOptions): { binary: BinaryMatrix; imageData: ImageData }

エラー: 不正な画像入力、メモリ不足、サポート外のフォーマットに対しては、例外または失敗結果を返す。UI はこれらをユーザー向けメッセージへ変換する。

## アーキテクチャ（推奨）

- UI 層 (`index.html`, `style.css`, `src/ui.ts`) — 画像の読み込み、コントロール、結果表示を担う。  
- コア処理 (`src/image.ts`) — バイナリ化や変換ロジックの純粋関数群。  
- ワーカー (`src/worker.ts`) — 大きな画像処理をブロックせず非同期で実行するための WebWorker。  
- 型定義 (`src/types.ts`) — 共通インターフェース。  
- ビルド (`package.json` + bundler: Vite/Parcel/Rollup) — 出力は静的ファイル（`dist/`）で GitHub Pages に配置。

## 既存ファイルと推奨追加ファイル

既存（ワークスペース）:

- `image_tool_20250406.py` — 元の Python 実装（参照）。  
- `index.html` — 既存の HTML（必要なら修正）。  
- `main.ts` — 現在の TypeScript エントリ（必要に応じてリファクタ）。  
- `style.css` — スタイル。  
- `package.json`, `tsconfig.json` — ビルド設定。

推奨追加:

- `src/image.ts` — コアロジック移植。  
- `src/worker.ts` — WebWorker 用ラッパー。  
- `src/ui.ts` — UI と DOM 操作。  
- `src/types.ts` — 型定義。  
- `tests/` — ユニットテスト（コアロジック向け）。

## 開発手順（ローカル）

PowerShell での例:

```powershell
# 1. 依存インストール
npm install

# 2. 開発モード（Vite を使う場合の例）
npx vite

# 3. ビルド
npm run build

# 4. ローカルで dist を確認（簡易サーバ）
npx serve dist
```

package.json に入れる推奨スクリプト例:

"scripts": {
	"dev": "vite",
	"build": "vite build",
	"preview": "vite preview",
	"deploy": "gh-pages -d dist"
}

※ `gh-pages` を使う方法のほか、GitHub Actions で `pages` ブランチへ自動デプロイする方法もある。

## GitHub Pages デプロイ（簡易）

1. `npm run build` で `dist/` を作成。  
2. `npm i -D gh-pages` をインストール。  
3. `npm run deploy`（上記スクリプトを設定済みの場合）で `gh-pages` ブランチへ自動で公開。  

または GitHub Actions を使う場合は、ビルド後に `pages` プロバイダへ `dist` をアップロードする workflow を作る。

## 受け入れ基準

- 同一の入力画像に対して、既存の `image_tool_20250406.py` と同等のバイナリ結果を生成できる（ピクセルレベルで一致が理想、アルゴリズム差分は小さくとも視覚差が出ない）。  
- ブラウザで画像を読み込み、処理を実行し、結果を PNG 等でダウンロードできる。  
- 大きめの画像を処理する際、UI のフリーズは発生しない（ワーカー活用）。  

検証方法:
- Python スクリプトで生成した出力とブラウザ版の出力を比較する小さなテストスイート（ピクセル差分の閾値を設定）を用意する。

## テスト戦略

- 単体テスト: コア関数（閾値処理・フィルタ・二値化）をカバー。  
- 統合テスト: ブラウザ上でのファイル読み込み→処理→ダウンロードの e2e を手動または Playwright で自動化。  

## エッジケースと注意点

- 透過 PNG の扱い（alpha チャンネル）。  
- 非標準カラープロファイルや ICC の解釈（ブラウザは自動で処理するが一致しない場合がある）。  
- メモリ制約（巨大画像）— サンプル実装では最大サイズを制限または分割処理を導入。  

## セキュリティとプライバシー

- 画像はクライアントサイドでのみ処理し、サーバに送信しない。  
- デプロイ先（GitHub Pages）にパブリック公開されることを想定。機密画像は扱わないよう注意を明記する。

## 次のタスク（優先順）

1. `image_tool_20250406.py` の解析（アルゴリズム抽出、入出力仕様の確定） — 実作業開始。  
2. TypeScript のモジュール設計（`src/types.ts`, `src/image.ts`, `src/worker.ts`）  
3. UI 実装（`index.html`, `style.css`, `src/ui.ts`）  
4. コア処理の移植とワーカー化  
5. ビルド＆GH Pages デプロイ設定  

---

この README は移植作業の青写真です。次は `image_tool_20250406.py` を読み、主要関数とパラメータを抽出して移植可能な単位に分割します。

