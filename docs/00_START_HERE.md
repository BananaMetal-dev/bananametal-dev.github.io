# 00_START_HERE.md
# Banana Metal Apps & Music Site
# Codex 初回読込・実行管理指示書

## 0. この文書の目的

この文書は、Codexが本プロジェクトへ最初に参加する際に読む、最優先の運用指示書である。

Codexは、作業を開始する前に必ずこの文書を読み、続けて指定された設計文書を読むこと。

この文書だけを根拠に大規模実装を開始してはならない。
最初に実施する作業は、リポジトリ確認と実装計画の報告だけである。

---

## 1. プロジェクトの目的

GitHub Pages上で公開する個人サイトを実装する。

初期サイトの目的は次の3つである。

1. 作成したブラウザアプリを紹介し、利用ページへ誘導する  
2. 作成した楽曲の一覧とYouTubeリンクを掲載する  
3. Googleフォームへ誘導するお問い合わせ窓口を設置する  

初期版は、静的サイトとして公開する。

---

## 2. 最重要原則

### 2.1 段階的に開発すること

このプロジェクトは一括実装を禁止する。

以下の順で、フェーズ単位に実装・確認・固定すること。

```text
Phase 0: リポジトリ確認と初期化
Phase 1: サイトの土台とページ枠組み
Phase 2: Apps一覧ページ
Phase 3: Music一覧と songs.json 読み込み
Phase 4: Contact と Privacy
Phase 5: 公開品質の仕上げ
Phase 6: GitHub Pages公開
Phase 7: 将来機能
```

各フェーズは、ユーザーまたは実行者から明示的に指示された場合にのみ実行すること。

次のフェーズへ自動的に進まないこと。

---

### 2.2 初期版と将来機能を混ぜないこと

初期版では、静的サイトと手動編集の `data/songs.json` を完成させる。

以下は初期版では実装しない。

```text
- Google Sheets API
- Google Apps Script
- Googleサービスアカウント
- GitHub Secrets
- Googleスプレッドシートからの自動同期
- GitHub Actionsによる定時楽曲同期
- APIキー
- 認証
- ログイン
- クラウド保存
- 音源アップロード
- 画像アップロード
- 動画アップロード
- サーバーサイド処理
- Google Analytics
- 広告タグ
- YouTube iframe自動埋め込み
```

これらは、初期版の公開・運用が安定してから、別フェーズとして追加する。

---

### 2.3 既存のローカル版を壊さないこと

既存のローカル版ビジュアライザーは、本プロジェクトの公開サイトと混ぜない。

既存ローカル版は、以下の資料として参照してよい。

```text
- 操作導線
- 画面構成
- 演出や描画の仕様
- 入出力の考え方
```

ただし、以下は禁止する。

```text
- 既存ローカル版のコードを無断で大規模変更する
- ローカル版へWeb版の依存関係を混ぜる
- Python / OpenCV / ffmpeg実装をブラウザ版へそのまま移植する
- 公開サイトの都合で既存ローカル版の挙動を変える
```

---

## 3. 必ず読む文書

Codexは、作業前に次の文書を順に読むこと。

```text
1. docs/00_START_HERE.md
2. docs/00_PROJECT_BRIEF.md
3. docs/01_PHASED_EXECUTION_RUNBOOK.md
4. docs/02_DATA_AND_FUTURE_AUTOMATION_SPEC.md
```

各文書の役割は次の通り。

| 文書 | 役割 | 今すぐ実装対象か |
|---|---|---:|
| `00_START_HERE.md` | 最優先の運用方針、実行順、制約 | はい |
| `00_PROJECT_BRIEF.md` | サイト全体の目的、要件、完了条件 | はい |
| `01_PHASED_EXECUTION_RUNBOOK.md` | フェーズごとの実装手順とCodex指示 | はい |
| `02_DATA_AND_FUTURE_AUTOMATION_SPEC.md` | 将来のGoogle Sheets自動同期の仕様 | いいえ |

`02_DATA_AND_FUTURE_AUTOMATION_SPEC.md` は将来機能の設計資料である。
初期フェーズでは読み込んで理解するだけとし、実装してはならない。

---

