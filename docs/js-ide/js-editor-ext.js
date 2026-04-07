(function () {
  "use strict";

  editor.hasFocus = function () {
    return document.activeElement === this;
  };

  editor.getLineIndices = function () {
    const editorValue = this.value;
    let indices = [0];
    
    let index = -1;
    while ((index = editorValue.indexOf("\n", index + 1)) !== -1) {
        indices.push(index + 1);
    }
    return indices;
  };

  editor.getCurrentPosition = function () {
    const before = this.value.slice(0, this.selectionStart);
    const lines = before.split("\n");

    return {
      line: lines.length,
      column: lines[lines.length - 1].length + 1,
      start: this.selectionStart,
      end: this.selectionEnd,
      lineStart: this.findLineStart(),
      lineEnd: this.findLineEnd(),
    };
  };

  editor.getWordAtCursor = function () {
    const left = this.value.slice(0, this.selectionStart);
    const right = this.value.slice(this.selectionStart);

    const leftMatch = left.match(/\w+$/);
    const rightMatch = right.match(/^\w+/);

    const word =
      (leftMatch ? leftMatch[0] : "") + (rightMatch ? rightMatch[0] : "");

    return word;
  };

  editor.hasSelection = function () {
    return this.selectionStart !== this.selectionEnd;
  };

  editor.getSelection = function () {
    return this.value.slice(this.selectionStart, this.selectionEnd);
  };

  editor.getSelectionLines = function () {
    const start = this.findLineStart();
    const end = this.findLineEnd();

    return {
      start,
      end,
      text: this.value.slice(start, end),
    }
  };

  editor.findLineStart = function (index) {
    if (index === 0) return 0;
    if (index === undefined) index = this.selectionStart;
    return this.value.lastIndexOf("\n", index - 1) + 1;
  };

  editor.findLineEnd = function (index) {
    if (index === undefined) index = this.selectionEnd;
    const next = this.value.indexOf("\n", index);
    return next === -1 ? this.value.length : next;
  };

  editor.lineColumnFromIndex = function(index) {
    const textBefore = this.value.slice(0, index);
    const lines = textBefore.split("\n");
    return {
      line: lines.length - 1,
      column: lines[lines.length - 1].length,
    };
  }

  editor.indexFromLineColumn = function(line, column) {
    const lines = this.value.split("\n");
    let index = 0;

    for (let i = 0; i < line; i += 1) {
      index += lines[i].length + 1;
    }

    return index + (column || 0);
  }

  let editorMetrics = null;
  editor.getCharacterMetrics = function() {
    if (editorMetrics) {
      return editorMetrics;
    }

    const style = getComputedStyle(this);
    const lineHeight = parseFloat(style.lineHeight) || 24;
    const paddingTop = parseFloat(style.paddingTop) || 0;
    const paddingLeft = parseFloat(style.paddingLeft) || 0;

    const probe = document.createElement("span");
    probe.textContent = "M";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.whiteSpace = "pre";
    probe.style.font = style.font;

    document.body.appendChild(probe);
    const charWidth = probe.getBoundingClientRect().width;
    document.body.removeChild(probe);

    editorMetrics = {
      lineHeight,
      charWidth,
      paddingTop,
      paddingLeft,
    };

    return editorMetrics;
  }

  let lastSavedValue = null;
  let lastSavedFileName = null;

  editor.loadSavedValue = function () {
    const savedValue = localStorage.getItem(`editor.${editor.id}.value`);
    const fileName = localStorage.getItem(`editor.${editor.id}.fileName`);
    if (savedValue !== null) {
      editor.value = savedValue;
      lastSavedValue = savedValue;
      return {fileName, value: savedValue};
    }
    return null;
  };

  editor.saveValue = function (fileName) {
      const currentValue = this.value;
      if (currentValue !== lastSavedValue) {
        localStorage.setItem(`editor.${editor.id}.value`, currentValue);
        lastSavedValue = currentValue;
      }

      const currentFileName = fileName || lastSavedFileName;
      if (currentFileName !== lastSavedFileName) {
        localStorage.setItem(`editor.${editor.id}.fileName`, currentFileName);
        lastSavedFileName = currentFileName;
      }
  }

  window.addEventListener("resize", function () {
    editorMetrics = null
  });
})();
