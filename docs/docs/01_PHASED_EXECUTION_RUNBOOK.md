# 01_PHASED_EXECUTION_RUNBOOK.md

# Codex実装手順書

## 運用原則

このプロジェクトは、一括実装しない。
以下のフェーズを順番に実行する。

各フェーズで必ず以下を行うこと。

```text
1. 作業対象ファイルを確認する
2. 作業範囲外の機能を追加しない
3. npm run build を実行する
4. 手動確認項目を報告する
5. Gitコミット可能な状態にする
```

既存のローカル版ビジュアライザーは、公開Web版のコードベースとして直接流用しない。
既存ローカル版は、画面構成、操作導線、演出仕様を参照する資料としてのみ扱う。

---

# Phase 0: リポジトリ確認と初期化

## Codexへの指示

```text
このリポジトリの現状を確認してください。

今回の作業は調査と初期設計だけです。
既存コードの大規模な変更、削除、依存関係の追加は行わないでください。

確認してほしい内容:
- 既存のフロントエンド構成
- package.json
- Vite、React、TypeScriptの有無
- GitHub Pages向けの設定有無
- 既存アプリとサイトコードが混在しているか
- 既存のローカル版ビジュアライザーとの分離方針
- 既存のREADME内容

出力してほしい内容:
1. 現在の構成の要約
2. 公開サイトを置く適切なディレクトリ案
3. 変更が必要なファイル一覧
4. 作成予定のファイル一覧
5. 実装上のリスク
6. Phase 1で実施すべき最小作業

このフェーズではコードを書き換えないでください。
```

## 完了条件

```text
- リポジトリ構成が把握できている
- 公開サイトと既存ローカル版の分離方針が明確である
- 次フェーズの作業範囲が確定している
```

---

# Phase 1: サイトの土台とページ枠組み

## Codexへの指示

```text
公開用ホームページの土台を実装してください。

今回の対象はページ構造とナビゲーションだけです。
楽曲JSONの読み込み、Googleフォーム実URL、Google Sheets連携、GitHub Actions、サービスアカウント、自動同期は実装しないでください。

要件:
- React + TypeScript + Viteを使用する
- GitHub Pagesで公開可能な静的サイト構成にする
- ページを用意する
  - /
  - /apps/
  - /music/
  - /contact/
  - /privacy/
  - 404.html
- 共通ヘッダーとフッターを作る
- ヘッダーにHome / Apps / Music / Contactへの導線を置く
- スマホ幅320pxからレイアウトが崩れないようにする
- 現段階では内容はプレースホルダーでよい
- 外部API、認証、ログイン、分析タグ、広告タグを追加しない
- 既存ローカル版のコードを変更しない

完了条件:
- 各ページにアクセスできる
- 404ページが存在する
- npm run build が成功する
- READMEにローカル起動方法とビルド方法を追記する

作業後に、変更ファイル一覧と手動確認手順を報告してください。
```

## 完了条件

```text
- ページ骨格が存在する
- スマホ表示で崩れない
- ビルドに成功する
```

---

# Phase 2: Apps一覧ページ

## Codexへの指示

```text
Apps一覧ページを実装してください。

今回の対象はアプリ一覧カードのみです。
アプリ本体の実装、音源処理、動画生成、IndexedDB、外部連携は実装しないでください。

要件:
- apps用の静的データファイルを作る
- アプリカードを表示する
- 表示項目:
  - アプリ名
  - 短い説明
  - スクリーンショットまたはプレースホルダー
  - 主な特徴
  - 利用上の注意
  - アプリを開くボタン
- statusを持たせる
  - available
  - coming_soon
  - private
- privateは一覧に表示しない
- coming_soonはボタンを無効化し、準備中表示にする
- availableは指定URLへ遷移できる
- URL未設定時は壊れず、準備中表示にする
- 既存ページ構造を大きく変更しない
- npm run build を実行する

完了条件:
- アプリデータの編集だけでカードを追加・非表示にできる
- privateが表示されない
- coming_soonの挙動が分かる
- スマホ表示でカードが崩れない
```

---

# Phase 3: 楽曲データとMusic一覧

## Codexへの指示

```text
Musicページに、data/songs.jsonから楽曲カードを表示する機能を追加してください。

今回の対象:
- songs.jsonの読み込み
- 楽曲カード表示
- 最終更新日時表示
- YouTube外部リンク

今回の対象外:
- Google Sheets API
- Apps Script
- GitHub Actions
- サービスアカウント
- 自動同期
- YouTube iframe埋め込み
- 音源再生機能
- 音源アップロード
- 外部API

songs.jsonの形式は次の通りです。

{
  "updatedAt": "2026-06-30T00:07:12+09:00",
  "songs": [
    {
      "id": "001",
      "siteVisible": true,
      "featured": true,
      "title": "Example Song",
      "artist": "Banana Metal",
      "youtubeId": "exampleVideoId",
      "coverImage": "/assets/covers/example.webp",
      "description": "説明文",
      "releaseDate": "2026-06-30",
      "tags": ["metal", "cover"],
      "sortOrder": 10
    }
  ]
}

要件:
- siteVisible === true の曲だけ表示する
- sortOrder昇順で表示する
- featured === true の曲を注目曲エリアに表示する
- 曲カードに表示する項目:
  - ジャケット画像
  - 曲名
  - アーティスト名
  - 説明
  - 公開日
  - タグ
  - YouTubeで聴くボタン
- YouTubeリンクはyoutubeIdから安全に生成する
- URLは新しいタブで開く
- rel="noopener noreferrer"を付ける
- coverImageがない場合はプレースホルダーを表示する
- JSONの取得に失敗してもページ全体を壊さず、エラー状態を表示する
- updatedAtをJST表記で表示する
- updatedAtがない場合は最終更新表示を隠すまたは不明表示にする
- npm run build を実行する
- READMEにsongs.jsonの編集方法を追記する

完了条件:
- songs.json編集で曲を追加・非表示にできる
- 楽曲一覧が正しく並ぶ
- YouTubeリンクが正しく開く
- 最終更新日時が表示される
- JSON失敗時も画面が壊れない
```

