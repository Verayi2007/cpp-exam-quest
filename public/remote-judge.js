(function (root) {
  const JUDGE0_BASE = "https://ce.judge0.com";
  const JUDGE0_LANGUAGES_ENDPOINT = `${JUDGE0_BASE}/languages`;
  const JUDGE0_SYNC_ENDPOINT = `${JUDGE0_BASE}/submissions?base64_encoded=false&wait=true`;
  const JUDGE0_ASYNC_ENDPOINT = `${JUDGE0_BASE}/submissions?base64_encoded=false`;
  const CPP_LANGUAGE_CANDIDATES = [105, 54, 53, 52, 76];
  const TERMINAL_STATUS_IDS = new Set([3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  let cppLanguageIdsPromise = null;

  function parseNumbers(text) {
    return (String(text).match(/-?\d+(?:\.\d+)?/g) || []).map(Number);
  }

  function parseInts(text) {
    return (String(text).match(/-?\d+/g) || []).map(Number);
  }

  function hasApprox(numbers, expected, tolerance = 1e-4) {
    return numbers.some(number => Math.abs(number - expected) <= tolerance);
  }

  function normalize(text) {
    return String(text).replace(/\s+/g, " ").trim();
  }

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function booleanFromOutput(output) {
    const text = normalize(output).toLowerCase();
    const numbers = parseNumbers(text);
    if (/不是|no|false|wrong/.test(text)) return false;
    if (/是|yes|true|right/.test(text)) return true;
    if (numbers.length > 0) return numbers[numbers.length - 1] !== 0;
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
      let passed = true;
      for (let j = 0; j < expected.length; j++) {
        if (values[i + j] !== expected[j]) {
          passed = false;
          break;
        }
      }
      if (passed) return true;
    }
    return false;
  }

  const checkers = {
    containsNumber(output, test) {
      return hasApprox(parseNumbers(output), Number(test.expected));
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

  function sanitizeSource(source) {
    let code = String(source || "").replace(/\r\n/g, "\n");
    code = code.replace(/#\s*include\s*<iostream\.h>/g, "#include <iostream>\nusing namespace std;");
    code = code.replace(/#\s*include\s*<iomanip\.h>/g, "#include <iomanip>");
    code = code.replace(/#\s*include\s*<math\.h>/g, "#include <cmath>");
    code = code.replace(/\bvoid\s+main\s*\(/g, "int main(");

    if (/\b(cin|cout|endl)\b/.test(code) && !/#\s*include\s*<iostream>/.test(code)) {
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

  function findMatchingBrace(code, openIndex) {
    let depth = 0;
    for (let i = openIndex; i < code.length; i++) {
      if (code[i] === "{") depth++;
      if (code[i] === "}") depth--;
      if (depth === 0) return i;
    }
    return -1;
  }

  function hasRecursiveFunction(code) {
    const definition = /\b(?:int|long\s+long|double|float|void|bool|char)\s+([A-Za-z_]\w*)\s*\([^;{}]*\)\s*\{/g;
    let match;
    while ((match = definition.exec(code))) {
      const name = match[1];
      if (name === "main") continue;
      const open = code.indexOf("{", match.index);
      const close = findMatchingBrace(code, open);
      if (close === -1) continue;
      if (new RegExp("\\b" + name + "\\s*\\(").test(code.slice(open + 1, close))) return true;
    }
    return false;
  }

  function checkRequirements(code, challenge) {
    for (const requirement of challenge.requires || []) {
      if (requirement.type === "regex" && !new RegExp(requirement.pattern).test(code)) {
        return requirement.message;
      }
      if (requirement.type === "recursive" && !hasRecursiveFunction(code)) {
        return requirement.message;
      }
    }
    return "";
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

  async function readResponseBody(response) {
    const text = await response.text();
    if (!text) return { text: "", data: null };
    try {
      return { text, data: JSON.parse(text) };
    } catch {
      return { text, data: null };
    }
  }

  function formatJudge0Error(response, payload) {
    if (payload && typeof payload === "object") {
      const details = Object.entries(payload)
        .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : value}`)
        .join("; ");
      if (details) return `Judge0 暂时不可用（HTTP ${response.status}）：${details}`;
    }
    return `Judge0 暂时不可用（HTTP ${response.status}）。`;
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const body = await readResponseBody(response);
    if (!response.ok) {
      const error = new Error(formatJudge0Error(response, body.data));
      error.status = response.status;
      error.payload = body.data;
      error.bodyText = body.text;
      throw error;
    }
    return body.data;
  }

  async function resolveCppLanguageIds() {
    if (!cppLanguageIdsPromise) {
      cppLanguageIdsPromise = requestJson(JUDGE0_LANGUAGES_ENDPOINT, { method: "GET" })
        .then(languages => {
          if (!Array.isArray(languages)) return CPP_LANGUAGE_CANDIDATES;
          const available = new Set(
            languages
              .filter(language => /C\+\+/.test(String(language.name || "")))
              .map(language => Number(language.id))
          );
          const supported = CPP_LANGUAGE_CANDIDATES.filter(id => available.has(id));
          return supported.length ? supported : CPP_LANGUAGE_CANDIDATES;
        })
        .catch(() => CPP_LANGUAGE_CANDIDATES);
    }
    return cppLanguageIdsPromise;
  }

  async function createSubmission(url, code, stdin, languageId) {
    return requestJson(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        source_code: code,
        language_id: languageId,
        stdin,
        cpu_time_limit: 2,
        wall_time_limit: 4,
        memory_limit: 128000
      })
    });
  }

  async function pollSubmission(token) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const result = await requestJson(`${JUDGE0_BASE}/submissions/${encodeURIComponent(token)}?base64_encoded=false`, {
        method: "GET"
      });
      if (TERMINAL_STATUS_IDS.has(Number(result.status && result.status.id))) {
        return result;
      }
      await delay(350);
    }
    throw new Error("Judge0 返回结果超时，请稍后重试。");
  }

  async function executeWithLanguage(code, stdin, languageId) {
    try {
      return await createSubmission(JUDGE0_SYNC_ENDPOINT, code, stdin, languageId);
    } catch (error) {
      const shouldFallback = error && (error.status === 400 || error.status === 404 || error.status === 405 || error.status >= 500);
      if (!shouldFallback) throw error;

      const queued = await createSubmission(JUDGE0_ASYNC_ENDPOINT, code, stdin, languageId);
      if (!queued || !queued.token) {
        throw error;
      }
      return pollSubmission(queued.token);
    }
  }

  async function execute(code, stdin) {
    const languageIds = await resolveCppLanguageIds();
    let lastError = null;
    for (const languageId of languageIds) {
      try {
        return await executeWithLanguage(code, stdin, languageId);
      } catch (error) {
        lastError = error;
        if (!error || (error.status !== 400 && error.status !== 422)) {
          throw error;
        }
      }
    }
    throw lastError || new Error("Judge0 暂时不可用，请稍后重试。");
  }

  async function runRemoteJudge(id, source) {
    const challenge = root.CHALLENGES.find(item => item.id === Number(id));
    if (!challenge) return { passed: false, stage: "load", message: "没有找到这一关。" };

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
    const structureFailure = checkRequirements(code, challenge);
    if (structureFailure) {
      return {
        passed: false,
        stage: "structure",
        message: structureFailure,
        analysis: challenge.concept,
        hint: challenge.hints[0],
        tests: []
      };
    }

    const results = [];
    for (let index = 0; index < challenge.tests.length; index++) {
      const test = challenge.tests[index];
      const execution = await execute(code, test.input);
      const status = execution.status || {};
      const stdout = execution.stdout || "";
      const stderr = execution.compile_output || execution.stderr || execution.message || "";

      if (status.id === 6) {
        const explanation = explainCompilerError(stderr);
        return {
          passed: false,
          stage: "compile",
          message: explanation.message,
          stderr,
          errorLines: extractErrorLines(stderr),
          analysis: explanation.analysis,
          hint: explanation.hint,
          tests: results
        };
      }

      const timedOut = status.id === 5 || status.id === 13;
      const checker = checkers[test.checker];
      const passed = status.id === 3 && checker && checker(stdout, test);
      results.push({
        index: index + 1,
        input: test.input,
        expected: test.expected,
        stdout,
        stderr,
        timedOut,
        passed: Boolean(passed)
      });

      if (!passed) {
        return {
          passed: false,
          stage: timedOut ? "timeout" : "test",
          message: timedOut ? "运行超时，可能出现了死循环。" : `第 ${index + 1} 组测试没有通过。`,
          analysis: challenge.concept,
          hint: challenge.hints[Math.min(index, challenge.hints.length - 1)],
          tests: results
        };
      }
    }

    return {
      passed: true,
      stage: "pass",
      message: challenge.id === root.CHALLENGES.length ? "18 关全部通过，祝你期末考试成功！" : "通过，下一关已解锁。",
      tests: results
    };
  }

  root.runRemoteJudge = runRemoteJudge;
})(window);
