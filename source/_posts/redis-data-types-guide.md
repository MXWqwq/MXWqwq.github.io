---
title: 'Redis 数据结构怎么选：从访问方式倒推'
date: 2026-09-29 10:27:51
description: '用读取、去重、排序和消费方式选择 Redis 的 String、Hash、List、Set、Sorted Set 与 Stream，并用命令示例理解各自的边界。'
tags:
  - Redis
  - 数据结构
  - 后端开发
categories:
  - Redis
---


把数据放进 Redis 前，先问一个问题：**下一次读取它时，需要做什么操作？** 如果只按键读取一个值，String 就够了；如果还要按字段修改、判断成员是否存在或按分数排序，换一种结构通常更自然。选型的依据是访问方式，不是数据在业务里叫什么名字。

## 六种常用结构

| 需求 | 结构 | 典型操作 |
| --- | --- | --- |
| 读取完整值、计数 | String | `GET`、`SET`、`INCR` |
| 读取或更新对象的某个字段 | Hash | `HGET`、`HSET` |
| 按插入顺序从两端取值 | List | `LPUSH`、`RPOP` |
| 去重、判断成员是否存在 | Set | `SADD`、`SISMEMBER` |
| 按分数维护顺序 | Sorted Set | `ZADD`、`ZRANGE ... REV` |
| 追加事件并让消费者读取 | Stream | `XADD`、`XREAD` |

String 存的是字节序列，适合保存序列化后的文章摘要或简单计数。Hash 把字段和值放在同一个键里，适合姓名、状态等平坦字段；如果对象有复杂嵌套，仍需考虑如何序列化。Set 中的成员不重复，但**没有展示顺序**。Sorted Set 的成员也不重复，每个成员还关联一个分数，可以按分数取排行榜。List 按插入顺序存放元素；Stream 更适合需要保留事件记录、由多个消费者按游标读取的场景。

## 在命令行里试一遍

以下命令可逐条输入 `redis-cli`。键名前缀表达业务用途，便于日后维护。

```text
SET article:42:title "认识 Redis" EX 300
GET article:42:title

HSET user:42 name "小林" level 3
HGET user:42 name
EXPIRE user:42 300

SADD article:42:likes u1 u2 u1
SISMEMBER article:42:likes u1

ZADD rank:weekly 120 alice 95 bob
ZRANGE rank:weekly 0 9 REV WITHSCORES
```

第一组给 String 键设置了 300 秒过期时间。第二组给 Hash 写入两个字段，再给**整个键**设置过期时间。`SADD` 再次加入 `u1` 不会产生第二个相同成员。排行榜中 `ZRANGE ... REV WITHSCORES` 从高分向低分读取，并返回分数供界面展示。

List 可以用一端入队、另一端出队实现简单的先进先出队列；但如果业务要求任务被领取后确认、失败后重试，只靠弹出 List 元素容易丢失处理状态，应进一步设计可靠队列或使用 Stream 的消费组能力。Stream 也不会自动替业务处理重复消息，消费者仍要考虑幂等。

## 选型时再检查三件事

1. **需要什么顺序？** 只去重用 Set；需要按分数排序用 Sorted Set；需要事件读取进度则考虑 Stream。
2. **更新范围有多大？** 每次都整体替换可以用 String；经常只改一个平坦字段，可以用 Hash。
3. **数据何时失效？** 缓存应明确设置过期或删除规则。TTL 作用于键，示例中的 `EXPIRE user:42 300` 并非只让 `name` 字段过期。

先写出读写操作，再选结构，比先选一个熟悉的结构再迁就业务更容易维护。

参考：[Redis 数据类型总览](https://redis.io/docs/latest/develop/data-types/) · [Redis 数据类型比较](https://redis.io/docs/latest/develop/data-types/compare-data-types/)
