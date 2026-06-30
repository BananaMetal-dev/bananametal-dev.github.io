# 02_DATA_AND_FUTURE_AUTOMATION_SPEC.md

# 楽曲データ仕様・将来のGoogle Sheets自動同期仕様

## 1. この文書の目的

この文書は、初期サイト完成後に追加する予定の以下の機能を定義する。

```text
Googleスプレッドシート
↓
公開用楽曲データ
↓
data/songs.json
↓
GitHub Pages
```

初期版では実装しない。
楽曲一覧が手動編集の`songs.json`で安定してから実装する。

---

## 2. データ管理の基本方針

### 2.1 役割分担

```text
元データ用スプレッドシート
= 楽曲の全情報と管理情報を持つ非公開台帳

公開確認用スプレッドシート
= 元データから必要な行・列だけを抽出して目視確認する非公開シート

data/songs.json
= ホームページに公開してよい情報だけを持つ静的JSON

GitHub Pages
= songs.jsonを読み込んで楽曲一覧を表示する
```

### 2.2 重要な原則

```text
- 元データシートを一般公開しない
- 公開確認用シートも一般公開しない
- GitHub Pagesへ出すのはsongs.jsonだけ
- songs.jsonには公開許可済みの列だけ含める
- 元データの行全体を丸ごとJSON化しない
- 公開対象外の列は処理対象にしない
```

---

## 3. 元データシートの推奨列

元データシートには以下の列を持たせる。

| 列名                 | 公開対象 | 用途                           |
| ------------------ | ---: | ---------------------------- |
| id                 |   はい | 固定ID。削除後も再利用しない              |
| site_visible       |   はい | ホームページの楽曲一覧に出すか              |
| featured           |   はい | 注目曲として表示するか                  |
| title              |   はい | 曲名                           |
| artist             |   はい | アーティスト名                      |
| youtube_id         |   はい | YouTube動画ID                  |
| cover_image        |   はい | ジャケット画像の公開パス                 |
| description        |   はい | 公開用説明文                       |
| release_date       |   はい | 公開日                          |
| tags               |   はい | カンマ区切りまたは配列化するタグ             |
| sort_order         |   はい | 表示順                          |
| youtube_visibility |  管理用 | public / unlisted / private  |
| status             |  管理用 | draft / published / archived |
| notes_private      |  いいえ | 制作メモ                         |
| suno_prompt        |  いいえ | Sunoプロンプト原文                  |
| private_url        |  いいえ | 非公開URL、限定公開管理URL             |
| rights_notes       |  いいえ | 権利確認メモ                       |
| revenue_notes      |  いいえ | 売上・原価などの管理情報                 |

---

## 4. site_visibleの意味

`site_visible`はYouTubeの公開設定とは別である。

```text
site_visible = TRUE
ホームページの楽曲一覧に表示する

site_visible = FALSE
ホームページの楽曲一覧に表示しない
```

例：

| YouTube状態 | site_visible | 意味                  |
| --------- | -----------: | ------------------- |
| public    |         TRUE | YouTubeでもサイトでも公開する  |
| unlisted  |         TRUE | サイト訪問者へリンクを見せる      |
| unlisted  |        FALSE | サイトには載せない           |
| private   |        FALSE | サイトには載せない           |
| private   |         TRUE | 一般訪問者には再生できないため使わない |

限定公開動画を`site_visible = TRUE`にすると、ホームページからリンクへ到達できるため、URLを知った人が再共有できる状態になる。

したがって、URLを外部へ知られたくない動画は、`site_visible = FALSE`にするだけでなく、YouTube側も`private`にすることを検討する。

---

## 5. 公開確認用スプレッドシート

公開確認用スプレッドシートは、元データから公開予定の行・列だけを取り出して確認するためのものである。

推奨構成：

```text
元データシート
↓
IMPORTRANGE + QUERY
↓
公開確認用スプレッドシート
↓
GitHub Actionsが読み取る
```

公開確認用シートに含めてよい列：

