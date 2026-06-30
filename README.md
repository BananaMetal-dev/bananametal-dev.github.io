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

Google Sheets 自動同期、GitHub Actions デプロイ、Googleフォームの実URL設定は初期版には含めません。

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

## Public Repository Safety

Do not commit:

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

## Deployment

GitHub Pages deployment is planned for Phase 6.

This phase does not include GitHub Actions, custom domain setup, Google Sheets automation, or scheduled song synchronization.
