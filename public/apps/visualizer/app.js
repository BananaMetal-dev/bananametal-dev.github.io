(() => {
  "use strict";

  const languageApi = window.BananaMetalLanguage;
  let currentLanguage = languageApi?.getLanguage?.() === "en" ? "en" : "ja";
  const LOCALIZED = {
    pageTitle: { ja: "Banana Visualizer | Banana Metal", en: "Banana Visualizer | Banana Metal" },
    brandNote: {
      ja: "Browser render Ready. 画像・音声・生成動画はサーバーへ送信しません。 / Images, audio, and generated videos are not sent to the server.",
      en: "Browser render Ready. Images, audio, and generated videos are not sent to the server.",
    },
    apps: { ja: "Apps", en: "Apps" },
    loadProject: { ja: "プロジェクト読込", en: "Load Project" },
    saveProject: { ja: "プロジェクト保存", en: "Save Project" },
    reset: { ja: "リセット", en: "Reset" },
    assets: { ja: "Assets", en: "Assets" },
    localOnly: { ja: "ローカル読み込みのみ", en: "Local files only" },
    stillImage: { ja: "静止画像", en: "Still Image" },
    audioTrack: { ja: "音声トラック", en: "Audio Track" },
    watermarkIcon: { ja: "ウォーターマーク", en: "Watermark Icon" },
    file: { ja: "ファイル", en: "File" },
    folder: { ja: "フォルダ", en: "Folder" },
    project: { ja: "Project", en: "Project" },
    silentDuration: { ja: "無音尺", en: "Silent Duration" },
    fullAudioLength: { ja: "音声フル尺", en: "Full Audio Length" },
    durationSeconds: { ja: "秒数", en: "Duration Seconds" },
    canvas: { ja: "Canvas", en: "Canvas" },
    imageSize: { ja: "画像サイズ", en: "Image Size" },
    aspectRatio: { ja: "アスペクト比", en: "Aspect Ratio" },
    frameRate: { ja: "フレームレート", en: "Frame Rate" },
    backgroundFit: { ja: "背景フィット", en: "Background Fit" },
    crop: { ja: "クロップ", en: "Crop" },
    letterbox: { ja: "レターボックス", en: "Letterbox" },
    backgroundZoom: { ja: "背景ズーム", en: "Background Zoom" },
    preview: { ja: "Preview", en: "Preview" },
    playPreview: { ja: "プレビュー再生", en: "Play Preview" },
    audioVolume: { ja: "音量", en: "Volume" },
    muteAudio: { ja: "ミュート", en: "Mute" },
    unmuteAudio: { ja: "ミュート解除", en: "Unmute" },
    render: { ja: "Render", en: "Render" },
    browserOnly: { ja: "Browser only", en: "Browser only" },
    visualizer: { ja: "Visualizer", en: "Visualizer" },
    dragHint: { ja: "プレビュー上でドラッグして移動", en: "Drag on the preview to move it." },
    response: { ja: "Response", en: "Response" },
    color: { ja: "Color", en: "Color" },
    barCount: { ja: "バー本数", en: "Bar Count" },
    size: { ja: "サイズ", en: "Size" },
    watermark: { ja: "Watermark", en: "Watermark" },
    opacity: { ja: "透明度", en: "Opacity" },
    watermarkDragHint: { ja: "プレビュー上でドラッグして位置を変更", en: "Drag on the preview to move it." },
    export: { ja: "Export", en: "Export" },
    startRender: { ja: "webM書き出し", en: "Render WebM" },
    stop: { ja: "停止", en: "Stop" },
    mp4Convert: { ja: "MP4に変換", en: "Convert to MP4" },
    mp4Download: { ja: "MP4をダウンロード", en: "Download MP4" },
    download: { ja: "ダウンロード", en: "Download" },
    outputName: { ja: "出力名", en: "Output Name" },
    outputSpeed: { ja: "処理速度の目安", en: "Processing Speed Hint" },
    speedWarning: { ja: "処理速度は保証できません。PC性能によって変動します。出力動画は通常速度です。", en: "Processing speed is not guaranteed and varies by PC performance. The output video remains at normal speed." },
    ready: { ja: "Ready", en: "Ready" },
    noOutput: { ja: "No output yet", en: "No output yet" },
    loaded: { ja: "読み込み済み", en: "Loaded" },
    notLoaded: { ja: "未読込み", en: "Not loaded" },
    mp4Converting: { ja: "MP4へ変換中", en: "Converting to MP4" },
    mp4Completed: { ja: "MP4変換が完了しました", en: "MP4 conversion completed" },
    mp4Unavailable: { ja: "このブラウザではMP4変換を利用できません。", en: "MP4 conversion is not available in this browser." },
    mp4Failed: { ja: "MP4変換に失敗しました。WebMは利用できます。", en: "MP4 conversion failed. The WebM output is still available." },
    supportedFileMissing: { ja: "{source}: 対応する{kind}ファイルが見つかりません", en: "{source}: supported {kind} file not found" },
    importing: { ja: "{name} を読み込み中", en: "Importing {name}" },
    imageImported: { ja: "静止画像を読み込みました", en: "Still image imported" },
    audioImported: { ja: "音声トラックを読み込みました", en: "Audio track imported" },
    watermarkImported: { ja: "ウォーターマークを読み込みました", en: "Watermark icon imported" },
    imageRequired: { ja: "静止画像は必須です。", en: "Still image is required." },
    mediaRecorderUnavailable: { ja: "このブラウザでは MediaRecorder を利用できません。", en: "MediaRecorder is not available in this browser." },
    canvasCaptureUnavailable: { ja: "このブラウザではキャンバス録画を利用できません。", en: "Canvas capture is not available in this browser." },
    webCodecsFallback: { ja: "高速書き出しを利用できないため、通常方式へ切り替えます。", en: "Fast rendering is unavailable. Falling back to standard recording." },
    renderStopping: { ja: "書き出しを停止しています", en: "Stopping render" },
    renderCanceled: { ja: "書き出しをキャンセルしました", en: "Render canceled" },
    rendering: { ja: "Rendering", en: "Rendering" },
    renderProgress: { ja: "書き出し進捗 {percent}%", en: "Render progress {percent}%" },
    renderingMeta: { ja: "Browser rendering in progress", en: "Rendering in browser" },
    renderCompleted: { ja: "書き出しが完了しました", en: "Render completed" },
    projectExported: { ja: "プロジェクトJSONを書き出しました", en: "Project JSON exported" },
    projectLoaded: { ja: "プロジェクトを読み込みました。メディアファイルをローカルで再接続してください。", en: "Project loaded. Reattach media files locally." },
    projectReset: { ja: "プロジェクトを初期化しました", en: "Project reset" },
    large: { ja: "大", en: "Large" },
    medium: { ja: "中", en: "Medium" },
    small: { ja: "小", en: "Small" },
    image: { ja: "画像", en: "image" },
    audio: { ja: "音声", en: "audio" },
    watermarkKind: { ja: "ウォーターマーク", en: "watermark" },
  };

  function t(key, tokens = {}) {
    const template = LOCALIZED[key]?.[currentLanguage] ?? LOCALIZED[key]?.ja ?? key;
    return template.replace(/\{(\w+)\}/g, (_, token) => String(tokens[token] ?? ""));
  }

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
        label: { ja: "下部固定・縦バー", en: "Bottom Fixed Vertical Bars" },
        defaults: { barCount: 120, topLine: true }
      },
      {
        id: "line_spectrum",
        kind: "visualizer_shape",
        label: { ja: "折れ線スペクトラム", en: "Line Spectrum" },
        defaults: { barCount: 120, topLine: true }
      },
      {
        id: "radial_bars",
        kind: "visualizer_shape",
        label: { ja: "放射状バー", en: "Radial Bars" },
        defaults: { barCount: 128, topLine: false }
      },
      {
        id: "filled_spectrum",
        kind: "visualizer_shape",
        label: { ja: "塗りスペクトラム", en: "Filled Spectrum" },
        defaults: { barCount: 120, topLine: false }
      },
      {
        id: "led_bars",
        kind: "visualizer_shape",
        label: { ja: "LEDバー", en: "LED Bars" },
        defaults: { barCount: 96, topLine: false }
      },
      {
        id: "ring_waveform",
        kind: "visualizer_shape",
        label: { ja: "リング波形", en: "Ring Waveform" },
        defaults: { barCount: 160, topLine: false }
      },
      {
        id: "low_end_emphasis",
        kind: "response_profile",
        label: { ja: "低域強調", en: "Low-End Emphasis" },
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
        label: { ja: "白＋アイスブルー", en: "White + Ice Blue" },
        defaults: { base: "#FFFFFF", accent: "#DDF6FF", peak: "#FFFFFF" }
      },
      {
        id: "monochrome",
        kind: "color",
        label: { ja: "モノクロ・無彩色", en: "Monochrome" },
        defaults: { base: "#BFC4C8", accent: "#F6F8F9", peak: "#FFFFFF" }
      }
    ]
  };

  const WORKSPACE_WIDTH_STORAGE_KEY = "banana-visualizer.workspace-widths";
  const AUDIO_SETTINGS_STORAGE_KEY = "banana-visualizer.audio-settings";
  const MIN_LEFT_PANEL_WIDTH = 260;
  const MAX_LEFT_PANEL_WIDTH = 520;
  const MIN_RIGHT_PANEL_WIDTH = 280;
  const MAX_RIGHT_PANEL_WIDTH = 520;
  const MIN_CENTER_WIDTH = 420;

  const els = {
    workspace: document.getElementById("workspace"),
    languageJaButton: document.getElementById("languageJaButton"),
    languageEnButton: document.getElementById("languageEnButton"),
    brandNote: document.getElementById("brandNote"),
    appsLink: document.getElementById("appsLink"),
    assetsHeading: document.getElementById("assetsHeading"),
    assetsHeadingNote: document.getElementById("assetsHeadingNote"),
    imageAssetLabel: document.getElementById("imageAssetLabel"),
    audioAssetLabel: document.getElementById("audioAssetLabel"),
    watermarkAssetLabel: document.getElementById("watermarkAssetLabel"),
    projectSummary: document.getElementById("projectSummary"),
    canvasSummary: document.getElementById("canvasSummary"),
    durationLabel: document.getElementById("durationLabel"),
    imageSizeLabel: document.getElementById("imageSizeLabel"),
    aspectRatioLabel: document.getElementById("aspectRatioLabel"),
    frameRateLabel: document.getElementById("frameRateLabel"),
    backgroundFitLabel: document.getElementById("backgroundFitLabel"),
    backgroundZoomLabel: document.getElementById("backgroundZoomLabel"),
    previewLabel: document.getElementById("previewLabel"),
    audioMuteButton: document.getElementById("audioMuteButton"),
    audioVolumeLabel: document.getElementById("audioVolumeLabel"),
    audioVolumeInput: document.getElementById("audioVolumeInput"),
    audioVolumeValue: document.getElementById("audioVolumeValue"),
    renderProgressOverlay: document.getElementById("renderProgressOverlay"),
    renderProgressPercent: document.getElementById("renderProgressPercent"),
    renderHeading: document.getElementById("renderHeading"),
    renderHeadingNote: document.getElementById("renderHeadingNote"),
    visualizerSummary: document.getElementById("visualizerSummary"),
    visualizerHint: document.getElementById("visualizerHint"),
    visualizerShapeLabel: document.getElementById("visualizerShapeLabel"),
    responseLabel: document.getElementById("responseLabel"),
    colorLabel: document.getElementById("colorLabel"),
    barCountLabel: document.getElementById("barCountLabel"),
    visualizerSizeLabel: document.getElementById("visualizerSizeLabel"),
    watermarkSummary: document.getElementById("watermarkSummary"),
    watermarkHint: document.getElementById("watermarkHint"),
    watermarkToggleLabel: document.getElementById("watermarkToggleLabel"),
    watermarkSizeLabel: document.getElementById("watermarkSizeLabel"),
    watermarkOpacityLabel: document.getElementById("watermarkOpacityLabel"),
    watermarkDragHint: document.getElementById("watermarkDragHint"),
    exportSummary: document.getElementById("exportSummary"),
    outputNameLabel: document.getElementById("outputNameLabel"),
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
    mp4DownloadLink: document.getElementById("mp4DownloadLink"),
    statusText: document.getElementById("statusText"),
    resultMeta: document.getElementById("resultMeta"),
    mp4ResultMeta: document.getElementById("mp4ResultMeta"),
    speedLabel: document.getElementById("speedLabel"),
    speedSelect: document.getElementById("speedSelect"),
    speedWarning: document.getElementById("speedWarning"),
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
      output: "",
      mp4Output: ""
    },
    media: {
      image: null,
      audio: null,
      watermark: null
    },
    audioGraph: {
      context: null,
      analyser: null,
      source: null,
      outputGain: null,
      destination: null
    },
    audioSettings: readStoredAudioSettings(),
    animationFrame: 0,
    renderFrame: 0,
    isPreviewing: false,
    isRendering: false,
    renderCanvas: null,
    renderMode: "",
    renderCancelRequested: false,
    renderAudioAnalysis: null,
    renderStartedAt: 0,
    renderDuration: 0,
    renderElapsed: 0,
    outputDuration: 0,
    renderStopTimer: 0,
    recorder: null,
    recordedChunks: [],
    status: t("ready"),
    resultMeta: t("noOutput")
  };

  init();

  function init() {
    bindLanguageToggle();
    buildPresetButtons();
    buildCatalogSelects();
    bindTopbar();
    bindAssets();
    bindProjectMenu();
    bindInspector();
    bindPreview();
    bindAudioControls();
    bindWorkspaceResize();
    els.audioElement.addEventListener("ended", handleAudioEnded);
    window.addEventListener("resize", drawPreview);
    applyWorkspaceWidths();
    syncFormFromState();
    applyStaticTexts();
    applyAudioSettings();
    renderStaticState();
    drawPreview();
  }

  function bindLanguageToggle() {
    els.languageJaButton.addEventListener("click", () => setLanguage("ja"));
    els.languageEnButton.addEventListener("click", () => setLanguage("en"));
    languageApi?.subscribe?.((language) => {
      currentLanguage = language === "en" ? "en" : "ja";
      applyStaticTexts();
      buildCatalogSelects();
      syncFormFromState();
      updateAssetStates();
      drawPreview();
    });
    setLanguage(currentLanguage);
  }

  function setLanguage(language) {
    currentLanguage = language === "en" ? "en" : "ja";
    languageApi?.setLanguage?.(currentLanguage);
    applyStaticTexts();
  }

  function entryLabel(entry) {
    if (typeof entry.label === "string") return entry.label;
    return entry.label[currentLanguage] || entry.label.ja;
  }

  function applyStaticTexts() {
    document.title = t("pageTitle");
    els.brandNote.textContent = t("brandNote");
    els.appsLink.textContent = t("apps");
    els.loadProjectButton.textContent = t("loadProject");
    els.saveProjectButton.textContent = t("saveProject");
    els.resetProjectButton.textContent = t("reset");
    els.assetsHeading.textContent = t("assets");
    els.assetsHeadingNote.textContent = t("localOnly");
    els.imageAssetLabel.textContent = t("stillImage");
    els.audioAssetLabel.textContent = t("audioTrack");
    els.watermarkAssetLabel.textContent = t("watermarkIcon");
    els.imageFileButton.textContent = t("file");
    els.imageFolderButton.textContent = t("folder");
    els.audioFileButton.textContent = t("file");
    els.audioFolderButton.textContent = t("folder");
    els.watermarkFileButton.textContent = t("file");
    els.watermarkFolderButton.textContent = t("folder");
    els.projectSummary.textContent = t("project");
    els.timelineSilentButton.textContent = t("silentDuration");
    els.timelineAudioButton.textContent = t("fullAudioLength");
    els.durationLabel.textContent = t("durationSeconds");
    els.canvasSummary.textContent = t("canvas");
    els.imageSizeLabel.textContent = t("imageSize");
    els.aspectRatioLabel.textContent = t("aspectRatio");
    els.frameRateLabel.textContent = t("frameRate");
    els.backgroundFitLabel.textContent = t("backgroundFit");
    els.fitCropButton.textContent = t("crop");
    els.fitLetterboxButton.textContent = t("letterbox");
    els.backgroundZoomLabel.textContent = t("backgroundZoom");
    els.previewLabel.textContent = t("preview");
    els.playButton.textContent = t("playPreview");
    els.audioVolumeLabel.textContent = t("audioVolume");
    syncAudioControls();
    els.renderHeading.textContent = t("render");
    els.renderHeadingNote.textContent = t("browserOnly");
    els.visualizerSummary.textContent = t("visualizer");
    els.visualizerHint.textContent = t("dragHint");
    els.visualizerShapeLabel.textContent = t("visualizer");
    els.responseLabel.textContent = t("response");
    els.colorLabel.textContent = t("color");
    els.barCountLabel.textContent = t("barCount");
    els.visualizerSizeLabel.textContent = t("size");
    els.watermarkSummary.textContent = t("watermark");
    els.watermarkHint.textContent = t("dragHint");
    els.watermarkToggleLabel.textContent = t("watermark");
    els.watermarkSizeLabel.textContent = t("size");
    els.watermarkOpacityLabel.textContent = t("opacity");
    els.watermarkDragHint.textContent = t("watermarkDragHint");
    els.exportSummary.textContent = t("export");
    els.renderButton.textContent = t("startRender");
    els.stopButton.textContent = t("stop");
    els.mp4Button.textContent = t("mp4Convert");
    els.downloadLink.textContent = t("download");
    els.mp4DownloadLink.textContent = t("mp4Download");
    setWebmDownloadState(Boolean(state.urls.output));
    setMp4DownloadState(Boolean(state.urls.mp4Output));
    els.outputNameLabel.textContent = t("outputName");
    els.speedLabel.textContent = t("outputSpeed");
    els.speedWarning.textContent = t("speedWarning");
    els.languageJaButton.classList.toggle("is-active", currentLanguage === "ja");
    els.languageEnButton.classList.toggle("is-active", currentLanguage === "en");
    Array.from(els.watermarkSizeSelect.options).forEach((option) => {
      option.textContent = t(option.value);
    });
    if (!state.status || state.status === "Ready" || state.status === LOCALIZED.ready.ja) {
      state.status = t("ready");
    }
    if (!state.resultMeta || state.resultMeta === "No output yet" || state.resultMeta === LOCALIZED.noOutput.ja) {
      state.resultMeta = t("noOutput");
    }
    renderStaticState();
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
        outputName: "banana-visualizer-output.webm",
        speed: 1
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
    const selectedValue = select.value;
    select.innerHTML = "";
    entries.forEach((entry) => {
      const option = document.createElement("option");
      option.value = entry.id;
      option.textContent = entryLabel(entry);
      select.appendChild(option);
    });
    if (selectedValue) select.value = selectedValue;
  }

  function bindTopbar() {
    els.loadProjectButton.addEventListener("click", () => els.projectFileInput.click());
    els.projectFileInput.addEventListener("change", loadProjectFromFile);
    els.saveProjectButton.addEventListener("click", saveProjectToFile);
    els.resetProjectButton.addEventListener("click", resetProject);
    els.renderButton.addEventListener("click", renderProject);
    els.stopButton.addEventListener("click", stopRender);
    els.mp4Button.addEventListener("click", convertToMp4);
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
    els.speedSelect.addEventListener("change", () => {
      state.project.export.speed = speedFromValue(els.speedSelect.value);
      syncFormFromState();
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

  function bindAudioControls() {
    els.audioMuteButton.addEventListener("click", toggleAudioMute);
    els.audioVolumeInput.addEventListener("input", () => {
      state.audioSettings.volume = clamp(Number(els.audioVolumeInput.value) / 100, 0, 1);
      applyAudioSettings();
      persistAudioSettings();
    });
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
      const kindLabel = kind === "image" ? t("image") : kind === "audio" ? t("audio") : t("watermarkKind");
      setStatus(t("supportedFileMissing", { source, kind: kindLabel }));
      return;
    }
    await importAsset(kind, file);
  }

  async function importAsset(kind, file) {
    setStatus(t("importing", { name: file.name }));
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
      state.media.audio = file;
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
      setStatus(t("audioImported"));
    } else if (kind === "watermark") {
      setStatus(t("watermarkImported"));
    } else {
      setStatus(t("imageImported"));
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
    if (kind === "audio") state.media.audio = null;
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
    state.project.export = {
      ...defaultProject().export,
      ...(state.project.export || {})
    };
    state.project.export.speed = selectedRenderSpeed();
    els.speedSelect.value = String(state.project.export.speed);
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
    const rawName = state.project.export.outputName || "banana-visualizer-output";
    const baseName = rawName.replace(/\.(?:webm|mp4)$/i, "");
    els.downloadLink.download = `${baseName}.webm`;
    els.mp4DownloadLink.download = `${baseName}.mp4`;
  }

  function setMp4DownloadState(active) {
    const isActive = Boolean(active && state.urls.mp4Output);
    els.mp4DownloadLink.classList.toggle("is-passive", !isActive);
    els.mp4DownloadLink.classList.toggle("primary", isActive);
    if (isActive) {
      els.mp4DownloadLink.href = state.urls.mp4Output;
      els.mp4DownloadLink.removeAttribute("aria-disabled");
      els.mp4DownloadLink.removeAttribute("tabindex");
      return;
    }
    els.mp4DownloadLink.removeAttribute("href");
    els.mp4DownloadLink.setAttribute("aria-disabled", "true");
    els.mp4DownloadLink.setAttribute("tabindex", "-1");
  }

  function setWebmDownloadState(active) {
    const isActive = Boolean(active && state.urls.output);
    els.downloadLink.classList.toggle("is-passive", !isActive);
    els.downloadLink.classList.toggle("primary", isActive);
    if (isActive) {
      els.downloadLink.href = state.urls.output;
      els.downloadLink.removeAttribute("aria-disabled");
      els.downloadLink.removeAttribute("tabindex");
      return;
    }
    els.downloadLink.removeAttribute("href");
    els.downloadLink.setAttribute("aria-disabled", "true");
    els.downloadLink.setAttribute("tabindex", "-1");
  }

  function updateAssetStates() {
    const imageLoaded = Boolean(state.assets.image);
    const audioLoaded = Boolean(state.assets.audio);
    const watermarkLoaded = Boolean(state.assets.watermark);
    els.imageAssetState.textContent = imageLoaded ? t("loaded") : t("notLoaded");
    els.audioAssetState.textContent = audioLoaded ? t("loaded") : t("notLoaded");
    els.watermarkAssetState.textContent = watermarkLoaded ? t("loaded") : t("notLoaded");
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
    els.playButton.textContent = t("stop");
    startAnimation();
  }

  function stopPreview() {
    state.isPreviewing = false;
    els.playButton.textContent = t("playPreview");
    els.audioElement.pause();
    stopAnimation();
    drawPreview();
    updatePlaybackText();
  }

  function toggleAudioMute() {
    state.audioSettings.muted = !state.audioSettings.muted;
    applyAudioSettings();
    persistAudioSettings();
  }

  function applyAudioSettings() {
    const { volume, muted } = state.audioSettings;
    els.audioElement.volume = volume;
    els.audioElement.muted = muted;
    if (state.audioGraph.outputGain) {
      state.audioGraph.outputGain.gain.value = muted ? 0 : volume;
    }
    syncAudioControls();
  }

  function syncAudioControls() {
    if (!els.audioVolumeInput || !els.audioMuteButton) return;
    const percent = Math.round(state.audioSettings.volume * 100);
    els.audioVolumeInput.value = String(percent);
    els.audioVolumeValue.textContent = `${percent}%`;
    els.audioMuteButton.textContent = state.audioSettings.muted ? t("unmuteAudio") : t("muteAudio");
    els.audioMuteButton.setAttribute("aria-pressed", String(state.audioSettings.muted));
    els.audioMuteButton.setAttribute(
      "aria-label",
      state.audioSettings.muted ? t("unmuteAudio") : t("muteAudio")
    );
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
      state.audioGraph.outputGain = state.audioGraph.context.createGain();
      state.audioGraph.destination = state.audioGraph.context.createMediaStreamDestination();
      state.audioGraph.source = state.audioGraph.context.createMediaElementSource(els.audioElement);
      state.audioGraph.source.connect(state.audioGraph.analyser);
      state.audioGraph.analyser.connect(state.audioGraph.outputGain);
      state.audioGraph.outputGain.connect(state.audioGraph.context.destination);
      state.audioGraph.analyser.connect(state.audioGraph.destination);
      applyAudioSettings();
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
      if (state.isPreviewing) {
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

  function selectedRenderSpeed() {
    return speedFromValue(state.project?.export?.speed);
  }

  function speedFromValue(value) {
    return Number(value) === 2 ? 2 : 1;
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
      setStatus(t("imageRequired"));
      return;
    }
    const speed = selectedRenderSpeed();

    if (canUseWebCodecs()) {
      try {
        await renderProjectWithWebCodecs();
        return;
      } catch (error) {
        if (state.renderCancelRequested || error?.name === "AbortError") {
          cancelFastRender();
          return;
        }
        resetRenderUi();
        setStatus(t("webCodecsFallback"));
      }
    }

    await renderProjectWithMediaRecorder();
  }

  function canUseWebCodecs() {
    return Boolean(window.BananaMetalWebCodecsRenderer?.isSupported?.("webm", Boolean(state.assets.audio)));
  }

  function canUseMp4() {
    return Boolean(window.BananaMetalWebCodecsRenderer?.isSupported?.("mp4", Boolean(state.assets.audio)));
  }

  async function renderProjectWithWebCodecs() {
    if (state.assets.audio) {
      await ensureAudioGraph();
    }

    clearResult();
    els.previewCanvas.width = state.project.layout.width;
    els.previewCanvas.height = state.project.layout.height;
    state.renderCanvas = document.createElement("canvas");
    state.renderCanvas.width = state.project.layout.width;
    state.renderCanvas.height = state.project.layout.height;
    const sourceDuration = safeDuration();
    const speed = selectedRenderSpeed();
    state.renderDuration = sourceDuration;
    beginRenderUi("webcodecs");

    const result = await window.BananaMetalWebCodecsRenderer.render({
      canvas: state.renderCanvas,
      width: state.project.layout.width,
      height: state.project.layout.height,
      fps: state.project.layout.fps,
      duration: sourceDuration,
      speed,
      audioFile: state.media.audio,
      audioContext: state.audioGraph.context,
      drawFrame: (canvas, renderTime, audioBuffer) => drawCanvas(canvas, renderTime, audioBuffer),
      onProgress: ({ ratio }) => updateRenderProgress(ratio),
      shouldCancel: () => state.renderCancelRequested
    });

    if (state.renderCancelRequested) {
      throw createRenderAbortError();
    }
    completeRender(result.blob, result.duration);
  }

  async function convertToMp4() {
    if (state.isRendering || !state.urls.output) return;
    if (!canUseMp4()) {
      setStatus(t("mp4Unavailable"));
      return;
    }

    try {
      if (state.assets.audio) {
        await ensureAudioGraph();
      }

      if (state.urls.mp4Output) {
        URL.revokeObjectURL(state.urls.mp4Output);
        state.urls.mp4Output = "";
      }
      setMp4DownloadState(false);
      state.renderCanvas = document.createElement("canvas");
      state.renderCanvas.width = state.project.layout.width;
      state.renderCanvas.height = state.project.layout.height;
      const sourceDuration = safeDuration();
      const speed = selectedRenderSpeed();
      state.renderDuration = sourceDuration;
      beginMp4ConversionUi();

      const result = await window.BananaMetalWebCodecsRenderer.render({
        format: "mp4",
        canvas: state.renderCanvas,
        width: state.project.layout.width,
        height: state.project.layout.height,
        fps: state.project.layout.fps,
        duration: sourceDuration,
        speed,
        audioFile: state.media.audio,
        audioContext: state.audioGraph.context,
        drawFrame: (canvas, renderTime, audioBuffer) => drawCanvas(canvas, renderTime, audioBuffer),
        onProgress: ({ ratio }) => updateRenderProgress(ratio),
        shouldCancel: () => state.renderCancelRequested
      });

      if (state.renderCancelRequested) {
        throw createRenderAbortError();
      }
      completeMp4Render(result.blob, result.duration);
    } catch (error) {
      if (state.renderCancelRequested || error?.name === "AbortError") {
        cancelFastRender();
        return;
      }
      resetRenderUi();
      setStatus(t("mp4Failed"));
    }
  }

  async function renderProjectWithMediaRecorder() {
    if (state.isRendering) return;
    if (!state.assets.image) {
      setStatus(t("imageRequired"));
      return;
    }
    if (!window.MediaRecorder) {
      setStatus(t("mediaRecorderUnavailable"));
      return;
    }
    if (typeof HTMLCanvasElement === "undefined" || !HTMLCanvasElement.prototype.captureStream) {
      setStatus(t("canvasCaptureUnavailable"));
      return;
    }

    if (state.assets.audio) {
      await ensureAudioGraph();
    }

    clearResult();
    els.previewCanvas.width = state.project.layout.width;
    els.previewCanvas.height = state.project.layout.height;

    state.renderCanvas = document.createElement("canvas");
    state.renderCanvas.width = state.project.layout.width;
    state.renderCanvas.height = state.project.layout.height;
    drawCanvas(state.renderCanvas);

    const stream = state.renderCanvas.captureStream(state.project.layout.fps);
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

    state.renderDuration = safeDuration();
    beginRenderUi("mediarecorder");

    if (state.assets.audio) {
      els.audioElement.currentTime = 0;
      await els.audioElement.play();
    }

    state.recorder.start(250);
    startBackgroundRender();

    window.clearTimeout(state.renderStopTimer);
    state.renderStopTimer = window.setTimeout(() => stopRender(), state.renderDuration * 1000 + 60);
  }

  function beginRenderUi(mode) {
    stopAnimation();
    state.isRendering = true;
    state.isPreviewing = false;
    state.renderMode = mode;
    state.renderCancelRequested = false;
    state.renderElapsed = 0;
    state.renderStartedAt = performance.now();
    els.renderButton.disabled = true;
    els.stopButton.disabled = false;
    els.stopButton.hidden = false;
    els.mp4Button.hidden = true;
    els.mp4Button.disabled = true;
    els.resultVideo.hidden = true;
    els.playButton.textContent = t("stop");
    els.playButton.disabled = true;
    beginRenderPresentation();
    updateRenderProgress(0);
  }

  function beginMp4ConversionUi() {
    stopAnimation();
    state.isRendering = true;
    state.isPreviewing = false;
    state.renderMode = "mp4";
    state.renderCancelRequested = false;
    state.renderElapsed = 0;
    state.renderStartedAt = performance.now();
    els.renderButton.disabled = true;
    els.mp4Button.disabled = true;
    els.stopButton.disabled = false;
    els.stopButton.hidden = false;
    els.playButton.textContent = t("stop");
    els.playButton.disabled = true;
    beginRenderPresentation();
    updateRenderProgress(0);
  }

  function resetRenderUi() {
    window.clearTimeout(state.renderStopTimer);
    stopBackgroundRender();
    stopAnimation();
    state.isRendering = false;
    state.isPreviewing = false;
    state.renderMode = "";
    state.renderCancelRequested = false;
    state.renderCanvas = null;
    state.renderAudioAnalysis = null;
    els.renderButton.disabled = false;
    els.stopButton.disabled = true;
    els.stopButton.hidden = true;
    els.mp4Button.hidden = !state.urls.output;
    els.mp4Button.disabled = Boolean(state.urls.output) ? !canUseMp4() : true;
    endRenderPresentation();
    els.playButton.disabled = false;
    els.playButton.textContent = t("playPreview");
  }

  function cancelFastRender() {
    resetRenderUi();
    setStatus(t("renderCanceled"));
    updatePlaybackText();
  }

  function createRenderAbortError() {
    const error = new Error("Render canceled.");
    error.name = "AbortError";
    return error;
  }

  function startBackgroundRender() {
    stopBackgroundRender();
    const tick = () => {
      if (!state.isRendering || !state.renderCanvas) return;
      state.renderElapsed = Math.min(
        state.renderDuration,
        Math.max(0, (performance.now() - state.renderStartedAt) / 1000)
      );
      drawCanvas(state.renderCanvas);
      updateRenderProgress(state.renderDuration > 0 ? state.renderElapsed / state.renderDuration : 0);
      if (state.renderElapsed >= state.renderDuration) {
        stopRender();
        return;
      }
      state.renderFrame = window.requestAnimationFrame(tick);
    };
    state.renderFrame = window.requestAnimationFrame(tick);
  }

  function beginRenderPresentation() {
    els.previewCanvas.hidden = true;
    els.previewCanvas.setAttribute("aria-hidden", "true");
    els.renderProgressOverlay.hidden = false;
    els.audioMuteButton.disabled = true;
    els.audioVolumeInput.disabled = true;
    els.audioElement.muted = true;
    if (state.audioGraph.outputGain) {
      state.audioGraph.outputGain.gain.value = 0;
    }
  }

  function endRenderPresentation() {
    els.previewCanvas.hidden = false;
    els.previewCanvas.removeAttribute("aria-hidden");
    els.renderProgressOverlay.hidden = true;
    els.audioMuteButton.disabled = false;
    els.audioVolumeInput.disabled = false;
    applyAudioSettings();
    drawPreview();
  }

  function stopBackgroundRender() {
    if (state.renderFrame) {
      window.cancelAnimationFrame(state.renderFrame);
      state.renderFrame = 0;
    }
  }

  function updateRenderProgress(ratio) {
    const percent = Math.round(clamp(ratio, 0, 1) * 100);
    const progressText = state.renderMode === "mp4"
      ? `${t("mp4Converting")} ${percent}%`
      : t("renderProgress", { percent });
    setStatus(progressText);
    els.renderProgressPercent.textContent = `${percent}%`;
    state.resultMeta = state.renderMode === "mp4"
      ? `${t("mp4Converting")} / ${percent}%`
      : `${t("renderingMeta")} / ${percent}%`;
    els.resultMeta.textContent = state.resultMeta;
  }

  function stopRender() {
    if (!state.isRendering) return;
    if (state.renderMode === "webcodecs" || state.renderMode === "mp4") {
      state.renderCancelRequested = true;
      setStatus(t("renderStopping"));
      return;
    }
    window.clearTimeout(state.renderStopTimer);
    stopBackgroundRender();
    state.renderElapsed = Math.min(
      state.renderDuration,
      Math.max(0, (performance.now() - state.renderStartedAt) / 1000)
    );
    els.audioElement.pause();
    if (state.recorder && state.recorder.state !== "inactive") {
      state.recorder.stop();
    } else {
      finalizeRender();
    }
  }

  function finalizeRender() {
    const blob = new Blob(state.recordedChunks, { type: pickMimeType() || "video/webm" });
    const renderedDuration = state.renderElapsed || state.renderDuration || safeDuration();
    completeRender(blob, renderedDuration);
  }

  function completeRender(blob, renderedDuration) {
    if (state.urls.output) {
      URL.revokeObjectURL(state.urls.output);
      state.urls.output = "";
    }

    state.urls.output = URL.createObjectURL(blob);
    state.outputDuration = renderedDuration;
    resetRenderUi();
    state.resultMeta = `${formatBytes(blob.size)} / ${renderedDuration.toFixed(1)} sec`;
    els.resultMeta.textContent = state.resultMeta;
    els.resultVideo.hidden = false;
    els.resultVideo.src = state.urls.output;
    els.mp4Button.hidden = false;
    els.mp4Button.disabled = !canUseMp4();
    setWebmDownloadState(true);
    setMp4DownloadState(false);
    els.mp4ResultMeta.hidden = true;
    setStatus(t("renderCompleted"));
    updatePlaybackText();
  }

  function completeMp4Render(blob, renderedDuration) {
    state.urls.mp4Output = URL.createObjectURL(blob);
    resetRenderUi();
    setMp4DownloadState(true);
    els.mp4ResultMeta.hidden = false;
    els.mp4ResultMeta.textContent = `MP4: ${formatBytes(blob.size)} / ${renderedDuration.toFixed(1)} sec`;
    setStatus(t("mp4Completed"));
    updatePlaybackText();
  }

  function clearResult() {
    els.resultVideo.hidden = true;
    els.resultVideo.removeAttribute("src");
    els.resultVideo.load();
    setWebmDownloadState(false);
    setMp4DownloadState(false);
    els.mp4Button.hidden = true;
    els.stopButton.hidden = true;
    if (state.urls.output) {
      URL.revokeObjectURL(state.urls.output);
      state.urls.output = "";
    }
    if (state.urls.mp4Output) {
      URL.revokeObjectURL(state.urls.mp4Output);
      state.urls.mp4Output = "";
    }
    state.resultMeta = t("noOutput");
    els.resultMeta.textContent = state.resultMeta;
    state.renderDuration = 0;
    state.renderElapsed = 0;
    state.outputDuration = 0;
    state.renderAudioAnalysis = null;
    els.mp4ResultMeta.hidden = true;
    els.mp4ResultMeta.textContent = "";
  }

  function setStatus(message) {
    state.status = message;
    els.statusText.textContent = message;
  }

  function drawPreview() {
    drawCanvas(els.previewCanvas);
  }

  function drawCanvas(canvas, renderTime = null, renderAudioBuffer = null) {
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
      ctx.fillText(t("stillImage"), width / 2, height / 2);
    }

    const color = getEntry(state.project.visualizer.colorId)?.defaults || {};
    const base = typeof color.base === "string" ? color.base : "#ffffff";
    const accent = typeof color.accent === "string" ? color.accent : "#ddf6ff";
    const peak = typeof color.peak === "string" ? color.peak : "#ffffff";
    const values = readVisualizerValues(renderTime, renderAudioBuffer);
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

  function readVisualizerValues(renderTime = null, renderAudioBuffer = null) {
    const count = Math.min(160, Math.max(24, Number(state.project.visualizer.parameters.barCount || 96)));
    if (renderAudioBuffer && Number.isFinite(renderTime)) {
      return readAudioBufferValues(renderAudioBuffer, renderTime, count);
    }

    const phaseTime = Number.isFinite(renderTime) ? renderTime * 1000 : performance.now();
    let values = Array.from({ length: count }, (_, index) => {
      const t = phaseTime / 620;
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

  function readAudioBufferValues(audioBuffer, timeSeconds, count) {
    const fftSize = 1024;
    const sampleRate = audioBuffer.sampleRate;
    if (!state.renderAudioAnalysis || state.renderAudioAnalysis.buffer !== audioBuffer) {
      state.renderAudioAnalysis = {
        buffer: audioBuffer,
        sampleRate,
        fftSize,
        channels: Array.from(
          { length: Math.min(2, audioBuffer.numberOfChannels) },
          (_, index) => audioBuffer.getChannelData(index)
        ),
        edges: buildLogBandEdges(fftSize / 2, count, sampleRate)
      };
    }

    const analysis = state.renderAudioAnalysis;
    if (analysis.edges.length !== count + 1) {
      analysis.edges = buildLogBandEdges(fftSize / 2, count, sampleRate);
    }

    const real = new Float32Array(fftSize);
    const imaginary = new Float32Array(fftSize);
    const center = Math.floor(Math.max(0, timeSeconds) * sampleRate);
    const start = center - Math.floor(fftSize / 2);
    for (let index = 0; index < fftSize; index += 1) {
      const sourceIndex = start + index;
      let sample = 0;
      if (sourceIndex >= 0 && sourceIndex < audioBuffer.length) {
        for (const channel of analysis.channels) sample += channel[sourceIndex] || 0;
        sample /= Math.max(1, analysis.channels.length);
      }
      const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (fftSize - 1));
      real[index] = sample * window;
    }

    fftInPlace(real, imaginary);
    const response = getEntry(state.project.visualizer.responseProfileId)?.defaults || {};
    const lowGain = Number(response.lowGain || 1.2);
    const midGain = Number(response.midGain || 1);
    const highGain = Number(response.highGain || 0.8);
    const normalization = fftSize / 2;
    const values = Array.from({ length: count }, (_, index) => {
      const startBin = analysis.edges[index];
      const endBin = Math.max(startBin + 1, analysis.edges[index + 1]);
      let sum = 0;
      for (let bin = startBin; bin < endBin; bin += 1) {
        sum += Math.hypot(real[bin], imaginary[bin]) / normalization;
      }
      const bandCenter = index / count;
      const gain = bandCenter < 0.33 ? lowGain : bandCenter < 0.66 ? midGain : highGain;
      return Math.max(0.04, Math.min(1, (sum / (endBin - startBin)) * gain));
    });
    return normalizeVisualizerValues(values);
  }

  function fftInPlace(real, imaginary) {
    const size = real.length;
    for (let index = 1, reverse = 0; index < size; index += 1) {
      let bit = size >> 1;
      while (reverse & bit) {
        reverse ^= bit;
        bit >>= 1;
      }
      reverse ^= bit;
      if (index < reverse) {
        [real[index], real[reverse]] = [real[reverse], real[index]];
        [imaginary[index], imaginary[reverse]] = [imaginary[reverse], imaginary[index]];
      }
    }

    for (let length = 2; length <= size; length <<= 1) {
      const angle = (-2 * Math.PI) / length;
      const stepReal = Math.cos(angle);
      const stepImaginary = Math.sin(angle);
      for (let offset = 0; offset < size; offset += length) {
        let currentReal = 1;
        let currentImaginary = 0;
        const half = length >> 1;
        for (let index = 0; index < half; index += 1) {
          const even = offset + index;
          const odd = even + half;
          const productReal = currentReal * real[odd] - currentImaginary * imaginary[odd];
          const productImaginary = currentReal * imaginary[odd] + currentImaginary * real[odd];
          real[odd] = real[even] - productReal;
          imaginary[odd] = imaginary[even] - productImaginary;
          real[even] += productReal;
          imaginary[even] += productImaginary;
          const nextReal = currentReal * stepReal - currentImaginary * stepImaginary;
          currentImaginary = currentReal * stepImaginary + currentImaginary * stepReal;
          currentReal = nextReal;
        }
      }
    }
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
    setStatus(t("projectExported"));
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
      export: {
        ...defaultProject().export,
        ...(parsed.export || {})
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
    setStatus(t("projectLoaded"));
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
    setStatus(t("projectReset"));
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

  function readStoredAudioSettings() {
    const fallback = { volume: 1, muted: false };
    try {
      const parsed = JSON.parse(window.localStorage.getItem(AUDIO_SETTINGS_STORAGE_KEY) || "null");
      if (!parsed || typeof parsed !== "object") return fallback;
      const volume = Number(parsed.volume);
      return {
        volume: Number.isFinite(volume) ? clamp(volume, 0, 1) : fallback.volume,
        muted: parsed.muted === true
      };
    } catch {
      return fallback;
    }
  }

  function persistAudioSettings() {
    window.localStorage.setItem(AUDIO_SETTINGS_STORAGE_KEY, JSON.stringify(state.audioSettings));
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
