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
  hintBtn: document.querySelector("#hintBtn"),
  hintBox: document.querySelector("#hintBox"),
  resetCodeBtn: document.querySelector("#resetCodeBtn"),
  resetAllBtn: document.querySelector("#resetAllBtn"),
  runBtn: document.querySelector("#runBtn"),
  runState: document.querySelector("#runState"),
  statusPill: document.querySelector("#statusPill"),
  consoleOutput: document.querySelector("#consoleOutput"),
  autosave: document.querySelector("#autosave"),
  finishDialog: document.querySelector("#finishDialog"),
  closeFinishBtn: document.querySelector("#closeFinishBtn")
};

let state = loadState();
let current = clampLevel(state.current || 1);
let hintIndex = 0;
const levelsPerPage = 6;
const pageCount = Math.ceil(levels.length / levelsPerPage);
let currentPage = Math.floor((current - 1) / levelsPerPage) + 1;

renderLevels();
selectLevel(current);

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
  localStorage.setItem(storageKey, JSON.stringify(state));
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
  el.editor.value = Object.prototype.hasOwnProperty.call(state.codes, current) ? state.codes[current] : "";
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

async function submitCode() {
  const level = levelById(current);
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
        body: JSON.stringify({ id: level.id, code: el.editor.value })
      });
      result = await response.json();
    } else {
      result = await window.runRemoteJudge(level.id, el.editor.value);
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
  el.editor.value = "";
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

el.editor.addEventListener("input", () => {
  state.codes[current] = el.editor.value;
  saveState();
  el.autosave.textContent = "已保存";
  window.clearTimeout(el.autosave._timer);
  el.autosave._timer = window.setTimeout(() => {
    el.autosave.textContent = "自动保存";
  }, 900);
});

el.editor.addEventListener("keydown", event => {
  if (event.key !== "Tab") return;
  event.preventDefault();
  const start = el.editor.selectionStart;
  const end = el.editor.selectionEnd;
  const value = el.editor.value;
  el.editor.value = value.slice(0, start) + "    " + value.slice(end);
  el.editor.selectionStart = el.editor.selectionEnd = start + 4;
  state.codes[current] = el.editor.value;
  saveState();
});

el.hintBtn.addEventListener("click", showHint);
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
