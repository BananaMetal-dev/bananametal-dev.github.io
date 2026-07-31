import type { SortMode, TrackSource } from "./types";

const SUPPORTED_EXTENSIONS = new Set(["mp3", "m4a", "wav"] as const);

type SupportedExtension = TrackSource["extension"];

type FileHandleLike = {
  kind: "file";
  name: string;
  getFile: () => Promise<File>;
};

type DirectoryHandleLike = {
  kind: "directory";
  name: string;
  values: () => AsyncIterableIterator<FileHandleLike | DirectoryHandleLike>;
};

type DirectoryPickerWindow = Window & {
  showDirectoryPicker?: () => Promise<DirectoryHandleLike>;
};

export function canPickDirectory() {
  return typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function";
}

export async function scanPickedDirectory(onProgress: (count: number) => void) {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) throw new Error("DIRECTORY_PICKER_UNAVAILABLE");

  const root = await picker();
  const tracks: TrackSource[] = [];
  const stack: Array<{ directory: DirectoryHandleLike; path: string }> = [
    { directory: root, path: root.name },
  ];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) break;

    for await (const entry of current.directory.values()) {
      const relativePath = `${current.path}/${entry.name}`;
      if (entry.kind === "directory") {
        stack.push({ directory: entry, path: relativePath });
        continue;
      }

      const extension = getSupportedExtension(entry.name);
      if (!extension) continue;

      const file = await entry.getFile();
      tracks.push(createTrack(file, relativePath, extension, () => entry.getFile()));
      if (tracks.length % 100 === 0) onProgress(tracks.length);
    }
  }

  onProgress(tracks.length);
  return deduplicateTracks(tracks);
}

export function tracksFromFileList(files: FileList) {
  const tracks: TrackSource[] = [];

  for (const file of Array.from(files)) {
    const extension = getSupportedExtension(file.name);
    if (!extension) continue;
    const relativePath = file.webkitRelativePath || file.name;
    tracks.push(createTrack(file, relativePath, extension, async () => file));
  }

  return deduplicateTracks(tracks);
}

export function sortTracks(tracks: TrackSource[], mode: SortMode) {
  const sorted = [...tracks];

  if (mode === "name") {
    return sorted.sort((left, right) =>
      left.name.localeCompare(right.name, "ja", { numeric: true, sensitivity: "base" }),
    );
  }

  if (mode === "newest") {
    return sorted.sort(
      (left, right) =>
        right.modifiedAt - left.modifiedAt ||
        left.name.localeCompare(right.name, "ja", { numeric: true, sensitivity: "base" }),
    );
  }

  for (let index = sorted.length - 1; index > 0; index -= 1) {
    const swapIndex = secureRandomIndex(index + 1);
    [sorted[index], sorted[swapIndex]] = [sorted[swapIndex], sorted[index]];
  }
  return sorted;
}

function createTrack(
  file: File,
  relativePath: string,
  extension: SupportedExtension,
  getFile: () => Promise<File>,
): TrackSource {
  return {
    id: `${relativePath}\u0000${file.size}\u0000${file.lastModified}`,
    name: file.name,
    relativePath,
    size: file.size,
    modifiedAt: file.lastModified,
    extension,
    getFile,
  };
}

function getSupportedExtension(fileName: string): SupportedExtension | null {
  const extension = fileName.split(".").pop()?.toLowerCase();
  if (!extension || !SUPPORTED_EXTENSIONS.has(extension as SupportedExtension)) return null;
  return extension as SupportedExtension;
}

function deduplicateTracks(tracks: TrackSource[]) {
  const seen = new Set<string>();
  return tracks.filter((track) => {
    const key = `${track.name}\u0000${track.size}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function secureRandomIndex(upperExclusive: number) {
  const random = new Uint32Array(1);
  crypto.getRandomValues(random);
  return Math.floor((random[0] / 0x1_0000_0000) * upperExclusive);
}
