(function (global) {
  "use strict";

  const IDE_EVENTS = {
    EDITOR_READY: "editor:ready",
    EDITOR_RUN: "editor:run",
    EDITOR_SET_RUN_STATE: "editor:set-run-state",

    SHELL_READY: "shell:ready",
    SHELL_RUN: "shell:run",
    SHELL_CLEAR: "shell:clear",
    SHELL_RESET: "shell:reset",
    SHELL_RUN_STARTED: "shell:run-started",
    SHELL_RUN_FINISHED: "shell:run-finished",

    SANDBOX_INIT: "sandbox:init",
    SANDBOX_READY: "sandbox:ready",
    SANDBOX_RUN_CODE: "sandbox:run_code",
    SANDBOX_RUN_DONE: "sandbox:run_done",

    SANDBOX_ALERT: "sandbox:alert",
    SANDBOX_PROMPT: "sandbox:prompt",
    SANDBOX_PROMPT_RESPONSE: "sandbox:prompt_response",
    SANDBOX_INPUT: "sandbox:input",
    SANDBOX_INPUT_RESPONSE: "sandbox:input_response",

    SANDBOX_CONSOLE_LOG: "sandbox:console_log",
    SANDBOX_CONSOLE_ERROR: "sandbox:console_error",
    SANDBOX_CONSOLE_WARN: "sandbox:console_warn",
    SANDBOX_CONSOLE_INFO: "sandbox:console_info",
  };

  function $(id) {
    return document.getElementById(id);
  }

  function stringifyValue(value) {
    if (typeof value === "undefined") return "undefined";
    if (value === null) return "null";
    if (value === Infinity) return "Infinity";
    if (value === -Infinity) return "-Infinity";
    if (value !== value) return "NaN"; // Check for NaN
    if (typeof value === "string") return value;

    try {
      return JSON.stringify(value);
    } catch (error) {
      return String(value);
    }
  }

  function postMessageSafe(targetWindow, type, payload) {
    if (!targetWindow) return;
    targetWindow.postMessage({ type, ...payload }, "*");
  }

  global.JsIdeLib = {
    IDE_EVENTS,
    $,
    stringifyValue,
    postMessageSafe
  };
})(window);
