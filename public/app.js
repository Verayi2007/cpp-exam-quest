const levels = window.CHALLENGES;
const storageKey = "cpp-quest-state-v2";

const el = {
  levelList: document.querySelector("#levelList"),
  progressText: document.querySelector("#progressText"),
  progressBar: document.querySelector("#progressBar"),
  prevPageBtn: document.querySelector("#prevPageBtn"),
  nextPageBtn: document.querySelector("#nextPageBtn"),
  pageText: document.querySelector("#pageText"),
  source: document.querySelector("#source"),
  title: document.querySelector("#title"),
  task: document.querySelector("#task"),
  inputSpec: document.querySelector("#inputSpec"),
  outputSpec: document.querySelector("#outputSpec"),
  concept: document.querySelector("#concept"),
  editor: document.querySelector("#editor"),
  monacoHost: document.querySelector("#monacoEditor"),
  errorLayer: document.querySelector("#errorLayer"),
  hintBtn: document.querySelector("#hintBtn"),
  answerBtn: document.querySelector("#answerBtn"),
  hintBox: document.querySelector("#hintBox"),
  resetCodeBtn: document.querySelector("#resetCodeBtn"),
  resetAllBtn: document.querySelector("#resetAllBtn"),
  runBtn: document.querySelector("#runBtn"),
  runState: document.querySelector("#runState"),
  statusPill: document.querySelector("#statusPill"),
  consoleOutput: document.querySelector("#consoleOutput"),
  autosave: document.querySelector("#autosave"),
  finishDialog: document.querySelector("#finishDialog"),
  closeFinishBtn: document.querySelector("#closeFinishBtn"),
  answerDialog: document.querySelector("#answerDialog"),
  answerTitle: document.querySelector("#answerTitle"),
  answerCode: document.querySelector("#answerCode"),
  closeAnswerBtn: document.querySelector("#closeAnswerBtn"),
  accountName: document.querySelector("#accountName"),
  syncState: document.querySelector("#syncState"),
  accountForm: document.querySelector("#accountForm"),
  usernameInput: document.querySelector("#usernameInput"),
  passwordInput: document.querySelector("#passwordInput"),
  loginBtn: document.querySelector("#loginBtn"),
  registerBtn: document.querySelector("#registerBtn"),
  logoutBtn: document.querySelector("#logoutBtn")
};

let state = loadState();
let current = clampLevel(state.current || 1);
let hintIndex = 0;
let highlightedLines = [];
let monacoEditor = null;
let monacoDecorations = [];
let isSettingEditorValue = false;
let account = { user: null, available: true, syncing: false };
let syncTimer = 0;
let skipServerSync = false;
const levelsPerPage = 6;
const pageCount = Math.ceil(levels.length / levelsPerPage);
let currentPage = Math.floor((current - 1) / levelsPerPage) + 1;

initCodeEditor();
renderLevels();
selectLevel(current);
initAccount();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || "{}");
    return {
      unlocked: Math.max(1, Number(saved.unlocked || 1)),
      current: Math.max(1, Number(saved.current || 1)),
      passed: Array.isArray(saved.passed) ? saved.passed : [],
      codes: saved.codes && typeof saved.codes === "object" ? saved.codes : {}
    };
  } catch {
    return { unlocked: 1, current: 1, passed: [], codes: {} };
  }
}

function saveState() {
  state.current = current;
  saveLocalState();
  queueServerSync();
}

function saveLocalState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function snapshotState() {
  return {
    unlocked: state.unlocked,
    current,
    passed: [...state.passed],
    codes: { ...state.codes }
  };
}

function normalizeState(input) {
  const value = input && typeof input === "object" ? input : {};
  const passed = Array.isArray(value.passed)
    ? [...new Set(value.passed.map(Number).filter(id => Number.isInteger(id) && id >= 1 && id <= levels.length))].sort((a, b) => a - b)
    : [];
  return {
    unlocked: Math.min(Math.max(Number(value.unlocked || 1), 1), levels.length),
    current: Math.min(Math.max(Number(value.current || 1), 1), levels.length),
    passed,
    codes: value.codes && typeof value.codes === "object" ? value.codes : {}
  };
}

