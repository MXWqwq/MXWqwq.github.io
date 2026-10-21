---
title: 'Java 异常处理：分清责任，正确关闭资源'
date: 2026-08-17 13:15:03
description: '从文件读取示例理解受检异常、运行时异常、throws 与 catch 的分工，并用 try-with-resources 自动关闭资源。'
tags:
  - Java
  - 异常处理
  - IO
categories:
  - Java
---


读文件失败可能是路径写错、文件不存在，也可能是读取过程出错。异常的意义是把这些失败明确交给能处理它们的代码，而不是让每一层都写一段笼统的 `catch (Exception e)`。

## 先分清两类常见异常

`IOException` 属于受检异常：调用相关方法时，代码需要捕获它，或者用 `throws` 声明继续向上交付。`IllegalArgumentException` 属于运行时异常：编译器不要求强制捕获，通常提示调用方法的方式不对。两者不是“严重”与“不严重”的区分；关键在于调用方是否应被要求处理这个失败。

方法自己不知道如何补救时，声明 `throws IOException` 很自然。负责与用户交互的入口则可以捕获异常，给出能帮助用户继续操作的提示。

## 用 try-with-resources 读一行文件

把下面的代码放进 `FilePreview.java`，再在运行目录准备一个 UTF-8 编码的 `notes.txt`。`BufferedReader` 实现了可关闭接口，放在 `try (...)` 中后，无论正常读完还是读取时抛出异常，离开该语句时都会执行关闭操作。

```java
import java.io.BufferedReader;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

public class FilePreview {
    static String firstLine(Path path) throws IOException {
        try (BufferedReader reader =
                 Files.newBufferedReader(path, StandardCharsets.UTF_8)) {
            return reader.readLine();
        }
    }

    public static void main(String[] args) {
        try {
            String line = firstLine(Paths.get("notes.txt"));
            System.out.println(line == null ? "(空文件)" : line);
        } catch (IOException e) {
            System.err.println("读取失败，请检查文件路径和权限：" + e.getMessage());
        }
    }
}
```

这里 `firstLine` 只负责读取，所以把 `IOException` 交给调用者；`main` 知道用户正在运行程序，因此在边界处提示失败原因。`readLine()` 返回 `null` 表示文件没有第一行，示例也明确处理了这一情况。

## 为什么不手写 finally 关闭

传统写法需要在 `finally` 中判断资源是否创建成功，还要处理 `close()` 自己抛出的异常。`try-with-resources` 把关闭动作与资源声明放在一起，遗漏的机会更少。如果读取和关闭都失败，读取时的异常仍是主要异常；关闭时的异常会作为 *suppressed exception* 附在它上面，可以通过 `getSuppressed()` 查看。

当然，`try-with-resources` 只解决资源关闭，不会替你决定如何补救读取失败。不要捕获后什么都不做，也不要在每层都记录一次同样的错误。能处理就处理；不能处理，就保留异常信息继续交给上层。

## 小结

写异常处理时依次判断：**失败能否在本层恢复？资源是否必须关闭？调用者需要知道什么？** 对文件、流等可关闭资源，优先考虑 `try-with-resources`；对受检异常，在能够做出有效处理的边界捕获，或者清楚地声明并向上传递。

参考：[Java 异常教程](https://dev.java/learn/language/annotations-exceptions/exceptions/) · [try-with-resources 官方说明](https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html) · [文件缓冲读取示例](https://docs.oracle.com/javase/tutorial/essential/io/file.html)
