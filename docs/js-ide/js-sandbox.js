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

  function injectConfirm() {
    const nativeConfirm = window.confirm.bind(window);

    window.confirm = function (message) {
      emitLine(IDE_EVENTS.SANDBOX_CONFIRM, message);

      const response = nativeConfirm(message);

      emit(IDE_EVENTS.SANDBOX_CONFIRM_RESPONSE, {
        value: response,
      });

      return response;
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
      debug: function () {
        emitLine(
          IDE_EVENTS.SANDBOX_CONSOLE_DEBUG,
          Array.from(arguments).map(stringifyValue).join(" "),
        );
        return nativeConsole.debug.apply(nativeConsole, arguments);
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

  async function runCode(code, options) {
    const settings = options || {};
    const sourceName = settings.sourceName || sandboxConfig.sourceName;
    const showResult = settings.showResult || false;
    let sourceUrl = sourceName;

    try {
      let result = undefined;

      if (showResult) {
        if (code.includes("await ")) {
          code = `(async () => { ${code} \n})()`;
        }
        result = window.eval(`${code}\n//# sourceURL=${sourceName}`);
        if (result instanceof Promise) {
          result = await result;
        }
      } else {
        const blob = new Blob([code], { type: "text/javascript" });
        sourceUrl = URL.createObjectURL(blob);

        result = await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.id = "runCodeScript"
          script.type = "module";

          script.textContent = `
            // Top-level await is allowed here
            try {
              await import('${sourceUrl}');
              runCodeScript.onfinish();
            } catch (err) {
              runCodeScript.onfinish(err);
            }
          `;

          script.onfinish = (error) => {
            URL.revokeObjectURL(sourceUrl);
            document.body.removeChild(script);
            if (error) {
              reject(error);
            } else {
              resolve();
            }
          };

          document.body.appendChild(script);
        });   
      }
      emit(IDE_EVENTS.SANDBOX_RUN_DONE, {
        ok: true,
        result: result == undefined ? undefined : stringifyValue(result),
      });
    } catch (error) {
      const regexTestSafari = /^.*@/;
      const errorDescription = error.message || String(error);
      let errorMessage = error.stack || errorDescription;

      if (regexTestSafari.test(errorMessage)) {
        if (errorMessage.startsWith("eval@") || errorMessage.startsWith("eval code@")) {
          errorMessage = errorDescription;
        } else {
          errorMessage = errorMessage.replaceAll("@", "\n    at ");
          errorMessage = `${errorDescription}\n${errorMessage}`;
        }
      } else {
        errorMessage = errorMessage.split("at eval (<anonymous>)")[0].split("at runCode")[0].trim();
      }
      
      if (sourceUrl !== sourceName) {
        errorMessage = errorMessage.replaceAll(sourceUrl, sourceName);
      }

      let match = errorMessage.match(/:(\d+):(\d+)/);
      if (match && match.length > 2) {
        error.line = Number(match[1]);
        error.column = Number(match[2]);
      }
      emit(IDE_EVENTS.SANDBOX_RUN_DONE, {
        ok: false,
        error: {message: errorMessage, line: error.line, column: error.column},
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

  function reportError(errorInfo) {
    runCodePromiseReject && runCodePromiseReject(errorInfo);
  }

  injectAlert();
  injectPrompt();
  injectConfirm();
  injectInput();
  injectConsole();
  injectInclude();
})();