function applyAccountState(nextState) {
  skipServerSync = true;
  state = normalizeState(nextState);
  current = clampLevel(state.current || 1);
  currentPage = Math.floor((current - 1) / levelsPerPage) + 1;
  saveLocalState();
  renderLevels();
  selectLevel(current);
  skipServerSync = false;
}

async function apiJson(url, options = {}) {
  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || `请求失败（HTTP ${response.status}）`);
  return data;
}

function renderAccount() {
  if (!el.accountName) return;
  if (!account.available) {
    el.accountName.textContent = "访客模式";
    el.syncState.textContent = "静态页面";
    el.accountForm.hidden = true;
    el.logoutBtn.hidden = true;
    return;
  }
  if (account.user) {
    el.accountName.textContent = account.user.username;
    el.syncState.textContent = account.syncing ? "同步中" : "已登录";
    el.accountForm.hidden = true;
    el.logoutBtn.hidden = false;
    return;
  }
  el.accountName.textContent = "访客模式";
  el.syncState.textContent = "本机保存";
  el.accountForm.hidden = false;
  el.logoutBtn.hidden = true;
}

async function initAccount() {
  if (!el.accountForm) return;
  try {
    const data = await apiJson("./api/auth/me");
    if (data.authenticated) {
      account.user = data.user;
      applyAccountState(data.state);
    }
  } catch {
    account.available = false;
  } finally {
    renderAccount();
  }
}

function queueServerSync() {
  if (skipServerSync || !account.user || !account.available) return;
  window.clearTimeout(syncTimer);
  syncTimer = window.setTimeout(syncStateNow, 500);
}

async function syncStateNow() {
  if (!account.user || !account.available) return;
  account.syncing = true;
  renderAccount();
  try {
    await apiJson("./api/state", {
      method: "PUT",
      body: JSON.stringify({ state: snapshotState() })
    });
    el.syncState.textContent = "已同步";
  } catch (error) {
    el.syncState.textContent = "同步失败";
    console.warn(error);
  } finally {
    account.syncing = false;
    window.setTimeout(renderAccount, 900);
  }
}

async function signIn(mode) {
  const username = el.usernameInput.value.trim();
  const password = el.passwordInput.value;
  el.syncState.textContent = mode === "register" ? "注册中" : "登录中";
  try {
    const data = await apiJson(`./api/auth/${mode}`, {
      method: "POST",
      body: JSON.stringify({ username, password, state: snapshotState() })
    });
    account.user = data.user;
    el.passwordInput.value = "";
    applyAccountState(data.state);
    renderAccount();
  } catch (error) {
    el.syncState.textContent = error.message;
  }
}

async function logout() {
  try {
    await apiJson("./api/auth/logout", { method: "POST", body: "{}" });
  } catch (error) {
    console.warn(error);
  }
  account.user = null;
  renderAccount();
}