```text
id
site_visible
featured
title
artist
youtube_id
cover_image
description
release_date
tags
sort_order
```

公開確認用シートに含めてはいけない列：

```text
notes_private
suno_prompt
private_url
rights_notes
revenue_notes
youtube_visibilityの詳細メモ
制作中メモ
権利確認中情報
```

公開確認用スプレッドシートは、一般公開しない。
GitHub Actions用のサービスアカウントに対してのみ閲覧権限を付与する。

---

## 6. 公開JSON仕様

ファイルパス：

```text
/data/songs.json
```

JSON形式：

```json
{
  "updatedAt": "2026-06-30T00:07:12+09:00",
  "songs": [
    {
      "id": "001",
      "siteVisible": true,
      "featured": false,
      "title": "Example Song",
      "artist": "Banana Metal",
      "youtubeId": "exampleVideoId",
      "coverImage": "/assets/covers/example.webp",
      "description": "公開用説明文",
      "releaseDate": "2026-06-30",
      "tags": ["metal", "cover"],
      "sortOrder": 10
    }
  ]
}
```

公開JSONに含めてよいキーは以下に限定する。

```text
id
siteVisible
featured
title
artist
youtubeId
coverImage
description
releaseDate
tags
sortOrder
```

これ以外の列やキーは、公開JSONへ出力しないこと。

---

## 7. updatedAtの仕様

`updatedAt`は、サイトに表示される楽曲一覧が実際に変更された時刻を表す。

```text
Googleスプレッドシートを最後に編集した時刻
ではない

公開用のsongs配列が最後に変わった時刻
である
```

正しい処理：

```text
1. 公開確認用シートを取得する
2. 公開対象行だけを抽出する
3. 値を正規化する
4. sortOrderで並べる
5. 既存songs.jsonのsongs配列と比較する
6. 完全に同じならsongs.jsonを書き換えない
7. 違う場合だけupdatedAtを現在JST時刻へ更新する
8. songs.jsonを書き換える
```

比較対象：

```text
比較する
- songs配列

比較しない
- updatedAt
```

これにより、毎日の確認だけで更新日時が変わることを防ぐ。

---

## 8. データ正規化ルール

差分判定前に以下を必ず行う。

```text
- 文字列の前後空白を削除する
- 空欄をnullと空文字で揺らさない
- booleanをtrue/falseに統一する
- sortOrderを数値に統一する
- tagsを配列化する
- tagsの各要素の前後空白を削除する
- 空タグを除外する
- tagsを一定の順序で保持する
- releaseDateをYYYY-MM-DD形式に統一する
- youtubeIdをURLではなく動画IDとして保持する
```

不正データがある場合は、黙って壊れたJSONを出力しない。

例：

```text
- idが空
- titleが空
- youtubeIdが空
- siteVisibleがtrueなのにyoutubeIdが空
- sortOrderが数値に変換できない
```

この場合はワークフローを失敗させ、エラー内容を明示する。

---

## 9. 将来のサービスアカウント仕様

サービスアカウントは、GitHub ActionsがGoogleスプレッドシートを自動で読むための専用アカウントである。

Googleアカウントの普段のログインパスワードは使用しない。

構成：

```text
Googleスプレッドシート
↑ 閲覧者権限のみ
Googleサービスアカウント
↑ 認証情報
GitHub Secrets
↑ GitHub Actions実行時のみ利用
GitHub Actions
↓
songs.json更新
```

サービスアカウントには、対象の公開確認用スプレッドシートに対して以下の権限だけを与える。

```text
閲覧者
```

与えない権限：

```text
編集者
削除
Google Drive全体へのアクセス
Gmail
個人Googleアカウントへのログイン
```

認証JSONは公開リポジトリに置かない。

禁止例：

```text
/service-account.json
/google-key.json
.env
```

認証情報はGitHub Secretsにのみ保存する。

想定Secret名：

```text
GOOGLE_SERVICE_ACCOUNT_JSON
GOOGLE_SHEETS_ID
```

---

## 10. 将来のGitHub Actions定時同期仕様

ワークフロー名：

