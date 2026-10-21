---
title: 'Java 集合入门：List、Set、Map 到底怎么选'
date: 2026-08-03 11:34:23
description: '用记录阅读历史、去重和统计次数的例子，理解 Java 的 List、Set、Map 各自解决什么问题，以及顺序、重复和键覆盖这些容易混淆的细节。'
tags:
  - Java
  - 集合
  - List
  - Set
  - Map
categories:
  - Java
---


同样是一组数据，为什么 Java 提供了 `List`、`Set` 和 `Map`？选集合时，先别想实现类的名字，先问自己三个问题：**要保留重复项吗？要按位置取值吗？数据是不是“键 → 值”的关系？**

## 先看三种接口的职责

| 需求 | 选择 | 关键特征 |
| --- | --- | --- |
| 保存一串阅读记录，允许同一篇出现多次 | `List` | 有顺序、可重复、可按索引访问 |
| 保存读过哪些文章，每篇只留一次 | `Set` | 不保留重复元素 |
| 记录每篇文章被读了几次 | `Map` | 每个键最多对应一个值 |

`Map` 不属于 `Collection` 接口树；它存的是键值映射。比如把“Java”作为键，再次 `put("Java", 3)` 会替换该键原来的值，而不是增加一条同名键的记录。

## 把三个需求放在同一个例子里

下面的代码可以直接放进 `CollectionChoice.java`。阅读记录要允许重复，因此用 `ArrayList`；去重结果和次数统计都希望按首次出现的顺序展示，因此分别用 `LinkedHashSet`、`LinkedHashMap`。

```java
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class CollectionChoice {
    public static void main(String[] args) {
        List<String> history = new ArrayList<>();
        history.add("Java");
        history.add("Redis");
        history.add("Java");

        Set<String> unique = new LinkedHashSet<>(history);
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (String title : history) {
            counts.put(title, counts.getOrDefault(title, 0) + 1);
        }

        System.out.println(history); // [Java, Redis, Java]
        System.out.println(unique);  // [Java, Redis]
        System.out.println(counts);  // {Java=2, Redis=1}
    }
}
```

变量尽量声明为 `List`、`Set`、`Map` 这样的接口类型。以后若需求变了，替换具体实现时，依赖这些变量的其他代码通常不必跟着改。

## 顺序和“相同”需要说清楚

`List` 的顺序属于接口语义。`Set` 只承诺元素不重复，**不代表所有 Set 都会保留插入顺序**；`LinkedHashSet` 才明确提供该顺序。同样，不能依赖 `HashMap` 的遍历顺序；需要按加入顺序输出时可选 `LinkedHashMap`。

给自定义对象去重时，还要定义“两个对象何时相同”。如果重写了 `equals()`，也应一起重写 `hashCode()`，让相等对象拥有相同的哈希值。否则，放入基于哈希的集合后，去重与查找可能不符合预期。

## 记住这条选择路线

需要按位置处理且允许重复，先考虑 `List`；只关心成员是否出现过，考虑 `Set`；需要用一个键查找对应值，考虑 `Map`。之后再根据是否要求遍历顺序，挑选合适的实现类。**先确定数据的含义，再考虑实现细节。**

参考：[Java 集合接口概览](https://dev.java/learn/api/collections-and-streams/collections-framework/) · [LinkedHashSet API](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedHashSet.html) · [集合与 equals/hashCode 约定](https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Collection.html)