function initCodeEditor() {
  if (!el.monacoHost || typeof window.require !== "function") return;

  const monacoBase = "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min";
  window.MonacoEnvironment = {
    getWorkerUrl() {
      const worker = `
        self.MonacoEnvironment = { baseUrl: "${monacoBase}/" };
        importScripts("${monacoBase}/vs/base/worker/workerMain.js");
      `;
      return `data:text/javascript;charset=utf-8,${encodeURIComponent(worker)}`;
    }
  };

  window.require.config({ paths: { vs: `${monacoBase}/vs` } });
  window.require(["vs/editor/editor.main"], () => {
    window.monaco.editor.defineTheme("cppQuestDark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "keyword", foreground: "82b7ff" },
        { token: "number", foreground: "ffd166" },
        { token: "string", foreground: "98e2b8" }
      ],
      colors: {
        "editor.background": "#0f1211",
        "editor.foreground": "#f0f6fc",
        "editorLineNumber.foreground": "#5f6b66",
        "editorLineNumber.activeForeground": "#b9c8d8",
        "editorCursor.foreground": "#82b7ff",
        "editor.selectionBackground": "#245445",
        "editor.lineHighlightBackground": "#17211d",
        "editorGutter.background": "#0f1211"
      }
    });

    monacoEditor = window.monaco.editor.create(el.monacoHost, {
      value: el.editor.value,
      language: "cpp",
      theme: "cppQuestDark",
      automaticLayout: true,
      minimap: { enabled: false },
      fontFamily: 'Consolas, "Cascadia Mono", "Courier New", monospace',
      fontSize: 15,
      lineHeight: 23,
      tabSize: 4,
      insertSpaces: true,
      scrollBeyondLastLine: false,
      renderLineHighlight: "all",
      roundedSelection: false,
      overviewRulerBorder: false,
      wordWrap: "off",
      bracketPairColorization: { enabled: true },
      guides: { bracketPairs: true, indentation: true }
    });

    el.monacoHost.parentElement.classList.add("monaco-ready");
    monacoEditor.onDidChangeModelContent(() => {
      handleEditorChange(monacoEditor.getValue());
    });
    monacoEditor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter, submitCode);
    renderErrorHighlights();
  });
}

function getEditorValue() {
  return monacoEditor ? monacoEditor.getValue() : el.editor.value;
}

function setEditorValue(value) {
  isSettingEditorValue = true;
  const nextValue = String(value || "");
  el.editor.value = nextValue;
  if (monacoEditor) {
    monacoEditor.setValue(nextValue);
  }
  isSettingEditorValue = false;
}

function handleEditorChange(value) {
  if (isSettingEditorValue) return;
  clearErrorHighlights();
  state.codes[current] = value;
  saveState();
  showAutosaveFlash();
}

function showAutosaveFlash() {
  el.autosave.textContent = "已保存";
  window.clearTimeout(el.autosave._timer);
  el.autosave._timer = window.setTimeout(() => {
    el.autosave.textContent = "自动保存";
  }, 900);
}

function clampLevel(id) {
  return Math.min(Math.max(Number(id) || 1, 1), levels.length);
}

function levelById(id) {
  return levels.find(level => level.id === Number(id));
}

function renderLevels() {
  const passedCount = state.passed.length;
  el.progressText.textContent = `${passedCount} / ${levels.length}`;
  el.progressBar.style.width = `${Math.round((passedCount / levels.length) * 100)}%`;
  el.pageText.textContent = `${currentPage} / ${pageCount}`;
  el.prevPageBtn.disabled = currentPage === 1;
  el.nextPageBtn.disabled = currentPage === pageCount;

  el.levelList.innerHTML = "";
  const start = (currentPage - 1) * levelsPerPage;
  for (const level of levels.slice(start, start + levelsPerPage)) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "level-item";
    button.disabled = level.id > state.unlocked;
    if (level.id === current) button.classList.add("active");
    if (state.passed.includes(level.id)) button.classList.add("passed");
    button.innerHTML = `
      <span class="level-no">${String(level.id).padStart(2, "0")}</span>
      <span class="level-title">
        <strong>${escapeHtml(level.title)}</strong>
        <span>${escapeHtml(level.source)}</span>
      </span>
      <span class="badge">${state.passed.includes(level.id) ? "已过" : level.id > state.unlocked ? "锁定" : level.difficulty}</span>
    `;
    button.addEventListener("click", () => selectLevel(level.id));
    el.levelList.appendChild(button);
  }
}

