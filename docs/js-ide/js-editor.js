(function () {
  "use strict";

  const settings = {
    autoSaveTimeout: 500,
    tabSize: 4,
    statusMessageNormalDuration: 3000,
    statusMessageErrorDuration: 5000,
  };

  const { IDE_EVENTS, $, postMessageSafe } = JsIdeLib;

  const editorContainer = $("editorContainer");
  const editor = $("editor");
  const preHighlighting = $("preHighlighting");
  const highlighting = $("highlighting");
  const lineNumbers = $("lineNumbers");
  const currentLineHighlight = $("currentLineHighlight");
  const findHighlights = $("findHighlights");

  const undoBtn = $("undoBtn");
  const redoBtn = $("redoBtn");
  const insertTabBtn = $("insertTabBtn");
  const outdentBtn = $("outdentBtn");
  const formatCodeBtn = $("formatCodeBtn");
  const clearCodeBtn = $("clearCodeBtn");
  const resetCodeBtn = $("resetCodeBtn");
  const saveCodeBtn = $("saveCodeBtn");
  const loadCodeBtn = $("loadCodeBtn");
  const loadCodeInput = $("loadCodeInput");
  const runCodeBtn = $("runCodeBtn");
  const fileNameInput = $("fileNameInput");
  const toggleLineNumbersBtn = $("toggleLineNumbersBtn");

  const findReplaceBar = $("findReplaceBar");
  const findInput = $("findInput");
  const replaceInput = $("replaceInput");
  const findPrevBtn = $("findPrevBtn");
  const findNextBtn = $("findNextBtn");
  const findStatus = $("findStatus");
  const toggleFindMatchCaseBtn = $("toggleFindMatchCaseBtn");
  const replaceBtn = $("replaceBtn");
  const replaceAllBtn = $("replaceAllBtn");
  const closeFindReplaceBtn = $("closeFindReplaceBtn");
  const editorStatus = $("editorStatus");
  const stickyStatusText = $("stickyStatusText");
  const stickyEditedStatus = $("stickyEditedStatus");

  const EXAMPLE_OPTIONS = [
    new Option("Example", "https://raw.githubusercontent.com/CodeWithIntention/from-curiosity-to-code/main/code/example.js"),
    new Option("Hello", "https://raw.githubusercontent.com/CodeWithIntention/from-curiosity-to-code/main/code/chapter-01/hello.js"),
    new Option("Guess Game — V1", "https://raw.githubusercontent.com/CodeWithIntention/from-curiosity-to-code/main/code/chapter-02/guess_game_v1.js"),
    new Option("Guess Game — V2", "https://raw.githubusercontent.com/CodeWithIntention/from-curiosity-to-code/main/code/chapter-03/guess_game_v2.js"),
    new Option("Guess Game — V3", "https://raw.githubusercontent.com/CodeWithIntention/from-curiosity-to-code/main/code/chapter-04/guess_game_v3.js"),
    new Option("Guess Game — V4", "https://raw.githubusercontent.com/CodeWithIntention/from-curiosity-to-code/main/code/chapter-05/guess_game_v4.js"),
    new Option("Guess Game — V5", "https://raw.githubusercontent.com/CodeWithIntention/from-curiosity-to-code/main/code/chapter-06/guess_game_v5.js"),
    new Option("Guess Game — V6", "https://raw.githubusercontent.com/CodeWithIntention/from-curiosity-to-code/main/code/chapter-07/guess_game_v6.js"),
    new Option("Guess Game — V7", "https://raw.githubusercontent.com/CodeWithIntention/from-curiosity-to-code/main/code/chapter-08/guess_game_v7.js"),
    new Option("Guess Game — V8", "https://raw.githubusercontent.com/CodeWithIntention/from-curiosity-to-code/main/code/chapter-09/guess_game_v8.js"),
  ];
  
  EXAMPLE_OPTIONS.forEach((option) => {exampleSelect.options.add(option)});

  const undoStack = [];
  const redoStack = [];
  let lastSnapshot = null;
  let ignoreEditorInput = false;
  let showLineNumbers = true;
  let findMatchCase = false;

  let currentStatusMessage = null;
  let stickyStatusMessage = null;

  async function fetchExampleSource(option) {
    const url = option.value
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to load example '${option.label}'': ${response.status} ${response.statusText}`);
    }

    return await response.text();
  }

  function setStatus(message, delayed = false) {
    if (delayed === false) {
      postStatusMessage(null);
    }
    if (!(message && message.text)) {
      stickyStatusMessage = null;
      lastSnapshot && (lastSnapshot.stickyStatusMessage = null);
      stickyStatusText.textContent = "";
      return;
    }
    stickyStatusMessage = message;
    lastSnapshot && (lastSnapshot.stickyStatusMessage = message);

    stickyStatusText.textContent = message.text;
    stickyStatusText.className = message.type || "sticky";
  }

  function updateEditedStatus(undoable = false) {
    const isEdited = isContentEdited();
    clearCodeBtn.disabled = !(editor.value || isEdited);
    formatCodeBtn.disabled = !editor.value.trim();

    stickyEditedStatus.textContent = isEdited && !undoable ? "*" : "";
    updateLineColumnStatus();
  }

  function updateLineColumnStatus() {
    const currentPosition = editor.getCurrentPosition();
    editorLineColumn.textContent = `${currentPosition.line}:${currentPosition.column}`;
    requestAnimationFrame(scrollSelectionIntoView);
  }

  function isContentEdited() {
    return (
      (undoStack.length > 0 &&
        undoStack[undoStack.length - 1].value !== editor.value) ||
      (lastSnapshot && lastSnapshot.value !== editor.value)
    );
  }

  function postStickyStatusMessage(text, type = "sticky") {
    function set(message) {
      setStatus(message, true);
    }
    const message = { text, type };
    setTimeout(set, 1, message);
  }

  function setStatusMessage(text, type = "sticky") {
    setStatus({ text, type });
  }

  function postStatusMessage(text, type = "info") {
    if (text) {
      currentStatusMessage = { text, type };
      editorStatus.innerHTML = `<span class='${type}'>${text}</span>`;
      lastSnapshot && (lastSnapshot.statusMessage = currentStatusMessage);
      return;
    }
    currentStatusMessage = null;
    lastSnapshot && (lastSnapshot.statusMessage = null);
    editorStatus.innerHTML = "";
  }

  function getSnapshot(useUndoPosition) {
    return {
      value: editor.value,
      selectionStart:
        useUndoPosition && editor.undoPosition
          ? editor.undoPosition.selectionStart
          : editor.selectionStart,
      selectionEnd:
        useUndoPosition && editor.undoPosition
          ? editor.undoPosition.selectionEnd
          : editor.selectionEnd,
      scrollTop: editorContainer.scrollTop,
      statusMessage: currentStatusMessage,
      stickyStatusMessage: stickyStatusMessage,
    };
  }

  function updateUndoRedoButtons() {
    undoBtn.disabled = undoStack.length === 0;
    redoBtn.disabled = redoStack.length === 0;
  }

  function syncEditorLayout() {
    const metrics = editor.getCharacterMetrics();

    editor.style.height = "auto";
    editor.style.width = "auto";
    preHighlighting.style.height = "auto";
    preHighlighting.style.width = "auto";

    const contentHeight = Math.max(
      editorContainer.clientHeight,
      editor.scrollHeight,
    ) + metrics.paddingTop + metrics.paddingBottom;

    const contentWidth = Math.max(
      editorContainer.clientWidth -
        (showLineNumbers ? lineNumbers.offsetWidth : 0),
      editor.scrollWidth,
    ) + metrics.paddingLeft + metrics.paddingRight;

    editor.style.width = contentWidth + "px";
    findHighlights.style.width = editor.style.width;
    preHighlighting.style.width = editor.style.witdth;
    currentLineHighlight.style.width = editor.style.width;
    editor.style.height = contentHeight + "px";
    preHighlighting.style.height = editor.style.height;
    lineNumbers.style.height = editor.style.height;
    findHighlights.style.height = editor.style.height;
  }

  function updateActiveLineNumber(lineNumber) {
    const active = lineNumbers.querySelector(".line-number.active");
    if (active) active.classList.remove("active");

    const next = lineNumbers.querySelector(`[data-line="${lineNumber}"]`);
    if (next) next.classList.add("active");
    return next;
  }

  function updateCurrentLineHighlight() {
    const lineNumber = editor.getCurrentPosition().line;
    const line = updateActiveLineNumber(lineNumber);

    if (line) {
      currentLineHighlight.style.display = "block";
      currentLineHighlight.style.top = line.offsetTop + "px";
      currentLineHighlight.style.height = line.offsetHeight + "px";
      currentLineHighlight.style.width = editor.style.width;
    } else {
      currentLineHighlight.style.display = "none";
    }
  }

  function updateLineNumbers() {
    if (!updateCurrentLineHighlight) {
      lineNumbers.innerHTML = "";
      lineNumbers.__editorLineCount__ = 0;
      updateCurrentLineHighlight();
      return;
    }

    const lineIndices = editor.getLineIndices();
    const updateLineIndicesOnly =
      lineNumbers.__editorLineCount__ === lineIndices.length;
    lineNumbers.__editorLineCount__ = lineIndices.length;

    if (updateLineIndicesOnly) {
      lineIndices.forEach((lineIndex, i) => {
        const lineElement = lineNumbers.querySelector(`[data-line="${i + 1}"]`);
        if (lineElement) {
          lineElement.dataset.index = lineIndex;
        }
      });
    } else {
      const lines = editor.value.split("\n");
      let index = 0;
      const html = [];

      lines.forEach((line, i) => {
        html.push(
          `<div class="line-number" data-line="${i + 1}" data-index="${index}">${i + 1}</div>`,
        );
        index += line.length + 1;
      });

      lineNumbers.innerHTML = html.join("");
    }
    updateCurrentLineHighlight();
  }

  function updateHighlight(undoable = false) {
    highlighting.textContent = editor.value || " ";
    Prism.highlightElement(highlighting);
    updateLineNumbers();
    refreshFindUI();
    updateEditedStatus(undoable);
    requestAnimationFrame(syncEditorLayout);
  }

  function setEditorValue(value, undoable = false) {
    const snapshot =
      typeof value === "object" && value.value !== undefined
        ? value
        : {
            value: String(value),
            selectionStart: 0,
            selectionEnd: 0,
            scrollTop: 0,
          };

    if (undoable) {
      pushUndoSnapshot(getSnapshot());
    }

    ignoreEditorInput = true;
    editor.value = snapshot.value;
    setEditorSelection(
      snapshot.selectionStart,
      snapshot.selectionEnd,
      snapshot.scrollTop,
    );
    ignoreEditorInput = false;

    lastSnapshot = getSnapshot();
    updateHighlight(undoable);
    editor.saveValue(fileNameInput.value);
    editor.focus();
  }

  function pushUndoSnapshot(previousValue) {
    if (
      undoStack.length === 0 ||
      undoStack[undoStack.length - 1].value !== previousValue.value
    ) {
      undoStack.push(previousValue);
      if (undoStack.length > 200) undoStack.shift();
    }

    redoStack.length = 0;
    updateUndoRedoButtons();
  }

  function updateSnapshotSelection() {
    if (lastSnapshot) {
      lastSnapshot.selectionStart = editor.selectionStart;
      lastSnapshot.selectionEnd = editor.selectionEnd;
      lastSnapshot.scrollTop = editorContainer.scrollTop;
      lastSnapshot.statusMessage = currentStatusMessage;
      lastSnapshot.stickyStatusMessage = stickyStatusMessage;
    }
  }

  function setEditorSelection(start, end, scrollTop) {
    let isBackward = false;

    if (start > end) {
      const temp = start;
      start = end;
      end = temp;
      isBackward = true;
    }
    if (start >= 0) {
      editor.selectionStart = start;
    }
    if (end >= 0) {
      editor.selectionEnd = end;
    } else {
      editor.selectionEnd = editor.selectionStart;
    }
    editor.selectionDirection = isBackward ? "backward" : "forward";

    if (scrollTop !== undefined) {
      editorContainer.scrollTop = scrollTop;
    } else {
      scrollSelectionIntoView();
    }
    editor.undoPosition = {
      selectionStart: editor.selectionStart,
      selectionEnd: editor.selectionEnd,
      scrollTop: editorContainer.scrollTop,
    };
    updateSnapshotSelection();
  }

  function setEditorRangeText(text, start, end, selectionMode) {
    editor.setRangeText(text, start, end, selectionMode);
    updateSnapshotSelection();
  }

  function initializeEditorHistory() {
    undoStack.length = 0;
    redoStack.length = 0;
    lastSnapshot = getSnapshot();
    updateUndoRedoButtons();
  }

  function applyEditorTransform(transformFn, ...Args) {
    const savedStickyStatusMessage = stickyStatusMessage;
    postStatusMessage(null);

    const before = getSnapshot();
    transformFn(...Args);
    editor.saveValue(fileNameInput.value);
    const after = getSnapshot();

    if (after.value !== before.value) {
      before.statusMessage = after.statusMessage;
      before.stickyStatusMessage = savedStickyStatusMessage;
      pushUndoSnapshot(before);
      lastSnapshot = after;
      updateHighlight();
    }
    editor.focus();
  }

  function undoEdit() {
    if (!undoStack.length) return;
    const current = getSnapshot();
    const previous = undoStack.pop();
    current.statusMessage = previous.statusMessage;
    redoStack.push(current);
    setEditorValue(previous);
    updateUndoRedoButtons();
    updateEditedStatus();

    setStatus(previous.stickyStatusMessage);

    let statusMessage = previous.statusMessage || {};
    if (statusMessage.type === "action") {
      postStatusMessage(`Undo (${statusMessage.text})`, "action");
    } else {
      postStatusMessage("Undo last edit.", "action");
    }
    editor.focus();
  }

  function redoEdit() {
    if (!redoStack.length) return;
    const current = getSnapshot(true);
    const next = redoStack.pop();
    current.statusMessage = next.statusMessage;
    undoStack.push(current);
    setEditorValue(next);
    updateUndoRedoButtons();
    updateEditedStatus();

    setStatus(next.stickyStatusMessage);

    let statusMessage = next.statusMessage || {};
    if (statusMessage.type === "action") {
      postStatusMessage(`Redo (${statusMessage.text})`, "action");
    } else {
      postStatusMessage("Redo last edit.", "action");
    }
    editor.focus();
  }

  function indentSelection() {
    const selectionLines = editor.getSelectionLines();

    if (selectionLines.text.trim() === "") {
      return;
    }
    const level = getTabLevel(selectionLines.text);
    const updated = indentBlock(selectionLines.text, level + 1);

    if (selectionLines.text !== updated) {
      applyEditorTransform(function () {
        setEditorRangeText(
          updated,
          selectionLines.start,
          selectionLines.end,
          "select",
        );
        postStatusMessage("Indented selected block.", "action");
      });
    }
  }

  function outdentSelection() {
    const selectionLines = editor.getSelectionLines();
    const level = getTabLevel(selectionLines.text, true);
    const updated = indentBlock(selectionLines.text, level - 1);

    if (selectionLines.text !== updated) {
      applyEditorTransform(function () {
        setEditorRangeText(
          updated,
          selectionLines.start,
          selectionLines.end,
          "select",
        );
        postStatusMessage("Outdented selected block.", "action");
      });
    }
  }

  function toggleBlockComment() {
    const selectionLines = editor.getSelectionLines();
    const lines = selectionLines.text.split("\n");
    const updated = lines
      .map((line) => {
        // Match leading whitespace + // (optional space)
        const uncommentMatch = line.match(/^(\s*)\/\/\s?/);

        if (uncommentMatch) {
          // Uncomment
          return line.replace(/^(\s*)\/\/\s?/, "$1");
        }

        // Skip empty or whitespace-only lines
        if (line.trim() === "") {
          return line;
        }

        // Comment: insert after indentation
        return line.replace(/^(\s*)(\S.*)$/, "$1// $2");
      })
      .join("\n");

    if (selectionLines.text !== updated) {
      applyEditorTransform(function () {
        setEditorRangeText(
          updated,
          selectionLines.start,
          selectionLines.end,
          "select",
        );
        postStatusMessage("Toggled comments for line selection.", "action");
      });
    }
  }

  function getTabLevel(block, outdent = false) {
    if (block === undefined || block === "") return 0;
    const minLeft = countMinMaxLeadingSpaces(block).minLeft;
    return calcTabLevel(minLeft, outdent);
  }

  function calcTabLevel(spaces, outdent = false) {
    return outdent === true
      ? Math.ceil(spaces / settings.tabSize)
      : Math.floor(spaces / settings.tabSize);
  }

  function countLeadingSpaces(text) {
    let left = 0;
    while (left < text.length) {
      const ch = text[left];
      if (ch === " ") {
        left += 1;
      } else if (ch === "\t") {
        left += settings.tabSize;
      } else {
        break;
      }
    }
    return left;
  }

  function countMinMaxLeadingSpaces(block, ignoreLeadingLines = false) {
    const lines = block.split("\n");
    let minLeft = null;
    let maxLeft = null;
    for (const line of lines) {
      if (line.trim() === "") continue;

      const left = countLeadingSpaces(line);
      if (ignoreLeadingLines && left === 0) continue;

      if (minLeft == null || left < minLeft) {
        minLeft = left;
      }
      if (maxLeft === null || left > maxLeft) {
        maxLeft = left;
      }
    }
    return { minLeft: minLeft || 0, maxLeft: maxLeft || 0 };
  }

  function indentBlock(block, level) {
    if (block === undefined || block.trim() === "") return block;

    const leadingSpaces = countMinMaxLeadingSpaces(block, level < 0);
    const minLeft = leadingSpaces.minLeft;
    const indentSpaces =
      level < 0
        ? minLeft > settings.tabSize
          ? settings.tabSize
          : 0
        : level * settings.tabSize;
    const indent = " ".repeat(indentSpaces);

    if (minLeft == 0) {
      return block.replace(/^/gm, indent);
    }
    const regex = new RegExp(`^ {1,${minLeft}}`, "gm");
    return block.replace(regex, indent);
  }

  function moveCaretToLine(lineElement) {
    const index = Number(lineElement.dataset.index);
    moveCaretToSelection(index, index);
  }

  function moveCaretToSelection(start, end) {
    setEditorSelection(start, end);
    updateCurrentLineHighlight();
    refreshFindUI();
    updateLineColumnStatus();
    editor.focus();
  }

  async function restoreSavedValue() {
    const savedValue = editor.loadSavedValue();
    if (savedValue !== null) {
      setEditorFileValue(savedValue.fileName, savedValue.value);
      setTimeout(
        postStatusMessage,
        500,
        `Restored last saved ${savedValue.fileName || "code"}.`,
        "info",
      );
      const optionIndex = EXAMPLE_OPTIONS.findIndex((option) => option.value.endsWith(`/${savedValue.fileName}`))
      if (optionIndex >= 0) {
        exampleSelect.selectedIndex = optionIndex;
      }
    } else {
      await resetExample();
    }
  }

  async function resetExample(undoable = false) {
    const option = exampleSelect.selectedIndex >= 0 && exampleSelect.options[exampleSelect.selectedIndex];
    if (!option) return;

    const exampleCode = await fetchExampleSource(option);
    const exampleFile = option.value;

    if (editor.value !== exampleCode) {
      setEditorFileValue(exampleFile.substring(exampleFile.lastIndexOf("/")+1), exampleCode, undoable);
    }
  }

  function resetEditor(fileName, code) {
    initializeEditorHistory();
    setEditorFileValue(fileName, code);
  }

  function setEditorFileValue(filename, value, undoable = false) {
    fileNameInput.value = filename || "untitled";
    postStickyStatusMessage(fileNameInput.value);
    if (undoable) {
      postStatusMessage(`Reset to '${fileNameInput.value}'.`, "action");
    }
    setEditorValue(value || "", undoable);
  }

  function sendRunRequest() {
    editor.saveValue();
    const code = editor.value.trimEnd();
    if (!code.trim()) {
      postStatusMessage("Please enter some code before running.", "alert");
      editor.focus();
      return;
    }

    const fileName = fileNameInput.value.trim() || "Editor code";

    postMessageSafe(window.parent, IDE_EVENTS.EDITOR_RUN, {
      code,
      fileName,
    });
  }

  function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function getFindFlags() {
    return findMatchCase ? "g" : "gi";
  }

  function getFindRegex() {
    const query = findInput.value;
    if (!query) return null;
    return new RegExp(escapeRegExp(query), getFindFlags());
  }

  const findMatches = new (function () {
    this.text = null;
    this.query = null;
    this.matchCase = false;
    this.currentMatchIndex = -1;
    this.matches = [];

    this.update = function (text, query, matchCase) {
      if (
        this.text === text &&
        this.query === query &&
        this.matchCase === matchCase
      ) {
        return this.matches;
      }

      const regex = new RegExp(escapeRegExp(query), matchCase ? "g" : "gi");

      const matches = [];
      let match;

      while ((match = regex.exec(text)) !== null) {
        matches.push({
          index: match.index,
          length: match[0].length,
        });

        if (match[0].length === 0) {
          regex.lastIndex += 1;
        }
      }

      this.text = text;
      this.query = query;
      this.matchCase = matchCase;
      this.matches = matches;
      this.currentMatchIndex = -1;

      return this.matches;
    };

    this.clear = function () {
      this.text = null;
      this.query = null;
      this.matchCase = false;
      this.matches = [];
      this.lastMatchIndex = -1;
    };

    this.getCurrentMatchIndex = function () {
      const selectionStart = editor.selectionStart;
      const selectionLength = editor.selectionEnd - editor.selectionStart;

      this.currentMatchIndex = this.matches.findIndex(function (match) {
        if (selectionLength === 0) {
          return (
            selectionStart >= match.index &&
            selectionStart <= match.index + match.length
          );
        }
        return (
          match.index === selectionStart && match.length === selectionLength
        );
      });
      return this.currentMatchIndex;
    };

    this.getMatches = function () {
      return this.update(editor.value, findInput.value, findMatchCase);
    };
  })();

  function clearFind() {
    findInput.value = "";
    findHighlights.innerHTML = "";
    findStatus.textContent = "";
    findMatches.clear();
    updateFindStatus();
    editor.focus();
  }

  function updateFindStatus(message) {
    if (isSearchBarOpen()) {
      findStatus.textContent = message || "";
    }
  }

  function refreshFindStatus() {
    const query = findInput.value;
    if (!query) {
      updateFindStatus();
      return;
    }

    const matches = findMatches.getMatches();
    if (!matches.length) {
      updateFindStatus("No matches found.");
      return;
    }

    let activeIndex = findMatches.getCurrentMatchIndex();
    let matchedMessage =
      matches.length === 1 ? "1 match" : matches.length + " matches";

    if (activeIndex >= 0) {
      updateFindStatus(`Match ${activeIndex + 1} of ${matchedMessage}`);
    } else {
      updateFindStatus(`Found ${matchedMessage}`);
    }
  }

  function renderFindHighlights() {
    findHighlights.innerHTML = "";

    const query = findInput.value;
    if (!query) return;

    const matches = findMatches.getMatches();
    if (!matches.length) return;

    const metrics = editor.getCharacterMetrics();
    const currentIndex = findMatches.getCurrentMatchIndex();

    matches.forEach(function (match, index) {
      const start = editor.lineColumnFromIndex(match.index);
      const end = editor.lineColumnFromIndex(match.index + match.length);

      if (start.line !== end.line) return;

      const highlight = document.createElement("div");
      highlight.className = "find-highlight";
      if (index === currentIndex) {
        highlight.classList.add("current");
      }

      highlight.style.top =
        metrics.paddingTop + start.line * metrics.lineHeight + "px";
      highlight.style.left =
        metrics.paddingLeft + start.column * metrics.charWidth + "px";
      highlight.style.width =
        Math.max(match.length * metrics.charWidth, 4) + "px";
      highlight.style.height = metrics.lineHeight + "px";

      findHighlights.appendChild(highlight);
    });
  }

  function refreshFindUI() {
    const leftConstraint = showLineNumbers
      ? "var(--editor-line-numbers-width)"
      : "0";
    if (leftConstraint !== findHighlights.style.left) {
      findHighlights.style.left = leftConstraint;
    }
    refreshFindStatus();
    requestAnimationFrame(renderFindHighlights);
  }

  function scrollSelectionIntoView() {
    const metrics = editor.getCharacterMetrics();
    const position = editor.getCurrentPosition();
    const lineNumber = Math.max(0, position.line - 1);
    const lineColumn = Math.max(0, position.column - 1);
    const targetTop = lineNumber * metrics.lineHeight;
    const viewTop = editorContainer.scrollTop;
    const viewBottom = viewTop + editorContainer.clientHeight;
    const gutterWidth = showLineNumbers ? lineNumbers.offsetWidth : 0;
    const targetLeft = metrics.paddingLeft + lineColumn * metrics.charWidth;
    const viewLeft = editorContainer.scrollLeft;
    const viewRight = editorContainer.scrollLeft + editorContainer.clientWidth;

    if (targetTop < viewTop || targetTop + metrics.lineHeight > viewBottom) {
      editorContainer.scrollTop = Math.max(
        targetTop - metrics.lineHeight * 2,
        0,
      );
    }

    const leftMargin = metrics.paddingLeft;
    const rightMargin = metrics.paddingRight + gutterWidth;

    if (targetLeft < viewLeft + leftMargin) {
      editorContainer.scrollLeft = Math.max(
        targetLeft - leftMargin,
        0,
      );
    } else if (targetLeft > viewRight - rightMargin) {
      editorContainer.scrollLeft = Math.max(
        targetLeft - editorContainer.clientWidth + rightMargin,
        0,
      );
    }
  }

  function selectMatch(match) {
    setEditorSelection(match.index, match.index + match.length);
    updateCurrentLineHighlight();
    refreshFindUI();
  }

  function isSearchBarOpen() {
    return !findReplaceBar.hidden;
  }

  function openFindReplace(mode) {
    findReplaceBar.hidden = false;

    const selectedText = editor.hasSelection()
      ? editor.getSelection()
      : editor.getWordAtCursor();
    if (selectedText) {
      findInput.value = selectedText.trim().split("\n")[0];
    }

    refreshFindUI();

    if (mode === "replace" && findInput.value) {
      replaceInput.focus();
      replaceInput.select();
    } else {
      findInput.focus();
      findInput.select();
    }
  }

  function closeFindReplace() {
    if (!isSearchBarOpen()) {
      return;
    }
    findReplaceBar.hidden = true;
    clearFind();
  }

  function findNext() {
    const matches = findMatches.getMatches();
    if (!matches.length) {
      refreshFindUI();
      return;
    }

    const start = editor.selectionEnd;
    let next = matches.find(function (match) {
      return match.index >= start;
    });

    if (!next) next = matches[0];
    selectMatch(next);
  }

  function findPrevious() {
    const matches = findMatches.getMatches();
    if (!matches.length) {
      refreshFindUI();
      return;
    }

    const start = editor.selectionStart;
    let previous = null;

    for (const match of matches) {
      if (match.index < start) {
        previous = match;
      } else {
        break;
      }
    }

    if (!previous) previous = matches[matches.length - 1];
    selectMatch(previous);
  }

  function selectionMatchesFind() {
    const currentMatchIndex = findMatches.currentMatchIndex;
    if (!editor.hasSelection() && currentMatchIndex !== -1) {
      const match = findMatches.matches[currentMatchIndex];
      setEditorSelection(match.index, match.index + match.length);
    }
    const query = findInput.value;
    if (!query) return false;

    const selected = editor.getSelection();

    if (findMatchCase) {
      return selected === query;
    }

    return selected.toLowerCase() === query.toLowerCase();
  }

  function replaceCurrent() {
    const query = findInput.value;
    if (!query) {
      refreshFindUI();
      return;
    }

    if (!selectionMatchesFind()) {
      findNext();
      return;
    }

    const position = editor.getCurrentPosition();
    applyEditorTransform(function () {
      setEditorRangeText(
        replaceInput.value,
        position.start,
        position.end,
        "select",
      );
      postStatusMessage(
        `Replaced "${query}" with "${replaceInput.value}" at line ${position.line}, column ${position.column}.`,
        "action",
      );
    });

    refreshFindUI();
    findNext();
  }

  function replaceAll() {
    const query = findInput.value;
    if (!query) {
      refreshFindUI();
      return;
    }

    const regex = getFindRegex();
    const before = editor.value;
    const after = before.replace(regex, replaceInput.value);

    if (before === after) {
      refreshFindUI();
      return;
    }

    postStatusMessage(
      `Replaced all instances of "${query}" with "${replaceInput.value}".`,
      "action",
    );
    setEditorValue(
      {
        value: after,
        selectionStart: 0,
        selectionEnd: 0,
        scrollTop: 0,
      },
      true,
    );
    refreshFindUI();
  }

  function deleteCurrentLine() {
    const position = editor.getCurrentPosition();
    applyEditorTransform(function () {
      setEditorRangeText("", position.lineStart, position.lineEnd + 1, "end");
      postStatusMessage(`Deleted line ${position.line}.`, "action");
    });
  }

  async function formatCode() {
    const hasSelection = editor.hasSelection();

    if (hasSelection) {
      const block = editor.getSelectedCodeBlock();
      await prettierFormat(
        block.text,
        function (formatted) {
          const blockText = indentBlock(formatted.trimEnd(), block.indent);
          if (block.text === blockText) {
            postStatusMessage(
              "Selected code block is already formatted.",
              "info",
            );
            return;
          }
          applyEditorTransform(function () {
            setEditorRangeText(blockText, block.start, block.end, "select");
            postStatusMessage("Selected code block formatted.", "action");
          });
        },
        function (error) {
          handleFormatError(error, "Selection", block);
        },
      );
    } else {
      await prettierFormat(
        editor.value,
        function (formatted) {
          if (editor.value !== formatted) {
            postStatusMessage("Code formatted.", "action");
            setEditorValue(
              {
                value: formatted,
                selectionStart: editor.selectionStart,
                selectionEnd: editor.selectionEnd,
              },
              true,
            );
          } else {
            postStatusMessage("Code is already formatted.", "info");
          }
        },
        function (error) {
          handleFormatError(error, "Code");
        },
      );
    }
  }

  function handleFormatError(error, context, block) {
    const lines = error.message.split("\n");
    let firstLine = lines[0].trim();
    const match = firstLine.match(/^(.*)\((\d+):(\d+)\)$/);

    if (match) {
      let message = match[1];
      let errorLine = Number(match[2]) - 1; // Prettier lines are 1-based
      let errorColumn = Number(match[3]);

      if (block) {
        const blockStart = editor.lineColumnFromIndex(block.start);
        errorLine += blockStart.line;
      }
      const start = editor.indexFromLineColumn(errorLine) + errorColumn - 1;
      const end = start + 1;

      moveCaretToSelection(end, start);
      firstLine = `${message} At line ${errorLine + 1}, column ${errorColumn}`;
    }
    postStatusMessage(`${context} format error: ${firstLine}`, "error");
  }

  async function prettierFormat(text, onSuccess, onError) {
    try {
      let formatted = await prettier.format(text, {
        parser: "babel",
        plugins: prettierPlugins,
        semi: true,
        singleQuote: false,
        tabWidth: 4,
      });
      onSuccess(formatted);
    } catch (error) {
      onError(error);
    }
  }

  function performTab(outdent = false) {
    const position = editor.getCurrentPosition();
    const startOfLine = editor.findStartOfLine(position.lineStart);

    if (position.start == position.end && position.start <= startOfLine) {
      const indent = startOfLine - position.lineStart;
      const relTabLevel = calcTabLevel(indent, outdent);
      const tabLevel = Math.max(relTabLevel + (outdent ? -1 : 1), 0);
      const tabIndent = tabLevel * settings.tabSize;

      setEditorRangeText(
        " ".repeat(tabIndent),
        position.lineStart,
        startOfLine,
        "end",
      );
    } else {
      const indent = position.start - position.lineStart;
      const relTabLevel = calcTabLevel(indent, outdent);
      const tabLevel = Math.max(relTabLevel + (outdent ? -1 : 1), 0);
      const tabIndent = tabLevel * settings.tabSize;
      const indentDelta = position.lineStart + tabIndent - position.start;

      if (outdent) {
        const newStart = position.start + indentDelta;
        const selected = editor.value.slice(newStart, position.end);
        const regEx = new RegExp(` {1,${Math.abs(indentDelta)}}$`, "gm");
        const updated = selected.replace(regEx, "");

        if (updated !== selected) {
          setEditorRangeText(updated, newStart, position.end, "end");
        }
      } else {
        setEditorRangeText(
          " ".repeat(indentDelta),
          position.start,
          position.end,
          "end",
        );
      }
    }
  }

  editor.getSelectedCodeBlock = function () {
    const value = this.value;
    let start = this.findLineStart();
    let end = this.findLineEnd();

    function countBraces(text) {
      let balance = 0;
      for (const ch of text) {
        if (ch === "{") balance += 1;
        else if (ch === "}") balance -= 1;
      }
      return balance;
    }

    let blockText = value.slice(start, end);
    let balance = countBraces(blockText);

    while (balance > 0 && end < value.length) {
      end = this.findLineEnd(end + 1);
      blockText = value.slice(start, end);
      balance = countBraces(blockText);
    }

    while (balance < 0 && start > 0) {
      start = this.findLineStart(start - 1);
      blockText = value.slice(start, end);
      balance = countBraces(blockText);
    }

    if (balance !== 0) {
      let expanded = true;
      while (expanded && balance !== 0) {
        expanded = false;

        if (start > 0) {
          const newStart = this.findLineStart(start - 1);
          if (newStart !== start) {
            start = newStart;
            expanded = true;
          }
        }

        if (end < value.length) {
          const newEnd = this.findLineEnd(end + 1);
          if (newEnd !== end) {
            end = newEnd;
            expanded = true;
          }
        }

        blockText = value.slice(start, end);
        balance = countBraces(blockText);
      }
    }

    const indent = getTabLevel(blockText);
    return {
      text: blockText,
      start,
      end,
      indent,
    };
  };

  let autoSaveTimer = null;

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && isSearchBarOpen()) {
      event.preventDefault();
      closeFindReplace();
    }
  });

  window.addEventListener("resize", function () {
    syncEditorLayout();
    refreshFindUI();
  });

  editorContainer.addEventListener("scroll", function () {
    refreshFindUI();
  });

  editor.addEventListener("click", function () {
    updateCurrentLineHighlight();
    refreshFindUI();
  });

  editor.addEventListener("keyup", function (event) {
    updateCurrentLineHighlight();
    updateSnapshotSelection();
    refreshFindUI();
    updateLineColumnStatus();
  });

  editor.addEventListener("mouseup", function () {
    updateSnapshotSelection();
    refreshFindUI();
    updateLineColumnStatus();
  });

  editor.addEventListener("input", function () {
    if (ignoreEditorInput) return;

    postStatusMessage(null);
    updateHighlight();

    const current = getSnapshot();
    if (current.value !== lastSnapshot.value) {
      pushUndoSnapshot(lastSnapshot);
      lastSnapshot = current;
    }

    const autoSaveTimeout = settings.autoSaveTimeout;
    if (!autoSaveTimeout) return;

    if (autoSaveTimer) {
      clearTimeout(autoSaveTimer);
    }

    autoSaveTimer = setTimeout(() => {
      editor.saveValue(fileNameInput.value);
      autoSaveTimer = null;
    }, autoSaveTimeout); // save after specified timeout of no typing
  });

  editor.addEventListener("keydown", function (event) {
    if (
      event.shiftKey &&
      (event.altKey || event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "f"
    ) {
      event.preventDefault();
      formatCode();
      return;
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      event.shiftKey &&
      event.key.toLowerCase() === "k"
    ) {
      event.preventDefault();
      deleteCurrentLine();
      return;
    }
    if (
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      event.key.toLowerCase() === "f"
    ) {
      event.preventDefault();
      openFindReplace("find");
      return;
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "h") {
      event.preventDefault();
      openFindReplace("replace");
      return;
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      !event.shiftKey &&
      event.key.toLowerCase() === "z"
    ) {
      event.preventDefault();
      undoEdit();
      return;
    }

    if (
      ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") ||
      ((event.ctrlKey || event.metaKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "z")
    ) {
      event.preventDefault();
      redoEdit();
      return;
    }

    if (
      (event.key === "[" && event.ctrlKey) ||
      (event.key === "Tab" && event.shiftKey && editor.hasSelectedLine())
    ) {
      event.preventDefault();
      outdentSelection();
      return;
    }

    if (
      (event.key === "]" && event.ctrlKey) ||
      (event.key === "Tab" && editor.hasSelectedLine())
    ) {
      event.preventDefault();
      indentSelection();
      return;
    }

    if (event.key === "Backspace" && !editor.hasSelection()) {
      const position = editor.getCurrentPosition();
      if (position.start <= editor.findStartOfLine(position.lineStart)) {
        event.preventDefault();
        applyEditorTransform(performTab, true);
      }
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      applyEditorTransform(performTab, event.shiftKey);
      return;
    }

    if (event.key === "Home") {
      let end = editor.selectionEnd;
      const start = editor.findStartOfLine(end);

      if (start != editor.selectionStart) {
        event.preventDefault();
        if (!event.shiftKey) {
          end = start;
        }
        setEditorSelection(end, start);
      }
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();

      if (event.ctrlKey) {
        sendRunRequest();
        return;
      }

      const start = editor.selectionStart;
      const end = editor.selectionEnd;

      const selectionLine = editor.getSelectionLines().text;
      let indent = getTabLevel(selectionLine) * settings.tabSize;

      if (editor.value[start - 1] === "{") {
        indent += settings.tabSize;
      }

      applyEditorTransform(function () {
        setEditorRangeText("\n" + " ".repeat(indent), start, end, "end");
      });
      return;
    }

    if (event.key === "/" && event.ctrlKey) {
      event.preventDefault();
      toggleBlockComment();
      return;
    }
  });

  lineNumbers.addEventListener("click", function (event) {
    const target = event.target;
    if (!target.classList.contains("line-number")) return;
    moveCaretToLine(target);
  });

  undoBtn.addEventListener("click", undoEdit);
  redoBtn.addEventListener("click", redoEdit);
  insertTabBtn.addEventListener("click", indentSelection);
  outdentBtn.addEventListener("click", outdentSelection);

  findNextBtn.addEventListener("click", findNext);
  findPrevBtn.addEventListener("click", findPrevious);
  replaceBtn.addEventListener("click", replaceCurrent);
  replaceAllBtn.addEventListener("click", replaceAll);
  closeFindReplaceBtn.addEventListener("click", closeFindReplace);

  findInput.addEventListener("input", refreshFindUI);
  replaceInput.addEventListener("input", refreshFindUI);

  findInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();
      if (event.shiftKey) {
        findPrevious();
      } else {
        findNext();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeFindReplace();
    }
  });

  replaceInput.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      event.preventDefault();

      if (event.ctrlKey && (event.altKey || event.metaKey)) {
        replaceAll();
      } else {
        replaceCurrent();
      }
    } else if (event.key === "Escape") {
      event.preventDefault();
      closeFindReplace();
    }
  });

  toggleFindMatchCaseBtn.addEventListener("click", function () {
    findMatchCase = !findMatchCase;
    refreshFindUI();
    this.classList.toggle("active", findMatchCase);
    if (findMatchCase) {
      findInput.focus();
    } else {
      editor.focus();
    }
  });

  clearCodeBtn.addEventListener("click", function () {
    if (
      !confirm(
        "Are you sure you want to clear the editor? This action cannot be undone.",
      )
    ) {
      return;
    }
    resetEditor();
    postStatusMessage("Editor cleared.", "action");
  });

  resetCodeBtn.addEventListener("click", async function () {
    await resetExample(true);
    editor.focus();
  });

  saveCodeBtn.addEventListener("click", function () {
    if (!editor.value.trim()) {
      alert("Please enter some code before saving.");
      editor.focus();
      return;
    }
    const fileName = fileNameInput.value.trim();
    if (!fileName) {
      alert("Please enter a file name before saving.");
      fileNameInput.focus();
      return;
    }
    const blob = new Blob([editor.value], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    const hasExtension = /\.[a-zA-Z0-9]+$/.test(fileName);
    link.download = hasExtension ? fileName : fileName + ".js";
    fileNameInput.value = link.download;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    setStatusMessage(link.download);
    postStatusMessage(`Code saved as "${link.download}".`, "action");
    editor.saveValue(fileNameInput.value);
    editor.focus();
  });

  loadCodeBtn.addEventListener("click", function () {
    loadCodeInput.click();
  });

  loadCodeInput.addEventListener("change", function (event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
      const newCode = e.target.result;
      resetEditor(file.name, newCode);
    };

    reader.readAsText(file);
    loadCodeInput.value = "";
  });

  formatCodeBtn.addEventListener("click", formatCode);

  runCodeBtn.addEventListener("click", sendRunRequest);

  toggleLineNumbersBtn.addEventListener("click", function () {
    showLineNumbers = !showLineNumbers;
    toggleLineNumbersBtn.classList.toggle("active", showLineNumbers);
    editorContainer.classList.toggle("show-line-numbers", showLineNumbers);
    syncEditorLayout();
    updateLineNumbers();
    refreshFindUI();
    editor.focus();
  });

  window.addEventListener("message", function (event) {
    if (event.source !== window.parent) return;
    const message = event.data || {};

    if (message.type === IDE_EVENTS.EDITOR_SET_RUN_STATE) {
      runCodeBtn.disabled = !!message.isRunning;
      if (message.isReady) {
        postStatusMessage("Shell is ready.", "info");
      } else if (message.isStarted) {
        postStatusMessage("Running code...", "action");
      } else if (message.isCompleted) {
        const error = message.error;
        if (error) {
          const { message, line, column } = error;
          if (line !== undefined && column !== undefined) {
            const startOfLine = editor.indexFromLineColumn(line - 1);
            let start = startOfLine + column - 1;
            let end = start;

            let match =
              message.match(/'(\S+)'/) ||
              message.match(/:\s+(\S+)\s+is\s/) ||
              message.match(/:\s+(\S+)/);
            if (match && match.length > 1) {
              const matchedLength = match[1].length;
              start = editor.value.indexOf(
                match[1],
                Math.max(start - matchedLength - 1, 0),
              );
              end = Math.max(start + matchedLength, startOfLine + column - 1);
            } else {
              end += 1;
            }

            if (end - startOfLine >= column) {
              moveCaretToSelection(end, start);
            } else {
              moveCaretToSelection(start, end);
            }
            postStatusMessage(
              `Run finished with error, at line ${line}, column ${column} (see Shell Console).`,
              "alert",
            );
          } else {
            postStatusMessage(
              "Run finished with error (see Shell Console)",
              "alert",
            );
          }
        } else {
          postStatusMessage("Run finished successfully.", "action");
        }
      }
    }
  });

  restoreSavedValue();
  initializeEditorHistory();
  postMessageSafe(window.parent, IDE_EVENTS.EDITOR_READY, {});
})();
