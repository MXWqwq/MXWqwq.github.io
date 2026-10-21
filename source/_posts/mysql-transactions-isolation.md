---
title: 'MySQL 事务隔离：用两个连接看懂可重复读'
date: 2026-08-25 09:55:32
description: '通过两个 MySQL 连接对照 READ COMMITTED 和 REPEATABLE READ 的普通查询结果，理解快照、锁定读与幻读边界。'
tags:
  - MySQL
  - InnoDB
  - 事务
categories:
  - MySQL
---


事务把一组操作放在一起提交或回滚；隔离级别决定并发事务能观察到什么。MySQL 的 InnoDB 支持 `READ UNCOMMITTED`、`READ COMMITTED`、`REPEATABLE READ` 和 `SERIALIZABLE`，默认是 `REPEATABLE READ`。下面只讨论 **InnoDB 中普通、非锁定的 SELECT**，不要把它与 `SELECT ... FOR UPDATE` 混为一谈。

## 准备一条记录

在任一连接执行一次：

```sql
CREATE TABLE isolation_demo (
  id BIGINT NOT NULL PRIMARY KEY,
  amount INT NOT NULL
) ENGINE=InnoDB;

INSERT INTO isolation_demo (id, amount) VALUES (1, 100);
```

打开两个独立的数据库连接，分别记为 A 和 B。以下步骤按顺序执行。`SET TRANSACTION` 必须放在事务开始前；这里不带 `SESSION`，只影响当前连接的**下一笔**事务。

## READ COMMITTED：每次普通读取取新快照

连接 A：

```sql
SET TRANSACTION ISOLATION LEVEL READ COMMITTED;
START TRANSACTION;
SELECT amount FROM isolation_demo WHERE id = 1; -- 100
```

连接 B：

```sql
START TRANSACTION;
UPDATE isolation_demo SET amount = 120 WHERE id = 1;
COMMIT;
```

回到连接 A：

```sql
SELECT amount FROM isolation_demo WHERE id = 1; -- 120
COMMIT;
```

在 `READ COMMITTED` 下，InnoDB 每次一致性读取都会建立新快照，所以 A 的两次普通查询可得到不同的已提交值。这称为**不可重复读**。如果 B 尚未提交，A 的普通读取不会看到 B 的新值。

## REPEATABLE READ：同一事务复用快照

保持两条连接，A 再开始一笔事务：

```sql
SET TRANSACTION ISOLATION LEVEL REPEATABLE READ;
START TRANSACTION;
SELECT amount FROM isolation_demo WHERE id = 1; -- 120
```

B 再执行并提交：

```sql
START TRANSACTION;
UPDATE isolation_demo SET amount = 140 WHERE id = 1;
COMMIT;
```

A 再读取并结束事务：

```sql
SELECT amount FROM isolation_demo WHERE id = 1; -- 仍为 120
COMMIT;
SELECT amount FROM isolation_demo WHERE id = 1; -- 新事务中可见 140
```

在这个场景中，A 的第一次普通查询建立快照；同一事务内后续普通查询仍读取该快照。事务外的新查询才会看见 B 已提交的新值。若 A 自己修改了数据，普通读取仍可看见自己的写入。

## 不要把所有读取混为一类

**脏读**是读取另一事务尚未提交的数据；`READ UNCOMMITTED` 允许这种风险。**幻读**讨论的是同一条件下结果集出现新行，不只是某行的值变化。InnoDB 的普通一致性读取与锁定读处理幻读的机制不同：默认 `REPEATABLE READ` 的普通读取依靠快照，范围锁定读可能使用间隙锁或 next-key 锁。不能简单套用“某隔离级别一定会/不会出现幻读”的通用口诀来推断每一种 InnoDB 查询。

## 小结

排查并发问题时，先确认存储引擎、隔离级别、是否同一事务，以及查询究竟是普通读取还是锁定读。`READ COMMITTED` 的普通查询按语句更新快照；`REPEATABLE READ` 的普通查询在同一事务复用首次读取的快照。真正需要阻止并发修改时，还应根据业务规则设计锁定读或写入约束。

参考：[InnoDB 事务隔离级别](https://dev.mysql.com/doc/refman/8.4/en/innodb-transaction-isolation-levels.html)、[一致性非锁定读](https://dev.mysql.com/doc/refman/8.4/en/innodb-consistent-read.html)、[SET TRANSACTION](https://dev.mysql.com/doc/refman/8.4/en/set-transaction.html)。
