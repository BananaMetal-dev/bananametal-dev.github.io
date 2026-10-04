const $ = (id) => document.getElementById(id);
let queue = [], sourceSha256 = "", queueId = "", selected = 0;
let labels = {};
let saveChain = Promise.resolve();
function key() { return `banana-master-review:${sourceSha256}:${queueId}`; }
function current() { return queue[selected]; }
function fmt(seconds) { const s = Math.max(0, Math.floor(seconds)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
const candidateNames = { anomaly: "検出ありの確認候補", "strong-positive": "検出ありの確認候補",
  "possible-missed": "見落としの確認候補", boundary: "判定境界の確認候補",
  "spectral-extreme": "音の帯域バランスが極端な候補", "dynamic-quiet": "静か・抑揚が大きい候補",
  "clean-control": "正常対照の確認候補", "control-candidate": "正常対照の確認候補",
  "coverage-fill": "幅広く確認する候補" };
function persist(item) {
  localStorage.setItem(key(), JSON.stringify(labels)); render();
  const snapshot = { ...labels[item.id] };
  $("save-status").textContent = "作業フォルダーへ保存中";
  saveChain = saveChain.catch(() => {}).then(async () => {
    const response = await fetch("/api/labels", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceSha256, queueId, label: snapshot }) });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    $("save-status").textContent = "作業フォルダーへ保存済み";
  }).catch((error) => { $("save-status").textContent = `保存失敗: ${error.message}。ブラウザ内には残っています。`; });
}
function render() {
  const item = current(); if (!item) return;
  $("item").value = item.id;
  $("filename").textContent = item.filename;
  $("metadata").textContent = `${item.id} · ${candidateNames[item.candidateType] ?? "確認候補"} · ${fmt(item.timeRange.startSeconds)}〜${fmt(item.timeRange.endSeconds)} · ${item.datasetRole === "holdout" ? "検証用" : "校正用"}`;
  $("reason").textContent = `${item.selectionReason}　Formal evidence: ${JSON.stringify(item.evidence)}`
    + (item.denseEvidence ? `　Local review evidence: ${JSON.stringify(item.denseEvidence)}` : "");
  const audio = $("audio"), source = `/clip/${encodeURIComponent(item.id)}`;
  if (audio.getAttribute("src") !== source) { audio.pause(); audio.src = source; audio.load(); }
  $("time").textContent = `原音 ${fmt(item.timeRange.startSeconds + (audio.currentTime || 0))}`;
  const label = labels[item.id] ?? {};
  $("symptom").value = label.symptomType ?? item.symptomType ?? "";
  $("start").value = String(label.startSeconds ?? item.timeRange.startSeconds);
  $("end").value = String(label.endSeconds ?? item.timeRange.endSeconds);
  $("correction").value = label.correctionNeed ?? "Unknown";
  $("notes").value = label.notes ?? "";
  document.querySelectorAll("#judgments button").forEach((button) => { button.dataset.active = String(button.dataset.value === label.reviewStatus); });
  const savedLabels = Object.values(labels);
  const symptomCount = savedLabels.filter((value) => value.reviewStatus && value.reviewStatus !== "Pending").length;
  const correctionCount = savedLabels.filter((value) => value.correctionNeed && value.correctionNeed !== "Unknown").length;
  $("progress").textContent = `${selected + 1}/${queue.length} · 症状判定 ${symptomCount}/${queue.length} · 補正要否 ${correctionCount}/${queue.length}`;
}
function update(patch) {
  const item = current();
  const startSeconds = Number($("start").value), endSeconds = Number($("end").value);
  if (!Number.isFinite(startSeconds) || !Number.isFinite(endSeconds) || startSeconds < item.timeRange.startSeconds
    || endSeconds > item.timeRange.endSeconds || startSeconds >= endSeconds) {
    $("save-status").textContent = "保存失敗: 開始・終了時刻を候補区間内で指定してください。"; return;
  }
  labels[item.id] = { ...labels[item.id], queueId, reviewId: item.id, trackId: item.trackId, fileHash: item.fileHash,
    filename: item.filename, startSeconds, endSeconds,
    candidateType: item.candidateType, datasetRole: item.datasetRole, symptomType: $("symptom").value,
    correctionNeed: $("correction").value, reviewStatus: labels[item.id]?.reviewStatus ?? "Pending",
    notes: $("notes").value, ...patch,
    updatedAt: new Date().toISOString() };
  persist(item);
}
function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a"); link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function csvCell(value) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
fetch("/api/queue").then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }).then(async (data) => {
  queue = data.entries; sourceSha256 = data.sourceSha256; queueId = data.queueId;
  $("dataset").textContent = `試聴対象: ${data.displayName ?? "評価キュー"}`;
  const saved = await fetch("/api/labels").then((response) => response.json());
  if (saved.sourceSha256 !== sourceSha256 || saved.queueId !== queueId) throw new Error("保存済みラベルのキューが一致しません");
  labels = Object.fromEntries(saved.labels.map((label) => [label.reviewId, label]));
  try {
    const local = JSON.parse(localStorage.getItem(key()) ?? "{}");
    for (const [id, label] of Object.entries(local)) {
      if (queue.some((item) => item.id === id) && (!labels[id] || Date.parse(label.updatedAt) > Date.parse(labels[id].updatedAt))) labels[id] = label;
    }
  } catch { /* server copy remains */ }
  $("item").replaceChildren(...queue.map((item) => { const option = document.createElement("option"); option.value = item.id; option.textContent = `${item.id} ${item.filename}`; return option; }));
  $("save-status").textContent = "保存済みラベルを読み込みました";
  render();
}).catch((error) => { $("progress").textContent = `読み込みエラー: ${error.message}`; });
$("item").addEventListener("change", (event) => { selected = queue.findIndex((item) => item.id === event.target.value); render(); });
$("previous").addEventListener("click", () => { selected = Math.max(0, selected - 1); render(); });
$("next").addEventListener("click", () => { selected = Math.min(queue.length - 1, selected + 1); render(); });
$("back").addEventListener("click", () => { $("audio").currentTime = Math.max(0, $("audio").currentTime - 3); });
$("forward").addEventListener("click", () => { $("audio").currentTime = Math.min($("audio").duration || Infinity, $("audio").currentTime + 3); });
$("play").addEventListener("click", async () => {
  try { if ($("audio").paused) await $("audio").play(); else $("audio").pause(); }
  catch (error) { $("progress").textContent = `再生エラー: ${error.message}`; }
});
$("audio").addEventListener("timeupdate", () => { if (current()) $("time").textContent = `原音 ${fmt(current().timeRange.startSeconds + $("audio").currentTime)}`; });
$("symptom").addEventListener("change", () => update({}));
$("start").addEventListener("change", () => update({}));
$("end").addEventListener("change", () => update({}));
$("correction").addEventListener("change", () => update({}));
$("notes").addEventListener("change", () => update({ notes: $("notes").value }));
document.querySelectorAll("#judgments button").forEach((button) => button.addEventListener("click", () => update({ reviewStatus: button.dataset.value, notes: $("notes").value })));
$("json").addEventListener("click", () => download("listening-labels.json", JSON.stringify({ sourceSha256, queueId, labels: Object.values(labels) }, null, 2) + "\n", "application/json"));
$("csv").addEventListener("click", () => {
  const fields = ["queueId", "reviewId", "trackId", "fileHash", "filename", "startSeconds", "endSeconds",
    "candidateType", "datasetRole", "symptomType", "reviewStatus", "correctionNeed", "notes", "updatedAt"];
  const lines = [fields.join(","), ...Object.values(labels).map((item) => fields.map((field) => csvCell(item[field])).join(","))];
  download("listening-labels.csv", "\ufeff" + lines.join("\r\n") + "\r\n", "text/csv");
});