```text
Sync Song Catalog
```

トリガー：

```text
- 毎日 00:07 JST頃
- 手動実行 workflow_dispatch
```

GitHub ActionsのcronはUTC基準で設定する。

```yaml
on:
  schedule:
    - cron: "7 15 * * *"
  workflow_dispatch:
```

処理順：

```text
1. リポジトリをチェックアウトする
2. Node環境を準備する
3. 依存関係をインストールする
4. Google Sheetsから公開確認用データを読む
5. 公開対象データを検証・正規化する
6. 次のsongs配列を作る
7. 既存songs.jsonのsongs配列と比較する
8. 差分なし:
   - songs.jsonを書き換えない
   - Gitコミットしない
   - pushしない
9. 差分あり:
   - updatedAtを現在JST時刻にする
   - songs.jsonを書き換える
   - Gitコミットする
   - pushする
10. GitHub Pagesの通常デプロイを動かす
```

差分なしの場合に実行ログへ出す文言：

```text
No public song catalog changes. Skipping commit and deployment.
```

---

## 11. 将来の同期処理に対するCodex指示

以下は、初期サイト完成後にのみ使用する。

```text
Googleスプレッドシートから公開用楽曲データを取得し、
data/songs.jsonを更新する同期機能を追加してください。

前提:
- 初期サイトは完成済み
- Musicページはdata/songs.jsonを読む構成で動作済み
- Googleスプレッドシートは非公開
- 公開確認用スプレッドシートのみを同期対象とする
- サービスアカウントには対象シートの閲覧権限のみを与える

今回の要件:
- Google Sheets APIを使う
- 認証情報は環境変数GOOGLE_SERVICE_ACCOUNT_JSONから読む
- スプレッドシートIDはGOOGLE_SHEETS_IDから読む
- 認証JSONをリポジトリに保存しない
- 公開列だけを明示的に抽出する
- 元行全体をJSON化しない
- site_visibleがtrueの行だけ公開候補にする
- データ検証と正規化を行う
- 現在のsongs.jsonのsongs配列と比較する
- 差分なしならsongs.jsonを変更しない
- 差分ありの場合だけupdatedAtをJST付きISO8601形式で更新する
- 差分ありの場合だけGitコミット対象にする
- エラー時は不完全なsongs.jsonを出力しない
- 既存のMusicページのデータ形式を壊さない

公開JSONへ含めてよいキー:
- id
- siteVisible
- featured
- title
- artist
- youtubeId
- coverImage
- description
- releaseDate
- tags
- sortOrder

公開JSONへ絶対に含めないもの:
- notes_private
- suno_prompt
- private_url
- rights_notes
- revenue_notes
- シート上の未定義列
- 認証情報
- 元シートURL
- 管理メモ

実装後に必ず行うこと:
- npm run build
- 同期スクリプトのテスト
- 差分なしケースのテスト
- 差分ありケースのテスト
- 不正データケースのテスト
- READMEへの設定手順追記
- 変更ファイル一覧の報告
```

---

## 12. 手動同期の運用

定時同期に加えて、手動実行を残す。

想定運用：

```text
通常
- 毎日00:07 JST頃に確認する
- 差分がある時だけ更新する

新曲をすぐ掲載したい時
- スプレッドシートを編集する
- GitHub ActionsのRun workflowを実行する
- 差分があればすぐにsongs.jsonが更新される
```

---

## 13. 完了判定

自動同期機能の完了条件：

```text
1. Googleスプレッドシートから公開データを読み取れる
2. サービスアカウントは対象シートの閲覧者権限だけを持つ
3. 非公開列がsongs.jsonへ出ない
4. site_visibleがfalseの曲がsongs.jsonへ出ない
5. 差分なしでコミットされない
6. 差分ありでのみupdatedAtが更新される
7. 差分ありでのみGitHub Pages更新が発生する
8. Musicページが既存仕様のまま表示できる
9. 認証情報がリポジトリへ保存されない
10. READMEに初期設定、Secrets、手動同期、トラブルシュートが記載される
```
