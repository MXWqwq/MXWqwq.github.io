---
title: 'MySQL 索引与 EXPLAIN：从查询反推索引'
date: 2026-10-13 16:42:21
description: '用一张订单表学习联合索引的左前缀规则，以及如何阅读 EXPLAIN 的访问方式、索引和预估扫描行数。'
tags:
  - MySQL
  - 索引
  - SQL优化
categories:
  - MySQL
---


索引不是给每一列都加一份“加速器”。它要服务于具体查询，同时占用存储空间，并增加写入时维护索引的工作。设计索引前，先找出真正频繁且需要优化的查询，再观察执行计划。

## 从一条订单查询开始

下面的示例使用 InnoDB。先建表，再按“某位用户的最近订单”这一查询模式建立联合索引：

```sql
CREATE TABLE orders_demo (
  id BIGINT NOT NULL AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  status VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_user_created (user_id, created_at)
) ENGINE=InnoDB;

INSERT INTO orders_demo (user_id, status, created_at) VALUES
  (7, 'paid', '2026-01-03 09:00:00'),
  (7, 'paid', '2026-01-04 10:00:00'),
  (8, 'pending', '2026-01-04 11:00:00');

SELECT id, status, created_at
FROM orders_demo
WHERE user_id = 7 AND created_at >= '2026-01-01'
ORDER BY created_at DESC
LIMIT 20;
```

`(user_id, created_at)` 是一个有顺序的联合索引。`user_id = 7` 先确定索引的左端范围，再由 `created_at` 缩小范围。只写 `WHERE created_at >= ...` 时，`created_at` 并非该索引的左前缀，不能把它当作从第一列开始的索引查找。优化器仍会结合数据量和其他可选方案自行决定计划，所以不能只凭 SQL 外观断定“必定走索引”。

## 用 EXPLAIN 检查计划

```sql
EXPLAIN FORMAT=TRADITIONAL
SELECT id, status, created_at
FROM orders_demo
WHERE user_id = 7 AND created_at >= '2026-01-01'
ORDER BY created_at DESC
LIMIT 20;

SHOW INDEX FROM orders_demo;
```

读传统格式的结果时，可先看这几列：

- `type`：访问表的方式，例如 `ALL` 表示全表扫描，`range` 表示范围访问；它是排查线索，不是单独的好坏评分。
- `possible_keys`：优化器考虑过的候选索引；`key`：最终选用的索引。候选出现了，不等于实际用了。
- `rows`：预计需要检查的行数，是估算值，不是这次查询实际读取的精确行数。
- `Extra`：补充执行信息。应结合查询目标阅读，不能只看到一个词就下结论。

示例表只有三行时，优化器选择全表扫描也可能合理。实际排查应使用接近真实规模和分布的数据，对照修改前后的计划与耗时。`EXPLAIN` 展示优化器计划，并不等于性能实测；需要实际执行信息时，可以对**确认安全的 SELECT** 使用 `EXPLAIN ANALYZE`，它会真正运行查询。

## 小结

先确定筛选、排序的真实查询模式，再考虑联合索引的列顺序；用 `EXPLAIN` 检查优化器是否按预期访问数据，最后以真实数据和实际耗时验证效果。索引越多并非越好，读性能收益应与写入和存储成本一起衡量。

参考：[MySQL 索引与优化](https://dev.mysql.com/doc/refman/8.4/en/optimization-indexes.html)、[多列索引](https://dev.mysql.com/doc/refman/8.4/en/multiple-column-indexes.html)、[EXPLAIN 输出](https://dev.mysql.com/doc/refman/8.4/en/explain-output.html)。