function selectLevel(id) {
  id = clampLevel(id);
  if (id > state.unlocked) return;

  current = id;
  currentPage = Math.floor((current - 1) / levelsPerPage) + 1;
  hintIndex = 0;
  const level = levelById(current);
  el.source.textContent = `${level.source} / ${level.difficulty}`;
  el.title.textContent = `${String(level.id).padStart(2, "0")}  ${level.title}`;
  el.task.textContent = level.task;
  el.inputSpec.textContent = level.input;
  el.outputSpec.textContent = level.output;
  el.concept.textContent = level.concept;
  setEditorValue(Object.prototype.hasOwnProperty.call(state.codes, current) ? state.codes[current] : "");
  clearErrorHighlights();
  closeAnswer();
  el.hintBox.hidden = true;
  setStatus(state.passed.includes(current) ? "已通过" : "未提交", state.passed.includes(current) ? "pass" : "");
  el.runState.textContent = "等待提交";
  el.consoleOutput.textContent = "写完代码后点击“提交运行”。通过后会自动解锁下一关。";
  saveState();
  renderLevels();
}

function setStatus(text, tone) {
  el.statusPill.textContent = text;
  el.statusPill.className = `status-pill ${tone || ""}`.trim();
}

function showHint() {
  const level = levelById(current);
  const hint = level.hints[hintIndex % level.hints.length];
  hintIndex += 1;
  el.hintBox.hidden = false;
  el.hintBox.textContent = hint;
}

function showAnswer() {
  const level = levelById(current);
  el.answerTitle.textContent = `${String(level.id).padStart(2, "0")}  ${level.title}`;
  el.answerCode.textContent = window.SOLUTIONS[level.id] || "这一关的参考答案正在整理中。";
  el.answerDialog.hidden = false;
}

function closeAnswer() {
  el.answerDialog.hidden = true;
}

function findFullWidthIssues(code) {
  const suspicious = {
    "；": "中文分号 `；`，请改成英文半角分号 `;`",
    "，": "中文逗号 `，`，请改成英文半角逗号 `,`",
    "（": "中文左括号 `（`，请改成英文半角括号 `(`",
    "）": "中文右括号 `）`，请改成英文半角括号 `)`",
    "｛": "中文左大括号 `｛`，请改成英文半角大括号 `{`",
    "｝": "中文右大括号 `｝`，请改成英文半角大括号 `}`",
    "“": "中文引号 `“`，请改成英文半角双引号 `\"`",
    "”": "中文引号 `”`，请改成英文半角双引号 `\"`",
    "‘": "中文单引号 `‘`，请改成英文半角单引号 `'`",
    "’": "中文单引号 `’`，请改成英文半角单引号 `'`"
  };
  const issues = [];
  let inBlockComment = false;
  let inString = false;
  let inChar = false;
  let escaped = false;
  code.split("\n").forEach((line, index) => {
    let inLineComment = false;
    for (let offset = 0; offset < line.length; offset++) {
      const char = line[offset];
      const next = line[offset + 1];
      if (inLineComment) break;
      if (inBlockComment) {
        if (char === "*" && next === "/") {
          inBlockComment = false;
          offset++;
        }
        continue;
      }
      if (inString || inChar) {
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === "\\") {
          escaped = true;
          continue;
        }
        if (inString && char === '"') inString = false;
        if (inChar && char === "'") inChar = false;
        continue;
      }
      if (char === "/" && next === "/") {
        inLineComment = true;
        continue;
      }
      if (char === "/" && next === "*") {
        inBlockComment = true;
        offset++;
        continue;
      }
      if (char === '"') {
        inString = true;
        continue;
      }
      if (char === "'") {
        inChar = true;
        continue;
      }
      if (suspicious[char]) {
        issues.push({ line: index + 1, message: suspicious[char] });
      }
    }
  });
  return issues;
}

function extractErrorLines(stderr) {
  const lines = [];
  const pattern = /main\.cpp:(\d+)(?::(\d+))?/g;
  let match;
  while ((match = pattern.exec(String(stderr || "")))) {
    lines.push(Number(match[1]));
  }
  return [...new Set(lines)].filter(line => Number.isInteger(line) && line > 0);
}

