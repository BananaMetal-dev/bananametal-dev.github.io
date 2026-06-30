# bananametal-dev.github.io
Banana Metal - Apps, Music and Creative Tools

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

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

## Phase 1 Scope

This phase provides the public site shell only:

- Home
- Apps
- Music
- Contact
- Privacy
- 404 page

The following are intentionally not implemented in Phase 1:

- Apps catalog cards
- Music catalog loading from `songs.json`
- Google Forms URL integration
- Google Sheets API
- GitHub Actions
- Authentication
- Analytics tags
- External APIs