## 4. 推奨ファイル配置

以下の配置を基本とする。

```text
project-root/
├─ docs/
│  ├─ 00_START_HERE.md
│  ├─ 00_PROJECT_BRIEF.md
│  ├─ 01_PHASED_EXECUTION_RUNBOOK.md
│  └─ 02_DATA_AND_FUTURE_AUTOMATION_SPEC.md
│
├─ public/
│  ├─ data/
│  │  └─ songs.json
│  ├─ assets/
│  │  ├─ covers/
│  │  ├─ screenshots/
│  │  ├─ icons/
│  │  └─ og/
│  ├─ favicon.ico
│  └─ 404.html
│
├─ src/
│  ├─ components/
│  ├─ pages/
│  ├─ data/
│  ├─ config/
│  ├─ styles/
│  └─ main.tsx
│
├─ package.json
├─ vite.config.ts
├─ tsconfig.json
└─ README.md
```

既存の構成が異なる場合、無理に上記へ全面移動しないこと。
まず現状を調査し、最小変更で保守可能な構成を提案すること。

---

## 5. 初回の実行手順

### 5.1 初回は Phase 0 のみ実行する

初回に行う作業は、以下だけとする。

```text
- リポジトリ構成を確認する
- package.json を確認する
- 使用中のフレームワークとビルド方式を確認する
- 既存ローカル版と公開サイトの分離状況を確認する
- docs内の仕様書を読む
- 実装方針と変更予定ファイルを報告する
```

初回に行ってはいけないこと。

```text
- コードの大規模変更
- 依存ライブラリ追加
- ファイル削除
- GitHub Actions追加
- GitHub Pages設定変更
- Google連携
- 自動同期の実装
```

### 5.2 初回の報告形式

Phase 0の完了報告では、必ず以下を出力すること。

```text
1. 現在のリポジトリ構成の要約
2. 発見した既存技術構成
3. 既存ローカル版との分離状況
4. 公開サイトの設置候補ディレクトリ
5. Phase 1で変更予定のファイル
6. 想定リスク・不足情報
7. Phase 1を開始してよいかの確認
```

この段階では、コード変更を行わないこと。

---

## 6. フェーズ実行時の共通ルール

各フェーズで必ず以下を守ること。

### 6.1 作業前

作業を始める前に、必ず以下を報告すること。

```text
- 今回実行するフェーズ名
- 今回の作業範囲
- 今回実装しないもの
- 変更予定ファイル
- 新規作成予定ファイル
- 既存ファイルに与える影響
```

### 6.2 作業中

```text
- 指示されていない機能を追加しない
- 依存ライブラリを追加する前に理由を示す
- 大規模リファクタリングを勝手に行わない
- 既存ローカル版を変更しない
- APIキー、認証情報、秘密情報を作成・保存しない
- 外部通信機能を追加しない
- 不明点が重大な場合は推測で実装せず、報告する
```

### 6.3 作業後

作業後に必ず以下を行うこと。

```text
- npm run build を実行する
- TypeScriptエラーを残さない
- 変更・追加・削除したファイルを列挙する
- 手動確認手順を提示する
- 既知の制約を記載する
- 次フェーズで実施すべき作業を1つだけ示す
```

削除したファイルがある場合は、削除理由を必ず明記すること。

---

## 7. データ公開と安全性の原則

公開サイト上のデータは、公開してよい最小限のものだけに限定する。

### 7.1 公開してよい想定データ

```text
- 曲名
- アーティスト名
- YouTube動画ID
- 公開用ジャケット画像
- 公開用説明文
- 公開日
- 公開用タグ
- 表示順
- featured
- siteVisible
- 公開用アプリ情報
- Googleフォームへのリンク
```

### 7.2 公開してはいけないデータ

```text
- APIキー
- パスワード
- OAuthトークン
- サービスアカウント認証JSON
- GitHub Secretsの値
- 非公開のYouTube URL
- 制作メモ
- Sunoプロンプト原文
- 権利確認メモ
- 収益情報
- 問い合わせ回答データ
- 個人情報
- Googleフォームの回答一覧
```

### 7.3 楽曲データの初期運用

初期版では、楽曲データを次のファイルで手動管理する。

