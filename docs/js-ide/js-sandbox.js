(function () {
  "use strict";

  const { IDE_EVENTS, postMessageSafe, stringifyValue } = JsIdeLib;

  let hostWindow = window.parent !== window ? window.parent : window.opener;
  let sandboxConfig = {
    sourceName: "js-ide-user-code.js",
  };

  function emit(type, payload) {
    if (!hostWindow) return;
    postMessageSafe(hostWindow, type, payload || {});
  }

  function emitLine(type, text) {
    emit(type, { text: String(text) });
  }

  function injectAlert() {
    const nativeAlert = window.alert.bind(window);

    window.alert = function (message) {
      emitLine(IDE_EVENTS.SANDBOX_ALERT, message);
      return nativeAlert(message);
    };
  }

  function injectPrompt() {
    const nativePrompt = window.prompt.bind(window);

    window.prompt = function (message, defaultValue) {
      if (message !== undefined) {
        emitLine(IDE_EVENTS.SANDBOX_PROMPT, message);
      }

      const result = nativePrompt(message, defaultValue);

      emit(IDE_EVENTS.SANDBOX_PROMPT_RESPONSE, {
        value: result === null ? null : String(result),
      });

      return result;
    };
  }

  function injectConsole() {
    const nativeConsole = window.console;

    window.console = {
      log: function () {
        emitLine(
          IDE_EVENTS.SANDBOX_CONSOLE_LOG,
          Array.from(arguments).map(stringifyValue).join(" "),
        );
        return nativeConsole.log.apply(nativeConsole, arguments);
      },
      error: function () {
        emitLine(
          IDE_EVENTS.SANDBOX_CONSOLE_ERROR,
          Array.from(arguments).map(stringifyValue).join(" "),
        );
        return nativeConsole.error.apply(nativeConsole, arguments);
      },
      warn: function () {
        emitLine(
          IDE_EVENTS.SANDBOX_CONSOLE_WARN,
          Array.from(arguments).map(stringifyValue).join(" "),
        );
        return nativeConsole.warn.apply(nativeConsole, arguments);
      },
      info: function () {
        emitLine(
          IDE_EVENTS.SANDBOX_CONSOLE_INFO,
          Array.from(arguments).map(stringifyValue).join(" "),
        );
        return nativeConsole.info.apply(nativeConsole, arguments);
      },
    };
  }

  function injectInclude() {
    let loadedScripts = new Set();

    window.include = async function (fileName) {
      if (!fileName) {
        throw new Error("Missing filename argument.");
      }

      if (!loadedScripts) {
        loadedScripts = new Set();
      }

      if (loadedScripts.has(fileName)) {
        return;
      }

      const script = document.createElement("script");
      const source = localStorage.getItem(fileName);

      if (source) {
        const blob = new Blob([source], { type: "text/javascript" });
        script.src = URL.createObjectURL(blob);
      } else {
        script.src = new URL(fileName, window.location.href).href;
      }

      await new Promise((resolve, reject) => {
        script.onload = function () {
          loadedScripts.add(fileName);
          if (source) {
            URL.revokeObjectURL(script.src);
          }
          resolve();
        };

        script.onerror = function () {
          if (source) {
            URL.revokeObjectURL(script.src);
          }
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
          reject(
            new Error(
              `Failed to load script '${fileName}' from ${source ? "localStorage" : "network"}.`,
            ),
          );
        };

        document.head.appendChild(script);
      });
    };
  }

  function injectInput() {
    window.input = async function (prompt) {
      return new Promise((resolve, reject) => {
        function onMessage(event) {
          if (event.source !== hostWindow) return;

          const message = event.data || {};

          if (message.type === IDE_EVENTS.SANDBOX_INPUT_RESPONSE) {
            window.removeEventListener("message", onMessage);

            if (message.ok) {
              resolve(message.result);
            } else {
              reject(new Error(message.error));
            }
          }
        }
        window.addEventListener("message", onMessage);
        emitLine(IDE_EVENTS.SANDBOX_INPUT, prompt);
      });
    };
  }

  function injectClasses() {
    class Graphics {
      constructor(windowRef, width, height) {
        this.window = windowRef;
        this.canvas = windowRef.document.createElement("canvas");
        this.canvas.width = width;
        this.canvas.height = height;
        windowRef.document.body.appendChild(this.canvas);
        this.ctx = this.canvas.getContext("2d");
      }
    }

    Graphics.random = function random(min, max) {
      return Math.random() * (max - min) + min;
    };

    window.Graphics = Graphics;
  }

  async function runCode(code, options) {
    const settings = options || {};
    const sourceName = settings.sourceName || sandboxConfig.sourceName;
    const showResult = settings.showResult && !(code.includes("await "));
    const codeLineCount = code.split("\n").length;

    try {
      let result = undefined;
      if (showResult) {
        result = window.eval(`\n${code}\n//# sourceURL=${sourceName}`);
        if (result instanceof Promise) {
          result = await result;
        }
      } else {
        const wrappedCode = `(async function () {\n${code}\n})()\n//# sourceURL=${sourceName}`;
        result = await window.eval(wrappedCode);
      }
      emit(IDE_EVENTS.SANDBOX_RUN_DONE, {
        ok: true,
        result: result === undefined ? undefined : stringifyValue(result),
      });
    } catch (error) {
      let errorMessage = error && error.stack ? error.stack : error.message || String(error);
      errorMessage = errorMessage.split("at eval (<anonymous>)")[0].split("at runCode")[0].trim();
      errorMessage = errorMessage.replace(
        /at (.+) \(([^:]+):(\d+):(\d+)\)/g,
        (_, func, file, line, col) => {
          const lineNumber = Math.max(0, parseInt(line, 10)-1);
          if (lineNumber > codeLineCount) return ""
          return `in ${file}:${func} at line ${lineNumber}, column ${col}`;
        }
      ).trim();
      emit(IDE_EVENTS.SANDBOX_RUN_DONE, {
        ok: false,
        error: errorMessage,
      });
    }
  }

  window.addEventListener("message", function (event) {
    const message = event.data || {};

    if (event.source) {
      hostWindow = event.source;
    }

    switch (message.type) {
      case IDE_EVENTS.SANDBOX_INIT:
        sandboxConfig = Object.assign({}, sandboxConfig, message.config || {});
        emit(IDE_EVENTS.SANDBOX_READY, {});
        break;

      case IDE_EVENTS.SANDBOX_RUN_CODE:
        runCode(message.code || "", {
          showResult: message.showResult,
          sourceName: message.sourceName,
        });
        break;
    }
  });

  injectClasses();
  injectAlert();
  injectPrompt();
  injectInput();
  injectConsole();
  injectInclude();
})();