function showErrorHighlights(lines) {
  highlightedLines = [...new Set(lines)].filter(line => Number.isInteger(line) && line > 0);
  renderErrorHighlights();
}

function clearErrorHighlights() {
  highlightedLines = [];
  renderErrorHighlights();
}

function renderErrorHighlights() {
  if (monacoEditor && window.monaco) {
    monacoDecorations = monacoEditor.deltaDecorations(
      monacoDecorations,
      highlightedLines.map(line => ({
        range: new window.monaco.Range(line, 1, line, 1),
        options: { isWholeLine: true, className: "monaco-error-line" }
      }))
    );
    window.monaco.editor.setModelMarkers(
      monacoEditor.getModel(),
      "judge",
      highlightedLines.map(line => ({
        startLineNumber: line,
        startColumn: 1,
        endLineNumber: line,
        endColumn: 1,
        severity: window.monaco.MarkerSeverity.Error,
        message: "这一行可能有语法或输出逻辑问题。"
      }))
    );
    return;
  }

  const lineHeight = 23.25;
  const topPadding = 18;
  el.errorLayer.innerHTML = "";
  for (const line of highlightedLines) {
    const marker = document.createElement("div");
    marker.className = "error-line";
    marker.style.top = `${topPadding + (line - 1) * lineHeight - el.editor.scrollTop}px`;
    marker.style.height = `${lineHeight}px`;
    el.errorLayer.appendChild(marker);
  }
}

async function submitCode() {
  const level = levelById(current);
  const code = getEditorValue();
  clearErrorHighlights();
  const fullWidthIssues = findFullWidthIssues(code);
  if (fullWidthIssues.length) {
    showErrorHighlights(fullWidthIssues.map(issue => issue.line));
    setStatus("未通过", "fail");
    el.consoleOutput.textContent = [
      "发现中文全角符号，C++ 编译器无法识别。",
      "",
      ...fullWidthIssues.map(issue => `第 ${issue.line} 行：${issue.message}`),
      "",
      "对应代码行已经标红。切换到英文输入法后替换这些符号。"
    ].join("\n");
    return;
  }
  el.runBtn.disabled = true;
  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(window.location.hostname);
  el.runState.textContent = isLocal ? "本地编译运行中..." : "沙箱编译运行中...";
  setStatus("判题中", "");
  el.consoleOutput.textContent = isLocal ? "正在提交给本地判题器。" : "正在提交给隔离判题沙箱。";

  try {
    let result;
    if (isLocal) {
      const response = await fetch("./api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: level.id, code })
      });
      result = await response.json();
    } else {
      result = await window.runRemoteJudge(level.id, code);
    }
    handleJudgeResult(result);
  } catch (error) {
    setStatus("连接失败", "fail");
    el.consoleOutput.textContent = [
      isLocal ? "没有连上本地判题服务。" : "没有连上隔离判题沙箱。",
      "",
      isLocal ? "确认你是通过 node server.js 启动页面，而不是直接打开 HTML 文件。" : "请稍后重试；如果持续失败，可能是 Judge0 公共服务暂时繁忙。",
      String(error.message || error)
    ].join("\n");
  } finally {
    el.runBtn.disabled = false;
    el.runState.textContent = "等待提交";
  }
}

function handleJudgeResult(result) {
  if (result.passed) {
    clearErrorHighlights();
    setStatus("已通过", "pass");
    el.consoleOutput.textContent = formatPass(result);

    if (!state.passed.includes(current)) {
      state.passed.push(current);
      state.passed.sort((a, b) => a - b);
    }
    state.unlocked = Math.max(state.unlocked, Math.min(current + 1, levels.length));
    saveState();
    renderLevels();

    if (current === levels.length) {
      el.finishDialog.hidden = false;
    } else {
      window.setTimeout(() => selectLevel(current + 1), 850);
    }
    return;
  }

  setStatus("未通过", "fail");
  showErrorHighlights(result.errorLines || extractErrorLines(result.stderr));
  el.consoleOutput.textContent = formatFailure(result);
}

