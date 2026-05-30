# C++ Exam Quest

一个把 C++ 期末复习做成闯关小游戏的网页练习器。

它适合那种“知道该复习，但就是不想打开题库”的时刻：把高频基础题拆成 18 个关卡，从循环、数字拆分、函数，到数组、排序和递归，一关一关写过去。不会了可以看提示，实在卡住可以打开参考答案，但想解锁下一关，仍然要自己把代码敲出来并通过测试。

## Highlights

- **18-level quest flow**: pass one level to unlock the next.
- **Blank C++ editor**: no starter code, closer to an exam-room blank screen.
- **Real judging**: compile and run C++ submissions against test cases.
- **Helpful feedback**: common mistakes such as full-width Chinese punctuation are explained directly.
- **Error line highlighting**: compiler-located lines are marked in the editor.
- **Answer viewer**: reference solutions are readable, but never auto-filled.
- **Local + online modes**: works locally with `g++`, and online with a sandboxed Judge0 runner.

## Try It Online

The GitHub Pages version runs fully in the browser and sends submissions to a Judge0 sandbox for compilation and execution.

After deployment, the page will be available at:

```text
https://Verayi2007.github.io/cpp-exam-quest/
```

## Local Mode

Local mode is useful when you want faster judging on your own machine.

Requirements:

- Node.js
- g++

Start the app:

```text
node server.js
```

Then open:

```text
http://localhost:4173
```

On Windows, you can also double-click:

```text
启动闯关IDE.bat
```

## Level List

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
17. 上浮冒泡排序
18. 递归最大公约数

## How Judging Works

The project has two judging paths:

- **Localhost**: the Node server calls the local `g++` compiler.
- **GitHub Pages**: the static page calls Judge0's sandboxed API.

This keeps the public version easy to share while preserving the full compile-and-run experience.

## Tech Stack

- HTML, CSS, JavaScript
- Node.js local judging server
- g++ for local compilation
- Judge0 for online sandboxed execution
- GitHub Actions + GitHub Pages for deployment

## Project Goal

Not a full online judge. Not a giant course platform.

Just a tiny study game for making C++ practice feel a little less like staring into the void.
