(() => {
  "use strict";

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
    preserveResizeBackup();
    preserveUpperColorBackup();
    preserveUpperGridViewportBackup();
    applySavedOutputWidth();
    setupOutputResizer();

    els.editModeToggle.addEventListener("change", () => {
      editMode = els.editModeToggle.checked;
      els.body.classList.toggle("edit-mode", editMode);
      els.boardHint.textContent = editMode
        ? "空セルクリックで追加、ボタン選択で編集、ドラッグで位置変更できます"
        : "ボタンを押すとON/OFFが切り替わります";
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
          name: "共通",
          order: 1,
          columns: 6,
          rows: 4,
          buttons: [
            {
              id: createId("btn"),
              name: "役割指定",
              prompt: "あなたは専門的な編集者です。",
              enabled: false,
              row: 1,
              column: 1,
            },
            {
              id: createId("btn"),
              name: "出力形式",
              prompt: "出力は見出しと箇条書きを使って、読みやすく整理してください。",
              enabled: false,
              row: 1,
              column: 2,
            },
          ],
          copyButtons: [
            {
              id: createId("copy"),
              name: "役割指定",
              prompt: "あなたは専門的な編集者です。",
              enabled: false,
              row: 1,
              column: 1,
            },
            {
              id: createId("copy"),
              name: "出力形式",
              prompt: "出力は見出しと箇条書きを使って、読みやすく整理してください。",
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
      showToastSoon("自動復旧しました");
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
        name: safeString(sheet.name) || `シート${index + 1}`,
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
        name: safeString(button.name) || "新規プロンプト",
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
      setSaveStatus("保存中", "saving");
      const normalized = normalizeState(state);
      const next = JSON.stringify(normalized);
      const previous = localStorage.getItem(STORAGE_KEY);
      if (previous) localStorage.setItem(BACKUP_KEY, previous);
      localStorage.setItem(STORAGE_KEY, next);
      setSaveStatus("保存済み", "");
    } catch (error) {
      console.error(error);
      setSaveStatus("保存失敗", "error");
      showToast("保存に失敗しました");
    }
  }

  function scheduleSave() {
    setSaveStatus("保存中", "saving");
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
      els.selectedButtonLabel.textContent = `${selectedArea === "copy" ? "下部" : "上部"}: ${selected.name}`;
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
    els.outputJoinModeText.textContent = joinMode === OUTPUT_JOIN_NEWLINE ? "改行" : "連結";
    els.outputText.value = blocks.join(joinMode === OUTPUT_JOIN_NEWLINE ? "\n" : "");
    els.outputSummary.textContent = `${enabledButtons.length}個のプロンプトを使用中`;
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
    const name = window.prompt("新しいシート名", "新規シート");
    if (name === null) return;
    const trimmed = name.trim() || "新規シート";
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
    const name = window.prompt("シート名", sheet.name);
    if (name === null) return;
    const trimmed = name.trim();
    if (!trimmed) return showToast("シート名は空にできません");
    sheet.name = trimmed;
    scheduleSave();
    render();
  }

  function deleteActiveSheet() {
    if (state.sheets.length <= 1) return showToast("最後の1シートは削除できません");
    const sheet = getActiveSheet();
    const ok = window.confirm(`${sheet.name} を削除します。保存済みのボタンも削除されます。よろしいですか。`);
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
      name: "新規プロンプト",
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
    button.name = els.buttonNameInput.value.trim() || "新規プロンプト";
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
    const ok = window.confirm(`${button.name} を削除します。格納プロンプトも削除されます。よろしいですか。`);
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
      const ok = window.confirm("範囲外になるボタンがあります。可能な限り空きセルへ移動して縮小します。よろしいですか。");
      if (!ok) return render();
    }

    const movedButtons = fitButtonsIntoGrid(sheet.buttons, nextColumns, nextRows);
    const movedCopyButtons = fitButtonsIntoGrid(sheet.copyButtons, nextColumns, nextRows);
    if (!movedButtons || !movedCopyButtons) {
      showToast("ボタン数が多いため、このサイズには縮小できません");
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
    if (!sheet.buttons.some((button) => button.enabled)) return showToast("リセット対象がありません");
    const ok = window.confirm("現在シートのON状態を全てOFFにし、生成エリアを空にします。よろしいですか。");
    if (!ok) return;
    sheet.buttons = sheet.buttons.map((button) => ({ ...button, enabled: false }));
    scheduleSave();
    render();
    showToast("リセットしました");
  }

  async function copyOutput() {
    const text = els.outputText.value;
    if (!text.trim()) return showToast("生成エリアは空です");

    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        els.outputText.focus();
        els.outputText.select();
        document.execCommand("copy");
        window.getSelection().removeAllRanges();
      }
      showToast("コピーしました");
    } catch (error) {
      console.error(error);
      showToast("コピーに失敗しました。生成エリアを選択してコピーしてください");
    }
  }

  async function copyButtonPrompt(button) {
    const text = button.prompt.trim();
    if (!text) return showToast("このボタンのプロンプトは空です");

    try {
      await writeClipboardText(text);
      showToast(`${button.name} をコピーしました`);
    } catch (error) {
      console.error(error);
      showToast("コピーに失敗しました");
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
    showToast("エクスポートしました");
  }

  function importData(event) {
    const file = event.target.files && event.target.files[0];
    event.target.value = "";
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = normalizeState(JSON.parse(String(reader.result || "")));
        const ok = window.confirm("現在のデータをインポート内容で置き換えます。実行前に現在データをバックアップします。よろしいですか。");
        if (!ok) return;
        const previous = localStorage.getItem(STORAGE_KEY);
        if (previous) localStorage.setItem(BACKUP_KEY, previous);
        state = imported;
        selectedButtonId = null;
        saveNow();
        render();
        showToast("インポートしました");
      } catch (error) {
        console.error(error);
        showToast("インポートできません。不正なJSONです");
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