---

# Phase 4: ContactとPrivacy

## Codexへの指示

```text
ContactページとPrivacyページを実装してください。

今回の対象:
- Googleフォームへの遷移導線
- 問い合わせ案内
- プライバシー説明

今回の対象外:
- サイト内フォーム送信
- Google Forms API
- Google Sheets API
- 自動メール送信
- ユーザー認証
- CAPTCHA
- 外部分析

要件:
- GoogleフォームURLは設定ファイルで一箇所だけ管理する
- URL未設定の場合:
  - 問い合わせボタンを無効化する
  - 「お問い合わせフォームは準備中です」と表示する
- URL設定済みの場合:
  - 新しいタブでGoogleフォームを開く
  - rel="noopener noreferrer"を付ける
- Contactページには以下を表示する:
  - 不具合報告
  - 機能要望
  - 楽曲について
  - 仕事・連携の相談
  - その他
- Privacyページには以下を表示する:
  - 問い合わせ内容は返信・対応のために利用する
  - お問い合わせはGoogleフォームおよびGoogleスプレッドシートで管理される
  - 公開アプリの個別仕様は各アプリページに記載される
  - 音源、画像、生成動画について、サイトが受信しない設計を採るアプリではその旨を明記する
  - 外部サービスのリンク先にはそれぞれの規約が適用される
- 「外部通信が一切ない」と断定しない
- npm run build を実行する

完了条件:
- GoogleフォームURLの有無で表示が正しく切り替わる
- Privacyページが存在する
- ビルドに成功する
```

---

# Phase 5: 公開品質の仕上げ

## Codexへの指示

```text
公開前の品質調整をしてください。

今回の対象:
- favicon
- OGPメタデータ
- title
- description
- 404ページの改善
- アクセシビリティ
- レスポンシブ調整
- README整備

禁止事項:
- 外部解析タグ追加禁止
- Google Analytics追加禁止
- 認証追加禁止
- Google Sheets連携追加禁止
- 大規模なUI再設計禁止
- 依存ライブラリ追加は原則禁止

要件:
- 各ページに固有のtitleとdescriptionを設定する
- OGP画像のパスを設定しやすくする
- faviconを追加する
- 画像にaltを設定する
- ボタンとリンクの役割を明確にする
- キーボード操作で主要導線へ到達できる
- 320px、768px、1280px程度で崩れない
- 404から主要ページへ戻れる
- READMEに以下を記載する:
  - 開発起動
  - ビルド
  - GitHub Pages公開
  - appsデータ編集
  - songs.json編集
  - GoogleフォームURL設定
  - 公開時の注意
- npm run build を実行する

完了条件:
- 公開に必要な最低限のメタ情報がある
- 主要ページがスマホで崩れない
- READMEが運用可能な内容になっている
```

---

# Phase 6: GitHub Pages公開

## Codexへの指示

```text
GitHub Pages公開のための設定を追加してください。

今回の対象:
- GitHub Pages用のデプロイ設定
- GitHub Actionsによる静的サイトのビルドとデプロイ
- READMEの公開手順更新

今回の対象外:
- Google Sheets同期
- サービスアカウント
- GitHub Secrets
- 楽曲自動更新
- 独自ドメイン
- 問い合わせ送信処理

要件:
- mainブランチへのpushでGitHub Pagesへデプロイする
- workflow_dispatchで手動デプロイできる
- Nodeバージョンを固定する
- npm ciを使う
- npm run buildを実行する
- GitHub Pagesのbase pathでアセット参照が壊れないようにする
- デプロイ失敗時に原因を追える構成にする
- READMEにGitHub側で必要なPages設定を明記する

完了条件:
- GitHub Actionsワークフローが存在する
- mainへのpushでビルドとデプロイが走る
- 手動実行も可能である
- GitHub Pages上で主要ページにアクセスできる
```

---

# Phase 7: 将来の機能追加

以下は初期サイト完成後に別フェーズとして実施する。

```text
- 音楽ビジュアライザー本体の公開
- プロンプト管理アプリ本体の公開
- Google Sheetsからsongs.jsonへの自動同期
- サービスアカウント
- GitHub Secrets
- GitHub Actionsの定時同期
- 差分更新
- 最終更新日時の自動更新
- YouTube埋め込み再生
- 楽曲検索
- タグフィルター
- 独自ドメイン
```

これらを初期サイト実装へ混ぜないこと。
