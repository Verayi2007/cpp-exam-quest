(function (root) {
  const CHALLENGES = [
    {
      id: 1,
      title: "n! 阶乘",
      source: "第 4 周第 2 题",
      difficulty: "热身",
      task: "2. 求 s=n!。n 的值通过键盘输入。用 while 循环。",
      input: "见题目原文",
      output: "见题目原文",
      concept: "循环初值和循环边界。阶乘的累乘初值必须是 1。",
      hints: ["定义 s=1, i=1。", "while(i<=n) 中执行 s*=i，然后 i++。", "不要把 s 初始化为 0。"],
      tests: [
        { input: "5\n", expected: 120, checker: "containsNumber" },
        { input: "7\n", expected: 5040, checker: "containsNumber" },
        { input: "1\n", expected: 1, checker: "containsNumber" }
      ]
    },
    {
      id: 2,
      title: "等比求和",
      source: "第 4 周第 4 题",
      difficulty: "热身",
      task: "4. 求 s=1+2+4+8+…+2^n。不能用 pow 函数。",
      input: "见题目原文",
      output: "见题目原文",
      concept: "题目中的 2^n 表示数学上的 n 次方。注意：C++ 里的 ^ 是按位异或，不是乘方。原题不允许使用 pow，因此用变量 x 保存当前项，每轮 x=x*2，再加到 s。",
      hints: ["不要在 C++ 代码中写 2^n；这里的 ^ 不是乘方运算。", "n=0 时答案是 1。s 从 1 开始，x 从 1 开始。", "循环 i=1 到 n，每次执行 x=x*2，再把 x 加到 s。"],
      tests: [
        { input: "0\n", expected: 1, checker: "containsNumber" },
        { input: "5\n", expected: 63, checker: "containsNumber" },
        { input: "10\n", expected: 2047, checker: "containsNumber" }
      ]
    },
    {
      id: 3,
      title: "整数逆序",
      source: "第 5 周第 1 题",
      difficulty: "核心",
      task: "1. 完成实验指导书(P19)实验 3(3.4.1)。\n整数的逆序转换：设计一个程序，输入一个整数，并将其反序转换输出成另一个整数。 例如输入12345，则转换输出成 54321。",
      input: "见题目原文",
      output: "见题目原文",
      concept: "%10 取个位，/10 去掉个位。do while 可以处理输入为 0 的情况。",
      hints: ["如果 num<0，先输出 '-'，再把 num 变成正数。", "循环中 t=num%10，输出 t，再 num=num/10。", "用 do while(num!=0) 可以让 0 也输出一次。"],
      tests: [
        { input: "12345\n", expected: "54321", checker: "containsText" },
        { input: "-704\n", expected: "-407", checker: "containsText" },
        { input: "1002\n", expected: "2001", checker: "containsText" }
      ]
    },
    {
      id: 4,
      title: "判断降序数",
      source: "第 6 周第 1 题",
      difficulty: "核心",
      task: "1.完成实验指导书(P19)实验 3 的(3.4.4)。\n判断降序数： 降序数是指该数的低位数不大于高位数， 如74，853，666 都是降序数，只有一位的数也是降序数。要求完成从整数的低位开始判断。",
      input: "见题目原文",
      output: "见题目原文",
      concept: "从低位往高位看，后取出的高位数字不能小于之前的低位数字。",
      hints: ["先保存最低位 last=x%10，再 x/=10。", "每取出一个新 digit，如果 digit<last，则不是降序。", "如果没发现冲突，就是降序。"],
      tests: [
        { input: "853\n", expected: true, checker: "boolean" },
        { input: "858\n", expected: false, checker: "boolean" },
        { input: "7\n", expected: true, checker: "boolean" }
      ]
    },
    {
      id: 5,
      title: "判断升序数",
      source: "第 9 周第 3 题",
      difficulty: "核心",
      task: "3. 编程题\n【程序功能】判断一个数是否是升序数。 （升序数是指该数的高位数字不大于低位数字，如24，369,  888 都是升序数，只有一位的数也是升序数）。\n【编程要求】\n(1). 定义一个函数 int fun(int x)， 功能是判断x 是否是升序数， 若是则返回 1，否则返回 0。\n(2). 主函数功能：从键盘输入 5 个各不相同且位数不等的正整数; 调用函数 fun( )判断这些数是否是升序数，输出判断结果信息。",
      input: "见题目原文",
      output: "见题目原文",
      concept: "从低位向高位取数时，新取出的高位数字不能大于低位数字。",
      hints: ["函数 fun 返回 1 表示是，返回 0 表示不是。", "从右往左看，数字应该越来越小或相等。", "比较 digit 和 last，冲突就 return 0。"],
      requires: [{ type: "regex", pattern: "\\bfun\\s*\\(", message: "这一关要求定义并调用 fun 函数。" }],
      tests: [
        { input: "369\n", expected: true, checker: "boolean" },
        { input: "321\n", expected: false, checker: "boolean" },
        { input: "888\n", expected: true, checker: "boolean" }
      ]
    },
    {
      id: 6,
      title: "回文数筛选",
      source: "第 9 周第 2 题",
      difficulty: "核心",
      task: "2. 编程题\n【程序功能】用乌勒母公式 f(n)=n^2-n+41(n=1,2,3,……,m)生成一个数列的前 m 项，找出其中的回文数。\n【编程要求】(1). 编写函数 int fun( int n)，其功能是产生 n 的一个反序数并返回。\n(2). 编写 main 函数实现以下功能：声明变量 m，输入一个整数并保存到 m 中，判断数列的前 m 项，如果是回文数的项则输出。\n注： 所谓回文数是指正序数与反序数相同。 如：121、1221、12321等。判定是否是回文数用原数与 fun 函数返回值是否相等即可。\n【测试数据与运行结果】\n测试数据：m=200\n运行结果：131  151  313  383  797  17071",
      input: "见题目原文",
      output: "见题目原文",
      concept: "反序函数 + 原数比较。回文数满足 x==fun(x)。",
      hints: ["先写反序函数 fun。", "main 中 for(i=1;i<=m;i++) 生成 x=i*i-i+41。", "如果 x==fun(x)，输出 x。"],
      requires: [{ type: "regex", pattern: "\\bfun\\s*\\(", message: "这一关要求定义并调用 fun 反序函数。" }],
      tests: [
        { input: "200\n", expected: [131, 151, 313, 383, 797, 17071], checker: "containsAllNumbers" }
      ]
    },
    {
      id: 7,
      title: "123...x 求和",
      source: "第 9 周第 1 题",
      difficulty: "核心",
      task: "1. 编程题：\n【题目】编写 fun 函数，它的功能是:求 s = 123…x + … + 123 + 12 + 1  (123 …x 表示 各位数字由最高位 1 递增到个位 x )\n由键盘输入 x 的值（在 1 至 9 之间） ，例如 x = 6, 则以上表达式为:\n         s = 123456 + 12345 + 1234 + 123 + 12 + 1\n其和值是: 137171\nx 是 fun 函数的形参, 表达式的值作为函数值传回 main 函数。\n【要求】编写主函数输入 x 的值，调用 fun 函数计算出表达式结果并输出。\n【测试数据与运行结果】\n测试数据：x=7\n运行结果：1371738",
      input: "见题目原文",
      output: "见题目原文",
      concept: "m=m*10+i 用来构造 1、12、123 这样的数，s 累加 m。",
      hints: ["m 初值 0，s 初值 0。", "for(i=1;i<=x;i++) { m=m*10+i; s+=m; }", "fun 返回 s，main 只负责输入和输出。"],
      requires: [{ type: "regex", pattern: "\\bfun\\s*\\(", message: "这一关要求定义并调用 fun 函数。" }],
      tests: [
        { input: "3\n", expected: 136, checker: "containsNumber" },
        { input: "6\n", expected: 137171, checker: "containsNumber" },
        { input: "7\n", expected: 1371738, checker: "containsNumber" }
      ]
    },
    {
      id: 8,
      title: "aa...a 求和",
      source: "第 10 周第 1 题",
      difficulty: "核心",
      task: "一、编程题：\n【题目】编写 fun 函数，它的功能是:求 s = aa…aa + … + aaa + aa + a\n(此处 a 和 n 的值在 1 至 9 之间， aa… aa 表示 n 个 a )\n    例如 a = 3, n = 6, 则以上表达式为:\n         s = 333333 + 33333 + 3333 + 333 + 33 + 3\n其和值是: 370368\na 和 n 是 fun 函数的形参, 表达式的值作为函数值传回 main 函数。\n【要求】编写主函数输入 a 和 n 的值，调用 fun 函数计算出表达式结果并输出。\n【测试数据与运行结果】:测试数据：a=5, n=7    运行结果：s=6172835",
      input: "见题目原文",
      output: "见题目原文",
      concept: "每轮 m=m*10+a，得到 a、aa、aaa，再把 m 加入 s。",
      hints: ["这题和上一关完全同骨架，只是每一位都用 a。", "循环 n 次。", "函数原型可写 int fun(int a, int n)。"],
      requires: [{ type: "regex", pattern: "\\bfun\\s*\\(", message: "这一关要求定义并调用 fun 函数。" }],
      tests: [
        { input: "5 7\n", expected: 6172835, checker: "containsNumber" },
        { input: "3 6\n", expected: 370368, checker: "containsNumber" },
        { input: "9 3\n", expected: 1107, checker: "containsNumber" }
      ]
    },
    {
      id: 9,
      title: "400 以内素数",
      source: "第 7 周第 1 题",
      difficulty: "函数",
      task: "1. 完成实验指导书(P28)实验 5(5.4.1)。\n求 400 以内的素数。要求使用函数实现判断某数是否为素数。\n注：判定一个数是否是素数函数的写法：\nint prime(int n)\n{\ni 从 2 开始到小于 n\n    如果 n 能被 i 整除\n   则返回 0  // 不是素数\n返回 1\n}",
      input: "见题目原文",
      output: "见题目原文",
      concept: "素数判断：从 2 到 n-1 或 n/2，能整除就不是素数。",
      hints: ["prime(2) 应该返回 1。", "for(i=2;i<n;i++) if(n%i==0) return 0; 最后 return 1。", "main 中循环 m=2 到 400。"],
      requires: [{ type: "regex", pattern: "\\bprime\\s*\\(", message: "这一关要求定义并调用 prime 函数。" }],
      tests: [
        { input: "", expected: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 397], checker: "containsAllNumbers" }
      ]
    },
    {
      id: 10,
      title: "质因子和",
      source: "第 8 周第 2 题",
      difficulty: "函数",
      task: "2. 完成实验指导书(P28)实验 5(5.4.3)。\n求质因子之和。题目要求：从键盘上输入一个整数，并求出该整数的质因子和。例如：输入 20，则 20=2x2x5，其质因子和为2+2+5，即9。 要求使用函数计算整数的质因子和。(测试数据：990 的质因子和为 2+3+3+5+11=24)",
      input: "见题目原文",
      output: "见题目原文",
      concept: "从 i=2 开始试除。能整除就累加 i，并让 n=n/i；否则 i++。",
      hints: ["while(n!=1) 是常见写法。", "能整除时不要立刻 i++，因为可能有重复质因子。", "990 的质因子和是 24。"],
      tests: [
        { input: "20\n", expected: 9, checker: "containsNumber" },
        { input: "990\n", expected: 24, checker: "containsNumber" },
        { input: "84\n", expected: 14, checker: "containsNumber" }
      ]
    },
    {
      id: 11,
      title: "哥德巴赫分解",
      source: "第 7 周第 2 题",
      difficulty: "综合",
      task: "2. 完成实验指导书(P28)实验 5(5.4.2)。\n哥德巴赫是德国数学家， 他提出 “任何大于2 的偶数， 都可以表示成两个素数之和” 。例如4=2+2，6=3+3，8=3+5，10=3+7=5+5。\n编制程序， 实现从键盘上输入一个大于2 的偶数， 并将该偶数分解成两个素数相加。",
      input: "见题目原文",
      output: "见题目原文",
      concept: "枚举 i，从 2 到 n/2，只要 prime(i)&&prime(n-i) 就可以输出。",
      hints: ["先写好 prime。", "for(i=2;i<=n/2;i++) 检查 i 和 n-i。", "找到一组后可以 break，也可以输出全部。"],
      requires: [{ type: "regex", pattern: "\\bprime\\s*\\(", message: "这一关建议使用 prime 函数。" }],
      tests: [
        { input: "10\n", expected: 10, checker: "goldbach" },
        { input: "28\n", expected: 28, checker: "goldbach" },
        { input: "100\n", expected: 100, checker: "goldbach" }
      ]
    },
    {
      id: 12,
      title: "400 内亲密对数",
      source: "第 7 周第 3 题",
      difficulty: "综合",
      task: "3. 完成实验指导书(P23)实验 4(4.3.1)。\n求 400 以内亲密对数，所谓亲密对数是指：若正整数A 的所有因子（包括 1 但是不包括自身，下同）之和为 B，而 B 的所有因子之和为 A，则称 A 和 B 为一对亲密对数。 （请使用函数调用编程。）\n参考值：亲密对数为：220 和 284",
      input: "见题目原文",
      output: "见题目原文",
      concept: "先写 yinzihe(n) 求不含自身的因子和，再判断 yinzihe(yinzihe(i))==i。",
      hints: ["因子包括 1，不包括自身。", "为避免重复输出，判断 i<s1。", "参考结果是 220 和 284。"],
      requires: [{ type: "regex", pattern: "\\byinzihe\\s*\\(", message: "这一关建议写 yinzihe 函数求因子和。" }],
      tests: [
        { input: "", expected: [220, 284], checker: "containsAllNumbers" }
      ]
    },
    {
      id: 13,
      title: "因子平方和",
      source: "第 10 周第 3 题",
      difficulty: "综合",
      task: "三、编程题\n【程序功能】在 100 至 300 之间所有的三位数中，查找其值等于其因子平方之和的数并输出。\n【编程要求】\n1．编写函数 int fac(int m) ，其功能是：求 m 的因子平方和，返回结果。注：因子不含 1 和自身。\n2．编写函数 int check(int x) ，其功能是：对整数 x 进行判定，其值是否等于其因子平方之和。如果相等，函数返回 1，否则返回 0。调用函数 fac 求得 x 的因子平方和。\n3. 编写 main()函数，利用循环依次产生 100 到 300 之间的所有三位整数，对每一个数调用函数 check(…)进行判定。在屏幕上输出满足条件的数。\n【测试数据与运行结果】\n100 至 300 之间满足条件的三位数为：121   169   289",
      input: "见题目原文",
      output: "见题目原文",
      concept: "fac(m) 求因子平方和，check(x) 判断 fac(x)==x。",
      hints: ["因子循环从 2 到 m/2。", "如果 m%i==0，就 s+=i*i。", "最终结果是 121、169、289。"],
      requires: [
        { type: "regex", pattern: "\\bfac\\s*\\(", message: "这一关要求写 fac 函数。" },
        { type: "regex", pattern: "\\bcheck\\s*\\(", message: "这一关要求写 check 函数。" }
      ],
      tests: [
        { input: "", expected: [121, 169, 289], checker: "containsAllNumbers" }
      ]
    },
    {
      id: 14,
      title: "特殊四位数",
      source: "第 8 周第 4 题",
      difficulty: "综合",
      task: "4.求具有 abcd=(ab+cd)^2 性质的四位正整数。例如 3025 这个数平分为两段为 30 和 25，使之相加后求平方，恰好等于 3025 本身，(30+25)^2=3025。请编程实现求出所有具有这种性质的全部四位数。(答案：2025，3025，9801)",
      input: "见题目原文",
      output: "见题目原文",
      concept: "枚举 1000 到 9999，ab=n/100，cd=n%100。",
      hints: ["不要真的拆成四个数字，直接 n/100 和 n%100。", "判断 n==(ab+cd)*(ab+cd)。", "答案是 2025、3025、9801。"],
      tests: [
        { input: "", expected: [2025, 3025, 9801], checker: "containsAllNumbers" }
      ]
    },
    {
      id: 15,
      title: "三位对称偶数",
      source: "第 10 周第 2 题",
      difficulty: "综合",
      task: "二、编程题\n计算在 100 至 999 之间有多少个符合条件的数，条件是：该数的数字具有对称性，且该整数能被 2 整除\n1. 编写函数 int duichen (int m), 判断 m 的数字是否具有对称性（如 202,515 具有对称性） ；\n2. 编写函数 int panduan ( int n),其功能是调用 duichen()函数判断 n 是否具有对称性且能被 2 整除；\n3. 编写 main()函数，利用循环产生 100 至 999 之间所有三位整数，对每一个三位整数调用函数 panduan ()进行判定，同时统计符合条件的数据个数，在屏幕上每五个数一行输出满足条件的数，然后输出符合条件的数据个数统计结果。运行结果为：\n满足条件的数为:\n202     212     222     232     242\n252     262     272     282     292\n404     414     424     434     444\n454     464     474     484     494\n606     616     626     636     646\n656     666     676     686     696\n808     818     828     838     848\n858     868     878     888     898\n满足条件的总数共有:40",
      input: "见题目原文",
      output: "见题目原文",
      concept: "三位数对称只需判断个位 m%10 是否等于百位 m/100。",
      hints: ["duichen(m) 判断 m%10==m/100。", "panduan(n) 判断 duichen(n)&&n%2==0。", "每输出 5 个换行只是格式要求，判题不强制。"],
      requires: [
        { type: "regex", pattern: "\\bduichen\\s*\\(", message: "这一关要求写 duichen 函数。" },
        { type: "regex", pattern: "\\bpanduan\\s*\\(", message: "这一关要求写 panduan 函数。" }
      ],
      tests: [
        { input: "", expected: [202,212,222,232,242,252,262,272,282,292,404,414,424,434,444,454,464,474,484,494,606,616,626,636,646,656,666,676,686,696,808,818,828,838,848,858,868,878,888,898,40], checker: "containsAllNumbers" }
      ]
    },
    {
      id: 16,
      title: "数组统计",
      source: "第 11 周第 1 题",
      difficulty: "数组",
      task: "一、 完成实验指导书(P43)实验 8(8.3.1)。\n1. 题目要求\n先定义具有 10 个元素的一维数组， 再从键盘输入10 个数据 （负数、0、 正数都有） 作为数组元素，最后统计数组元素中正数、 负数和零的个数， 并计算10 个数的平均值， 要求输出正数、 负数和零的个数及 10 个数的平均值。",
      input: "见题目原文",
      output: "见题目原文",
      concept: "数组输入和统计可以同步做，也可以分开做。平均值用 double。",
      hints: ["double a[10], sum=0。", "if(a[i]>0) pos++; else if(a[i]<0) neg++; else zero++;", "平均值是 sum/10，不要写成整型除法。"],
      tests: [
        { input: "-1 0 2 -3 0 4 5 -6 0 8\n", expected: [4, 3, 3, 0.9], checker: "containsApproxNumbers" }
      ]
    },
    {
      id: 17,
      title: "上浮冒泡排序",
      source: "第 11 周第 3 题",
      difficulty: "数组",
      task: "三、 完成实验指导书(P44)实验 8(8.3.3)。\n1. 问题的提出\n冒泡排序的过程可以是下沉也可以是上浮。要求编写上浮策略的冒泡程序。\n2. 分析\n上浮策略的冒泡排序是每趟向左扫描，下标从n-1 开始（假设有 n 个数组元素） ，向左比较，也就是：\nfor(j=0;j<n-1;j++)\n   for(i=n-1;i>j;i--)\n     if(a[i]<a[i-1])\n      {  交换 a[i]和 a[i-1]  }\n排序的数据来源可以从键盘输入，可以初始化赋值，也可以用随机数产生(我们要求排序的数据来源于随机数产生的 10 个 100 以内的数据)。 在排序之前应当输出数据， 并在排序后再次输出数据，以对比排序是否成功。",
      input: "见题目原文",
      output: "见题目原文",
      concept: "上浮冒泡每趟从右向左比较：for(j=n-1;j>i;j--)。",
      hints: ["为方便自动判题，可用固定数组 int a[10]={12,5,34,26,18,8,4,22,9,15}; 练循环。", "外层 i=0 到 n-2，内层 j=n-1 到 i+1。", "如果 a[j]<a[j-1] 就交换。"],
      tests: [
        { input: "", expected: [4, 5, 8, 9, 12, 15, 18, 22, 26, 34], checker: "containsSubsequence" }
      ]
    },
    {
      id: 18,
      title: "递归最大公约数",
      source: "第 12 周第 2 题",
      difficulty: "递归",
      task: "2. 完成实验指导书(P34)实验 6(6.4.2)。\n题目要求：使用递归函数求两个整数的公约数。\n分析：欧几里德算法：给定两个正整数m 和 n，求他们的最大公约数。\n(1) m 除以 n，并令 r 为所得余数。\n(2) 若 r 等于 0，算法结束，n 即为 m 和 n 的最大公约数，否则转（3）。\n(3) 将 n 的值赋予 m，r 的值赋予 n，返回（1）。\n   设求两个整数的公约数的函数原型为”int f(int m,int n);”,对 f(m,n)而言， 若m 能被 n整除，则直接返回 n；若 m 不能被 n 整除，则公约数由 f(n,m%n)计算。\n测试数据：输入：8500，150，最大公约数为：50",
      input: "见题目原文",
      output: "见题目原文",
      concept: "递归要有出口：如果 m%n==0，返回 n；否则 return f(n,m%n)。",
      hints: ["这一关必须真的递归。", "注意递归调用前要 return。", "参考测试 8500 和 150 的最大公约数是 50。"],
      requires: [{ type: "recursive", message: "这一关要求至少有一个函数调用自身，也就是递归。" }],
      tests: [
        { input: "8500 150\n", expected: 50, checker: "containsNumber" },
        { input: "48 18\n", expected: 6, checker: "containsNumber" },
        { input: "270 192\n", expected: 6, checker: "containsNumber" }
      ]
    }
  ];

  if (typeof module !== "undefined" && module.exports) {
    module.exports = CHALLENGES;
  } else {
    root.CHALLENGES = CHALLENGES;
  }
})(typeof window !== "undefined" ? window : globalThis);
