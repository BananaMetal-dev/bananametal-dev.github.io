import "./styles.css";
import { ConverterWorkerPool, getAutoParallelism } from "./app/workerPool";
import { collectDroppedFiles, downloadFile, normalizeFiles, outputName, pickOutputDirectory, saveToDirectory } from "./files/fileIo";
import type { OutputDirectoryHandle } from "./files/fileIo";
import type { CollisionPolicy, ConversionJob, ConversionMode, Language } from "./types";

const copy = {
  ja: {
    title: "WAV ⇄ MP3 バッチ変換", eyebrow: "LOCAL AUDIO WORKSTATION", privacy: "音声は端末外へ送信されません",
    back: "Appsへ戻る", wavMode: "WAV → MP3", mp3Mode: "MP3 → WAV", dropTitle: "ファイルまたはフォルダをドロップ",
    dropBody: "複数ファイルとサブフォルダに対応", files: "ファイルを選択", folder: "フォルダを選択", output: "出力先を選択",
    outputDownload: "出力先: ブラウザのダウンロード", settings: "変換設定", bitrate: "MP3ビットレート", parallel: "並列数",
    collision: "同名ファイル", skip: "スキップ", overwrite: "上書き", auto: "Auto", quality: "MP3からWAVへ変換しても、失われた音質は復元されません。",
    start: "変換を開始", cancel: "キャンセル", clear: "一覧をクリア", downloadAll: "完了ファイルをダウンロード",
    queue: "変換キュー", empty: "対応する音声ファイルを追加してください。", file: "ファイル", size: "サイズ", status: "状態", progress: "進捗", action: "操作",
    queued: "待機中", converting: "変換中", success: "完了", skipped: "スキップ", failed: "失敗", cancelled: "キャンセル済み",
    download: "保存", selected: "出力先", unsupported: "このブラウザではフォルダへの直接保存を利用できません。ダウンロードで保存します。",
    noMatch: "選択した変換方向に対応するファイルがありません。", working: "変換中です", complete: "処理が完了しました",
    chrome: "Chrome / Edge推奨", local: "Browser-only / No upload", remove: "削除", licenses: "ライセンス情報",
  },
  en: {
    title: "WAV ⇄ MP3 Batch Converter", eyebrow: "LOCAL AUDIO WORKSTATION", privacy: "Your audio never leaves this device",
    back: "Back to Apps", wavMode: "WAV → MP3", mp3Mode: "MP3 → WAV", dropTitle: "Drop files or folders here",
    dropBody: "Multiple files and subfolders supported", files: "Choose files", folder: "Choose folder", output: "Choose output folder",
    outputDownload: "Output: browser downloads", settings: "Conversion settings", bitrate: "MP3 bitrate", parallel: "Parallel jobs",
    collision: "Existing files", skip: "Skip", overwrite: "Overwrite", auto: "Auto", quality: "Converting MP3 to WAV cannot restore audio quality already lost.",
    start: "Start conversion", cancel: "Cancel", clear: "Clear list", downloadAll: "Download completed files",
    queue: "Conversion queue", empty: "Add supported audio files to begin.", file: "File", size: "Size", status: "Status", progress: "Progress", action: "Action",
    queued: "Queued", converting: "Converting", success: "Complete", skipped: "Skipped", failed: "Failed", cancelled: "Cancelled",
    download: "Save", selected: "Output", unsupported: "Direct folder output is unavailable in this browser. Files will use browser downloads.",
    noMatch: "No files match the selected conversion direction.", working: "Conversion in progress", complete: "Processing complete",
    chrome: "Chrome / Edge recommended", local: "Browser-only / No upload", remove: "Remove", licenses: "Licenses",
  },
} as const;

let language = (localStorage.getItem("bm-wav-mp3-language") === "en" ? "en" : "ja") as Language;
let mode: ConversionMode = "wav-to-mp3";
let jobs: ConversionJob[] = [];
let outputDirectory: OutputDirectoryHandle | undefined;
let collision: CollisionPolicy = "skip";
let running = false;
let pool: ConverterWorkerPool | undefined;

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) throw new Error("App root not found.");
const app = appRoot;
renderShell();

