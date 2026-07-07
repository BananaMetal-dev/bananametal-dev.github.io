(() => {
  "use strict";

  const languageApi = window.BananaMetalLanguage;
  let currentLanguage = languageApi?.getLanguage?.() === "en" ? "en" : "ja";
  const TEXT = {
    title: { ja: "Prompt Manager", en: "Prompt Manager" },
    lead: {
      ja: "Style、Lyrics、Exclude用の部品を整理し、ブラウザ内で組み立てる管理ツールです",
      en: "A browser tool for organizing Style, Lyrics, and Exclude parts and building prompts locally.",
    },
    backToApps: { ja: "Appsへ戻る", en: "Back to Apps" },
    saved: { ja: "保存済み", en: "Saved" },
    saving: { ja: "保存中", en: "Saving" },
    saveError: { ja: "保存失敗", en: "Save failed" },
    editMode: { ja: "編集モード", en: "Edit Mode" },
    localNote: {
      ja: "入力内容はこのブラウザ内の localStorage に保存されます。必要に応じて JSON エクスポートでバックアップしてください。",
      en: "Inputs are saved in this browser's localStorage. Export JSON when you need a backup.",
    },
    outputArea: { ja: "生成エリア", en: "Output Area" },
    copy: { ja: "コピー", en: "Copy" },
    resetSheet: { ja: "シートをリセット", en: "Reset Sheet" },
    joinMode: { ja: "ボタン間を", en: "Join buttons with" },
    joinNewline: { ja: "改行", en: "New line" },
    joinInline: { ja: "連結", en: "Inline" },
    promptCount: { ja: "{count}個のプロンプトを使用中", en: "{count} prompts enabled" },
    sheetManager: { ja: "シート管理", en: "Sheet Manager" },
    sheetManagerLead: { ja: "編集モード中はここでシート追加、切り替え、並べ替え、名前変更を行います", en: "In edit mode you can add, switch, reorder, and rename sheets here." },
    rename: { ja: "名前変更", en: "Rename" },
    delete: { ja: "削除", en: "Delete" },
    steampunk: { ja: "スチームパンク", en: "Steampunk" },
    sheetDragNote: { ja: "シートタブはドラッグで順序変更できます。", en: "You can drag sheet tabs to reorder them." },
    boardHintEdit: { ja: "空セルクリックで追加、ボタン選択で編集、ドラッグで位置変更できます", en: "Click an empty cell to add, select a button to edit, and drag to move it." },
    boardHintPlay: { ja: "ボタンを押すとON/OFFが切り替わります", en: "Press a button to toggle it on or off." },
    columns: { ja: "列", en: "Columns" },
    rows: { ja: "行", en: "Rows" },
    editPanel: { ja: "編集パネル", en: "Edit Panel" },
    promptAssign: { ja: "プロンプト割り当て", en: "Prompt Assignment" },
    buttonEditorEmpty: { ja: "ボタンを選択すると、貼り付け用の入力欄が表示されます。空セルクリックで追加できます。", en: "Select a button to show the paste fields. Click an empty cell to add a new button." },
    selected: { ja: "選択中", en: "Selected" },
    notSelected: { ja: "未選択", en: "Not selected" },
    promptField: { ja: "貼り付け用プロンプト欄", en: "Prompt Paste Field" },
    promptFieldPlaceholder: { ja: "ここにプロンプトを貼り付けると、選択中のボタンへ自動保存されます。", en: "Paste a prompt here to save it to the selected button automatically." },
    buttonName: { ja: "ボタン名", en: "Button Name" },
    enableButton: { ja: "ONにする", en: "Enable" },
    deleteButton: { ja: "このボタンを削除", en: "Delete This Button" },
    data: { ja: "データ", en: "Data" },
    export: { ja: "エクスポート", en: "Export" },
    import: { ja: "インポート", en: "Import" },
    singleCopyTitle: { ja: "個別コピー用ボタンエリア", en: "Single Copy Button Area" },
    copyBoardHint: { ja: "ボタンを押すと、そのボタンのプロンプトだけをコピーします", en: "Press a button to copy only that button's prompt." },
    commonSheet: { ja: "共通", en: "Common" },
    defaultRoleName: { ja: "役割指定", en: "Role" },
    defaultRolePrompt: { ja: "あなたは専門的な編集者です。", en: "You are a professional editor." },
    defaultFormatName: { ja: "出力形式", en: "Output Format" },
    defaultFormatPrompt: { ja: "出力は見出しと箇条書きを使って、読みやすく整理してください。", en: "Structure the output clearly using headings and bullet points." },
    autoRecovered: { ja: "自動復旧しました", en: "Recovered automatically" },
    sheetPrefix: { ja: "シート", en: "Sheet" },
    newPrompt: { ja: "新規プロンプト", en: "New Prompt" },
    saveFailedToast: { ja: "保存に失敗しました", en: "Failed to save" },
    selectedAreaBuilder: { ja: "上部", en: "Top" },
    selectedAreaCopy: { ja: "下部", en: "Bottom" },
    newSheetPrompt: { ja: "新しいシート名", en: "New sheet name" },
    newSheetDefault: { ja: "新規シート", en: "New Sheet" },
    sheetNamePrompt: { ja: "シート名", en: "Sheet name" },
    sheetNameEmpty: { ja: "シート名は空にできません", en: "Sheet name cannot be empty" },
    lastSheetDeleteBlocked: { ja: "最後の1シートは削除できません", en: "The last remaining sheet cannot be deleted" },
    deleteSheetConfirm: { ja: "{name} を削除します。保存済みのボタンも削除されます。よろしいですか。", en: "Delete {name}? Saved buttons in this sheet will also be removed." },
    deleteButtonConfirm: { ja: "{name} を削除します。格納プロンプトも削除されます。よろしいですか。", en: "Delete {name}? Its stored prompt will also be removed." },
    resizeConfirm: { ja: "範囲外になるボタンがあります。可能な限り空きセルへ移動して縮小します。よろしいですか。", en: "Some buttons fall out of range. They will be moved into empty cells where possible before shrinking. Continue?" },
    resizeTooMany: { ja: "ボタン数が多いため、このサイズには縮小できません", en: "There are too many buttons to shrink to this size" },
    resetTargetMissing: { ja: "リセット対象がありません", en: "Nothing to reset" },
    resetConfirm: { ja: "現在シートのON状態を全てOFFにし、生成エリアを空にします。よろしいですか。", en: "Turn off all buttons in the current sheet and clear the output area?" },
    resetDone: { ja: "リセットしました", en: "Reset complete" },
    outputEmpty: { ja: "生成エリアは空です", en: "The output area is empty" },
    copied: { ja: "コピーしました", en: "Copied" },
    copyFailedOutput: { ja: "コピーに失敗しました。生成エリアを選択してコピーしてください", en: "Copy failed. Select the output area and copy it manually." },
    buttonPromptEmpty: { ja: "このボタンのプロンプトは空です", en: "This button has no prompt text" },
    buttonCopied: { ja: "{name} をコピーしました", en: "Copied {name}" },
    copyFailed: { ja: "コピーに失敗しました", en: "Copy failed" },
    exported: { ja: "エクスポートしました", en: "Exported" },
    importConfirm: { ja: "現在のデータをインポート内容で置き換えます。実行前に現在データをバックアップします。よろしいですか。", en: "Replace the current data with the imported data? The current data will be backed up first." },
    imported: { ja: "インポートしました", en: "Imported" },
    importInvalid: { ja: "インポートできません。不正なJSONです", en: "Import failed. The JSON is invalid." },
  };

  function t(key, tokens = {}) {
    const template = TEXT[key]?.[currentLanguage] ?? TEXT[key]?.ja ?? key;
    return template.replace(/\{(\w+)\}/g, (_, token) => String(tokens[token] ?? ""));
  }

  const STORAGE_KEY = "bananaMetal.promptBuilder.current";
  const BACKUP_KEY = "bananaMetal.promptBuilder.backup.latest";
  const RESIZE_BACKUP_KEY = "bananaMetal.promptBuilder.backup.beforeButtonResize";
  const UPPER_COLOR_BACKUP_KEY = "bananaMetal.promptBuilder.backup.beforeUpperColorChange";
  const UPPER_GRID_VIEWPORT_BACKUP_KEY = "bananaMetal.promptBuilder.backup.beforeUpperGridViewport";
  const OUTPUT_WIDTH_KEY = "bananaMetal.promptBuilder.layout.outputWidth";
  const CORRUPT_KEY = "bananaMetal.promptBuilder.corrupt";
  const OUTPUT_JOIN_NEWLINE = "newline";
  const OUTPUT_JOIN_INLINE = "inline";
  const THEME_STANDARD = "standard";
  const THEME_STEAMPUNK = "steampunk";
  const MAX_GRID = 20;
  const MIN_GRID = 1;
  const OUTPUT_MIN_WIDTH = 280;
  const RIGHT_MIN_WIDTH = 420;

  const els = {
    body: document.body,
    languageJaButton: document.getElementById("languageJaButton"),
    languageEnButton: document.getElementById("languageEnButton"),
    appTitle: document.getElementById("appTitle"),
    appLead: document.getElementById("appLead"),
    backToAppsLink: document.getElementById("backToAppsLink"),
    editModeLabel: document.getElementById("editModeLabel"),
    localNoteText: document.getElementById("localNoteText"),
    outputAreaTitle: document.getElementById("outputAreaTitle"),
    joinModeLabel: document.getElementById("joinModeLabel"),
    sheetManagerTitle: document.getElementById("sheetManagerTitle"),
    sheetManagerLead: document.getElementById("sheetManagerLead"),
    themeToggleLabel: document.getElementById("themeToggleLabel"),
    sheetDragNote: document.getElementById("sheetDragNote"),
    columnsLabel: document.getElementById("columnsLabel"),
    rowsLabel: document.getElementById("rowsLabel"),
    editSheetTitle: document.getElementById("editSheetTitle"),
    editSheetNote: document.getElementById("editSheetNote"),
    promptAssignTitle: document.getElementById("promptAssignTitle"),
    selectedLabel: document.getElementById("selectedLabel"),
    buttonPromptLabel: document.getElementById("buttonPromptLabel"),
    buttonNameLabel: document.getElementById("buttonNameLabel"),
    buttonEnableLabel: document.getElementById("buttonEnableLabel"),
    dataTitle: document.getElementById("dataTitle"),
    singleCopyTitle: document.getElementById("singleCopyTitle"),
    copyColumnsLabel: document.getElementById("copyColumnsLabel"),
    copyRowsLabel: document.getElementById("copyRowsLabel"),
    contentLayout: document.querySelector(".content-layout"),
    outputResizeHandle: document.getElementById("outputResizeHandle"),
    saveStatus: document.getElementById("saveStatus"),
    editModeToggle: document.getElementById("editModeToggle"),
    sheetTabs: document.getElementById("sheetTabs"),
    editSheetTabs: document.getElementById("editSheetTabs"),
    addSheetButton: document.getElementById("addSheetButton"),
    editAddSheetButton: document.getElementById("editAddSheetButton"),
    editRenameSheetButton: document.getElementById("editRenameSheetButton"),
    editDeleteSheetButton: document.getElementById("editDeleteSheetButton"),
    steampunkThemeToggle: document.getElementById("steampunkThemeToggle"),
    themeToggleText: document.getElementById("themeToggleText"),
    activeSheetTitle: document.getElementById("activeSheetTitle"),
    boardHint: document.getElementById("boardHint"),
    columnsInput: document.getElementById("columnsInput"),
    rowsInput: document.getElementById("rowsInput"),
    copyColumnsInput: document.getElementById("copyColumnsInput"),
    copyRowsInput: document.getElementById("copyRowsInput"),
    gridScroller: document.getElementById("gridScroller"),
    copyGridScroller: document.getElementById("copyGridScroller"),
    promptGrid: document.getElementById("promptGrid"),
    copyPromptGrid: document.getElementById("copyPromptGrid"),
    renameSheetButton: document.getElementById("renameSheetButton"),
    deleteSheetButton: document.getElementById("deleteSheetButton"),
    buttonEditorEmpty: document.getElementById("buttonEditorEmpty"),
    buttonEditor: document.getElementById("buttonEditor"),
    selectedButtonLabel: document.getElementById("selectedButtonLabel"),
    buttonNameInput: document.getElementById("buttonNameInput"),
    buttonPromptInput: document.getElementById("buttonPromptInput"),
    buttonEnabledInput: document.getElementById("buttonEnabledInput"),
    deleteButtonButton: document.getElementById("deleteButtonButton"),
    exportButton: document.getElementById("exportButton"),
    importButton: document.getElementById("importButton"),
    importFileInput: document.getElementById("importFileInput"),
    outputSummary: document.getElementById("outputSummary"),
    outputJoinModeToggle: document.getElementById("outputJoinModeToggle"),
    outputJoinModeText: document.getElementById("outputJoinModeText"),
    copyButton: document.getElementById("copyButton"),
    resetButton: document.getElementById("resetButton"),
    outputText: document.getElementById("outputText"),
    toast: document.getElementById("toast"),
  };

  let state = loadState();
  let editMode = false;
  let selectedButtonId = null;
  let selectedArea = "builder";
  let focusPromptEditor = false;
  let saveTimer = null;
  let toastTimer = null;

  init();

  function init() {
    bindLanguageToggle();
    preserveResizeBackup();
    preserveUpperColorBackup();
    preserveUpperGridViewportBackup();
    applySavedOutputWidth();
    setupOutputResizer();

    els.editModeToggle.addEventListener("change", () => {
      editMode = els.editModeToggle.checked;
      els.body.classList.toggle("edit-mode", editMode);
      els.boardHint.textContent = editMode ? t("boardHintEdit") : t("boardHintPlay");
      if (!editMode) {
        selectedButtonId = null;
        selectedArea = "builder";
      }
      render();
    });

    els.addSheetButton.addEventListener("click", addSheet);
    els.editAddSheetButton.addEventListener("click", addSheet);
    els.renameSheetButton.addEventListener("click", renameActiveSheet);
    els.editRenameSheetButton.addEventListener("click", renameActiveSheet);
    els.deleteSheetButton.addEventListener("click", deleteActiveSheet);
    els.editDeleteSheetButton.addEventListener("click", deleteActiveSheet);
    els.steampunkThemeToggle.addEventListener("change", updateThemeMode);
    els.columnsInput.addEventListener("change", () => resizeGrid("columns", els.columnsInput.value));
    els.rowsInput.addEventListener("change", () => resizeGrid("rows", els.rowsInput.value));
    els.copyColumnsInput.addEventListener("change", () => resizeGrid("columns", els.copyColumnsInput.value));
    els.copyRowsInput.addEventListener("change", () => resizeGrid("rows", els.copyRowsInput.value));
    els.buttonNameInput.addEventListener("input", updateSelectedButtonFromEditor);
    els.buttonPromptInput.addEventListener("input", updateSelectedButtonFromEditor);
    els.buttonEnabledInput.addEventListener("change", updateSelectedButtonFromEditor);
    els.deleteButtonButton.addEventListener("click", deleteSelectedButton);
    els.copyButton.addEventListener("click", copyOutput);
    els.resetButton.addEventListener("click", resetActiveSheet);
    els.outputJoinModeToggle.addEventListener("change", updateOutputJoinMode);
    els.exportButton.addEventListener("click", exportData);
    els.importButton.addEventListener("click", () => els.importFileInput.click());
    els.importFileInput.addEventListener("change", importData);

    render();
    saveNow();
  }

  function bindLanguageToggle() {
    els.languageJaButton.addEventListener("click", () => setLanguage("ja"));
    els.languageEnButton.addEventListener("click", () => setLanguage("en"));
    languageApi?.subscribe?.((language) => {
      currentLanguage = language === "en" ? "en" : "ja";
      applyStaticTexts();
      render();
    });
    setLanguage(currentLanguage);
  }

  function setLanguage(language) {
    currentLanguage = language === "en" ? "en" : "ja";
    languageApi?.setLanguage?.(currentLanguage);
    applyStaticTexts();
  }

  function applyStaticTexts() {
    document.title = `${t("title")} | Banana Metal`;
    els.appTitle.textContent = t("title");
    els.appLead.textContent = t("lead");
    els.backToAppsLink.textContent = t("backToApps");
    els.editModeLabel.textContent = t("editMode");
    els.localNoteText.textContent = t("localNote");
    els.outputAreaTitle.textContent = t("outputArea");
    els.copyButton.textContent = t("copy");
    els.resetButton.textContent = t("resetSheet");
    els.joinModeLabel.textContent = t("joinMode");
    els.sheetManagerTitle.textContent = t("sheetManager");
    els.sheetManagerLead.textContent = t("sheetManagerLead");
    els.editRenameSheetButton.textContent = t("rename");
    els.editDeleteSheetButton.textContent = t("delete");
    els.renameSheetButton.textContent = t("rename");
    els.deleteSheetButton.textContent = t("delete");
    els.themeToggleLabel.textContent = t("steampunk");
    els.sheetDragNote.textContent = t("sheetDragNote");
    els.columnsLabel.textContent = t("columns");
    els.rowsLabel.textContent = t("rows");
    els.copyColumnsLabel.textContent = t("columns");
    els.copyRowsLabel.textContent = t("rows");
    els.editSheetTitle.textContent = t("sheetManager");
    els.editSheetNote.textContent = t("sheetDragNote");
    els.promptAssignTitle.textContent = t("promptAssign");
    els.buttonEditorEmpty.textContent = t("buttonEditorEmpty");
    els.selectedLabel.textContent = t("selected");
    if (!selectedButtonId) els.selectedButtonLabel.textContent = t("notSelected");
    els.buttonPromptLabel.textContent = t("promptField");
    els.buttonPromptInput.placeholder = t("promptFieldPlaceholder");
    els.buttonNameLabel.textContent = t("buttonName");
    els.buttonEnableLabel.textContent = t("enableButton");
    els.deleteButtonButton.textContent = t("deleteButton");
    els.dataTitle.textContent = t("data");
    els.exportButton.textContent = t("export");
    els.importButton.textContent = t("import");
    els.singleCopyTitle.textContent = t("singleCopyTitle");
    els.copyBoardHint.textContent = t("copyBoardHint");
    els.addSheetButton.setAttribute("title", t("sheetManager"));
    els.addSheetButton.setAttribute("aria-label", t("sheetManager"));
    els.editAddSheetButton.setAttribute("title", t("sheetManager"));
    els.editAddSheetButton.setAttribute("aria-label", t("sheetManager"));
    els.languageJaButton.classList.toggle("is-active", currentLanguage === "ja");
    els.languageEnButton.classList.toggle("is-active", currentLanguage === "en");
    if (!els.saveStatus.textContent || els.saveStatus.textContent === TEXT.saved.ja || els.saveStatus.textContent === TEXT.saved.en) {
      els.saveStatus.textContent = t("saved");
    }
  }

  function applySavedOutputWidth() {
    const savedValue = localStorage.getItem(OUTPUT_WIDTH_KEY);
    if (savedValue === null) return;
    const savedWidth = Number(savedValue);
    if (!Number.isFinite(savedWidth)) return;
    setOutputPanelWidth(savedWidth, false);
  }

  function setupOutputResizer() {
    if (!els.contentLayout || !els.outputResizeHandle) return;

    let startX = 0;
    let startWidth = 0;

    const stopDrag = () => {
      if (!els.body.classList.contains("resizing-columns")) return;
      els.body.classList.remove("resizing-columns");
      localStorage.setItem(OUTPUT_WIDTH_KEY, String(getCurrentOutputWidth()));
      window.removeEventListener("pointermove", onDrag);
      window.removeEventListener("pointerup", stopDrag);
      window.removeEventListener("pointercancel", stopDrag);
    };

    const onDrag = (event) => {
      const delta = event.clientX - startX;
      setOutputPanelWidth(startWidth + delta, false);
    };

    els.outputResizeHandle.addEventListener("pointerdown", (event) => {
      if (window.matchMedia("(max-width: 1080px)").matches) return;
      event.preventDefault();
      startX = event.clientX;
      startWidth = getCurrentOutputWidth();
      els.body.classList.add("resizing-columns");
      try {
        els.outputResizeHandle.setPointerCapture(event.pointerId);
      } catch (_error) {
        // Some synthetic or older pointer environments cannot be captured.
      }
      window.addEventListener("pointermove", onDrag);
      window.addEventListener("pointerup", stopDrag);
      window.addEventListener("pointercancel", stopDrag);
    });

    els.outputResizeHandle.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const current = getCurrentOutputWidth();
      if (event.key === "Home") {
        setOutputPanelWidth(OUTPUT_MIN_WIDTH, true);
      } else if (event.key === "End") {
        setOutputPanelWidth(getMaxOutputWidth(), true);
      } else {
        const direction = event.key === "ArrowLeft" ? -1 : 1;
        setOutputPanelWidth(current + direction * 24, true);
      }
    });

    window.addEventListener("resize", () => setOutputPanelWidth(getCurrentOutputWidth(), false));
  }

  function getCurrentOutputWidth() {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--output-panel-width");
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 360;
  }

  function getMaxOutputWidth() {
    if (!els.contentLayout) return 640;
    const max = els.contentLayout.clientWidth - RIGHT_MIN_WIDTH - 10;
    return Math.max(OUTPUT_MIN_WIDTH, max);
  }

  function setOutputPanelWidth(width, persist) {
    const next = Math.round(clampNumber(width, 360, OUTPUT_MIN_WIDTH, getMaxOutputWidth()));
    document.documentElement.style.setProperty("--output-panel-width", `${next}px`);
    if (persist) localStorage.setItem(OUTPUT_WIDTH_KEY, String(next));
  }

  function preserveResizeBackup() {
    const current = localStorage.getItem(STORAGE_KEY);
    if (!current || localStorage.getItem(RESIZE_BACKUP_KEY)) return;

    try {
      const snapshot = {
        savedAt: new Date().toISOString(),
        reason: "before-button-size-reduction",
        data: normalizeState(JSON.parse(current)),
      };
      localStorage.setItem(RESIZE_BACKUP_KEY, JSON.stringify(snapshot));
    } catch (_error) {
      localStorage.setItem(RESIZE_BACKUP_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        reason: "before-button-size-reduction-raw",
        raw: current,
      }));
    }
  }

  function preserveUpperColorBackup() {
    const current = localStorage.getItem(STORAGE_KEY);
    if (!current || localStorage.getItem(UPPER_COLOR_BACKUP_KEY)) return;

    try {
      const snapshot = {
        savedAt: new Date().toISOString(),
        reason: "before-upper-button-color-change",
        data: normalizeState(JSON.parse(current)),
      };
      localStorage.setItem(UPPER_COLOR_BACKUP_KEY, JSON.stringify(snapshot));
    } catch (_error) {
      localStorage.setItem(UPPER_COLOR_BACKUP_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        reason: "before-upper-button-color-change-raw",
        raw: current,
      }));
    }
  }

  function preserveUpperGridViewportBackup() {
    const current = localStorage.getItem(STORAGE_KEY);
    if (!current || localStorage.getItem(UPPER_GRID_VIEWPORT_BACKUP_KEY)) return;

    try {
      const snapshot = {
        savedAt: new Date().toISOString(),
        reason: "before-upper-grid-viewport-change",
        data: normalizeState(JSON.parse(current)),
      };
      localStorage.setItem(UPPER_GRID_VIEWPORT_BACKUP_KEY, JSON.stringify(snapshot));
    } catch (_error) {
      localStorage.setItem(UPPER_GRID_VIEWPORT_BACKUP_KEY, JSON.stringify({
        savedAt: new Date().toISOString(),
        reason: "before-upper-grid-viewport-change-raw",
        raw: current,
      }));
    }
  }

  function createDefaultState() {
    return {
      version: 4,
      outputJoinMode: OUTPUT_JOIN_NEWLINE,
      theme: THEME_STANDARD,
      activeSheetId: "sheet-common",
      sheets: [
        {
          id: "sheet-common",
          name: t("commonSheet"),
          order: 1,
          columns: 6,
          rows: 4,
          buttons: [
            {
              id: createId("btn"),
              name: t("defaultRoleName"),
              prompt: t("defaultRolePrompt"),
              enabled: false,
              row: 1,
              column: 1,
            },
            {
              id: createId("btn"),
              name: t("defaultFormatName"),
              prompt: t("defaultFormatPrompt"),
              enabled: false,
              row: 1,
              column: 2,
            },
          ],
          copyButtons: [
            {
              id: createId("copy"),
              name: t("defaultRoleName"),
              prompt: t("defaultRolePrompt"),
              enabled: false,
              row: 1,
              column: 1,
            },
            {
              id: createId("copy"),
              name: t("defaultFormatName"),
              prompt: t("defaultFormatPrompt"),
              enabled: false,
              row: 1,
              column: 2,
            },
          ],
        },
      ],
    };
  }

  function loadState() {
    const current = localStorage.getItem(STORAGE_KEY);
    const backup = localStorage.getItem(BACKUP_KEY);

    const parsedCurrent = parseAndValidate(current);
    if (parsedCurrent.ok) return parsedCurrent.value;

    const parsedBackup = parseAndValidate(backup);
    if (parsedBackup.ok) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedBackup.value));
      showToastSoon(t("autoRecovered"));
      return parsedBackup.value;
    }

    if (current || backup) {
      localStorage.setItem(CORRUPT_KEY, JSON.stringify({ current, backup, savedAt: new Date().toISOString() }));
    }

    return createDefaultState();
  }

  function showToastSoon(message) {
    window.setTimeout(() => showToast(message), 0);
  }

  function parseAndValidate(raw) {
    if (!raw) return { ok: false };
    try {
      const parsed = JSON.parse(raw);
      const normalized = normalizeState(parsed);
      return { ok: true, value: normalized };
    } catch (_error) {
      return { ok: false };
    }
  }

  function normalizeState(input) {
    if (!input || typeof input !== "object") throw new Error("Invalid data");
    if (!Array.isArray(input.sheets) || input.sheets.length === 0) throw new Error("Missing sheets");

    const sheets = input.sheets.map((sheet, index) => {
      if (!sheet || typeof sheet !== "object") throw new Error("Invalid sheet");
      const columns = clampNumber(sheet.columns, 6, MIN_GRID, MAX_GRID);
      const rows = clampNumber(sheet.rows, 4, MIN_GRID, MAX_GRID);
      const normalizedButtons = normalizeButtonList(sheet.buttons, columns, rows, "btn");
      const normalizedCopyButtons = Array.isArray(sheet.copyButtons)
        ? normalizeButtonList(sheet.copyButtons, columns, rows, "copy")
        : duplicateButtonsForCopy(normalizedButtons);
      return {
        id: safeString(sheet.id) || createId("sheet"),
        name: safeString(sheet.name) || `${t("sheetPrefix")}${index + 1}`,
        order: Number.isFinite(Number(sheet.order)) ? Number(sheet.order) : index + 1,
        columns,
        rows,
        buttons: resolveButtonCollisions(normalizedButtons, columns, rows),
        copyButtons: resolveButtonCollisions(normalizedCopyButtons, columns, rows),
      };
    });

    const activeExists = sheets.some((sheet) => sheet.id === input.activeSheetId);
    return {
      version: 4,
      outputJoinMode: normalizeOutputJoinMode(input.outputJoinMode),
      theme: normalizeTheme(input.theme),
      activeSheetId: activeExists ? input.activeSheetId : sortSheets(sheets)[0].id,
      sheets,
    };
  }

  function normalizeOutputJoinMode(value) {
    return value === OUTPUT_JOIN_INLINE ? OUTPUT_JOIN_INLINE : OUTPUT_JOIN_NEWLINE;
  }

  function normalizeTheme(value) {
    return value === THEME_STEAMPUNK ? THEME_STEAMPUNK : THEME_STANDARD;
  }

  function normalizeButtonList(buttons, columns, rows, idPrefix) {
    const source = Array.isArray(buttons) ? buttons : [];
    return source.map((button, buttonIndex) => {
      const row = clampNumber(button.row, Math.min(buttonIndex + 1, rows), 1, rows);
      const column = clampNumber(button.column, 1, 1, columns);
      return {
        id: safeString(button.id) || createId(idPrefix),
        name: safeString(button.name) || t("newPrompt"),
        prompt: safeString(button.prompt),
        enabled: Boolean(button.enabled),
        row,
        column,
      };
    });
  }

  function duplicateButtonsForCopy(buttons) {
    return buttons.map((button) => ({
      ...button,
      id: createId("copy"),
    }));
  }

  function resolveButtonCollisions(buttons, columns, rows) {
    const used = new Set();
    const result = [];
    const overflow = [];

    for (const button of buttons) {
      const key = cellKey(button.row, button.column);
      if (!used.has(key)) {
        used.add(key);
        result.push(button);
      } else {
        overflow.push(button);
      }
    }

    for (const button of overflow) {
      const empty = findFirstEmptyCell({ columns, rows, buttons: result });
      if (!empty) continue;
      result.push({ ...button, row: empty.row, column: empty.column });
    }

    return result;
  }

  function saveNow() {
    try {
      setSaveStatus(t("saving"), "saving");
      const normalized = normalizeState(state);
      const next = JSON.stringify(normalized);
      const previous = localStorage.getItem(STORAGE_KEY);
      if (previous) localStorage.setItem(BACKUP_KEY, previous);
      localStorage.setItem(STORAGE_KEY, next);
      setSaveStatus(t("saved"), "");
    } catch (error) {
      console.error(error);
      setSaveStatus(t("saveError"), "error");
      showToast(t("saveFailedToast"));
    }
  }

  function scheduleSave() {
    setSaveStatus(t("saving"), "saving");
    window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(saveNow, 220);
  }

  function setSaveStatus(text, className) {
    els.saveStatus.textContent = text;
    els.saveStatus.className = `save-status ${className}`.trim();
  }

  function render() {
    const sheet = getActiveSheet();
    renderTheme();
    renderSheets();
    renderGrid(sheet);
    renderCopyGrid(sheet);
    renderEditPanel(sheet);
    renderOutput(sheet);
  }

  function renderTheme() {
    const theme = normalizeTheme(state.theme);
    els.body.classList.toggle("theme-steampunk", theme === THEME_STEAMPUNK);
    els.steampunkThemeToggle.checked = theme === THEME_STEAMPUNK;
    els.themeToggleText.textContent = theme === THEME_STEAMPUNK ? "ON" : "OFF";
  }

  function renderSheets() {
    renderSheetTabs(els.sheetTabs);
    renderSheetTabs(els.editSheetTabs);
  }

  function renderSheetTabs(container) {
    if (!container) return;
    container.innerHTML = "";
    for (const sheet of sortSheets(state.sheets)) {
      const tab = document.createElement("button");
      tab.type = "button";
      tab.className = `sheet-tab${sheet.id === state.activeSheetId ? " active" : ""}`;
      tab.textContent = sheet.name;
      tab.title = sheet.name;
      tab.draggable = editMode;
      tab.addEventListener("click", () => switchSheet(sheet.id));
      tab.addEventListener("dragstart", (event) => {
        if (!editMode) return;
        event.dataTransfer.setData("application/x-sheet-id", sheet.id);
      });
      tab.addEventListener("dragover", (event) => {
        if (!editMode) return;
        event.preventDefault();
        tab.classList.add("drag-over");
      });
      tab.addEventListener("dragleave", () => tab.classList.remove("drag-over"));
      tab.addEventListener("drop", (event) => {
        tab.classList.remove("drag-over");
        if (!editMode) return;
        event.preventDefault();
        const draggedId = event.dataTransfer.getData("application/x-sheet-id");
        if (draggedId) reorderSheets(draggedId, sheet.id);
      });
      container.appendChild(tab);
    }
  }

  function renderGrid(sheet) {
    els.activeSheetTitle.textContent = sheet.name;
    els.columnsInput.value = String(sheet.columns);
    els.rowsInput.value = String(sheet.rows);
    syncGridScrollerSize(els.gridScroller, sheet);
    drawGrid(els.promptGrid, sheet, "builder");
  }

  function renderCopyGrid(sheet) {
    els.copyColumnsInput.value = String(sheet.columns);
    els.copyRowsInput.value = String(sheet.rows);
    syncGridScrollerSize(els.copyGridScroller, sheet);
    drawGrid(els.copyPromptGrid, sheet, "copy");
  }

  function syncGridScrollerSize(scroller, sheet) {
    if (!scroller) return;
    const visibleRows = Math.min(sheet.rows, 5);
    const height = `calc((var(--cell-h) * ${visibleRows}) + (var(--gap) * ${Math.max(visibleRows - 1, 0)}) + 22px)`;
    scroller.style.width = "100%";
    scroller.style.maxWidth = "100%";
    scroller.style.height = height;
    scroller.style.maxHeight = height;
  }

  function drawGrid(container, sheet, mode) {
    const buttons = getButtonList(sheet, mode);
    container.style.gridTemplateColumns = `repeat(${sheet.columns}, var(--cell-w))`;
    container.innerHTML = "";

    for (let row = 1; row <= sheet.rows; row += 1) {
      for (let column = 1; column <= sheet.columns; column += 1) {
        const cell = document.createElement("div");
        const button = findButtonAt(buttons, row, column);
        const cellNumber = getCellSequenceNumber(sheet.columns, row, column);
        cell.className = [
          "grid-cell",
          button ? "" : "empty",
          mode === "builder" && row % 2 === 0 ? "row-alt" : "",
        ].filter(Boolean).join(" ");
        cell.dataset.row = String(row);
        cell.dataset.column = String(column);
        cell.addEventListener("click", () => {
          if (editMode && !button) addButtonAt(row, column, mode);
        });
        cell.addEventListener("dragover", (event) => {
          if (!editMode) return;
          const draggedArea = event.dataTransfer.types.includes("application/x-button-area")
            ? event.dataTransfer.getData("application/x-button-area")
            : mode;
          if (draggedArea && draggedArea !== mode) return;
          event.preventDefault();
          cell.classList.add("drop-target");
        });
        cell.addEventListener("dragleave", () => cell.classList.remove("drop-target"));
        cell.addEventListener("drop", (event) => {
          cell.classList.remove("drop-target");
          if (!editMode) return;
          event.preventDefault();
          const buttonId = event.dataTransfer.getData("application/x-button-id");
          const area = event.dataTransfer.getData("application/x-button-area") || mode;
          if (buttonId && area === mode) moveButtonTo(buttonId, row, column, mode);
        });

        if (button) {
          cell.appendChild(createPromptButton(button, mode, cellNumber));
        } else if (mode === "builder") {
          cell.appendChild(createGridPlaceholder(cellNumber));
        }
        container.appendChild(cell);
      }
    }
  }

  function createGridPlaceholder(number) {
    const node = document.createElement("span");
    node.className = "grid-placeholder-number";
    node.textContent = String(number);
    node.setAttribute("aria-hidden", "true");
    return node;
  }

  function getCellSequenceNumber(columns, row, column) {
    return ((row - 1) * columns) + column;
  }

  function createPromptButton(button, mode, cellNumber) {
    const node = document.createElement("button");
    node.type = "button";
    node.className = [
      "prompt-button",
      mode === "builder" ? "numbered" : "",
      button.enabled ? "enabled" : "",
      selectedArea === mode && selectedButtonId === button.id ? "selected" : "",
    ].filter(Boolean).join(" ");
    if (mode === "builder") {
      const badge = document.createElement("span");
      badge.className = "prompt-button-number";
      badge.textContent = String(cellNumber);
      badge.setAttribute("aria-hidden", "true");
      node.appendChild(badge);
    }
    const label = document.createElement("span");
    label.className = "prompt-button-label";
    label.textContent = mode === "builder" && button.name.trim() === String(cellNumber) ? "" : button.name;
    node.appendChild(label);
    node.title = button.prompt ? `${button.name}\n\n${button.prompt}` : button.name;
    node.draggable = editMode;
    node.addEventListener("click", (event) => {
      event.stopPropagation();
      if (editMode) {
        selectedButtonId = button.id;
        selectedArea = mode;
        focusPromptEditor = true;
        render();
      } else if (mode === "copy") {
        copyButtonPrompt(button);
      } else {
        button.enabled = !button.enabled;
        scheduleSave();
        render();
      }
    });
    node.addEventListener("dragstart", (event) => {
      if (!editMode) return;
      event.dataTransfer.setData("application/x-button-id", button.id);
      event.dataTransfer.setData("application/x-button-area", mode);
      node.classList.add("dragging");
    });
    node.addEventListener("dragend", () => node.classList.remove("dragging"));
    return node;
  }

  function renderEditPanel(sheet) {
    const selected = getButtonList(sheet, selectedArea).find((button) => button.id === selectedButtonId);
    els.buttonEditor.hidden = !selected;
    els.buttonEditorEmpty.hidden = Boolean(selected);

    if (selected) {
      els.selectedButtonLabel.textContent = `${selectedArea === "copy" ? t("selectedAreaCopy") : t("selectedAreaBuilder")}: ${selected.name}`;
      els.buttonNameInput.value = selected.name;
      els.buttonPromptInput.value = selected.prompt;
      els.buttonEnabledInput.checked = selected.enabled;
      if (focusPromptEditor) {
        focusPromptEditor = false;
        window.setTimeout(() => {
          els.buttonPromptInput.focus();
          els.buttonPromptInput.select();
        }, 0);
      }
    }
  }

  function renderOutput(sheet) {
    const enabledButtons = sheet.buttons
      .filter((button) => button.enabled && button.prompt.trim())
      .sort((a, b) => (a.row - b.row) || (a.column - b.column));
    const blocks = [];
    for (const button of enabledButtons) blocks.push(button.prompt.trim());

    const joinMode = normalizeOutputJoinMode(state.outputJoinMode);
    els.outputJoinModeToggle.checked = joinMode === OUTPUT_JOIN_NEWLINE;
    els.outputJoinModeText.textContent = joinMode === OUTPUT_JOIN_NEWLINE ? t("joinNewline") : t("joinInline");
    els.outputText.value = blocks.join(joinMode === OUTPUT_JOIN_NEWLINE ? "\n" : "");
    els.outputSummary.textContent = t("promptCount", { count: enabledButtons.length });
    els.resetButton.disabled = !sheet.buttons.some((button) => button.enabled);
  }

  function updateOutputJoinMode() {
    state.outputJoinMode = els.outputJoinModeToggle.checked ? OUTPUT_JOIN_NEWLINE : OUTPUT_JOIN_INLINE;
    scheduleSave();
    renderOutput(getActiveSheet());
  }

  function updateThemeMode() {
    state.theme = els.steampunkThemeToggle.checked ? THEME_STEAMPUNK : THEME_STANDARD;
    scheduleSave();
    renderTheme();
  }

  function getActiveSheet() {
    return state.sheets.find((sheet) => sheet.id === state.activeSheetId) || sortSheets(state.sheets)[0];
  }

  function getButtonList(sheet, area) {
    return area === "copy" ? sheet.copyButtons : sheet.buttons;
  }

  function setButtonList(sheet, area, buttons) {
    if (area === "copy") {
      sheet.copyButtons = buttons;
    } else {
      sheet.buttons = buttons;
    }
  }

  function sortSheets(sheets) {
    return [...sheets].sort((a, b) => (a.order - b.order) || a.name.localeCompare(b.name, "ja"));
  }

  function switchSheet(sheetId) {
    if (sheetId === state.activeSheetId) return;
    state.activeSheetId = sheetId;
    const sheet = getActiveSheet();
    sheet.buttons = sheet.buttons.map((button) => ({ ...button, enabled: true }));
    selectedButtonId = null;
    selectedArea = "builder";
    scheduleSave();
    render();
  }

  function reorderSheets(draggedId, targetId) {
    if (draggedId === targetId) return;
    const ordered = sortSheets(state.sheets);
    const from = ordered.findIndex((sheet) => sheet.id === draggedId);
    const to = ordered.findIndex((sheet) => sheet.id === targetId);
    if (from < 0 || to < 0) return;
    const [moved] = ordered.splice(from, 1);
    ordered.splice(to, 0, moved);
    ordered.forEach((sheet, index) => {
      sheet.order = index + 1;
    });
    state.sheets = ordered;
    scheduleSave();
    render();
  }

  function addSheet() {
    const name = window.prompt(t("newSheetPrompt"), t("newSheetDefault"));
    if (name === null) return;
    const trimmed = name.trim() || t("newSheetDefault");
    const maxOrder = Math.max(...state.sheets.map((sheet) => sheet.order), 0);
    const sheet = {
      id: createId("sheet"),
      name: trimmed,
      order: maxOrder + 1,
      columns: 6,
      rows: 4,
      buttons: [],
      copyButtons: [],
    };
    state.sheets.push(sheet);
    state.activeSheetId = sheet.id;
    selectedButtonId = null;
    scheduleSave();
    render();
  }

  function renameActiveSheet() {
    const sheet = getActiveSheet();
    const name = window.prompt(t("sheetNamePrompt"), sheet.name);
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) return showToast(t("sheetNameEmpty"));
    sheet.name = trimmed;
    scheduleSave();
    render();
  }

  function deleteActiveSheet() {
    if (state.sheets.length <= 1) return showToast(t("lastSheetDeleteBlocked"));
    const sheet = getActiveSheet();
    const ok = window.confirm(t("deleteSheetConfirm", { name: sheet.name }));
    if (!ok) return;
    state.sheets = state.sheets.filter((item) => item.id !== sheet.id);
    state.sheets = sortSheets(state.sheets).map((item, index) => ({ ...item, order: index + 1 }));
    state.activeSheetId = state.sheets[0].id;
    selectedButtonId = null;
    selectedArea = "builder";
    scheduleSave();
    render();
  }

  function addButtonAt(row, column, area) {
    const sheet = getActiveSheet();
    const buttons = getButtonList(sheet, area);
    if (findButtonAt(buttons, row, column)) return;
    const button = {
      id: createId(area === "copy" ? "copy" : "btn"),
      name: t("newPrompt"),
      prompt: "",
      enabled: false,
      row,
      column,
    };
    buttons.push(button);
    setButtonList(sheet, area, buttons);
    selectedButtonId = button.id;
    selectedArea = area;
    focusPromptEditor = true;
    scheduleSave();
    render();
  }

  function updateSelectedButtonFromEditor() {
    const sheet = getActiveSheet();
    const button = getButtonList(sheet, selectedArea).find((item) => item.id === selectedButtonId);
    if (!button) return;
    button.name = els.buttonNameInput.value.trim() || t("newPrompt");
    button.prompt = els.buttonPromptInput.value;
    button.enabled = els.buttonEnabledInput.checked;
    scheduleSave();
    renderGrid(sheet);
    renderCopyGrid(sheet);
    renderOutput(sheet);
  }

  function deleteSelectedButton() {
    const sheet = getActiveSheet();
    const buttons = getButtonList(sheet, selectedArea);
    const button = buttons.find((item) => item.id === selectedButtonId);
    if (!button) return;
    const ok = window.confirm(t("deleteButtonConfirm", { name: button.name }));
    if (!ok) return;
    setButtonList(sheet, selectedArea, buttons.filter((item) => item.id !== selectedButtonId));
    selectedButtonId = null;
    selectedArea = "builder";
    scheduleSave();
    render();
  }

  function findButtonAt(buttons, row, column) {
    return buttons.find((button) => button.row === row && button.column === column);
  }

  function moveButtonTo(buttonId, row, column, area) {
    const sheet = getActiveSheet();
    const buttons = getButtonList(sheet, area);
    const moving = buttons.find((button) => button.id === buttonId);
    if (!moving) return;
    const target = findButtonAt(buttons, row, column);
    if (target && target.id !== moving.id) {
      const oldRow = moving.row;
      const oldColumn = moving.column;
      moving.row = row;
      moving.column = column;
      target.row = oldRow;
      target.column = oldColumn;
    } else {
      moving.row = row;
      moving.column = column;
    }
    selectedButtonId = moving.id;
    selectedArea = area;
    scheduleSave();
    render();
  }

  function resizeGrid(field, rawValue) {
    const sheet = getActiveSheet();
    const nextValue = clampNumber(rawValue, sheet[field], MIN_GRID, MAX_GRID);
    const nextColumns = field === "columns" ? nextValue : sheet.columns;
    const nextRows = field === "rows" ? nextValue : sheet.rows;
    const allButtons = [...sheet.buttons, ...sheet.copyButtons];
    const hasOutOfRange = allButtons.some((button) => button.column > nextColumns || button.row > nextRows);

    if (hasOutOfRange) {
      const ok = window.confirm(t("resizeConfirm"));
      if (!ok) return render();
    }

    const movedButtons = fitButtonsIntoGrid(sheet.buttons, nextColumns, nextRows);
    const movedCopyButtons = fitButtonsIntoGrid(sheet.copyButtons, nextColumns, nextRows);
    if (!movedButtons || !movedCopyButtons) {
      showToast(t("resizeTooMany"));
      return render();
    }

    sheet.columns = nextColumns;
    sheet.rows = nextRows;
    sheet.buttons = movedButtons;
    sheet.copyButtons = movedCopyButtons;
    scheduleSave();
    render();
  }

  function fitButtonsIntoGrid(buttons, columns, rows) {
    if (buttons.length > columns * rows) return null;
    const placed = [];
    const used = new Set();
    const overflow = [];

    for (const button of buttons) {
      if (button.row <= rows && button.column <= columns && !used.has(cellKey(button.row, button.column))) {
        used.add(cellKey(button.row, button.column));
        placed.push(button);
      } else {
        overflow.push(button);
      }
    }

    for (const button of overflow) {
      const empty = findFirstEmptyCell({ columns, rows, buttons: placed });
      if (!empty) return null;
      placed.push({ ...button, row: empty.row, column: empty.column });
    }

    return placed;
  }

  function findFirstEmptyCell(sheet) {
    const used = new Set(sheet.buttons.map((button) => cellKey(button.row, button.column)));
    for (let row = 1; row <= sheet.rows; row += 1) {
      for (let column = 1; column <= sheet.columns; column += 1) {
        if (!used.has(cellKey(row, column))) return { row, column };
      }
    }
    return null;
  }

  function resetActiveSheet() {
    const sheet = getActiveSheet();
    if (!sheet.buttons.some((button) => button.enabled)) return showToast(t("resetTargetMissing"));
    const ok = window.confirm(t("resetConfirm"));
    if (!ok) return;
    sheet.buttons = sheet.buttons.map((button) => ({ ...button, enabled: false }));
    scheduleSave();
    render();
    showToast(t("resetDone"));
  }

  async function copyOutput() {
    const text = els.outputText.value;
    if (!text.trim()) return showToast(t("outputEmpty"));

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        els.outputText.focus();
        els.outputText.select();
        document.execCommand("copy");
        window.getSelection().removeAllRanges();
      }
      showToast(t("copied"));
    } catch (error) {
      console.error(error);
      showToast(t("copyFailedOutput"));
    }
  }

  async function copyButtonPrompt(button) {
    const text = button.prompt.trim();
    if (!text) return showToast(t("buttonPromptEmpty"));

    try {
      await writeClipboardText(text);
      showToast(t("buttonCopied", { name: button.name }));
    } catch (error) {
      console.error(error);
      showToast(t("copyFailed"));
    }
  }

  async function writeClipboardText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return;
    }
    const buffer = document.createElement("textarea");
    buffer.value = text;
    buffer.setAttribute("readonly", "");
    buffer.style.position = "fixed";
    buffer.style.left = "-9999px";
    document.body.appendChild(buffer);
    buffer.focus();
    buffer.select();
    document.execCommand("copy");
    buffer.remove();
  }

  function exportData() {
    saveNow();
    const payload = JSON.stringify(normalizeState(state), null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "prompt-sheets-export.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(t("exported"));
  }

  function importData(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = normalizeState(JSON.parse(String(reader.result || "")));
        const ok = window.confirm(t("importConfirm"));
        if (!ok) return;
        const previous = localStorage.getItem(STORAGE_KEY);
        if (previous) localStorage.setItem(BACKUP_KEY, previous);
        state = imported;
        selectedButtonId = null;
        saveNow();
        render();
        showToast(t("imported"));
      } catch (error) {
        console.error(error);
        showToast(t("importInvalid"));
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function clampNumber(value, fallback, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return fallback;
    return Math.min(max, Math.max(min, Math.trunc(number)));
  }

  function safeString(value) {
    return typeof value === "string" ? value : "";
  }

  function cellKey(row, column) {
    return `${row}:${column}`;
  }

  function createId(prefix) {
    if (window.crypto && window.crypto.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
    return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    els.toast.textContent = message;
    els.toast.classList.add("show");
    toastTimer = window.setTimeout(() => els.toast.classList.remove("show"), 2400);
  }
})();
