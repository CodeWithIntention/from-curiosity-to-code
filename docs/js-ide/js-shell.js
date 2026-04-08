(async function () {
  "use strict";

  const {
    IDE_EVENTS,
    $,
    stringifyValue,
    postMessageSafe  } = JsIdeLib;

  const output = $("output");
  const shellPrompt = $("shellPrompt");
  const shellInput = $("shellInput");
  const shellInputCancelBtn = $("shellInputCancelBtn");
  const clearShellBtn = $("clearShellBtn");
  const resetShellBtn = $("resetShellBtn");

  const shellHistory = [];
  let historyIndex = -1;
  let sandboxWindow = null;

  const shellMessages = {
    jsInputPlaceholder: "Type script here and press Enter",
    inputPlaceholder: "Enter input here (Esc to Cancel)",
    shellResetMessage: "Variables and state were cleared after reset.",
    shellReadyMessage: "JavaScript shell ready.",
    confirmReset: "Are you sure you want to reset the shell? This will clear all variables and state."
  };

  const shellConsole = {
    log: (...args) => {
      args = args.map(stringifyValue);
      appendLine(args.join(" "), "log");
    },

    error: (...args) => {
      args = args.map(stringifyValue);
      appendLine(args.join(" "), "error");
    },

    warn: (...args) => {
      args = args.map(stringifyValue);
      appendLine(args.join(" "), "alert");
    },

    info: (...args) => {
      args = args.map(stringifyValue);
      appendLine(args.join(" "), "info");
    },

    debug: (...args) => {
      args = args.map(stringifyValue);
      appendLine(args.join(" "), "info");
    },
  };

  async function createSandbox(forceReset = false) {
    const oldFrame = $("sandbox");
    const newFrame = oldFrame.cloneNode(false);
    oldFrame.parentNode.replaceChild(newFrame, oldFrame);

    return new Promise((resolve) => {
      newFrame.addEventListener("load", function () {
        sandboxWindow = newFrame.contentWindow;

        if (!forceReset) {
          postMessageSafe(sandboxWindow, IDE_EVENTS.SANDBOX_INIT, {
            config: {
              sourceName: "js-shell-user-code.js",
            },
          });
        }
        resolve();
      });
      newFrame.src = new URL("js-sandbox.html", window.location.href).href;
    }); 
  } 

  async function resetShell(forceReset = false) {
    if (!forceReset && !confirm(shellMessages.confirmReset)) {
      return;
    }
    clearInput();
    clearShell(forceReset);
    await createSandbox(forceReset);

    if (!forceReset) {
      appendLine(shellMessages.shellResetMessage, "info");
    }
  }

  function clearShell(forceReset = false) {
    output.innerHTML = "";
    if (!forceReset) {
      appendLine(shellMessages.shellReadyMessage, "info");
    }
  }

  function clearInput(inputValue) {
    const resolve = shellInput.pendingInputResolver;
    shellInput.pendingInputResolver = null;

    if (resolve) {
      resolve(inputValue);
    }

    if (shellPrompt.inputLine) {
      shellPrompt.inputLine.className = "line input";
      shellPrompt.inputLine = null;
    }

    shellPrompt.className = "normal";
    shellInput.value = "";
    shellInput.disabled = false;
    shellInput.placeholder = shellMessages.jsInputPlaceholder;
    shellInputCancelBtn.hidden = true;
    shellInput.focus();
  }

  function appendLine(text, className) {
    const line = document.createElement("div");
    line.className = "line " + (className || "result");
    line.textContent = String(text);
    output.appendChild(line);
    output.scrollTop = output.scrollHeight;
    return line;
  }

  function appendInput(text, className) {
    return appendLine(
      `${shellPrompt.textContent} ${text}`,
      className || "input",
    );
  }

  window.addEventListener("message", (event) => {
    if (event.source !== sandboxWindow) return;

    const message = event.data || {};

    switch (message.type) {
      case IDE_EVENTS.SANDBOX_READY:
        postMessageSafe(window.parent, IDE_EVENTS.SHELL_READY, {});
        break;

      case IDE_EVENTS.SANDBOX_ALERT:
        appendLine(message.text, "alert");
        break;

      case IDE_EVENTS.SANDBOX_PROMPT:
        appendLine(message.text, "input");
        break;

      case IDE_EVENTS.SANDBOX_PROMPT_RESPONSE:
        if (message.value === null) {
          appendInput("<Cancel>", "alert");
        } else {
          appendInput(message.value);
        }
        break;

      case IDE_EVENTS.SANDBOX_CONSOLE_LOG:
        shellConsole.log(message.text);
        break;
      case IDE_EVENTS.SANDBOX_CONSOLE_ERROR:
        shellConsole.error(message.text);
        break;
      case IDE_EVENTS.SANDBOX_CONSOLE_WARN:
        shellConsole.warn(message.text);
        break;
      case IDE_EVENTS.SANDBOX_CONSOLE_INFO:
        shellConsole.info(message.text);
        break;

      case IDE_EVENTS.SANDBOX_INPUT:
        handleSandboxInput(message.text);
        break;
    }
  });

  async function handleSandboxInput(promptText) {
    const line = appendLine(promptText, "input pulse");
    clearInput();

    const result = await new Promise((resolve) => {
      shellPrompt.className = "pulse";
      shellPrompt.inputLine = line;
      shellInput.pendingInputResolver = resolve;
      shellInput.placeholder = shellMessages.inputPlaceholder;
      shellInputCancelBtn.hidden = false;
    });

    postMessageSafe(sandboxWindow, IDE_EVENTS.SANDBOX_INPUT_RESPONSE, {
      ok: true,
      result,
    });
  }

  function shouldDisplayResult(result) {
    return typeof result !== "undefined";
  }

  async function evalCode(code, options) {
    return new Promise((resolve, reject) => {
      function onMessage(event) {
        if (event.source !== sandboxWindow) return;

        const message = event.data || {};

        if (message.type === IDE_EVENTS.SANDBOX_RUN_DONE) {
          window.removeEventListener("message", onMessage);

          if (message.ok) {
            resolve(message.result);
          } else {
            reject(message.error);
          }
        }
      }
      window.addEventListener("message", onMessage);
      postMessageSafe(sandboxWindow, IDE_EVENTS.SANDBOX_RUN_CODE, {
        code,
        showResult: options && options.showResult,
        sourceName: (options && options.sourceName) || undefined,
      });
    });
  }

  async function runCode(code, options, completionCallback) {
    const settings = options || {};
    const echoInput = !!settings.echoInput;
    const showResult = settings.showResult !== false;

    if (!code || !code.trim()) {
      if (completionCallback) completionCallback(true);
      return;
    }

    if (echoInput) appendInput(code);

    let sandbox = sandboxWindow;
    let completed = false;
    let evalCodeError = null;

    try {
      const result = await evalCode(code, settings);
      completed = sandbox === sandboxWindow;

      if (completed && showResult && shouldDisplayResult(result)) {
        appendLine(result, "result");
      }
    } catch (error) {
      evalCodeError = error;
      completed = sandbox === sandboxWindow;
      if (completed) {
        appendLine(error.message || error.name, "error");
      }
    } finally {
      if (completionCallback) {
        completionCallback(completed, evalCodeError);
      }
    }
  }

  shellInput.handleInput = async function (input) {
    if (this.pendingInputResolver) {
      this.value = "";

      if (input === null) {
        appendInput("<Cancel>", "alert");
      } else {
        appendInput(input);
      }
      clearInput(input);
    } else if (input !== null) {
      this.value = "";
      input = input.trim();
      if (!input) return;

      shellHistory.push(input);
      historyIndex = shellHistory.length;
      await runCode(input, { echoInput: true, showResult: true, sourceName: "shell-input" });
    }
  };

  shellInput.addEventListener("keydown", async function (event) {
    if (event.key === "Escape") {
      if (this.pendingInputResolver) {
        event.preventDefault();
        await this.handleInput(null);
      }
    } else if (event.key === "Enter") {
      event.preventDefault();
      await this.handleInput(this.value);
    } else if (event.key === "ArrowUp") {
      if (!shellHistory.length) return;
      event.preventDefault();
      historyIndex = Math.max(0, historyIndex - 1);
      shellInput.value = shellHistory[historyIndex] || "";
    } else if (event.key === "ArrowDown") {
      if (!shellHistory.length) return;
      event.preventDefault();
      historyIndex = Math.min(shellHistory.length, historyIndex + 1);
      this.value =
        historyIndex < shellHistory.length ? shellHistory[historyIndex] : "";
    }
  });

  shellInputCancelBtn.addEventListener("click", async function () {
    await shellInput.handleInput(null);
    clearInput();
  });

  clearShellBtn.addEventListener("click", function () {
    clearShell(true);
 });

  resetShellBtn.addEventListener("click", async function () {
    await resetShell(false);
  });

  window.addEventListener("message", async function (event) {
    if (event.source !== window.parent) return;
    const message = event.data || {};

    if (message.type === IDE_EVENTS.SHELL_RUN) {
      const fileName = message.fileName || "editor code";
      const code = message.code || "";

      postMessageSafe(window.parent, IDE_EVENTS.SHELL_RUN_STARTED, {
        fileName,
      });

      await resetShell(true);
      clearInput();
      appendLine(`======= Running ${fileName} =======`, "info");

      await runCode(code, { showResult: false, sourceName: fileName }, function (completed, errorMessage) {
        clearInput();

        if (completed) {
          appendLine(`======= Finished ${fileName} =======`, "info");
          postMessageSafe(window.parent, IDE_EVENTS.SHELL_RUN_FINISHED, {
            fileName,
            error: errorMessage
          });
        }
      });
    } else if (message.type === IDE_EVENTS.SHELL_CLEAR) {
      clearShell(false);
    } else if (message.type === IDE_EVENTS.SHELL_RESET) {
      resetShell();
    }
  });

  clearShell();
  clearInput();
  await createSandbox();
})();