```text
public/data/songs.json
```

Google Sheetsとの自動同期は、初期版の対象外である。

---

## 8. Git・コミット運用

各フェーズの実装・確認が終わったら、次フェーズへ進む前にコミット可能な状態にすること。

推奨コミット粒度：

```text
chore: initialize public site structure
feat: add apps catalog page
feat: add music catalog from songs json
feat: add contact and privacy pages
chore: prepare github pages deployment
```

以下は禁止する。

```text
- 大量の無関係な変更を1コミットへ混ぜる
- build生成物を不要にコミットする
- 秘密情報をコミットする
- 認証JSONをコミットする
- .envをコミットする
```

`.gitignore`に、少なくとも以下を含めること。

```text
.env
.env.*
*.pem
*.key
service-account*.json
google-key*.json
```

ただし、`.env.example`は秘密値を含まない形で置いてよい。

---

## 9. GitHub Pages公開に関する原則

初期版はGitHub Pagesへ公開する。

初期の公開では、以下を行う。

```text
- mainブランチへのpushでデプロイ
- workflow_dispatchで手動デプロイ可能
- npm ci
- npm run build
- GitHub Pagesの配下パスでもアセット参照が壊れない構成
```

初期版では、以下を行わない。

```text
- 独自ドメイン設定
- Google Sheets自動同期
- サービスアカウント作成
- GitHub Secrets登録
```

---

## 10. モバイル・アクセシビリティ・品質の最低基準

実装時は以下を満たすこと。

```text
- 横幅320pxで横スクロールが出ない
- 主要ボタンはタップしやすい
- 画像にaltを設定する
- キーボード操作で主要リンクに到達できる
- リンク先が外部の場合は分かる表示にする
- 新しいタブを開くリンクに rel="noopener noreferrer" を付ける
- JSON読み込み失敗時に画面全体が壊れない
- 画像未設定時にプレースホルダーを表示する
- GoogleフォームURL未設定時に壊れず準備中表示にする
```

---

## 11. Codexへの初回実行メッセージ

この文書を保存後、Codexには以下を最初に入力する。

```text
このリポジトリの公開サイト開発を開始します。

最初に、以下の文書を順番に読んでください。

1. docs/00_START_HERE.md
2. docs/00_PROJECT_BRIEF.md
3. docs/01_PHASED_EXECUTION_RUNBOOK.md
4. docs/02_DATA_AND_FUTURE_AUTOMATION_SPEC.md

重要:
- 初回は Phase 0 のみ実行してください。
- コード変更、依存関係追加、ファイル削除、GitHub Actions追加は行わないでください。
- 02_DATA_AND_FUTURE_AUTOMATION_SPEC.md は将来機能の設計資料です。理解するだけで、実装しないでください。
- 実行後は、00_START_HERE.md の「5.2 初回の報告形式」に従って報告してください。

Phase 1以降は、私が明示的に指示するまで実行しないでください。
```

---

## 12. フェーズ開始用メッセージの形式

Phase 0完了後、次のフェーズを開始する時は、以下の形式で指示する。

```text
docs/00_START_HERE.md、docs/00_PROJECT_BRIEF.md、
docs/01_PHASED_EXECUTION_RUNBOOK.md を前提として、
01_PHASED_EXECUTION_RUNBOOK.md の「Phase X: [フェーズ名]」だけを実行してください。

重要:
- Phase X+1以降は実行しないでください。
- 02_DATA_AND_FUTURE_AUTOMATION_SPEC.md の将来機能は実装しないでください。
- 作業前に、変更予定ファイルと作業範囲を報告してください。
- 作業後に、変更ファイル一覧、npm run buildの結果、手動確認手順、既知の制約を報告してください。
```

---

## 13. 最終確認

このプロジェクトの初期完成形は、次の導線が通ることを意味する。

```text
サイトを開く
↓
作ったアプリが分かる
↓
作った楽曲の一覧を見られる
↓
YouTubeへ移動して聴ける
↓
問い合わせフォームへ移動できる
```

Google Sheets自動同期、サービスアカウント、定時更新、Webビジュアライザー本体の公開などは、上記が安定してから別フェーズで追加する。