function renderShell(): void {
  const t = copy[language];
  document.documentElement.lang = language;
  app.innerHTML = `
    <header class="topbar">
      <a class="brand" href="/apps/" aria-label="Banana Metal Apps"><span class="brand-mark">BM</span><span>Banana Metal</span></a>
      <div class="top-meta"><span class="privacy-dot"></span><strong>${t.privacy}</strong><span class="device-note">${t.local}</span></div>
      <div class="top-actions"><a href="/apps/">${t.back}</a><div class="language-switch" role="group" aria-label="Language"><button data-language="ja" class="${language === "ja" ? "active" : ""}">JA</button><button data-language="en" class="${language === "en" ? "active" : ""}">EN</button></div></div>
    </header>
    <main class="workspace">
      <section class="intro">
        <div><p class="eyebrow">${t.eyebrow}</p><h1>${t.title}</h1></div><span class="compatibility">${t.chrome}</span>
      </section>
      <section class="mode-tabs" aria-label="Conversion direction">
        <button data-mode="wav-to-mp3" class="${mode === "wav-to-mp3" ? "active" : ""}"><span>WAV</span><b>→</b><span>MP3</span></button>
        <button data-mode="mp3-to-wav" class="${mode === "mp3-to-wav" ? "active" : ""}"><span>MP3</span><b>→</b><span>WAV</span></button>
      </section>
      <section class="control-grid">
        <div class="input-panel">
          <div id="drop-zone" class="drop-zone" tabindex="0" role="button" aria-label="${t.dropTitle}">
            <div class="wave-icon" aria-hidden="true">∿</div><h2>${t.dropTitle}</h2><p>${t.dropBody}</p>
            <div class="pick-actions"><button id="pick-files" class="button primary">${t.files}</button><button id="pick-folder" class="button secondary">${t.folder}</button></div>
          </div>
          <input id="file-input" type="file" accept="${mode === "wav-to-mp3" ? ".wav,audio/wav" : ".mp3,audio/mpeg"}" multiple hidden />
          <input id="folder-input" type="file" accept="${mode === "wav-to-mp3" ? ".wav,audio/wav" : ".mp3,audio/mpeg"}" webkitdirectory multiple hidden />
        </div>
        <aside class="settings-panel">
          <div class="panel-heading"><span>02</span><h2>${t.settings}</h2></div>
          <div class="settings-fields">
            <label class="field ${mode === "mp3-to-wav" ? "disabled" : ""}"><span>${t.bitrate}</span><select id="bitrate" ${mode === "mp3-to-wav" ? "disabled" : ""}><option>128</option><option>192</option><option>256</option><option selected>320</option></select></label>
            <label class="field"><span>${t.parallel}</span><select id="parallel"><option value="auto">${t.auto} (${getAutoParallelism()})</option>${[1,2,4,6,8,12,16].map((value) => `<option value="${value}">${value}</option>`).join("")}</select></label>
            <fieldset class="field"><legend>${t.collision}</legend><div class="segmented"><button data-collision="skip" class="${collision === "skip" ? "active" : ""}">${t.skip}</button><button data-collision="overwrite" class="${collision === "overwrite" ? "active" : ""}">${t.overwrite}</button></div></fieldset>
          </div>
          <button id="pick-output" class="output-button"><span class="folder-icon">▰</span><span><b>${t.output}</b><small id="output-label">${outputDirectory ? `${t.selected}: ${escapeHtml(outputDirectory.name)}` : t.outputDownload}</small></span></button>
          ${!("showDirectoryPicker" in window) ? `<p class="support-note">${t.unsupported}</p>` : ""}
          ${mode === "mp3-to-wav" ? `<p class="quality-note">${t.quality}</p>` : ""}
        </aside>
      </section>
      <section class="queue-panel">
        <div class="queue-header"><div><p class="eyebrow">03 / QUEUE</p><h2>${t.queue}</h2></div><div class="queue-actions"><button id="download-all" class="button secondary" ${jobs.some((job) => job.output) ? "" : "disabled"}>${t.downloadAll}</button><button id="clear" class="text-button" ${running || !jobs.length ? "disabled" : ""}>${t.clear}</button></div></div>
        <div id="notice" class="notice" role="status" aria-live="polite"></div>
        <div class="queue-table-wrap"><table><thead><tr><th>${t.file}</th><th>${t.size}</th><th>${t.status}</th><th>${t.progress}</th><th>${t.action}</th></tr></thead><tbody id="queue-body"></tbody></table><div id="empty-state" class="empty-state">${t.empty}</div></div>
        <div class="run-bar"><div class="overall"><span id="overall-label">0 / ${jobs.length}</span><div class="progress-track"><span id="overall-progress"></span></div></div><button id="cancel" class="button danger" ${running ? "" : "hidden"}>${t.cancel}</button><button id="start" class="button primary start-button" ${running || !jobs.length ? "disabled" : ""}>${t.start}<span>→</span></button></div>
      </section>
    </main>
    <footer><span>Banana Metal Tools</span><span>WAV parser · LAME WASM · mpg123 WASM · <a href="/licenses/wav-mp3/THIRD_PARTY_NOTICES.txt">${t.licenses}</a></span></footer>`;
  bindEvents();
  renderQueue();
}

