(function () {
  "use strict";

  const { IDE_EVENTS, $, postMessageSafe } = JsIdeLib;

  const workspace = $("workspace");
  const editorHost = $("editorHost");
  const shellHost = $("shellHost");
  const editorFrame = $("editorFrame");
  const shellFrame = $("shellFrame");
  const resizer = $("resizer");

  let isResizing = false;
  
  function postToEditor(type, payload) {
    postMessageSafe(editorFrame.contentWindow, type, payload || {});
  }

  function postToShell(type, payload) {
    postMessageSafe(shellFrame.contentWindow, type, payload || {});
  }

  function setFramePointerEvents(enabled) {
    const value = enabled ? "auto" : "none";
    editorFrame.style.pointerEvents = value;
    shellFrame.style.pointerEvents = value;
  }

  function handleEditorMessage(event) {
    if (event.source !== editorFrame.contentWindow) return;
    const message = event.data || {};

    switch (message.type) {
      case IDE_EVENTS.EDITOR_READY:
        break;

      case IDE_EVENTS.EDITOR_RUN:
        postToEditor(IDE_EVENTS.EDITOR_SET_RUN_STATE, { isRunning: true });
        postToShell(IDE_EVENTS.SHELL_RUN, {
          code: message.code || "",
          fileName: message.fileName || "editor code",
        });
        break;
    }
  }

  function handleShellMessage(event) {
    if (event.source !== shellFrame.contentWindow) return;
    const message = event.data || {};

    switch (message.type) {
      case IDE_EVENTS.SHELL_READY:
        postToEditor(IDE_EVENTS.EDITOR_SET_RUN_STATE, { isRunning: false, isReady: true });
        break;

      case IDE_EVENTS.SHELL_RUN_STARTED:
        postToEditor(IDE_EVENTS.EDITOR_SET_RUN_STATE, { isRunning: true, isStarted: true });
        break;

      case IDE_EVENTS.SHELL_RUN_FINISHED:
        postToEditor(IDE_EVENTS.EDITOR_SET_RUN_STATE, { isRunning: false, isCompleted: true, error: message.error });
        break;
    }
  }

  function onMessage(event) {
    handleEditorMessage(event);
    handleShellMessage(event);
  }

  function initResize() {
    resizer.addEventListener("mousedown", function (event) {
      event.preventDefault();
      isResizing = true;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      setFramePointerEvents(false);
    });

    window.addEventListener("mousemove", function (event) {
      if (!isResizing) return;

      const rect = workspace.getBoundingClientRect();
      let leftWidth = event.clientX - rect.left;

      const minEditorWidth = 240;
      const minShellWidth = 240;
      const maxLeftWidth = rect.width - minShellWidth - resizer.offsetWidth;

      leftWidth = Math.max(minEditorWidth, Math.min(leftWidth, maxLeftWidth));

      const leftPercent = (leftWidth / rect.width) * 100;
      editorHost.style.width = leftPercent + "%";
      shellHost.style.width = 100 - leftPercent + "%";
    });

    window.addEventListener("mouseup", function () {
      if (!isResizing) return;

      isResizing = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setFramePointerEvents(true);
    });
  }

  window.addEventListener("message", onMessage);
  initResize();
})();
