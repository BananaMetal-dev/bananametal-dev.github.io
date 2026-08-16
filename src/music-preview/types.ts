export type Availability = "available" | "reserved" | "closed" | "coming_soon";

export type MusicEntryBase = {
  trackId: string;
  title: string;
  style: string;
  description: string;
  tags: string[];
  youtubeVocal: string;
  youtubeKaraoke: string;
  thumbnailUrl: string;
  availability: Availability;
  featured: boolean;
  sortOrder: number;
  updatedAt: string;
};

export type OriginalSongEntry = MusicEntryBase & {
  category: "original";
  artist: string;
};

export type KaraokeSongEntry = MusicEntryBase & {
  category: "karaoke";
  originalArtist: string;
  youtubeUrl: string;
};

export type MusicPreviewCatalog = {
  source: {
    kind: "fixture";
    spreadsheetId: string;
    sheets: string[];
    capturedAt: string;
  };
  originalSongs: OriginalSongEntry[];
  karaokeSongs: KaraokeSongEntry[];
};

export type MusicPreviewState =
  | { status: "loading" }
  | { status: "loaded"; catalog: MusicPreviewCatalog }
  | { status: "error" };