function bindEvents(): void {
  app.querySelectorAll<HTMLButtonElement>("[data-language]").forEach((button) => button.addEventListener("click", () => {
    language = button.dataset.language as Language; localStorage.setItem("bm-wav-mp3-language", language); renderShell();
  }));
  app.querySelectorAll<HTMLButtonElement>("[data-mode]").forEach((button) => button.addEventListener("click", () => {
    if (running) return; mode = button.dataset.mode as ConversionMode; jobs = []; renderShell();
  }));
  app.querySelectorAll<HTMLButtonElement>("[data-collision]").forEach((button) => button.addEventListener("click", () => {
    collision = button.dataset.collision as CollisionPolicy;
    app.querySelectorAll("[data-collision]").forEach((item) => item.classList.toggle("active", item === button));
  }));
  const fileInput = byId<HTMLInputElement>("file-input"); const folderInput = byId<HTMLInputElement>("folder-input");
  byId("pick-files").addEventListener("click", (event) => { event.stopPropagation(); fileInput.click(); });
  byId("pick-folder").addEventListener("click", (event) => { event.stopPropagation(); folderInput.click(); });
  fileInput.addEventListener("change", () => addFiles([...fileInput.files || []]));
  folderInput.addEventListener("change", () => addFiles([...folderInput.files || []]));
  const dropZone = byId("drop-zone");
  dropZone.addEventListener("click", () => fileInput.click());
  dropZone.addEventListener("keydown", (event) => { if ((event as KeyboardEvent).key === "Enter" || (event as KeyboardEvent).key === " ") fileInput.click(); });
  for (const type of ["dragenter", "dragover"]) dropZone.addEventListener(type, (event) => { event.preventDefault(); dropZone.classList.add("dragging"); });
  for (const type of ["dragleave", "drop"]) dropZone.addEventListener(type, (event) => { event.preventDefault(); dropZone.classList.remove("dragging"); });
  dropZone.addEventListener("drop", async (event) => addFiles(await collectDroppedFiles((event as DragEvent).dataTransfer!)));
  byId("pick-output").addEventListener("click", async () => {
    try { outputDirectory = await pickOutputDirectory(); renderShell(); }
    catch (error) { if (!(error instanceof DOMException) || error.name !== "AbortError") showNotice(String(error), true); }
  });
  byId("clear").addEventListener("click", () => { jobs = []; renderQueue(); });
  byId("start").addEventListener("click", startConversion);
  byId("cancel").addEventListener("click", cancelConversion);
  byId("download-all").addEventListener("click", () => jobs.forEach((job) => { if (job.output) downloadFile(job.outputName, job.output); }));
}

function addFiles(files: File[]): void {
  const normalized = normalizeFiles(files, mode);
  if (!normalized.length) { showNotice(copy[language].noMatch, true); return; }
  const current = new Set(jobs.map((job) => `${job.relativePath}:${job.file.size}:${job.file.lastModified}`));
  for (const entry of normalized) {
    const key = `${entry.relativePath}:${entry.file.size}:${entry.file.lastModified}`;
    if (!current.has(key)) jobs.push({ ...entry, outputName: outputName(entry.relativePath, mode), status: "queued", progress: 0 });
  }
  renderQueue();
}

