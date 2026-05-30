(function (root) {
  root.SOLUTIONS = {
    1: `#include <iostream>
using namespace std;

int main() {
    int n, i = 1, s = 1;
    cin >> n;
    while (i <= n) {
        s *= i;
        i++;
    }
    cout << s << endl;
    return 0;
}`,
    2: `#include <iostream>
using namespace std;

int main() {
    int n, s = 1, x = 1;
    cin >> n;
    for (int i = 1; i <= n; i++) {
        x *= 2;
        s += x;
    }
    cout << s << endl;
    return 0;
}`,
    3: `#include <iostream>
using namespace std;

int main() {
    int num;
    cin >> num;
    if (num < 0) {
        cout << "-";
        num = -num;
    }
    do {
        cout << num % 10;
        num /= 10;
    } while (num != 0);
    cout << endl;
    return 0;
}`,
    4: `#include <iostream>
using namespace std;

int main() {
    int x;
    cin >> x;
    int last = x % 10;
    x /= 10;
    while (x > 0) {
        int digit = x % 10;
        if (digit < last) {
            cout << 0 << endl;
            return 0;
        }
        last = digit;
        x /= 10;
    }
    cout << 1 << endl;
    return 0;
}`,
    5: `#include <iostream>
using namespace std;

int fun(int x) {
    int last = x % 10;
    x /= 10;
    while (x > 0) {
        int digit = x % 10;
        if (digit > last) return 0;
        last = digit;
        x /= 10;
    }
    return 1;
}

int main() {
    int x;
    cin >> x;
    cout << fun(x) << endl;
    return 0;
}`,
    6: `#include <iostream>
using namespace std;

int fun(int n) {
    int sum = 0;
    do {
        sum = sum * 10 + n % 10;
        n /= 10;
    } while (n != 0);
    return sum;
}

int main() {
    int m;
    cin >> m;
    for (int i = 1; i <= m; i++) {
        int x = i * i - i + 41;
        if (x == fun(x)) cout << x << "\\t";
    }
    cout << endl;
    return 0;
}`,
    7: `#include <iostream>
using namespace std;

int fun(int x) {
    int m = 0, s = 0;
    for (int i = 1; i <= x; i++) {
        m = m * 10 + i;
        s += m;
    }
    return s;
}

int main() {
    int x;
    cin >> x;
    cout << fun(x) << endl;
    return 0;
}`,
    8: `#include <iostream>
using namespace std;

int fun(int a, int n) {
    int m = 0, s = 0;
    for (int i = 0; i < n; i++) {
        m = m * 10 + a;
        s += m;
    }
    return s;
}

int main() {
    int a, n;
    cin >> a >> n;
    cout << fun(a, n) << endl;
    return 0;
}`,
    9: `#include <iostream>
using namespace std;

int prime(int n) {
    for (int i = 2; i < n; i++) {
        if (n % i == 0) return 0;
    }
    return 1;
}

int main() {
    for (int n = 2; n <= 400; n++) {
        if (prime(n)) cout << n << "\\t";
    }
    cout << endl;
    return 0;
}`,
    10: `#include <iostream>
using namespace std;

int sumPrimeFactor(int n) {
    int i = 2, s = 0;
    while (n != 1) {
        if (n % i == 0) {
            s += i;
            n /= i;
        } else {
            i++;
        }
    }
    return s;
}

int main() {
    int n;
    cin >> n;
    cout << sumPrimeFactor(n) << endl;
    return 0;
}`,
    11: `#include <iostream>
using namespace std;

int prime(int n) {
    for (int i = 2; i < n; i++) {
        if (n % i == 0) return 0;
    }
    return 1;
}

int main() {
    int n;
    cin >> n;
    for (int i = 2; i <= n / 2; i++) {
        if (prime(i) && prime(n - i)) {
            cout << n << "=" << i << "+" << n - i << endl;
        }
    }
    return 0;
}`,
    12: `#include <iostream>
using namespace std;

int yinzihe(int n) {
    int s = 0;
    for (int i = 1; i < n; i++) {
        if (n % i == 0) s += i;
    }
    return s;
}

int main() {
    for (int i = 3; i < 400; i++) {
        int s = yinzihe(i);
        if (i == yinzihe(s) && i < s) {
            cout << i << " " << s << endl;
        }
    }
    return 0;
}`,
    13: `#include <iostream>
using namespace std;

int fac(int m) {
    int s = 0;
    for (int i = 2; i <= m / 2; i++) {
        if (m % i == 0) s += i * i;
    }
    return s;
}

int check(int x) {
    return fac(x) == x;
}

int main() {
    for (int x = 100; x <= 300; x++) {
        if (check(x)) cout << x << "\\t";
    }
    cout << endl;
    return 0;
}`,
    14: `#include <iostream>
using namespace std;

int main() {
    for (int n = 1000; n < 10000; n++) {
        int a = n / 100;
        int b = n % 100;
        if (n == (a + b) * (a + b)) cout << n << "\\t";
    }
    cout << endl;
    return 0;
}`,
    15: `#include <iostream>
using namespace std;

int duichen(int m) {
    return m % 10 == m / 100;
}

int panduan(int n) {
    return duichen(n) && n % 2 == 0;
}

int main() {
    int count = 0;
    for (int n = 100; n < 1000; n++) {
        if (panduan(n)) {
            cout << n << "\\t";
            count++;
            if (count % 5 == 0) cout << endl;
        }
    }
    cout << count << endl;
    return 0;
}`,
    16: `#include <iostream>
using namespace std;

int main() {
    double a[10], sum = 0;
    int positive = 0, negative = 0, zero = 0;
    for (int i = 0; i < 10; i++) {
        cin >> a[i];
        sum += a[i];
        if (a[i] > 0) positive++;
        else if (a[i] < 0) negative++;
        else zero++;
    }
    cout << positive << " " << negative << " " << zero << endl;
    cout << sum / 10 << endl;
    return 0;
}`,
    17: `#include <iostream>
using namespace std;

int main() {
    int a[10] = {12, 5, 34, 26, 18, 8, 4, 22, 9, 15};
    int n = 10;
    for (int i = 0; i < n - 1; i++) {
        for (int j = n - 1; j > i; j--) {
            if (a[j] < a[j - 1]) {
                int t = a[j];
                a[j] = a[j - 1];
                a[j - 1] = t;
            }
        }
    }
    for (int i = 0; i < n; i++) cout << a[i] << "\\t";
    cout << endl;
    return 0;
}`,
    18: `#include <iostream>
using namespace std;

int f(int m, int n) {
    if (m % n == 0) return n;
    return f(n, m % n);
}

int main() {
    int m, n;
    cin >> m >> n;
    cout << f(m, n) << endl;
    return 0;
}`
  };
})(window);
