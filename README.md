# bananametal-dev.github.io

Banana Metal の公開アプリ、楽曲、問い合わせ導線をまとめる GitHub Pages 向け静的サイトです。

## Overview

初期版では、次のページを提供します。

- Home
- Apps
- Music
- Contact
- Privacy
- 404

Google Sheets 自動同期、Googleフォームの実URL設定、独自ドメイン設定は初期版には含めません。

## Tech Stack

- React
- TypeScript
- Vite
- Static JSON data
- Plain CSS

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

`npm run build` は Vite の build 後に `scripts/prepare-pages.mjs` を実行します。
このスクリプトは GitHub Pages で直接URLアクセスしやすいように、次の静的ルートへ `dist/index.html` をコピーします。

- `dist/apps/index.html`
- `dist/music/index.html`
- `dist/contact/index.html`
- `dist/privacy/index.html`

未知のURLは `public/404.html` が GitHub Pages の404ページとして表示されます。

## Editing Apps

Apps data is managed in `src/data/apps.ts`.

- `available`: show the app and enable the link only when `url` is set.
- `coming_soon`: show the app with a disabled action.
- `private`: do not show the app on the public Apps page.

Do not put private app notes, credentials, or unpublished URLs in this file.

## Editing Songs

Music data is managed manually in `public/data/songs.json`.

Use this shape:

```json
{
  "updatedAt": "2026-06-30T00:07:12+09:00",
  "songs": [
    {
      "id": "001",
      "siteVisible": true,
      "featured": true,
      "title": "Sample Track One",
      "artist": "Banana Metal",
      "youtubeId": "sampleVideoIdOne",
      "coverImage": "",
      "description": "楽曲一覧表示のためのサンプルデータです。",
      "releaseDate": "2026-06-30",
      "tags": ["sample", "metal"],
      "sortOrder": 10
    }
  ]
}
```

- Set `siteVisible` to `false` to hide a song.
- Set `featured` to `true` to show a song in the featured area.
- Keep `youtubeId` as the video ID only, not a full YouTube URL.
- Leave `coverImage` empty to show the site placeholder.
- Use `sortOrder` to control display order.

Do not add private YouTube URLs, production notes, Suno prompts, rights notes, revenue data, or personal information.

## Contact Setup

`src/config/site.ts` contains the Google Form URL in one place.

- Leave `googleFormUrl` as `""` while the form is not ready.
- Set it to a full `https://` or `http://` URL when the Contact page button should become active.
- Do not commit Googleフォーム回答データ or private form management information.

## GitHub Pages Deployment

GitHub Pages deployment uses GitHub Actions.

Repository settings required on GitHub:

1. Open Repository Settings.
2. Open Pages.
3. Find Build and deployment.
4. Set Source to GitHub Actions.

Deployment behavior:

- Pushes to `main` run the deploy workflow.
- The workflow can also be started manually from the Actions tab with Run workflow.
- The planned public URL is `https://bananametal-dev.github.io/`.
- The Vite `base` is set to `/` in `vite.config.ts` because this repository is treated as a `username.github.io` user site.
- If this site is later moved to a project repository, update `base` in `vite.config.ts` to the repository path, for example `/repository-name/`.

URLs to verify after deployment:

- `https://bananametal-dev.github.io/`
- `https://bananametal-dev.github.io/apps/`
- `https://bananametal-dev.github.io/music/`
- `https://bananametal-dev.github.io/contact/`
- `https://bananametal-dev.github.io/privacy/`
- `https://bananametal-dev.github.io/404.html`
- `https://bananametal-dev.github.io/data/songs.json`

The GitHub Actions workflow only builds and deploys the static Vite site. It does not sync song data from Google Sheets.

## Public Repository Safety

GitHub Pages publishes this public repository as an internet-accessible website. Do not commit:

- `.env` files
- API keys
- passwords
- OAuth tokens
- service account JSON
- GitHub Secrets values
- private YouTube URLs
- Googleフォーム回答データ
- personal information
- production notes or unpublished prompt text

## Future Automation

Google Sheets automatic synchronization is a separate future phase. The current deployment workflow does not add Google Sheets API, Apps Script, service accounts, GitHub Secrets, scheduled sync, or song catalog automation.
