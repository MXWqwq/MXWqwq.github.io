---
title: 'Redis Cache Aside：读写流程与一致性边界'
date: 2026-09-03 09:05:56
description: '从一次缓存未命中开始，理解 Cache Aside 的读取、数据库更新后删除缓存、TTL，以及并发情况下仍可能出现的旧值。'
tags:
  - Redis
  - 缓存
  - 后端开发
categories:
  - Redis
---


Cache Aside（旁路缓存）的核心是：**应用负责决定何时读缓存、何时查数据库、何时删除缓存**。Redis 保存可重建的副本，数据库仍是数据的权威来源。它适合读取频繁、允许短时间旧值的资料页或商品详情；不能把它误认为天然的强一致方案。

## 读取：命中就返回，未命中再回源

以商品详情为例，缓存键可以写成 `cache:product:42`。应用先执行 `GET`；没有值时查数据库，再用带过期时间的 `SET` 回填。

```text
function getProduct(id):
    key = "cache:product:" + id
    cached = redis.GET(key)
    if cached exists:
        return decode(cached)

    product = database.findProduct(id)
    if product does not exist:
        return notFound

    redis.SET(key, encode(product), EX 300)
    return product
```

`SET ... EX 300` 把过期时间和写入放在同一条命令里。300 秒只是演示值，实际应根据业务能容忍的旧值时间、数据库压力和更新频率选择。若查询结果不存在，可以为“未找到”设置**较短**的哨兵缓存，减少反复查询不存在的 ID；创建新记录时要记得删除该哨兵。

## 写入：先提交数据库，再删除缓存

当商品发生变更，常见做法是先完成数据库写入，再 `DEL cache:product:42`。下次读取会重新查询数据库并回填。

```text
function updateProduct(id, changes):
    database.updateAndCommit(id, changes)
    redis.DEL("cache:product:" + id)
```

这里的顺序不能随意交换：如果先删缓存再改数据库，其他请求可能趁数据库尚未更新时把旧值重新写回缓存。即使采用“先写库、后删缓存”，**并发下仍有时间窗口**：一个较早开始的读请求可能先查到旧数据，在写请求删缓存后才完成回填，于是旧值短暂重现。TTL 最终会清掉它，却不能保证每次读取都立刻看到最新值。

## 失效和并发要单独设计

- **过期与主动删除配合。** TTL 为漏掉的失效操作提供兜底；业务写入后仍应主动删除相关键。不要把 TTL 当作实时同步。
- **热点键过期会集中回源。** 多个请求同时发现缓存未命中时，可能一起查询数据库。可为热点数据采用单次加载、互斥回填或提前刷新，并确保失败时请求仍有明确的处理路径。
- **批量失效要找全依赖。** 更新商品详情时，列表、搜索结果等其他缓存可能也含有旧内容；应建立键与业务数据的对应关系。
- **高一致性场景要提高方案等级。** 对余额、库存确认等不能接受旧值的操作，应以数据库事务和业务约束为准，必要时引入版本校验；不能仅依赖 Redis 的删除操作。

Cache Aside 把“如何加速读取”与“如何保证真实数据正确”分开处理。先画出读写时序，再定 TTL 和失效范围，最后分析最坏的并发顺序，才算把缓存设计完整。

参考：[Redis Cache Aside](https://redis.io/docs/latest/develop/use-cases/cache-aside/) · [`SET` 命令](https://redis.io/docs/latest/commands/set/)
