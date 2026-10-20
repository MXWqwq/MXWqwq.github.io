---
title: 什么是闭包
tags:
  - 技术

AIGC:
    Label: "1"
    ContentProducer: 001191440300708461136T1XGW3
    ProduceID: e750d20f93a6a2571b2c28bb6d0f3fba_72e5905ec52711f19b82525400de85a5
    ReservedCode1: iszYx9w1wqjBmwWj8/1N0y79pmwN4ikzIoJ/pR7rlbuv/b5oWeQiAjh9wp/spArhwaev7dtWE5LNByp5M+vMus60/eJd/memWTJtQtRUPER/uBrictl7q/v8SgloSz9b9MNk6CKW9LAW6+6IkOq7W61zjzxbH4RS6AUj4f7yMEVk+Hj/chySZA0dDHs=
    ContentPropagator: 001191440300708461136T1XGW3
    PropagateID: e750d20f93a6a2571b2c28bb6d0f3fba_72e5905ec52711f19b82525400de85a5
    ReservedCode2: iszYx9w1wqjBmwWj8/1N0y79pmwN4ikzIoJ/pR7rlbuv/b5oWeQiAjh9wp/spArhwaev7dtWE5LNByp5M+vMus60/eJd/memWTJtQtRUPER/uBrictl7q/v8SgloSz9b9MNk6CKW9LAW6+6IkOq7W61zjzxbH4RS6AUj4f7yMEVk+Hj/chySZA0dDHs=
---





闭包（Closure）是 JavaScript 里最常被提起、也最容易讲不清楚的概念之一。这篇笔记整理一下我自己的理解。

## 什么是闭包

简单说，闭包就是「函数 + 它创建时所处的词法环境」。当一个函数引用了它外层作用域的变量，并且这个函数被「带出」外层作用域继续使用，就形成了闭包。

```javascript
function createCounter() {
  let count = 0;
  return function () {
    count += 1;
    return count;
  };
}

const counter = createCounter();
console.log(counter()); // 1
console.log(counter()); // 2
```

上面的 `count` 按理说在 `createCounter` 返回后就应该被回收，但因为返回的函数还引用着它，它就被「保存」了下来。这就是闭包最常见的表现。

## 常见误区

误区一：认为闭包会复制变量的值。实际上闭包引用的是**变量本身**，而不是当时的快照。看这个经典例子：

```javascript
for (var i = 0; i < 3; i++) {
  setTimeout(function () {
    console.log(i); // 输出 3、3、3，而不是 0、1、2
  }, 100);
}
```

用 `let` 声明 `i` 可以解决，因为 `let` 每次迭代都会创建新的绑定；或者用立即执行函数把 `i` 作为参数传进去。

误区二：认为闭包会造成内存泄漏。闭包确实会延长变量的生命周期，但只要不再持有对闭包的引用，垃圾回收器依然能正常工作。真正需要警惕的是「无意中把闭包挂在全局对象或事件监听器上，却从不解除」。

## 实用场景

- **私有变量**：用闭包模拟私有成员，比如上面的计数器；
- **柯里化**：固定部分参数，返回接收剩余参数的函数；
- **模块模式**：返回一组方法，内部状态对外不可见。

```javascript
const store = (function () {
  let state = {};
  return {
    get(key) { return state[key]; },
    set(key, value) { state[key] = value; }
  };
})();
```

## 小结

闭包不是黑魔法，它只是语言对词法作用域的忠实实现。理解它的关键，是记住「函数记住的是变量的引用，不是值」。多写几个小例子，把上面的误区亲手跑一遍，基本就不会再混淆了。
*（内容由AI生成，仅供参考）*
*（内容由AI生成，仅供参考）*
