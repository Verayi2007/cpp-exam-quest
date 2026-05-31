# C++ Exam Quest

把期末复习题做成一款可以真实提交、真实判题、逐关解锁的 C++ 练习 IDE。

这个项目不是“看答案背模板”，而是强迫自己在空白编辑器里把代码重新敲出来。你提交代码后，只有真的通过测试，下一关才会解锁。不会写时可以看提示，卡住时也能打开只读参考答案，但答案不会自动填进编辑器。

## Live Demo

- Online demo: [https://Verayi2007.github.io/cpp-exam-quest/](https://Verayi2007.github.io/cpp-exam-quest/)
- Repository: [https://github.com/Verayi2007/cpp-exam-quest](https://github.com/Verayi2007/cpp-exam-quest)

GitHub Pages 版本会把代码提交到隔离的 Judge0 沙箱中编译运行，不会在作者电脑上执行访问者代码。

## Why This Project Works In A Portfolio

- It has a clear user problem: exam practice is painful, repetitive, and hard to stay engaged with.
- It turns dry题目 into a game loop: unlock, retry, get feedback, move on.
- It uses a real judging flow instead of fake keyword matching.
- It supports both local compilation and public web demo deployment.
- It now includes a repeatable smoke test that runs all 18 bundled reference solutions end-to-end.

## Core Features

- 18 个循序渐进的 C++ 期末高频题目
- 空白 IDE 练习模式，更接近考试手写体验
- 本地模式下调用 `g++` 真实编译和运行
- GitHub Pages 模式下调用 Judge0 远程沙箱
- Monaco Editor 编辑体验，支持 `Ctrl/Cmd + Enter` 提交
- 自动保存每一关代码进度
- 错误高亮，能定位编译报错行
- 针对常见新手错误给出更可读的反馈
- 识别中文全角符号、括号、引号等隐藏输入错误
- 只读参考答案，不提供一键代写

## Challenge Set

1. n! 阶乘
2. 等比求和
3. 整数逆序
4. 判断降序数
5. 判断升序数
6. 回文数筛选
7. 123...x 求和
8. aa...a 求和
9. 400 以内素数
10. 质因子和
11. 哥德巴赫分解
12. 400 内亲密对数
13. 因子平方和
14. 特殊四位数
15. 三位对称偶数
16. 数组统计
17. 冒泡排序
18. 递归最大公约数

## Local Run

Requirements:

- Node.js 20+
- `g++`

Start the local judge server:

```bash
npm run start
```

Then open:

```text
http://localhost:4173
```

Windows users can also double-click:

```text
启动闯关IDE.bat
```

## Verification

Run the smoke test:

```bash
npm run test:smoke
```

What it checks:

- local server starts successfully
- `GET /api/health` returns the expected metadata
- the static shell is served correctly
- all 18 bundled reference solutions pass `/api/run`

The same smoke test is also wired into GitHub Actions in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Demo Walkthrough

1. Open the app and start at level 1 with a blank editor.
2. Type your own C++ solution instead of modifying starter code.
3. Submit to the local judge or remote Judge0 sandbox.
4. Read the compiler or test feedback directly in the console panel.
5. Fix the code until the level passes and the next challenge unlocks.
6. If blocked, open a hint or inspect the read-only reference answer, then retype the solution yourself.

这套流程能很直观地演示项目的核心价值：不是展示静态页面，而是展示“尝试 -> 报错 -> 修正 -> 通关”的真实学习闭环。

## Project Structure

```text
public/
  app.js             client-side app state and UI logic
  challenges.js      18 challenge definitions and judge rules
  remote-judge.js    Judge0-based remote execution
  solutions.js       bundled reference solutions for verification
server.js            local HTTP server and g++ judge
scripts/
  smoke-test.mjs     end-to-end local verification script
```

## Tech Stack

- HTML
- CSS
- JavaScript
- Node.js
- `g++`
- Judge0
- GitHub Actions
- GitHub Pages
- Monaco Editor

## Roadmap

- Add real screenshot assets and short GIF demo clips for the README
- Add per-level completion timing and retry analytics stored locally
- Add a “mock exam mode” that hides hints and answers until the end
- Add more structured test data visibility after a failed submission

## Notes

- `localhost` uses the local Node server plus local `g++`.
- GitHub Pages uses Judge0 because static hosting cannot safely run a compiler.
- The current reference solutions are intentionally simple and readable because the target users are students practicing fundamentals.

 ## Motivation
 
 复习编程题最难的地方，不是“看懂答案”，而是能不能在空白编辑器里把它重新写出来。
 
 这个项目想做的事情很直接：少一点拖延，多一点反馈；少一点死记硬背，多一点真实提交和修错的过程。
