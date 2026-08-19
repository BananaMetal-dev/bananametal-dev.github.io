import type { CollisionPolicy, ConversionMode, InputFile } from "../types";

export type OutputDirectoryHandle = {
  kind: "directory";
  name: string;
  getDirectoryHandle: (name: string, options?: { create?: boolean }) => Promise<OutputDirectoryHandle>;
  getFileHandle: (name: string, options?: { create?: boolean }) => Promise<OutputFileHandle>;
  values: () => AsyncIterableIterator<InputHandle>;
};
type OutputFileHandle = { kind: "file"; name: string; getFile: () => Promise<File>; createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> };
type InputHandle = OutputDirectoryHandle | OutputFileHandle;
type DirectoryPickerWindow = Window & { showDirectoryPicker?: () => Promise<OutputDirectoryHandle> };
type HandleDataTransferItem = DataTransferItem & { getAsFileSystemHandle?: () => Promise<InputHandle | undefined> };
export function normalizeFiles(files: File[], mode: ConversionMode): InputFile[] {
  const extension = mode === "wav-to-mp3" ? ".wav" : ".mp3";
  const seen = new Set<string>();
  return files.filter((file) => file.name.toLowerCase().endsWith(extension)).map((file) => ({ id: crypto.randomUUID(), file, relativePath: file.webkitRelativePath || file.name })).filter((entry) => {
    const key = `${entry.relativePath}:${entry.file.size}:${entry.file.lastModified}`;
    if (seen.has(key)) return false; seen.add(key); return true;
  });
}
export function outputName(path: string, mode: ConversionMode): string { return path.replace(/\.[^.\\/]+$/, "") + (mode === "wav-to-mp3" ? ".mp3" : ".wav"); }
export async function collectDroppedFiles(dataTransfer: DataTransfer): Promise<File[]> {
  const handles = await Promise.all([...dataTransfer.items].map((item) => (item as HandleDataTransferItem).getAsFileSystemHandle?.().catch(() => undefined)));
  if (handles.some(Boolean)) { const files: File[] = []; for (const handle of handles) if (handle) await walkHandle(handle, "", files); return files; }
  return [...dataTransfer.files];
}
export async function pickOutputDirectory(): Promise<OutputDirectoryHandle | undefined> { return (window as DirectoryPickerWindow).showDirectoryPicker?.(); }
export async function saveToDirectory(root: OutputDirectoryHandle, relativePath: string, bytes: Uint8Array, policy: CollisionPolicy): Promise<"saved" | "skipped"> {
  const parts = relativePath.replaceAll("\\", "/").split("/").filter(Boolean); const fileName = parts.pop();
  if (!fileName) throw new Error("Output file name is empty.");
  let directory = root; for (const part of parts) directory = await directory.getDirectoryHandle(part, { create: true });
  if (policy === "skip") {
    try { await directory.getFileHandle(fileName); return "skipped"; }
    catch (error) { if (!(error instanceof DOMException) || error.name !== "NotFoundError") throw error; }
  }
  const handle = await directory.getFileHandle(fileName, { create: true });
  const writable = await handle.createWritable(); await writable.write(new Blob([ownedBuffer(bytes)], { type: mimeFromName(fileName) })); await writable.close(); return "saved";
}
export function downloadFile(name: string, bytes: Uint8Array): void {
  const url = URL.createObjectURL(new Blob([ownedBuffer(bytes)], { type: mimeFromName(name) })); const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name.split(/[\\/]/).pop() || name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
async function walkHandle(handle: InputHandle, path: string, files: File[]): Promise<void> {
  if (handle.kind === "file") { const file = await handle.getFile(); Object.defineProperty(file, "webkitRelativePath", { value: `${path}${file.name}`, configurable: true }); files.push(file); return; }
  for await (const child of handle.values()) await walkHandle(child, `${path}${handle.name}/`, files);
}
function mimeFromName(name: string): string { return name.toLowerCase().endsWith(".mp3") ? "audio/mpeg" : "audio/wav"; }
function ownedBuffer(bytes: Uint8Array): ArrayBuffer { return bytes.slice().buffer as ArrayBuffer; }
