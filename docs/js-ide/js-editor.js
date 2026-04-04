(function () {
  "use strict";

  const settings = { tabSize: 4 };

  const { IDE_EVENTS, $, postMessageSafe } = JsIdeLib;

  const editorContainer = $("editorContainer");
  const editor = $("editor");
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
  const exampleCode = `/*
Sample JavaScript code to get you started
*/
let name = prompt("What is your name?");
console.log("Hello, " + name + "!");
`;

  const undoStack = [];
  const redoStack = [];
  let lastSnapshot = null;
  let ignoreEditorInput = false;
  let showLineNumbers = true;
  let findMatchCase = false;

  let currentStatusMessage = null;
  let stickyStatusMessage = null;
  const statusMessageNormalDuration = 3000;
  const statusMessageErrorDuration = 5000;

  function setStatus(message) {
    const {text, type} = message || {text: null, type: null};
    setStatusMessage(text, type);
  }

  function postStickyStatusMessage(text, type = 'info') {
    function set(message) {
      setStatusMessage(message.text, message.type);
    }
    currentStatusMessage = { text, type, postId: null };
    setTimeout(set, 1, currentStatusMessage);
  }

  function setStatusMessage(text, type = 'info') {
    if (!text) {
      stickyStatusMessage = null;
      postStatusMessage(null);
      return;
    }

    stickyStatusMessage = { text, type };
    postStatusMessage(null);
    if (!(currentStatusMessage && currentStatusMessage.postId)) {
      updateStatusMessage(stickyStatusMessage);
    }
  }

  function postStatusMessage(text, type = "info") {
    function clear(message) {
      if (message && message.postId) {
        clearTimeout(message.postId);
        message.postId = null;
      }
      updateStatusMessage(stickyStatusMessage);
    }
    clear(currentStatusMessage);
    const message = updateStatusMessage({text, type});
    if (message !== null) {
      message.postId = setTimeout(clear, type === 'error' ? statusMessageErrorDuration : statusMessageNormalDuration, message);
    }
  }

  function updateStatusMessage(message) {
    if (message && message.text) {
      currentStatusMessage = message;
      editorStatus.innerHTML = `<span class='${message.type}'>${message.text}</span>`;
      editorStatus.hidden = false;
      if (lastSnapshot) {
        lastSnapshot.statusMessage = message;
        lastSnapshot.stickyStatusMessage = stickyStatusMessage;
      }
      return message;
    }
    if (lastSnapshot) {
      lastSnapshot.statusMessage = null;
      lastSnapshot.stickyStatusMessage = null;
    }
    currentStatusMessage = null;
    editorStatus.hidden = true;
    editorStatus.innerHTML = "";
    return null;
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
    editor.style.height = "auto";
    editor.style.width = "auto";

    const contentHeight = Math.max(
      editorContainer.clientHeight,
      editor.scrollHeight,
    );
    const contentWidth = Math.max(
      editorContainer.clientWidth -
        (showLineNumbers ? lineNumbers.offsetWidth : 0),
      editor.scrollWidth,
    );

    editor.style.height = contentHeight + "px";
    editor.style.width = contentWidth + "px";
    lineNumbers.style.height = contentHeight + "px";
    findHighlights.style.height = contentHeight + "px";
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
    } else {
      currentLineHighlight.style.display = "none";
    }
  }

  function updateLineNumbers() {
    if (!showLineNumbers) {
      lineNumbers.innerHTML = "";
      updateCurrentLineHighlight();
      return;
    }

    const lines = editor.value.split("\n");
    let index = 0;
    const html = [];

    for (let i = 0; i < lines.length; i += 1) {
      html.push(
        `<div class="line-number" data-line="${i + 1}" data-index="${index}">${i + 1}</div>`,
      );
      index += lines[i].length + 1;
    }

    lineNumbers.innerHTML = html.join("");
    updateCurrentLineHighlight();
  }

  function updateHighlight() {
    highlighting.textContent = editor.value || " ";
    Prism.highlightElement(highlighting);
    updateLineNumbers();
    refreshFindUI();
    requestAnimationFrame(syncEditorLayout);
  }

  function setEditorValue(value, pushToUndoStack = false) {
    const snapshot =
      typeof value === "object" && value.value !== undefined
        ? value
        : {
            value: String(value),
            selectionStart: 0,
            selectionEnd: 0,
            scrollTop: 0,
          };

    if (pushToUndoStack) {
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
    updateHighlight();
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
    if (start >= 0) {
      editor.selectionStart = start;
    }
    if (end >= 0) {
      editor.selectionEnd = end;
    } else {
      editor.selectionEnd = editor.selectionStart;
    }
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

  function applyEditorTransform(transformFn) {
    const savedStickyStatusMessage = stickyStatusMessage;
    setStatusMessage(null);

    const before = getSnapshot();
    transformFn();
    const after = getSnapshot();

    if (after.value !== before.value) {
      before.statusMessage = after.statusMessage;
      before.stickyStatusMessage = savedStickyStatusMessage;
      pushUndoSnapshot(before);
      lastSnapshot = after;
      updateHighlight();
    }
  }

  function undoEdit() {
    if (!undoStack.length) return;
    const current = getSnapshot();
    const previous = undoStack.pop();
    current.statusMessage = previous.statusMessage;
    redoStack.push(current);
    setEditorValue(previous);
    updateUndoRedoButtons();

    setStatus(previous.stickyStatusMessage);

    let statusMessage = previous.statusMessage || {};
    if (statusMessage.type === 'action') {
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

    setStatus(next.stickyStatusMessage);

    let statusMessage = next.statusMessage || {};
    if (statusMessage.type === 'action') {
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
        setEditorRangeText(updated, selectionLines.start, selectionLines.end, "select");
        postStatusMessage("Indented selected block.", "action");
      });
    }
  }

  function outdentSelection() {
    const selectionLines = editor.getSelectionLines();
    const level = getTabLevel(selectionLines.text);
    const updated = indentBlock(selectionLines.text, level - 1);

    if (selectionLines.text !== updated) {
      applyEditorTransform(function () {
        setEditorRangeText(updated, selectionLines.start, selectionLines.end, "select");
        postStatusMessage("Outdented selected block.", "action");
      });
    }
  }

  function toggleBlockComment() {
    const selectionLines = editor.getSelectionLines();
    const lines = selectionLines.text.split("\n");
    const updated = lines.map(line => {
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
    }).join("\n");

    if (selectionLines.text !== updated) {
      applyEditorTransform(function () {
        setEditorRangeText(updated, selectionLines.start, selectionLines.end, "select");
        postStatusMessage("Toggled comments for line selection.", "action");
      });
    }
  }

  function getTabLevel(block) {
    if (block === undefined || block === "") return 0;
    const minLeft = countMinMaxLeadingSpaces(block).minLeft;
    return Math.ceil(minLeft / settings.tabSize);
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
    editor.focus();
    updateCurrentLineHighlight();
    refreshFindUI();
  }

  function resetExample(undoable = false) {
    fileNameInput.value = "example.js";
    postStickyStatusMessage(fileNameInput.value, "info");
    if (undoable) {
      postStatusMessage("Reset to example code.", "action");
    }
    setEditorValue(exampleCode, undoable);
  }

  function sendRunRequest() {
    const code = editor.value;
    const fileName = fileNameInput.value.trim() || "editor code";

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
        return match.index === selectionStart && match.length === selectionLength;
      });
      return this.currentMatchIndex;
    }

    this.getMatches = function () {
      return this.update(editor.value, findInput.value, findMatchCase);
    }
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
    let matchedMessage = matches.length === 1 ? "1 match" : matches.length + " matches"; 

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
    renderFindHighlights();
  }

  function scrollSelectionIntoView() {
    const metrics = editor.getCharacterMetrics();
    const textBefore = editor.value.slice(0, editor.selectionStart);
    const lineNumber = textBefore.split("\n").length - 1;
    const targetTop = lineNumber * metrics.lineHeight;
    const viewTop = editorContainer.scrollTop;
    const viewBottom = viewTop + editorContainer.clientHeight;

    if (targetTop < viewTop || targetTop + metrics.lineHeight > viewBottom) {
      editorContainer.scrollTop = Math.max(
        targetTop - metrics.lineHeight * 2,
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
    if (isSearchBarOpen()) {
      return;
    }
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
      setEditorRangeText(replaceInput.value, position.start, position.end, "select");
      postStickyStatusMessage(`Replaced "${query}" with "${replaceInput.value}" at line ${position.line}, column ${position.column}.`, "action");
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

    postStickyStatusMessage(`Replaced all instances of "${query}" with "${replaceInput.value}".`, "action");
    setEditorValue({
      value: after,
      selectionStart: 0,
      selectionEnd: 0,
      scrollTop: 0,
    }, true);
    refreshFindUI();
  }

  function deleteCurrentLine() {
    const position = editor.getCurrentPosition();
    applyEditorTransform(function () {
      setEditorRangeText("", position.lineStart, position.lineEnd+1, "end");
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
            postStatusMessage("Selected code block is already formatted.", "info");
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
            setEditorValue({
              value: formatted,
              selectionStart: editor.selectionStart,
              selectionEnd: editor.selectionEnd,
            }, true);
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
      const start = editor.indexFromLineColumn(errorLine);
      const end = start + errorColumn;

      moveCaretToSelection(start, end);
      firstLine = `${message} At line ${errorLine + 1}, column ${errorColumn}`;
    }
    postStatusMessage(`${context} format error: ${firstLine}`, 'error');
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

  editor.addEventListener("keyup", function () {
    updateCurrentLineHighlight();
    updateSnapshotSelection();
    refreshFindUI();
  });

  editor.addEventListener("mouseup", function () {
    updateSnapshotSelection();
    refreshFindUI();
  });

  editor.addEventListener("input", function () {
    if (ignoreEditorInput) return;

    const current = getSnapshot();
    if (current.value !== lastSnapshot.value) {
      pushUndoSnapshot(lastSnapshot);
      lastSnapshot = current;
    }
    setStatusMessage(null);
    updateHighlight();
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

    if (event.key === "Tab") {
      event.preventDefault();

      const start = editor.selectionStart;
      const end = editor.selectionEnd;

      applyEditorTransform(function () {
        if (event.shiftKey) {
          const selected = editor.value.slice(start - 4, end);
          const updated = selected.replace(/ {1,4}$/gm, "");
          setEditorRangeText(updated, start - 4, end, "end");
        } else {
          setEditorRangeText("    ", start, end, "end");
        }
      });
      return;
    }

    if (event.key === "Enter") {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      
      event.preventDefault();

      const selectionLine = editor.getSelectionLines().text;
      const indent = countLeadingSpaces(selectionLine);
      applyEditorTransform(function () {
        setEditorRangeText("\n" + selectionLine.substring(0, indent), start, end, "end");
      });
      return;
    }

    if (event.key === "[" && event.ctrlKey) {
      event.preventDefault();
      outdentSelection();
      return;
    }

    if (event.key === "]" && event.ctrlKey) {
      event.preventDefault();
      indentSelection();
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
    if (editor.value !== "") {
      postStickyStatusMessage("Cleared code.", "action");
      setEditorValue("", true);
    }
    editor.focus();
  });

  resetCodeBtn.addEventListener("click", function () {
    if (editor.value !== exampleCode) {
      resetExample(true);
    }
    editor.focus();
  });

  saveCodeBtn.addEventListener("click", function () {
    const fileName = fileNameInput.value.trim() || "script.js";
    const blob = new Blob([editor.value], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = fileName.endsWith(".js") ? fileName : fileName + ".js";
    fileNameInput.value = link.download;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
    setStatusMessage(`Code saved as "${link.download}".`, "action");
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
      if (editor.value !== newCode) {
        setStatusMessage(file.name, "info");
        setEditorValue(newCode);
        initializeEditorHistory();
      }
      fileNameInput.value = file.name;
      editor.focus();
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
      } else if (message.isError) {
        postStatusMessage("Error occurred while running code.", "alert");
      } else if (message.isCompleted) {
        postStatusMessage("Run completed.", "action");
      }
    }
  });

  initializeEditorHistory();
  resetExample();
  refreshFindUI();
  postMessageSafe(window.parent, IDE_EVENTS.EDITOR_READY, {});
})();
