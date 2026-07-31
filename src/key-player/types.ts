export type SortMode = "name" | "newest" | "random";

export type PlayerStatus =
  | "empty"
  | "scanning"
  | "loading"
  | "stopped"
  | "playing"
  | "paused"
  | "error";

export type TrackSource = {
  id: string;
  name: string;
  relativePath: string;
  size: number;
  modifiedAt: number;
  extension: "mp3" | "m4a" | "wav";
  getFile: () => Promise<File>;
};

export type LoadedTrack = {
  trackId: string;
  buffer: AudioBuffer;
  key: number;
};
