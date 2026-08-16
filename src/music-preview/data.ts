import type {
  Availability,
  KaraokeSongEntry,
  MusicEntryBase,
  MusicPreviewCatalog,
  OriginalSongEntry,
} from "./types";

const availabilityValues = new Set<Availability>(["available", "reserved", "closed", "coming_soon"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string {
  return typeof record[key] === "string" ? record[key].trim() : "";
}

function readBoolean(record: Record<string, unknown>, key: string): boolean {
  return record[key] === true || record[key] === "TRUE";
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return Number.MAX_SAFE_INTEGER;
}

function readTags(record: Record<string, unknown>): string[] {
  const value = record.tags;
  if (Array.isArray(value)) return value.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((tag) => tag.trim()).filter(Boolean);
  return [];
}

function readAvailability(record: Record<string, unknown>): Availability | null {
  const value = readString(record, "availability") as Availability;
  return availabilityValues.has(value) ? value : null;
}

function readBase(record: Record<string, unknown>): MusicEntryBase | null {
  const trackId = readString(record, "track_id");
  const title = readString(record, "title");
  const availability = readAvailability(record);
  if (!trackId || !title || !availability) return null;

  return {
    trackId,
    title,
    style: readString(record, "style"),
    description: readString(record, "description"),
    tags: readTags(record),
    youtubeVocal: readString(record, "youtube_vocal"),
    youtubeKaraoke: readString(record, "youtube_karaoke"),
    thumbnailUrl: readString(record, "thumbnail_url"),
    availability,
    featured: readBoolean(record, "featured"),
    sortOrder: readNumber(record, "sort_order"),
    updatedAt: readString(record, "updated_at"),
  };
}

function readOriginal(value: unknown): OriginalSongEntry | null {
  if (!isRecord(value)) return null;
  const base = readBase(value);
  const artist = readString(value, "artist");
  if (!base || !artist) return null;
  return { ...base, category: "original", artist };
}

function readKaraoke(value: unknown): KaraokeSongEntry | null {
  if (!isRecord(value)) return null;
  const base = readBase(value);
  const originalArtist = readString(value, "original_artist");
  if (!base || !originalArtist) return null;
  return { ...base, category: "karaoke", originalArtist, youtubeUrl: readString(value, "youtube") };
}

function parseCatalog(value: unknown): MusicPreviewCatalog {
  if (!isRecord(value) || !Array.isArray(value.original) || !Array.isArray(value.karaoke) || !isRecord(value.source)) {
    throw new Error("Invalid music preview catalog");
  }

  const originalSongs = value.original.map(readOriginal).filter((song): song is OriginalSongEntry => song !== null);
  const karaokeSongs = value.karaoke.map(readKaraoke).filter((song): song is KaraokeSongEntry => song !== null);
  const spreadsheetId = readString(value.source, "spreadsheetId");
  const capturedAt = readString(value.source, "capturedAt");
  const sheets = Array.isArray(value.source.sheets)
    ? value.source.sheets.filter((sheet): sheet is string => typeof sheet === "string")
    : [];

  if (!spreadsheetId || !capturedAt || sheets.length === 0) throw new Error("Invalid music preview source");

  return {
    source: { kind: "fixture", spreadsheetId, sheets, capturedAt },
    originalSongs: originalSongs.sort((a, b) => a.sortOrder - b.sortOrder),
    karaokeSongs: karaokeSongs.sort((a, b) => a.sortOrder - b.sortOrder),
  };
}

export async function loadMusicPreviewCatalog(signal: AbortSignal): Promise<MusicPreviewCatalog> {
  const response = await fetch("/data/music-preview.json", { signal });
  if (!response.ok) throw new Error(`Music preview data request failed: ${response.status}`);
  const value: unknown = await response.json();
  return parseCatalog(value);
}

export function isSafeExternalUrl(value: string): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isYoutubeUrl(value: string): boolean {
  if (!isSafeExternalUrl(value)) return false;
  const hostname = new URL(value).hostname.toLowerCase();
  return hostname === "youtu.be" || hostname === "youtube.com" || hostname.endsWith(".youtube.com");
}