function formatPass(result) {
  const lines = [result.message || "通过。", ""];
  for (const test of result.tests || []) {
    lines.push(`测试 ${test.index}: 通过`);
    if (test.input) lines.push(`输入: ${test.input.trim()}`);
    lines.push(`输出: ${test.stdout.trim() || "(无输出)"}`);
    lines.push("");
  }
  return lines.join("\n").trim();
}

function formatFailure(result) {
  const lines = [result.message || "没有通过。", ""];
  if (result.analysis) {
    lines.push("知识点解析:");
    lines.push(result.analysis);
    lines.push("");
  }
  if (result.hint) {
    lines.push("提示:");
    lines.push(result.hint);
    lines.push("");
  }
  if (result.stderr) {
    lines.push("编译/运行错误:");
    lines.push(cleanPathNoise(result.stderr));
    lines.push("");
  }
  for (const test of result.tests || []) {
    lines.push(`测试 ${test.index}: ${test.passed ? "通过" : "未通过"}`);
    if (test.input) lines.push(`输入: ${test.input.trim()}`);
    lines.push(`期望: ${formatExpected(test.expected)}`);
    lines.push(`你的输出: ${test.stdout.trim() || "(无输出)"}`);
    if (test.stderr) lines.push(`错误输出: ${cleanPathNoise(test.stderr).trim()}`);
    if (test.timedOut) lines.push("这一组运行超时，优先检查循环退出条件。");
    lines.push("");
  }
  return lines.join("\n").trim();
}

function formatExpected(expected) {
  if (Array.isArray(expected)) return expected.join(" ");
  return String(expected);
}

function cleanPathNoise(text) {
  return String(text).replace(/[A-Za-z]:[^\n\r]*?main\.cpp/g, "main.cpp");
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, ch => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[ch]);
}

function resetCurrentCode() {
  if (!confirm("清空本关代码？")) return;
  setEditorValue("");
  clearErrorHighlights();
  state.codes[current] = "";
  saveState();
}

function resetAll() {
  if (!confirm("确定重置全部闯关进度和代码？")) return;
  state = { unlocked: 1, current: 1, passed: [], codes: {} };
  current = 1;
  currentPage = 1;
  saveState();
  renderLevels();
  selectLevel(1);
}

el.editor.addEventListener("input", () => handleEditorChange(el.editor.value));

el.editor.addEventListener("scroll", renderErrorHighlights);
el.editor.addEventListener("keydown", event => {
  if (event.key !== "Tab") return;
  event.preventDefault();
  const start = el.editor.selectionStart;
  const end = el.editor.selectionEnd;
  const value = el.editor.value;
  setEditorValue(value.slice(0, start) + "    " + value.slice(end));
  el.editor.selectionStart = el.editor.selectionEnd = start + 4;
  handleEditorChange(el.editor.value);
});

el.hintBtn.addEventListener("click", showHint);
el.answerBtn.addEventListener("click", showAnswer);
el.resetCodeBtn.addEventListener("click", resetCurrentCode);
el.resetAllBtn.addEventListener("click", resetAll);
el.prevPageBtn.addEventListener("click", () => {
  if (currentPage <= 1) return;
  currentPage -= 1;
  renderLevels();
});
el.nextPageBtn.addEventListener("click", () => {
  if (currentPage >= pageCount) return;
  currentPage += 1;
  renderLevels();
});
el.runBtn.addEventListener("click", submitCode);
el.closeFinishBtn.addEventListener("click", () => {
  el.finishDialog.hidden = true;
});
el.closeAnswerBtn.addEventListener("click", closeAnswer);
el.accountForm.addEventListener("submit", event => {
  event.preventDefault();
  signIn("login");
});
el.registerBtn.addEventListener("click", () => signIn("register"));
el.logoutBtn.addEventListener("click", logout);
el.answerDialog.addEventListener("click", event => {
  if (event.target === el.answerDialog) closeAnswer();
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeAnswer();
});
