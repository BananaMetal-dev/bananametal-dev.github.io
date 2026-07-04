(() => {
  "use strict";

  const ACCEPTED_EXTENSIONS = {
    image: [".png", ".jpg", ".jpeg", ".webp"],
    audio: [".mp3", ".wav", ".ogg", ".m4a"],
    watermark: [".png", ".jpg", ".jpeg", ".webp"]
  };

  const SIZE_PRESETS = [
    { id: "720", label: "720p", shortEdge: 720 },
    { id: "1080", label: "1080p", shortEdge: 1080 },
    { id: "2160", label: "4K", shortEdge: 2160 }
  ];

  const ASPECT_PRESETS = [
    { id: "16:9", label: "16:9", width: 16, height: 9 },
    { id: "9:16", label: "9:16", width: 9, height: 16 },
    { id: "1:1", label: "1:1", width: 1, height: 1 },
    { id: "4:5", label: "4:5", width: 4, height: 5 }
  ];

  const CATALOG = {
    entries: [
      {
        id: "vertical_bars",
        kind: "visualizer_shape",
        label: "下部固定・縦バー",
        defaults: { barCount: 120, topLine: true }
      },
      {
        id: "line_spectrum",
        kind: "visualizer_shape",
        label: "折れ線スペクトラム",
        defaults: { barCount: 120, topLine: true }
      },
      {
        id: "radial_bars",
        kind: "visualizer_shape",
        label: "放射状バー",
        defaults: { barCount: 128, topLine: false }
      },
      {
        id: "filled_spectrum",
        kind: "visualizer_shape",
        label: "塗りスペクトラム",
        defaults: { barCount: 120, topLine: false }
      },
      {
        id: "led_bars",
        kind: "visualizer_shape",
        label: "LEDバー",
        defaults: { barCount: 96, topLine: false }
      },
      {
        id: "ring_waveform",
        kind: "visualizer_shape",
        label: "リング波形",
        defaults: { barCount: 160, topLine: false }
      },
      {
        id: "low_end_emphasis",
        kind: "response_profile",
        label: "低域強調",
        defaults: {
          lowGain: 1.4,
          midGain: 1,
          highGain: 0.75,
          temporalSmoothing: 0.78,
          spatialSmoothing: 0.62
        }
      },
      {
        id: "white_ice_blue",
        kind: "color",
        label: "白＋アイスブルー",
        defaults: { base: "#FFFFFF", accent: "#DDF6FF", peak: "#FFFFFF" }
      },
      {
        id: "monochrome",
        kind: "color",
        label: "モノクロ・無彩色",
        defaults: { base: "#BFC4C8", accent: "#F6F8F9", peak: "#FFFFFF" }
      }
    ]
  };

  const WORKSPACE_WIDTH_STORAGE_KEY = "banana-visualizer.workspace-widths";
  const MIN_LEFT_PANEL_WIDTH = 260;
  const MAX_LEFT_PANEL_WIDTH = 520;
  const MIN_RIGHT_PANEL_WIDTH = 280;
  const MAX_RIGHT_PANEL_WIDTH = 520;
  const MIN_CENTER_WIDTH = 420;

  const els = {
    workspace: document.getElementById("workspace"),
    leftResizer: document.getElementById("leftResizer"),
    rightResizer: document.getElementById("rightResizer"),
    loadProjectButton: document.getElementById("loadProjectButton"),
    saveProjectButton: document.getElementById("saveProjectButton"),
    resetProjectButton: document.getElementById("resetProjectButton"),
    projectFileInput: document.getElementById("projectFileInput"),
    renderButton: document.getElementById("renderButton"),
    stopButton: document.getElementById("stopButton"),
    mp4Button: document.getElementById("mp4Button"),
    playButton: document.getElementById("playButton"),
    previewReadout: document.getElementById("previewReadout"),
    canvasReadout: document.getElementById("canvasReadout"),
    playbackText: document.getElementById("playbackText"),
    previewCanvas: document.getElementById("previewCanvas"),
    previewFrame: document.getElementById("previewFrame"),
    audioElement: document.getElementById("audioElement"),
    resultVideo: document.getElementById("resultVideo"),
    downloadLink: document.getElementById("downloadLink"),
    statusText: document.getElementById("statusText"),
    resultMeta: document.getElementById("resultMeta"),
    durationInput: document.getElementById("durationInput"),
    timelineSilentButton: document.getElementById("timelineSilentButton"),
    timelineAudioButton: document.getElementById("timelineAudioButton"),
    fitCropButton: document.getElementById("fitCropButton"),
    fitLetterboxButton: document.getElementById("fitLetterboxButton"),
    zoomInput: document.getElementById("zoomInput"),
    zoomValue: document.getElementById("zoomValue"),
    fpsSelect: document.getElementById("fpsSelect"),
    sizePresetButtons: document.getElementById("sizePresetButtons"),
    aspectPresetButtons: document.getElementById("aspectPresetButtons"),
    shapeSelect: document.getElementById("shapeSelect"),
    responseSelect: document.getElementById("responseSelect"),
    colorSelect: document.getElementById("colorSelect"),
    barCountInput: document.getElementById("barCountInput"),
    barCountValue: document.getElementById("barCountValue"),
    visualizerSizeInput: document.getElementById("visualizerSizeInput"),
    visualizerSizeValue: document.getElementById("visualizerSizeValue"),
    watermarkEnabledInput: document.getElementById("watermarkEnabledInput"),
    watermarkSizeSelect: document.getElementById("watermarkSizeSelect"),
    watermarkOpacityInput: document.getElementById("watermarkOpacityInput"),
    watermarkOpacityValue: document.getElementById("watermarkOpacityValue"),
    outputNameInput: document.getElementById("outputNameInput"),
    imageDrop: document.getElementById("imageDrop"),
    audioDrop: document.getElementById("audioDrop"),
    watermarkDrop: document.getElementById("watermarkDrop"),
    imageFileButton: document.getElementById("imageFileButton"),
    imageFolderButton: document.getElementById("imageFolderButton"),
    audioFileButton: document.getElementById("audioFileButton"),
    audioFolderButton: document.getElementById("audioFolderButton"),
    watermarkFileButton: document.getElementById("watermarkFileButton"),
    watermarkFolderButton: document.getElementById("watermarkFolderButton"),
    imageFileInput: document.getElementById("imageFileInput"),
    imageFolderInput: document.getElementById("imageFolderInput"),
    audioFileInput: document.getElementById("audioFileInput"),
    audioFolderInput: document.getElementById("audioFolderInput"),
    watermarkFileInput: document.getElementById("watermarkFileInput"),
    watermarkFolderInput: document.getElementById("watermarkFolderInput"),
    imageAssetState: document.getElementById("imageAssetState"),
    audioAssetState: document.getElementById("audioAssetState"),
    watermarkAssetState: document.getElementById("watermarkAssetState")
  };

  const state = {
    project: defaultProject(),
    leftPanelWidth: readStoredWidth(`${WORKSPACE_WIDTH_STORAGE_KEY}.left`, 340, MIN_LEFT_PANEL_WIDTH, MAX_LEFT_PANEL_WIDTH),
    rightPanelWidth: readStoredWidth(`${WORKSPACE_WIDTH_STORAGE_KEY}.right`, 340, MIN_RIGHT_PANEL_WIDTH, MAX_RIGHT_PANEL_WIDTH),
    resize: null,
    drag: null,
    assets: {
      image: null,
      audio: null,
      watermark: null
    },
    urls: {
      image: "",
      audio: "",
      watermark: "",
      output: ""
    },
    media: {
      image: null,
      watermark: null
    },
    audioGraph: {
      context: null,
      analyser: null,
      source: null,
      destination: null
    },
    animationFrame: 0,
    isPreviewing: false,
    isRendering: false,
    renderStopTimer: 0,
    recorder: null,
    recordedChunks: [],
    status: "Ready",
    resultMeta: "No output yet"
  };

  init();

  function init() {
    buildPresetButtons();
    buildCatalogSelects();
    bindTopbar();
    bindAssets();
    bindProjectMenu();
    bindInspector();
    bindPreview();
    bindWorkspaceResize();
    els.audioElement.addEventListener("ended", handleAudioEnded);
    window.addEventListener("resize", drawPreview);
    applyWorkspaceWidths();
    syncFormFromState();
    renderStaticState();
    drawPreview();
  }

  function defaultProject() {
    return {
      schemaVersion: 1,
      projectId: crypto.randomUUID(),
      name: "Banana Visualizer Project",
      assets: {},
      timeline: {
        mode: "silent",
        durationSeconds: 10
      },
      layout: {
        width: 1080,
        height: 1080,
        fps: 30,
        fitMode: "crop"
      },
      imageTransform: {
        zoom: 1,
        offsetX: 0,
        offsetY: 0
      },
      visualizer: {
        shapeId: "vertical_bars",
        responseProfileId: "low_end_emphasis",
        colorId: "white_ice_blue",
        parameters: {
          barCount: 120,
          visualizerSize: 55,
          visualizerOffsetX: 0,
          visualizerOffsetY: 0
        }
      },
      watermark: {
        enabled: false,
        size: "medium",
        positionX: 0.84,
        positionY: 0.84,
        opacity: 58
      },
      export: {
        outputName: "banana-visualizer-output.webm"
      }
    };
  }

  function buildPresetButtons() {
    els.sizePresetButtons.innerHTML = "";
    SIZE_PRESETS.forEach((preset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.id = preset.id;
      button.textContent = preset.label;
      button.addEventListener("click", () => setCanvasPreset(selectedAspectId(), preset.id));
      els.sizePresetButtons.appendChild(button);
    });

    els.aspectPresetButtons.innerHTML = "";
    ASPECT_PRESETS.forEach((preset) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.id = preset.id;
      button.textContent = preset.label;
      button.addEventListener("click", () => setCanvasPreset(preset.id, selectedSizeId()));
      els.aspectPresetButtons.appendChild(button);
    });
  }

  function buildCatalogSelects() {
    populateSelect(els.shapeSelect, entriesByKind("visualizer_shape"));
    populateSelect(els.responseSelect, entriesByKind("response_profile"));
    populateSelect(els.colorSelect, entriesByKind("color"));
  }

  function populateSelect(select, entries) {
    select.innerHTML = "";
    entries.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = entry.label;
      select.appendChild(option);
    });
  }

  function bindTopbar() {
    els.loadProjectButton.addEventListener("click", () => els.projectFileInput.click());
    els.projectFileInput.addEventListener("change", loadProjectFromFile);
    els.saveProjectButton.addEventListener("click", saveProjectToFile);
    els.resetProjectButton.addEventListener("click", resetProject);
    els.renderButton.addEventListener("click", renderProject);
    els.stopButton.addEventListener("click", stopRender);
    els.mp4Button.addEventListener("click", () => setStatus("MP4変換は次段階です。"));
    els.playButton.addEventListener("click", togglePreview);
  }

  function bindAssets() {
    bindAssetInput("image");
    bindAssetInput("audio");
    bindAssetInput("watermark");
    bindDropZone(els.imageDrop, "image");
    bindDropZone(els.audioDrop, "audio");
    bindDropZone(els.watermarkDrop, "watermark");
    window.addEventListener("paste", onWindowPaste);
  }

  function bindAssetInput(kind) {
    const fileButton = els[`${kind}FileButton`];
    const folderButton = els[`${kind}FolderButton`];
    const fileInput = els[`${kind}FileInput`];
    const folderInput = els[`${kind}FolderInput`];

    fileButton.addEventListener("click", () => fileInput.click());
    folderButton.addEventListener("click", () => folderInput.click());
    fileInput.addEventListener("change", (event) => {
      importFirstSupported(kind, Array.from(event.currentTarget.files || []), "File");
      event.currentTarget.value = "";
    });
    folderInput.addEventListener("change", (event) => {
      importFirstSupported(kind, Array.from(event.currentTarget.files || []), "Folder");
      event.currentTarget.value = "";
    });
  }

  function bindDropZone(zone, kind) {
    zone.addEventListener("dragenter", (event) => {
      event.preventDefault();
      zone.classList.add("is-drag-over");
    });
    zone.addEventListener("dragover", (event) => {
      event.preventDefault();
      zone.classList.add("is-drag-over");
    });
    zone.addEventListener("dragleave", () => zone.classList.remove("is-drag-over"));
    zone.addEventListener("drop", async (event) => {
      event.preventDefault();
      zone.classList.remove("is-drag-over");
      const files = await filesFromDrop(event);
      importFirstSupported(kind, files, "Drop");
    });
  }

  function bindProjectMenu() {
    els.durationInput.addEventListener("input", () => {
      state.project.timeline.durationSeconds = clamp(Number(els.durationInput.value) || 10, 0.3, 3600);
      updateStatusReadouts();
    });
    els.timelineSilentButton.addEventListener("click", () => {
      state.project.timeline.mode = "silent";
      syncFormFromState();
      updateStatusReadouts();
    });
    els.timelineAudioButton.addEventListener("click", () => {
      state.project.timeline.mode = "audio_full_length";
      syncFormFromState();
      updateStatusReadouts();
    });
    els.fpsSelect.addEventListener("change", () => {
      state.project.layout.fps = Number(els.fpsSelect.value);
      syncFormFromState();
    });
    els.fitCropButton.addEventListener("click", () => {
      state.project.layout.fitMode = "crop";
      syncFormFromState();
      drawPreview();
    });
    els.fitLetterboxButton.addEventListener("click", () => {
      state.project.layout.fitMode = "letterbox";
      syncFormFromState();
      drawPreview();
    });
    els.zoomInput.addEventListener("input", () => {
      state.project.imageTransform.zoom = clamp(Number(els.zoomInput.value), 0.3, 3);
      syncFormFromState();
      drawPreview();
    });
  }

  function bindInspector() {
    els.shapeSelect.addEventListener("change", () => {
      state.project.visualizer.shapeId = els.shapeSelect.value;
      const entry = getEntry(state.project.visualizer.shapeId);
      if (entry) {
        state.project.visualizer.parameters.barCount = entry.defaults.barCount || state.project.visualizer.parameters.barCount;
      }
      syncFormFromState();
      drawPreview();
    });
    els.responseSelect.addEventListener("change", () => {
      state.project.visualizer.responseProfileId = els.responseSelect.value;
      drawPreview();
    });
    els.colorSelect.addEventListener("change", () => {
      state.project.visualizer.colorId = els.colorSelect.value;
      drawPreview();
    });
    els.barCountInput.addEventListener("input", () => {
      state.project.visualizer.parameters.barCount = clamp(Number(els.barCountInput.value), 24, 256);
      syncFormFromState();
      drawPreview();
    });
    els.visualizerSizeInput.addEventListener("input", () => {
      state.project.visualizer.parameters.visualizerSize = clamp(Number(els.visualizerSizeInput.value), 0, 100);
      syncFormFromState();
      drawPreview();
    });
    els.watermarkEnabledInput.addEventListener("change", () => {
      state.project.watermark.enabled = els.watermarkEnabledInput.checked;
      drawPreview();
    });
    els.watermarkSizeSelect.addEventListener("change", () => {
      state.project.watermark.size = els.watermarkSizeSelect.value;
      drawPreview();
    });
    els.watermarkOpacityInput.addEventListener("input", () => {
      state.project.watermark.opacity = clamp(Number(els.watermarkOpacityInput.value), 0, 100);
      syncFormFromState();
      drawPreview();
    });
    els.outputNameInput.addEventListener("input", () => {
      state.project.export.outputName = sanitizeOutputName(els.outputNameInput.value);
      updateDownloadName();
    });
  }

  function bindPreview() {
    const canvas = els.previewCanvas;
    canvas.addEventListener("pointerdown", onCanvasPointerDown);
    canvas.addEventListener("pointermove", onCanvasPointerMove);
    canvas.addEventListener("pointerup", onCanvasPointerUp);
    canvas.addEventListener("pointercancel", onCanvasPointerUp);
    canvas.addEventListener("keydown", onCanvasKeyDown);
  }

  function bindWorkspaceResize() {
    els.leftResizer.addEventListener("pointerdown", beginPanelResize("left"));
    els.rightResizer.addEventListener("pointerdown", beginPanelResize("right"));
    els.leftResizer.addEventListener("keydown", onResizerKeyDown("left"));
    els.rightResizer.addEventListener("keydown", onResizerKeyDown("right"));
    window.addEventListener("pointermove", onWorkspacePointerMove);
    window.addEventListener("pointerup", stopPanelResize);
    window.addEventListener("pointercancel", stopPanelResize);
  }

  function onResizerKeyDown(side) {
    return (event) => {
      if (event.key === "ArrowLeft") {
        nudgePanelWidth(side, -16);
        event.preventDefault();
      } else if (event.key === "ArrowRight") {
        nudgePanelWidth(side, 16);
        event.preventDefault();
      }
    };
  }

  function beginPanelResize(side) {
    return (event) => {
      const rect = els.workspace.getBoundingClientRect();
      state.resize = {
        side,
        startX: event.clientX,
        startLeft: state.leftPanelWidth,
        startRight: state.rightPanelWidth,
        workspaceWidth: rect.width
      };
      document.body.style.cursor = "col-resize";
      event.preventDefault();
    };
  }

  function onWorkspacePointerMove(event) {
    if (!state.resize) return;

    const delta = event.clientX - state.resize.startX;
    const maxLeft = Math.min(MAX_LEFT_PANEL_WIDTH, state.resize.workspaceWidth - state.rightPanelWidth - MIN_CENTER_WIDTH);
    const maxRight = Math.min(MAX_RIGHT_PANEL_WIDTH, state.resize.workspaceWidth - state.leftPanelWidth - MIN_CENTER_WIDTH);

    if (state.resize.side === "left") {
      state.leftPanelWidth = clamp(state.resize.startLeft + delta, MIN_LEFT_PANEL_WIDTH, Math.max(MIN_LEFT_PANEL_WIDTH, maxLeft));
    } else {
      state.rightPanelWidth = clamp(state.resize.startRight - delta, MIN_RIGHT_PANEL_WIDTH, Math.max(MIN_RIGHT_PANEL_WIDTH, maxRight));
    }

    applyWorkspaceWidths();
  }

  function stopPanelResize() {
    if (!state.resize) return;
    state.resize = null;
    document.body.style.cursor = "";
    window.localStorage.setItem(`${WORKSPACE_WIDTH_STORAGE_KEY}.left`, String(state.leftPanelWidth));
    window.localStorage.setItem(`${WORKSPACE_WIDTH_STORAGE_KEY}.right`, String(state.rightPanelWidth));
  }

  function nudgePanelWidth(side, delta) {
    const workspaceWidth = els.workspace.getBoundingClientRect().width;
    if (side === "left") {
      const maxLeft = Math.min(MAX_LEFT_PANEL_WIDTH, workspaceWidth - state.rightPanelWidth - MIN_CENTER_WIDTH);
      state.leftPanelWidth = clamp(state.leftPanelWidth + delta, MIN_LEFT_PANEL_WIDTH, Math.max(MIN_LEFT_PANEL_WIDTH, maxLeft));
    } else {
      const maxRight = Math.min(MAX_RIGHT_PANEL_WIDTH, workspaceWidth - state.leftPanelWidth - MIN_CENTER_WIDTH);
      state.rightPanelWidth = clamp(state.rightPanelWidth - delta, MIN_RIGHT_PANEL_WIDTH, Math.max(MIN_RIGHT_PANEL_WIDTH, maxRight));
    }
    applyWorkspaceWidths();
  }

  function applyWorkspaceWidths() {
    els.workspace.style.setProperty("--left-panel-width", `${state.leftPanelWidth}px`);
    els.workspace.style.setProperty("--right-panel-width", `${state.rightPanelWidth}px`);
  }

  async function importFirstSupported(kind, files, source) {
    const file = firstAcceptedFile(kind, files);
    if (!file) {
      setStatus(`${source}: supported ${kind} file not found`);
      return;
    }
    await importAsset(kind, file);
  }

  async function importAsset(kind, file) {
    setStatus(`Importing ${file.name}`);
    revokeAsset(kind);
    state.assets[kind] = {
      originalName: file.name,
      size: file.size,
      type: file.type
    };
    state.urls[kind] = URL.createObjectURL(file);

    if (kind === "image") {
      state.media.image = await loadImage(state.urls.image);
      state.project.imageTransform = { zoom: 1, offsetX: 0, offsetY: 0 };
      state.project.layout.fitMode = "crop";
      els.imageDrop.open = false;
    } else if (kind === "audio") {
      els.audioElement.src = state.urls.audio;
      els.audioElement.load();
      els.audioDrop.open = false;
      if (state.project.timeline.mode === "audio_full_length") {
        await waitForAudioMetadata();
      }
    } else {
      state.media.watermark = await loadImage(state.urls.watermark);
      state.project.watermark.enabled = true;
      els.watermarkDrop.open = false;
    }

    if (kind === "audio") {
      setStatus("Audio track imported");
    } else if (kind === "watermark") {
      setStatus("Watermark icon imported");
    } else {
      setStatus("Still image imported");
    }

    updateAssetStates();
    syncFormFromState();
    drawPreview();
  }

  function revokeAsset(kind) {
    if (state.urls[kind]) {
      URL.revokeObjectURL(state.urls[kind]);
      state.urls[kind] = "";
    }
    if (kind === "image") state.media.image = null;
    if (kind === "watermark") state.media.watermark = null;
  }

  async function waitForAudioMetadata() {
    if (Number.isFinite(els.audioElement.duration) && els.audioElement.duration > 0) {
      updateAudioDurationFromMedia();
      return;
    }

    await new Promise((resolve) => {
      const onLoaded = () => {
        els.audioElement.removeEventListener("loadedmetadata", onLoaded);
        resolve();
      };
      els.audioElement.addEventListener("loadedmetadata", onLoaded);
    });
    updateAudioDurationFromMedia();
  }

  function updateAudioDurationFromMedia() {
    if (state.project.timeline.mode !== "audio_full_length") return;
    if (Number.isFinite(els.audioElement.duration) && els.audioElement.duration > 0) {
      state.project.timeline.durationSeconds = els.audioElement.duration;
      syncFormFromState();
      updateStatusReadouts();
    }
  }

  function onWindowPaste(event) {
    const files = Array.from(event.clipboardData.files || []);
    if (!files.length) return;
    const imageFile = firstAcceptedFile("image", files);
    const audioFile = firstAcceptedFile("audio", files);
    const watermarkFile = firstAcceptedFile("watermark", files);
    if (audioFile) {
      event.preventDefault();
      importAsset("audio", audioFile);
    } else if (imageFile) {
      event.preventDefault();
      importAsset("image", imageFile);
    } else if (watermarkFile) {
      event.preventDefault();
      importAsset("watermark", watermarkFile);
    }
  }

  async function filesFromDrop(event) {
    const items = Array.from(event.dataTransfer.items || []);
    const fileEntries = items
      .map((item) => (typeof item.webkitGetAsEntry === "function" ? item.webkitGetAsEntry() : null))
      .filter(Boolean);
    if (!fileEntries.length) {
      return Array.from(event.dataTransfer.files || []);
    }

    const nested = await Promise.all(fileEntries.map(readEntryFiles));
    return nested.flat();
  }

  async function readEntryFiles(entry) {
    if (entry.isFile) {
      return new Promise((resolve, reject) => {
        entry.file((file) => resolve([file]), reject);
      });
    }
    if (!entry.isDirectory) return [];
    const reader = entry.createReader();
    const entries = [];
    while (true) {
      const batch = await new Promise((resolve, reject) => reader.readEntries(resolve, reject));
      if (!batch.length) break;
      entries.push(...batch);
    }
    const nested = await Promise.all(entries.map(readEntryFiles));
    return nested.flat();
  }

  function firstAcceptedFile(kind, files) {
    return files.find((file) => {
      const lower = file.name.toLowerCase();
      return ACCEPTED_EXTENSIONS[kind].some((extension) => lower.endsWith(extension));
    });
  }

  function selectedAspectId() {
    return aspectPresetIdFor(state.project.layout);
  }

  function selectedSizeId() {
    return sizePresetIdFor(state.project.layout, selectedAspectId());
  }

  function setCanvasPreset(aspectId, sizeId) {
    const dimensions = dimensionsForPreset(aspectId, sizeId);
    state.project.layout.width = dimensions.width;
    state.project.layout.height = dimensions.height;
    state.project.layout.fitMode = "crop";
    syncFormFromState();
    drawPreview();
  }

  function dimensionsForPreset(aspectId, sizeId) {
    const aspect = ASPECT_PRESETS.find((preset) => preset.id === aspectId) || ASPECT_PRESETS[0];
    const size = SIZE_PRESETS.find((preset) => preset.id === sizeId) || SIZE_PRESETS[1];
    if (aspect.width === aspect.height) {
      return { width: size.shortEdge, height: size.shortEdge };
    }
    if (aspect.width > aspect.height) {
      return {
        width: roundEven(size.shortEdge * (aspect.width / aspect.height)),
        height: size.shortEdge
      };
    }
    return {
      width: size.shortEdge,
      height: roundEven(size.shortEdge * (aspect.height / aspect.width))
    };
  }

  function aspectPresetIdFor(layout) {
    const ratio = layout.width / layout.height;
    const match = ASPECT_PRESETS.find((preset) => Math.abs(ratio - preset.width / preset.height) < 0.015);
    return match ? match.id : "16:9";
  }

  function sizePresetIdFor(layout, aspectId) {
    const aspect = ASPECT_PRESETS.find((preset) => preset.id === aspectId) || ASPECT_PRESETS[0];
    const shortEdge = aspect.width >= aspect.height ? layout.height : layout.width;
    const match = SIZE_PRESETS.find((preset) => Math.abs(shortEdge - preset.shortEdge) <= 2);
    return match ? match.id : "1080";
  }

  function entriesByKind(kind) {
    return CATALOG.entries.filter((entry) => entry.kind === kind);
  }

  function getEntry(id) {
    return CATALOG.entries.find((entry) => entry.id === id);
  }

  function syncFormFromState() {
    updateAssetStates();
    els.durationInput.value = String(Number(state.project.timeline.durationSeconds.toFixed(2)));
    els.durationInput.disabled = state.project.timeline.mode === "audio_full_length";
    toggleActive(els.timelineSilentButton, state.project.timeline.mode === "silent");
    toggleActive(els.timelineAudioButton, state.project.timeline.mode === "audio_full_length");
    toggleActive(els.fitCropButton, state.project.layout.fitMode === "crop");
    toggleActive(els.fitLetterboxButton, state.project.layout.fitMode === "letterbox");
    els.fpsSelect.value = String(state.project.layout.fps);
    els.zoomInput.value = String(imageZoomValue());
    els.zoomValue.textContent = `${imageZoomValue().toFixed(2)}x`;
    els.shapeSelect.value = state.project.visualizer.shapeId;
    els.responseSelect.value = state.project.visualizer.responseProfileId;
    els.colorSelect.value = state.project.visualizer.colorId;
    els.barCountInput.value = String(Number(state.project.visualizer.parameters.barCount || 120));
    els.barCountValue.textContent = String(Number(state.project.visualizer.parameters.barCount || 120));
    els.visualizerSizeInput.value = String(visualizerSizePercent());
    els.visualizerSizeValue.textContent = `${Math.round(visualizerSizePercent())}%`;
    els.watermarkEnabledInput.checked = state.project.watermark.enabled;
    els.watermarkEnabledInput.disabled = !state.assets.watermark;
    els.watermarkSizeSelect.value = state.project.watermark.size;
    els.watermarkOpacityInput.value = String(state.project.watermark.opacity);
    els.watermarkOpacityValue.textContent = `${Math.round(state.project.watermark.opacity)}%`;
    els.outputNameInput.value = state.project.export.outputName;
    updatePresetButtons();
    updateStatusReadouts();
    updateDownloadName();
    els.previewCanvas.width = state.project.layout.width;
    els.previewCanvas.height = state.project.layout.height;
    els.previewFrame.style.aspectRatio = `${state.project.layout.width} / ${state.project.layout.height}`;
  }

  function renderStaticState() {
    setStatus(state.status);
    els.resultMeta.textContent = state.resultMeta;
    updateAssetStates();
  }

  function updatePresetButtons() {
    const sizeId = selectedSizeId();
    const aspectId = selectedAspectId();
    Array.from(els.sizePresetButtons.children).forEach((button) => {
      toggleActive(button, button.dataset.id === sizeId);
    });
    Array.from(els.aspectPresetButtons.children).forEach((button) => {
      toggleActive(button, button.dataset.id === aspectId);
    });
  }

  function updateStatusReadouts() {
    els.canvasReadout.textContent = `${state.project.layout.width} x ${state.project.layout.height}`;
    els.previewReadout.textContent = `${state.project.layout.width} x ${state.project.layout.height} / ${state.project.layout.fps}fps`;
    updatePlaybackText();
  }

  function updateDownloadName() {
    els.downloadLink.download = state.project.export.outputName || "banana-visualizer-output.webm";
  }

  function updateAssetStates() {
    const imageLoaded = Boolean(state.assets.image);
    const audioLoaded = Boolean(state.assets.audio);
    const watermarkLoaded = Boolean(state.assets.watermark);
    els.imageAssetState.textContent = imageLoaded ? "Loaded" : "Not loaded";
    els.audioAssetState.textContent = audioLoaded ? "Loaded" : "Not loaded";
    els.watermarkAssetState.textContent = watermarkLoaded ? "Loaded" : "Not loaded";
    els.imageAssetState.classList.toggle("is-loaded", imageLoaded);
    els.audioAssetState.classList.toggle("is-loaded", audioLoaded);
    els.watermarkAssetState.classList.toggle("is-loaded", watermarkLoaded);
  }

  function readWatermarkBounds(width, height) {
    if (!state.media.watermark) return null;
    const ratios = { small: 0.1, medium: 0.16, large: 0.24 };
    const targetWidth = Math.max(24, Math.min(width, width * (ratios[state.project.watermark.size] || 0.16)));
    const scale = targetWidth / state.media.watermark.naturalWidth;
    const targetHeight = state.media.watermark.naturalHeight * scale;
    const margin = Math.max(12, Math.min(width, height) * 0.035);
    const bounds = clampWatermarkPosition(
      {
        positionX: Number.isFinite(state.project.watermark.positionX) ? state.project.watermark.positionX : 0.84,
        positionY: Number.isFinite(state.project.watermark.positionY) ? state.project.watermark.positionY : 0.84
      },
      width,
      height,
      targetWidth,
      targetHeight,
      margin
    );
    return {
      x: bounds.x,
      y: bounds.y,
      width: targetWidth,
      height: targetHeight
    };
  }

  function clampWatermarkPosition(position, width = state.project.layout.width, height = state.project.layout.height, targetWidth = null, targetHeight = null, margin = null) {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    const actualMargin = margin ?? Math.max(12, Math.min(safeWidth, safeHeight) * 0.035);
    const ratios = { small: 0.1, medium: 0.16, large: 0.24 };
    const resolvedTargetWidth = targetWidth ?? Math.max(24, Math.min(safeWidth, safeWidth * (ratios[state.project.watermark.size] || 0.16)));
    const resolvedTargetHeight = targetHeight ?? (state.media.watermark ? state.media.watermark.naturalHeight * (resolvedTargetWidth / state.media.watermark.naturalWidth) : resolvedTargetWidth * 0.5);
    const maxX = Math.max(actualMargin, safeWidth - resolvedTargetWidth - actualMargin);
    const maxY = Math.max(actualMargin, safeHeight - resolvedTargetHeight - actualMargin);
    const baseX = Number.isFinite(position.positionX) ? position.positionX * safeWidth : 0.84 * safeWidth;
    const baseY = Number.isFinite(position.positionY) ? position.positionY * safeHeight : 0.84 * safeHeight;
    const x = clamp(baseX, actualMargin, maxX);
    const y = clamp(baseY, actualMargin, maxY);
    return {
      positionX: safeWidth > 0 ? x / safeWidth : 0,
      positionY: safeHeight > 0 ? y / safeHeight : 0,
      x,
      y
    };
  }

  function toggleActive(element, active) {
    element.classList.toggle("active", active);
  }

  function imageZoomValue() {
    return clamp(Number.isFinite(state.project.imageTransform.zoom) ? state.project.imageTransform.zoom : 0.3, 0.3, 3);
  }

  function visualizerSizePercent() {
    return clamp(Number(state.project.visualizer.parameters.visualizerSize || 55), 0, 100);
  }

  async function togglePreview() {
    if (state.isPreviewing) {
      stopPreview();
      return;
    }

    if (state.assets.audio) {
      await ensureAudioGraph();
      if (els.audioElement.currentTime >= safeDuration()) {
        els.audioElement.currentTime = 0;
      }
      await els.audioElement.play();
    }

    state.isPreviewing = true;
    els.playButton.textContent = "Pause";
    startAnimation();
  }

  function stopPreview() {
    state.isPreviewing = false;
    els.playButton.textContent = "Play preview";
    els.audioElement.pause();
    stopAnimation();
    drawPreview();
    updatePlaybackText();
  }

  async function ensureAudioGraph() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio API is not available.");
    }

    if (!state.audioGraph.context) {
      state.audioGraph.context = new AudioContextClass();
      state.audioGraph.analyser = state.audioGraph.context.createAnalyser();
      state.audioGraph.analyser.fftSize = 2048;
      state.audioGraph.destination = state.audioGraph.context.createMediaStreamDestination();
      state.audioGraph.source = state.audioGraph.context.createMediaElementSource(els.audioElement);
      state.audioGraph.source.connect(state.audioGraph.analyser);
      state.audioGraph.analyser.connect(state.audioGraph.context.destination);
      state.audioGraph.analyser.connect(state.audioGraph.destination);
    }

    if (state.audioGraph.context.state === "suspended") {
      await state.audioGraph.context.resume();
    }
  }

  function startAnimation() {
    stopAnimation();
    const tick = () => {
      drawPreview();
      updatePlaybackText();
      if (state.isPreviewing || state.isRendering) {
        state.animationFrame = window.requestAnimationFrame(tick);
      }
    };
    state.animationFrame = window.requestAnimationFrame(tick);
  }

  function stopAnimation() {
    if (state.animationFrame) {
      window.cancelAnimationFrame(state.animationFrame);
      state.animationFrame = 0;
    }
  }

  function safeDuration() {
    if (state.project.timeline.mode === "audio_full_length" && Number.isFinite(els.audioElement.duration) && els.audioElement.duration > 0) {
      return els.audioElement.duration;
    }
    return Math.max(0.3, Number(state.project.timeline.durationSeconds || 10));
  }

  function handleAudioEnded() {
    if (state.isRendering) {
      stopRender();
      return;
    }
    if (state.isPreviewing) {
      stopPreview();
    }
  }

  async function renderProject() {
    if (state.isRendering) return;
    if (!state.assets.image) {
      setStatus("Still image is required.");
      return;
    }
    if (!window.MediaRecorder) {
      setStatus("MediaRecorder is not available in this browser.");
      return;
    }

    if (state.assets.audio) {
      await ensureAudioGraph();
    }

    clearResult();
    els.previewCanvas.width = state.project.layout.width;
    els.previewCanvas.height = state.project.layout.height;

    const stream = els.previewCanvas.captureStream(state.project.layout.fps);
    const composed = new MediaStream();
    stream.getVideoTracks().forEach((track) => composed.addTrack(track));
    if (state.assets.audio && state.audioGraph.destination) {
      state.audioGraph.destination.stream.getAudioTracks().forEach((track) => composed.addTrack(track));
    }

    const mimeType = pickMimeType();
    state.recordedChunks = [];
    state.recorder = new MediaRecorder(composed, mimeType ? { mimeType } : undefined);
    state.recorder.addEventListener("dataavailable", (event) => {
      if (event.data && event.data.size > 0) {
        state.recordedChunks.push(event.data);
      }
    });
    state.recorder.addEventListener("stop", finalizeRender);

    state.isRendering = true;
    state.isPreviewing = true;
    els.renderButton.disabled = true;
    els.stopButton.disabled = false;
    els.stopButton.hidden = false;
    els.mp4Button.hidden = true;
    els.downloadLink.hidden = true;
    els.resultVideo.hidden = true;
    els.playButton.textContent = "Pause";
    setStatus("Rendering");
    state.resultMeta = "Rendering in browser";
    els.resultMeta.textContent = state.resultMeta;

    if (state.assets.audio) {
      els.audioElement.currentTime = 0;
      await els.audioElement.play();
    }

    state.recorder.start(250);
    startAnimation();

    window.clearTimeout(state.renderStopTimer);
    state.renderStopTimer = window.setTimeout(() => stopRender(), safeDuration() * 1000 + 60);
  }

  function stopRender() {
    if (!state.isRendering) return;
    window.clearTimeout(state.renderStopTimer);
    els.audioElement.pause();
    if (state.recorder && state.recorder.state !== "inactive") {
      state.recorder.stop();
    } else {
      finalizeRender();
    }
  }

  function finalizeRender() {
    if (state.urls.output) {
      URL.revokeObjectURL(state.urls.output);
      state.urls.output = "";
    }

    const blob = new Blob(state.recordedChunks, { type: pickMimeType() || "video/webm" });
    state.urls.output = URL.createObjectURL(blob);
    state.isRendering = false;
    state.isPreviewing = false;
    els.renderButton.disabled = false;
    els.stopButton.disabled = true;
    els.stopButton.hidden = true;
    els.playButton.textContent = "Play preview";
    stopAnimation();
    drawPreview();

    state.resultMeta = `${formatBytes(blob.size)} / ${safeDuration().toFixed(1)} sec`;
    els.resultMeta.textContent = state.resultMeta;
    els.resultVideo.hidden = false;
    els.resultVideo.src = state.urls.output;
    els.downloadLink.hidden = false;
    els.mp4Button.hidden = false;
    els.downloadLink.href = state.urls.output;
    setStatus("Render completed");
    updatePlaybackText();
  }

  function clearResult() {
    els.resultVideo.hidden = true;
    els.resultVideo.removeAttribute("src");
    els.resultVideo.load();
    els.downloadLink.hidden = true;
    els.downloadLink.removeAttribute("href");
    els.mp4Button.hidden = true;
    els.stopButton.hidden = true;
    if (state.urls.output) {
      URL.revokeObjectURL(state.urls.output);
      state.urls.output = "";
    }
    state.resultMeta = "No output yet";
    els.resultMeta.textContent = state.resultMeta;
  }

  function setStatus(message) {
    state.status = message;
    els.statusText.textContent = message;
  }

  function drawPreview() {
    const canvas = els.previewCanvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#151c21");
    gradient.addColorStop(1, "#070a0d");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    if (state.media.image) {
      drawBackground(ctx, state.media.image, width, height);
      ctx.fillStyle = "rgba(0, 0, 0, 0.18)";
      ctx.fillRect(0, 0, width, height);
    } else {
      ctx.fillStyle = "rgba(238, 244, 247, 0.86)";
      ctx.font = `${Math.max(14, width * 0.012)}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("Still image", width / 2, height / 2);
    }

    const color = getEntry(state.project.visualizer.colorId)?.defaults || {};
    const base = typeof color.base === "string" ? color.base : "#ffffff";
    const accent = typeof color.accent === "string" ? color.accent : "#ddf6ff";
    const peak = typeof color.peak === "string" ? color.peak : "#ffffff";
    const values = readVisualizerValues();
    const bounds = readVisualizerBounds(width, height);
    drawVisualizer(ctx, values, bounds, accent, peak, base);

    if (state.project.watermark.enabled && state.media.watermark) {
      drawWatermark(ctx, state.media.watermark, width, height);
    }
  }

  function drawBackground(ctx, image, width, height) {
    const transform = clampImageTransform(state.project.imageTransform, image, state.project.layout);
    if (state.project.layout.fitMode === "letterbox") {
      const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
      const drawWidth = image.naturalWidth * scale;
      const drawHeight = image.naturalHeight * scale;
      const drawX = (width - drawWidth) / 2;
      const drawY = (height - drawHeight) / 2;
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      return;
    }

    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight) * transform.zoom;
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const offsetScaleX = width / state.project.layout.width;
    const offsetScaleY = height / state.project.layout.height;
    const drawX = (width - drawWidth) / 2 + transform.offsetX * offsetScaleX;
    const drawY = (height - drawHeight) / 2 + transform.offsetY * offsetScaleY;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  }

  function readVisualizerValues() {
    const count = Math.min(160, Math.max(24, Number(state.project.visualizer.parameters.barCount || 96)));
    let values = Array.from({ length: count }, (_, index) => {
      const t = performance.now() / 620;
      return 0.16 + Math.abs(Math.sin(t + index * 0.43)) * 0.48;
    });

    const analyser = state.audioGraph.analyser;
    if (analyser && (state.isPreviewing || state.isRendering)) {
      const source = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(source);
      const response = getEntry(state.project.visualizer.responseProfileId)?.defaults || {};
      const lowGain = Number(response.lowGain || 1.2);
      const midGain = Number(response.midGain || 1);
      const highGain = Number(response.highGain || 0.8);
      const sampleRate = state.audioGraph.context ? state.audioGraph.context.sampleRate : 44100;
      const edges = buildLogBandEdges(source.length, count, sampleRate);
      values = Array.from({ length: count }, (_, index) => {
        const start = edges[index];
        const end = Math.max(start + 1, edges[index + 1]);
        let sum = 0;
        for (let i = start; i < end; i += 1) sum += source[i];
        const bandCenter = index / count;
        const gain = bandCenter < 0.33 ? lowGain : bandCenter < 0.66 ? midGain : highGain;
        return Math.max(0.04, Math.min(1, (sum / (end - start) / 255) * gain));
      });
    }

    return normalizeVisualizerValues(values);
  }

  function drawVisualizer(ctx, values, bounds, accent, peak, base) {
    const shapeId = state.project.visualizer.shapeId;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 14;

    if (shapeId === "line_spectrum" || shapeId === "filled_spectrum") {
      drawSpectrum(ctx, values, bounds, accent, peak, base, shapeId === "filled_spectrum");
    } else if (shapeId === "radial_bars" || shapeId === "ring_waveform") {
      drawRadial(ctx, values, bounds, accent, peak, shapeId === "ring_waveform");
    } else if (shapeId === "led_bars") {
      drawLedBars(ctx, values, bounds, accent, peak, base);
    } else {
      drawVerticalBars(ctx, values, bounds, accent, peak);
    }

    ctx.shadowBlur = 0;
  }

  function drawVerticalBars(ctx, values, bounds, accent, peak) {
    const baseY = bounds.y + bounds.height * 0.87;
    const maxHeight = bounds.height * 0.28;
    const left = bounds.x + bounds.width * 0.06;
    const width = bounds.width * 0.88;
    const gap = 3;
    const barWidth = Math.max(2, (width - gap * (values.length - 1)) / values.length);
    values.forEach((value, index) => {
      const x = left + index * (barWidth + gap);
      const h = Math.max(3, value * maxHeight);
      const gradient = ctx.createLinearGradient(0, baseY - h, 0, baseY);
      gradient.addColorStop(0, peak);
      gradient.addColorStop(1, accent);
      ctx.fillStyle = gradient;
      ctx.fillRect(x, baseY - h, barWidth, h);
    });
  }

  function drawSpectrum(ctx, values, bounds, accent, peak, base, filled) {
    const visualizerHeight = bounds.height * 0.92;
    const baseline = bounds.y + bounds.height * 0.985;
    const left = bounds.x;
    const width = bounds.width;
    ctx.beginPath();
    values.forEach((value, index) => {
      const x = left + (index / (values.length - 1)) * width;
      const y = baseline - value * visualizerHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineWidth = 2;
    ctx.strokeStyle = accent;
    ctx.stroke();
    ctx.lineTo(left + width, baseline);
    ctx.lineTo(left, baseline);
    ctx.closePath();
    const fill = ctx.createLinearGradient(0, baseline - visualizerHeight, 0, baseline);
    fill.addColorStop(0, filled ? `${accent}cc` : `${accent}88`);
    fill.addColorStop(1, filled ? `${base}33` : `${base}14`);
    ctx.fillStyle = fill;
    ctx.fill();
    if (filled) {
      ctx.beginPath();
      values.forEach((value, index) => {
        const x = left + (index / (values.length - 1)) * width;
        const y = baseline - value * visualizerHeight;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.lineWidth = 1.2;
      ctx.strokeStyle = peak;
      ctx.stroke();
    }
  }

  function drawRadial(ctx, values, bounds, accent, peak, isRing) {
    const centerX = bounds.x + bounds.width / 2;
    const centerY = bounds.y + bounds.height * 0.5;
    const radialSpan = Math.min(bounds.width, bounds.height);
    const radius = radialSpan * 0.24;
    const amplitude = radialSpan * 0.18;
    if (isRing) {
      ctx.beginPath();
      values.forEach((value, index) => {
        const angle = (index / values.length) * Math.PI * 2 - Math.PI / 2;
        const r = radius + value * amplitude;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.closePath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = peak;
      ctx.stroke();
      ctx.lineWidth = 6;
      ctx.strokeStyle = `${accent}22`;
      ctx.stroke();
      return;
    }

    values.forEach((value, index) => {
      const angle = (index / values.length) * Math.PI * 2 - Math.PI / 2;
      const inner = radius;
      const outer = radius + value * amplitude;
      const x1 = centerX + Math.cos(angle) * inner;
      const y1 = centerY + Math.sin(angle) * inner;
      const x2 = centerX + Math.cos(angle) * outer;
      const y2 = centerY + Math.sin(angle) * outer;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineWidth = Math.max(1.4, radialSpan / values.length * 0.42);
      ctx.strokeStyle = value > 0.72 ? peak : accent;
      ctx.stroke();
    });
  }

  function drawLedBars(ctx, values, bounds, accent, peak, base) {
    const visualizerHeight = bounds.height * 0.28;
    const baseline = bounds.y + bounds.height * 0.87;
    const left = bounds.x + bounds.width * 0.06;
    const width = bounds.width * 0.88;
    const gap = 4;
    const segmentGap = 3;
    const segmentCount = 9;
    const barWidth = Math.max(3, (width - gap * (values.length - 1)) / values.length);
    const segmentHeight = Math.max(3, (visualizerHeight - segmentGap * (segmentCount - 1)) / segmentCount);
    values.forEach((value, index) => {
      const x = left + index * (barWidth + gap);
      const lit = Math.max(1, Math.round(value * segmentCount));
      for (let segment = 0; segment < segmentCount; segment += 1) {
        const y = baseline - (segment + 1) * segmentHeight - segment * segmentGap;
        ctx.fillStyle = segment < lit ? (segment > segmentCount * 0.72 ? peak : accent) : `${base}20`;
        ctx.fillRect(x, y, barWidth, segmentHeight);
      }
    });
  }

  function drawWatermark(ctx, image, width, height) {
    const ratios = { small: 0.1, medium: 0.16, large: 0.24 };
    const targetWidth = Math.max(24, Math.min(width, width * (ratios[state.project.watermark.size] || 0.16)));
    const scale = targetWidth / image.naturalWidth;
    const targetHeight = image.naturalHeight * scale;
    const bounds = resolveWatermarkBounds(width, height, targetWidth, targetHeight);
    ctx.save();
    ctx.globalAlpha = clamp(state.project.watermark.opacity, 0, 100) / 100;
    ctx.drawImage(image, bounds.x, bounds.y, targetWidth, targetHeight);
    ctx.restore();
  }

  function resolveWatermarkBounds(width, height, targetWidth, targetHeight) {
    const margin = Math.max(12, Math.min(width, height) * 0.035);
    const maxX = Math.max(margin, width - targetWidth - margin);
    const maxY = Math.max(margin, height - targetHeight - margin);
    const normalizedX = Number.isFinite(state.project.watermark.positionX) ? state.project.watermark.positionX : 0.84;
    const normalizedY = Number.isFinite(state.project.watermark.positionY) ? state.project.watermark.positionY : 0.84;
    const x = clamp(normalizedX * width, margin, maxX);
    const y = clamp(normalizedY * height, margin, maxY);
    return { x, y, width: targetWidth, height: targetHeight, margin };
  }

  function readVisualizerBounds(width, height) {
    const base = visualizerBoundsForSize(width, height);
    const offset = visualizerOffset();
    const shiftedX = clamp(base.x + (offset.x * width) / state.project.layout.width, 0, Math.max(0, width - base.width));
    const shiftedY = clamp(base.y + (offset.y * height) / state.project.layout.height, 0, Math.max(0, height - base.height));
    return {
      x: shiftedX,
      y: shiftedY,
      width: base.width,
      height: base.height
    };
  }

  function visualizerBoundsForSize(width, height) {
    const shapeId = state.project.visualizer.shapeId;
    let base;
    let max;
    if (shapeId === "line_spectrum" || shapeId === "filled_spectrum") {
      base = { x: width * 0.26, y: height * 0.62, width: width * 0.48, height: height * 0.14 };
      max = { x: width * 0.01, y: height * 0.03, width: width * 0.98, height: height * 0.94 };
    } else if (shapeId === "vertical_bars" || shapeId === "led_bars") {
      base = { x: width * 0.34, y: height * 0.62, width: width * 0.28, height: height * 0.16 };
      max = { x: width * 0.08, y: height * 0.30, width: width * 0.84, height: height * 0.30 };
    } else if (shapeId === "radial_bars" || shapeId === "ring_waveform") {
      const size = Math.min(width, height) * 0.165;
      const maxSize = Math.min(width, height) * 0.92;
      base = { x: (width - size) / 2, y: (height - size) / 2, width: size, height: size };
      max = { x: (width - maxSize) / 2, y: (height - maxSize) / 2, width: maxSize, height: maxSize };
    } else {
      base = { x: width * 0.39, y: height * 0.68, width: width * 0.22, height: height * 0.12 };
      max = { x: width * 0.08, y: height * 0.34, width: width * 0.84, height: height * 0.28 };
    }
    const scale = visualizerSizePercent() / 100;
    return {
      x: lerp(base.x, max.x, scale),
      y: lerp(base.y, max.y, scale),
      width: lerp(base.width, max.width, scale),
      height: lerp(base.height, max.height, scale)
    };
  }

  function visualizerOffset() {
    return {
      x: Number(state.project.visualizer.parameters.visualizerOffsetX || 0),
      y: Number(state.project.visualizer.parameters.visualizerOffsetY || 0)
    };
  }

  function normalizeVisualizerValues(values) {
    let peak = 0;
    values.forEach((value) => {
      if (value > peak) peak = value;
    });
    if (peak <= 0) return values.map(() => 0);
    return values.map((value) => Math.max(0.12, value / peak));
  }

  function buildLogBandEdges(sampleCount, bandCount, sampleRate, lowCutHz = 21) {
    const highHz = Math.max(lowCutHz * 1.5, sampleRate / 2);
    const safeLowHz = Math.max(1, Math.min(lowCutHz, highHz - 1));
    const logLow = Math.log(safeLowHz);
    const logHigh = Math.log(highHz);
    const edges = Array.from({ length: bandCount + 1 }, (_, index) => {
      const t = index / bandCount;
      const hz = Math.exp(logLow + (logHigh - logLow) * t);
      return clamp(Math.round(hz / highHz * sampleCount), 0, sampleCount);
    });
    for (let index = 1; index < edges.length; index += 1) {
      if (edges[index] <= edges[index - 1]) {
        edges[index] = Math.min(sampleCount, edges[index - 1] + 1);
      }
    }
    edges[edges.length - 1] = sampleCount;
    return edges;
  }

  function clampImageTransform(transform, image, layout) {
    const zoom = clamp(Number.isFinite(transform.zoom) ? transform.zoom : 0.3, 0.3, 3);
    if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      return { zoom, offsetX: 0, offsetY: 0 };
    }
    const baseScale = Math.max(layout.width / image.naturalWidth, layout.height / image.naturalHeight);
    const scaledWidth = image.naturalWidth * baseScale * zoom;
    const scaledHeight = image.naturalHeight * baseScale * zoom;
    const maxOffsetX = Math.max(0, (scaledWidth - layout.width) / 2);
    const maxOffsetY = Math.max(0, (scaledHeight - layout.height) / 2);
    return {
      zoom,
      offsetX: clamp(transform.offsetX, -maxOffsetX, maxOffsetX),
      offsetY: clamp(transform.offsetY, -maxOffsetY, maxOffsetY)
    };
  }

  function onCanvasPointerDown(event) {
    const rect = els.previewCanvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (state.project.watermark.enabled && state.assets.watermark && state.media.watermark) {
      const watermarkBounds = readWatermarkBounds(rect.width, rect.height);
      if (
        x >= watermarkBounds.x &&
        x <= watermarkBounds.x + watermarkBounds.width &&
        y >= watermarkBounds.y &&
        y <= watermarkBounds.y + watermarkBounds.height
      ) {
        state.drag = { kind: "watermark", pointerId: event.pointerId, x: event.clientX, y: event.clientY };
        els.previewCanvas.classList.add("is-dragging");
        els.previewCanvas.setPointerCapture(event.pointerId);
        return;
      }
    }
    const bounds = readVisualizerBounds(rect.width, rect.height);
    const insideVisualizer = x >= bounds.x && x <= bounds.x + bounds.width && y >= bounds.y && y <= bounds.y + bounds.height;
    if (insideVisualizer) {
      state.drag = { kind: "visualizer", pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    } else if (state.assets.image) {
      state.drag = { kind: "image", pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    } else {
      return;
    }
    els.previewCanvas.classList.add("is-dragging");
    els.previewCanvas.setPointerCapture(event.pointerId);
  }

  function onCanvasPointerMove(event) {
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    const rect = els.previewCanvas.getBoundingClientRect();
    const deltaX = (event.clientX - state.drag.x) * state.project.layout.width / rect.width;
    const deltaY = (event.clientY - state.drag.y) * state.project.layout.height / rect.height;
    state.drag.x = event.clientX;
    state.drag.y = event.clientY;

    if (state.drag.kind === "image") {
      if (!state.media.image) return;
      const next = clampImageTransform({
        zoom: imageZoomValue(),
        offsetX: state.project.imageTransform.offsetX + deltaX,
        offsetY: state.project.imageTransform.offsetY + deltaY
      }, state.media.image, state.project.layout);
      state.project.imageTransform = next;
      syncFormFromState();
      drawPreview();
      return;
    }

    if (state.drag.kind === "watermark") {
      const next = clampWatermarkPosition({
        positionX: Number(state.project.watermark.positionX ?? 0.84) + deltaX / state.project.layout.width,
        positionY: Number(state.project.watermark.positionY ?? 0.84) + deltaY / state.project.layout.height
      });
      state.project.watermark.positionX = next.positionX;
      state.project.watermark.positionY = next.positionY;
      drawPreview();
      return;
    }

    state.project.visualizer.parameters.visualizerOffsetX = clamp(Number(state.project.visualizer.parameters.visualizerOffsetX || 0) + deltaX, -state.project.layout.width, state.project.layout.width);
    state.project.visualizer.parameters.visualizerOffsetY = clamp(Number(state.project.visualizer.parameters.visualizerOffsetY || 0) + deltaY, -state.project.layout.height, state.project.layout.height);
    drawPreview();
  }

  function onCanvasPointerUp(event) {
    if (!state.drag || state.drag.pointerId !== event.pointerId) return;
    state.drag = null;
    els.previewCanvas.classList.remove("is-dragging");
    els.previewCanvas.releasePointerCapture(event.pointerId);
  }

  function onCanvasKeyDown(event) {
    const step = event.shiftKey ? 24 : 12;
    if (event.key === "ArrowLeft") {
      state.project.visualizer.parameters.visualizerOffsetX = clamp(Number(state.project.visualizer.parameters.visualizerOffsetX || 0) - step, -state.project.layout.width, state.project.layout.width);
      drawPreview();
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      state.project.visualizer.parameters.visualizerOffsetX = clamp(Number(state.project.visualizer.parameters.visualizerOffsetX || 0) + step, -state.project.layout.width, state.project.layout.width);
      drawPreview();
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      state.project.visualizer.parameters.visualizerOffsetY = clamp(Number(state.project.visualizer.parameters.visualizerOffsetY || 0) - step, -state.project.layout.height, state.project.layout.height);
      drawPreview();
      event.preventDefault();
    } else if (event.key === "ArrowDown") {
      state.project.visualizer.parameters.visualizerOffsetY = clamp(Number(state.project.visualizer.parameters.visualizerOffsetY || 0) + step, -state.project.layout.height, state.project.layout.height);
      drawPreview();
      event.preventDefault();
    }
  }

  function saveProjectToFile() {
    const exportProject = {
      ...state.project,
      assets: {
        image: state.assets.image,
        audio: state.assets.audio,
        watermark: state.assets.watermark
      }
    };
    const blob = new Blob([JSON.stringify(exportProject, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${sanitizeOutputName(state.project.name || "banana-visualizer-project")}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setStatus("Project JSON exported");
  }

  async function loadProjectFromFile(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;
    const text = await file.text();
    const parsed = JSON.parse(text);
    const loadedProject = {
      ...defaultProject(),
      ...parsed,
      watermark: {
        ...defaultProject().watermark,
        ...(parsed.watermark || {})
      },
      projectId: crypto.randomUUID(),
      assets: {}
    };
    if (typeof loadedProject.watermark.position === "string") {
      const legacy = loadedProject.watermark.position;
      loadedProject.watermark.positionX = legacy.endsWith("right") ? 0.84 : 0.08;
      loadedProject.watermark.positionY = legacy.startsWith("bottom") ? 0.84 : 0.08;
    }
    if (!Number.isFinite(loadedProject.watermark.positionX)) loadedProject.watermark.positionX = 0.84;
    if (!Number.isFinite(loadedProject.watermark.positionY)) loadedProject.watermark.positionY = 0.84;
    delete loadedProject.watermark.position;
    state.project = loadedProject;
    state.assets.image = null;
    state.assets.audio = null;
    state.assets.watermark = null;
    revokeAsset("image");
    revokeAsset("audio");
    revokeAsset("watermark");
    els.audioElement.removeAttribute("src");
    els.audioElement.load();
    syncFormFromState();
    renderStaticState();
    drawPreview();
    setStatus("Project loaded. Reattach media files locally.");
  }

  function resetProject() {
    stopPreview();
    clearResult();
    revokeAsset("image");
    revokeAsset("audio");
    revokeAsset("watermark");
    els.audioElement.removeAttribute("src");
    els.audioElement.load();
    state.project = defaultProject();
    state.assets.image = null;
    state.assets.audio = null;
    state.assets.watermark = null;
    syncFormFromState();
    renderStaticState();
    drawPreview();
    setStatus("Project reset");
  }

  function updatePlaybackText() {
    const current = Number.isFinite(els.audioElement.currentTime) ? els.audioElement.currentTime : 0;
    const duration = state.project.timeline.mode === "audio_full_length" && Number.isFinite(els.audioElement.duration) ? els.audioElement.duration : state.project.timeline.durationSeconds;
    els.playbackText.textContent = `${formatTime(current)} / ${duration > 0 ? formatTime(duration) : "--:--"}`;
  }

  function sanitizeOutputName(value) {
    const next = String(value || "").trim().replace(/[<>:\"/\\\\|?*]+/g, "-");
    return next || "banana-visualizer-output.webm";
  }

  function pickMimeType() {
    const candidates = [
      "video/webm;codecs=vp9,opus",
      "video/webm;codecs=vp8,opus",
      "video/webm"
    ];
    return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) || "";
  }

  function readStoredWidth(key, fallback, min, max) {
    const parsed = Number(window.localStorage.getItem(key));
    if (!Number.isFinite(parsed)) return fallback;
    return clamp(parsed, min, max);
  }

  function roundEven(value) {
    return Math.max(2, Math.round(value / 2) * 2);
  }

  function lerp(start, end, value) {
    return start + (end - start) * value;
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const power = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
    const size = bytes / 1024 ** power;
    return `${size.toFixed(size >= 10 || power === 0 ? 0 : 1)} ${units[power]}`;
  }

  function formatTime(seconds) {
    const total = Math.max(0, Math.floor(seconds));
    const minutes = Math.floor(total / 60);
    const remainder = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
  }
})();
