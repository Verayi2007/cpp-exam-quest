const http = require("http");
const fs = require("fs/promises");
const fss = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const challenges = require("./public/challenges.js");

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const TMP_ROOT = path.join(ROOT, ".tmp");
const PORT = Number(process.env.PORT || 4173);
const GPP = process.env.GPP || "g++";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body)
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", chunk => {
      data += chunk;
      if (data.length > 400_000) {
        reject(new Error("代码太长了，先控制在 400KB 以内。"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sanitizeSource(source) {
  let code = String(source || "").replace(/\r\n/g, "\n");
  code = code.replace(/#\s*include\s*<iostream\.h>/g, "#include <iostream>\nusing namespace std;");
  code = code.replace(/#\s*include\s*<iomanip\.h>/g, "#include <iomanip>");
  code = code.replace(/#\s*include\s*<math\.h>/g, "#include <cmath>");
  code = code.replace(/\bvoid\s+main\s*\(/g, "int main(");

  const needsIostream = /\b(cin|cout|endl)\b/.test(code);
  if (needsIostream && !/#\s*include\s*<iostream>/.test(code)) {
    code = "#include <iostream>\nusing namespace std;\n" + code;
  }
  return code;
}

function findFullWidthIssues(source) {
  const messages = {
    "；": "中文分号 `；`，请改成英文半角分号 `;`",
    "，": "中文逗号 `，`，请改成英文半角逗号 `,`",
    "（": "中文左括号 `（`，请改成英文半角括号 `(`",
    "）": "中文右括号 `）`，请改成英文半角括号 `)`",
    "｛": "中文左大括号 `｛`，请改成英文半角大括号 `{`",
    "｝": "中文右大括号 `｝`，请改成英文半角大括号 `}`"
  };
  const issues = [];
  String(source || "").split(/\r?\n/).forEach((line, index) => {
    for (const char of line) {
      if (messages[char]) issues.push({ line: index + 1, message: messages[char] });
    }
  });
  return issues;
}

function explainCompilerError(stderr) {
  const text = String(stderr || "");
  if (/U0000ff1b|\\uff1b|character literal operator/i.test(text)) {
    return {
      message: "编译没有通过：代码中可能混入了中文全角分号 `；`。",
      analysis: "中文输入法下的 `；` 和英文分号 `;` 看起来很像，但 C++ 只能识别英文半角符号。",
      hint: "查看标红代码行，切换到英文输入法，把 `；` 替换为 `;`。"
    };
  }
  if (/expected ['‘`]?;['’`]? before/i.test(text)) {
    return {
      message: "编译没有通过：看起来少了一个分号 `;`。",
      analysis: "C++ 的普通语句通常要以分号结束。编译器标出的行有时是下一行，因此也要检查它前一行的末尾。",
      hint: "重点检查报错位置上一行。像 `s=s*i` 这样的赋值语句应写成 `s=s*i;`。"
    };
  }
  if (/expected ['‘`]?}['’`]?|expected declaration before ['‘`]?}['’`]?/i.test(text)) {
    return {
      message: "编译没有通过：大括号可能没有配对。",
      analysis: "每一个 `{` 都需要对应一个 `}`。函数、循环和条件语句嵌套时最容易漏写。",
      hint: "从 `main` 开始逐层检查左右大括号数量。"
    };
  }
  if (/was not declared in this scope/i.test(text)) {
    return {
      message: "编译没有通过：使用了尚未声明的变量或函数。",
      analysis: "变量要先定义再使用；函数如果写在 `main` 后面，需要提前声明函数原型。",
      hint: "查看编译器提示中的名称，检查拼写、作用域和定义位置。"
    };
  }
  if (/undefined reference to [`'‘]?main/i.test(text)) {
    return {
      message: "编译没有通过：程序里没有找到 `main` 函数。",
      analysis: "C++ 程序需要入口函数。标准写法是 `int main()`。",
      hint: "先补上 `int main() { ... return 0; }`。"
    };
  }
  if (text.includes("expected ')'") || text.includes("expected '('")) {
    return {
      message: "编译没有通过：小括号可能没有配对。",
      analysis: "函数参数、`if`、`for`、`while` 后的小括号都要成对出现。",
      hint: "检查报错行附近的 `(` 和 `)`，尤其是循环条件。"
    };
  }
  return {
    message: "编译没有通过。",
    analysis: "先让程序能编译。常见问题：少分号、括号不配对、函数没有返回值、变量作用域写错。",
    hint: "从编译器显示的第一条错误开始改，后面的错误通常会一起消失。"
  };
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

function runProcess(command, args, options = {}) {
  return new Promise(resolve => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      shell: false,
      windowsHide: true
    });

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, options.timeoutMs || 3000);

    if (options.input) {
      child.stdin.write(options.input);
    }
    child.stdin.end();

    child.stdout.on("data", chunk => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", chunk => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", error => {
      clearTimeout(timer);
      resolve({ code: -1, stdout, stderr: stderr + String(error.message || error), timedOut });
    });
    child.on("close", code => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

function parseNumbers(text) {
  return (String(text).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
}

function parseInts(text) {
  return (String(text).match(/-?\d+/g) || []).map(Number);
}

function hasApprox(numbers, expected, tolerance = 1e-4) {
  return numbers.some(n => Math.abs(n - expected) <= tolerance);
}

function normalize(text) {
  return String(text).replace(/\s+/g, " ").trim();
}

function booleanFromOutput(output) {
  const text = normalize(output).toLowerCase();
  const nums = parseNumbers(text);
  if (/不是|no|false|wrong/.test(text)) return false;
  if (/是|yes|true|right/.test(text)) return true;
  if (nums.length > 0) return nums[nums.length - 1] !== 0;
  return undefined;
}

function isPrime(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

function containsSubsequence(values, expected) {
  for (let i = 0; i <= values.length - expected.length; i++) {
    let ok = true;
    for (let j = 0; j < expected.length; j++) {
      if (values[i + j] !== expected[j]) {
        ok = false;
        break;
      }
    }
    if (ok) return true;
  }
  return false;
}

const checkers = {
  containsNumber(output, test) {
    const numbers = parseNumbers(output);
    return hasApprox(numbers, Number(test.expected));
  },
  containsText(output, test) {
    return normalize(output).includes(String(test.expected));
  },
  boolean(output, test) {
    return booleanFromOutput(output) === Boolean(test.expected);
  },
  containsAllNumbers(output, test) {
    const values = parseInts(output);
    return test.expected.every(expected => values.includes(expected));
  },
  containsApproxNumbers(output, test) {
    const values = parseNumbers(output);
    return test.expected.every(expected => hasApprox(values, Number(expected), 1e-3));
  },
  containsSubsequence(output, test) {
    return containsSubsequence(parseInts(output), test.expected);
  },
  goldbach(output, test) {
    const n = Number(test.expected);
    const values = parseInts(output);
    for (let i = 0; i < values.length; i++) {
      for (let j = i; j < values.length; j++) {
        if (values[i] + values[j] === n && isPrime(values[i]) && isPrime(values[j])) {
          return true;
        }
      }
    }
    return false;
  }
};

function checkRequirements(code, challenge) {
  const failures = [];
  for (const requirement of challenge.requires || []) {
    if (requirement.type === "regex") {
      const re = new RegExp(requirement.pattern);
      if (!re.test(code)) failures.push(requirement.message);
    }
    if (requirement.type === "recursive" && !hasRecursiveFunction(code)) {
      failures.push(requirement.message);
    }
  }
  return failures;
}

function hasRecursiveFunction(code) {
  const defRe = /\b(?:int|long\s+long|double|float|void|bool|char)\s+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{/g;
  let match;
  while ((match = defRe.exec(code))) {
    const name = match[1];
    if (name === "main") continue;
    const open = code.indexOf("{", match.index);
    const close = findMatchingBrace(code, open);
    if (close === -1) continue;
    const body = code.slice(open + 1, close);
    const callRe = new RegExp("\\b" + name + "\\s*\\(");
    if (callRe.test(body)) return true;
  }
  return false;
}

function findMatchingBrace(code, openIndex) {
  let depth = 0;
  for (let i = openIndex; i < code.length; i++) {
    if (code[i] === "{") depth++;
    if (code[i] === "}") depth--;
    if (depth === 0) return i;
  }
  return -1;
}

async function judgeSubmission(id, source) {
  const challenge = challenges.find(item => item.id === Number(id));
  if (!challenge) {
    return { passed: false, stage: "load", message: "没有找到这一关。" };
  }

  const fullWidthIssues = findFullWidthIssues(source);
  if (fullWidthIssues.length) {
    return {
      passed: false,
      stage: "compile",
      message: "发现中文全角符号，C++ 编译器无法识别。",
      analysis: fullWidthIssues.map(issue => `第 ${issue.line} 行：${issue.message}`).join("\n"),
      hint: "对应代码行已经标红。切换到英文输入法后替换这些符号。",
      errorLines: [...new Set(fullWidthIssues.map(issue => issue.line))],
      tests: []
    };
  }

  const code = sanitizeSource(source);
  const requirementFailures = checkRequirements(code, challenge);
  if (requirementFailures.length) {
    return {
      passed: false,
      stage: "structure",
      message: requirementFailures[0],
      analysis: challenge.concept,
      hint: challenge.hints[0],
      tests: []
    };
  }

  await fs.mkdir(TMP_ROOT, { recursive: true });
  const runDir = path.join(TMP_ROOT, `run-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  await fs.mkdir(runDir, { recursive: true });
  const sourcePath = path.join(runDir, "main.cpp");
  const exePath = path.join(runDir, process.platform === "win32" ? "main.exe" : "main");
  await fs.writeFile(sourcePath, code, "utf8");

  try {
    const compile = await runProcess(GPP, ["-std=c++17", "-O2", sourcePath, "-o", exePath], {
      cwd: runDir,
      timeoutMs: 20000
    });

    if (compile.timedOut) {
      return {
        passed: false,
        stage: "compile",
        message: "编译超时了，检查一下代码里是否有异常模板或卡住的宏。",
        stderr: compile.stderr,
        analysis: challenge.concept,
        hint: challenge.hints[0]
      };
    }

    if (compile.code !== 0) {
      const explanation = explainCompilerError(compile.stderr);
      return {
        passed: false,
        stage: "compile",
        message: explanation.message,
        stderr: compile.stderr,
        errorLines: extractErrorLines(compile.stderr),
        analysis: explanation.analysis,
        hint: explanation.hint
      };
    }

    const results = [];
    for (let index = 0; index < challenge.tests.length; index++) {
      const test = challenge.tests[index];
      const run = await runProcess(exePath, [], {
        cwd: runDir,
        input: test.input,
        timeoutMs: 3000
      });
      const checker = checkers[test.checker];
      const ok = !run.timedOut && run.code === 0 && checker && checker(run.stdout, test);
      results.push({
        index: index + 1,
        input: test.input,
        expected: test.expected,
        stdout: run.stdout,
        stderr: run.stderr,
        timedOut: run.timedOut,
        passed: Boolean(ok)
      });

      if (!ok) {
        return {
          passed: false,
          stage: run.timedOut ? "timeout" : "test",
          message: run.timedOut ? "运行超时，可能出现了死循环。" : `第 ${index + 1} 组测试没有通过。`,
          analysis: challenge.concept,
          hint: challenge.hints[Math.min(index, challenge.hints.length - 1)],
          tests: results
        };
      }
    }

    return {
      passed: true,
      stage: "pass",
      message: challenge.id === challenges.length ? "18 关全部通过，祝你期末考试成功！" : "通过，下一关已解锁。",
      tests: results
    };
  } finally {
    fs.rm(runDir, { recursive: true, force: true }).catch(() => {});
  }
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestPath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.resolve(PUBLIC, "." + requestPath);

  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "GET" && req.url === "/api/health") {
      sendJson(res, 200, { ok: true, gpp: GPP, challenges: challenges.length });
      return;
    }

    if (req.method === "POST" && req.url === "/api/run") {
      const body = JSON.parse(await readBody(req) || "{}");
      const result = await judgeSubmission(body.id, body.code);
      sendJson(res, 200, result);
      return;
    }

    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, {
      passed: false,
      message: error.message || "服务器内部错误。",
      stack: String(error.stack || "")
    });
  }
});

server.listen(PORT, () => {
  if (!fss.existsSync(TMP_ROOT)) fss.mkdirSync(TMP_ROOT, { recursive: true });
  console.log(`C++ 期末闯关 IDE 已启动: http://localhost:${PORT}`);
});