async function startConversion(): Promise<void> {
  if (running || !jobs.length) return;
  running = true;
  jobs = jobs.map((job) => ({ ...job, status: "queued", progress: 0, output: undefined, message: undefined }));
  const parallelSelect = byId<HTMLSelectElement>("parallel");
  const parallel = parallelSelect.value === "auto" ? getAutoParallelism() : Number(parallelSelect.value);
  const bitrate = Number(byId<HTMLSelectElement>("bitrate").value || 320) as 128 | 192 | 256 | 320;
  pool = new ConverterWorkerPool(parallel);
  showNotice(copy[language].working);
  renderQueue();
  let nextJob = 0;
  const runNext = async () => {
    while (running) {
      const job = jobs[nextJob];
      nextJob += 1;
      if (!job) return;
      job.status = "converting"; renderQueue();
      try {
        const buffer = await job.file.arrayBuffer();
        const output = await pool!.convert(job.id, buffer, { mode, bitrate }, (progress) => { job.progress = progress; renderQueue(); });
        if (!running) { job.status = "cancelled"; return; }
        if (outputDirectory) {
          const result = await saveToDirectory(outputDirectory, job.outputName, output, collision);
          job.status = result === "skipped" ? "skipped" : "success";
          job.message = result === "skipped" ? copy[language].skip : undefined;
        } else { job.output = output; job.status = "success"; }
        job.progress = 1;
      } catch (error) {
        job.status = running ? "failed" : "cancelled";
        job.message = error instanceof Error ? error.message : String(error);
      }
      renderQueue();
    }
  };
  await Promise.all(Array.from({ length: Math.min(parallel, jobs.length) }, runNext));
  pool.close(); pool = undefined; running = false;
  showNotice(copy[language].complete); renderQueue();
}

function cancelConversion(): void {
  if (!running) return; running = false; pool?.cancel(); pool = undefined;
  for (const job of jobs) if (job.status === "queued" || job.status === "converting") job.status = "cancelled";
  renderQueue();
}

function renderQueue(): void {
  const t = copy[language]; const body = byId<HTMLTableSectionElement>("queue-body");
  body.innerHTML = jobs.map((job) => `<tr><td data-label="${t.file}"><div class="file-cell"><span class="file-type">${mode === "wav-to-mp3" ? "WAV" : "MP3"}</span><span><b>${escapeHtml(job.file.name)}</b><small>${escapeHtml(job.relativePath)}</small></span></div></td><td data-label="${t.size}">${formatBytes(job.file.size)}</td><td data-label="${t.status}"><span class="status status-${job.status}">${t[job.status]}</span>${job.message ? `<small class="error-message" title="${escapeHtml(job.message)}">${escapeHtml(job.message)}</small>` : ""}</td><td data-label="${t.progress}"><div class="row-progress"><span style="width:${Math.round(job.progress * 100)}%"></span></div><small>${Math.round(job.progress * 100)}%</small></td><td data-label="${t.action}">${job.output ? `<button class="mini-button" data-download="${job.id}">${t.download}</button>` : `<button class="mini-button remove" data-remove="${job.id}" ${running ? "disabled" : ""}>${t.remove}</button>`}</td></tr>`).join("");
  byId("empty-state").toggleAttribute("hidden", jobs.length > 0);
  const finished = jobs.filter((job) => ["success", "skipped", "failed", "cancelled"].includes(job.status)).length;
  const overall = jobs.length ? jobs.reduce((sum, job) => sum + job.progress, 0) / jobs.length : 0;
  byId("overall-label").textContent = `${finished} / ${jobs.length}`;
  (byId("overall-progress").style as CSSStyleDeclaration).width = `${Math.round(overall * 100)}%`;
  const start = byId<HTMLButtonElement>("start"); start.disabled = running || !jobs.length;
  byId("cancel").toggleAttribute("hidden", !running);
  byId<HTMLButtonElement>("clear").disabled = running || !jobs.length;
  byId<HTMLButtonElement>("download-all").disabled = !jobs.some((job) => job.output);
  app.querySelectorAll<HTMLButtonElement>("[data-download]").forEach((button) => button.addEventListener("click", () => { const job = jobs.find((item) => item.id === button.dataset.download); if (job?.output) downloadFile(job.outputName, job.output); }));
  app.querySelectorAll<HTMLButtonElement>("[data-remove]").forEach((button) => button.addEventListener("click", () => { jobs = jobs.filter((item) => item.id !== button.dataset.remove); renderQueue(); }));
}

function showNotice(message: string, error = false): void { const notice = byId("notice"); notice.textContent = message; notice.classList.toggle("error", error); }
function byId<T extends HTMLElement = HTMLElement>(id: string): T { const element = document.getElementById(id); if (!element) throw new Error(`Missing element: ${id}`); return element as T; }
function escapeHtml(value: string): string { const node = document.createElement("span"); node.textContent = value; return node.innerHTML; }
function formatBytes(bytes: number): string { if (bytes < 1024) return `${bytes} B`; if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`; return `${(bytes / 1048576).toFixed(1)} MB`; }
