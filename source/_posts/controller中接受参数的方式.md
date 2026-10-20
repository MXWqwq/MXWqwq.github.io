---
title: 'Controller中接受参数的方式'
date: 2026-10-20 14:45:15
description: '主要介绍SpringMVC中Controller的接参方式'
---

# 六种
Spring MVC中Controller接收参数常用方式包括@PathVariable、@RequestParam、无注解传参、HttpServletRequest、@RequestBody和@RequestHeader**六种**，分别适用于URL路径、查询参数、请求体及请求头等不同场景。

#### 1 @PathVariable接收参数
请求方式：localhost:7001/param/123

代码示例：
```javascript
@GetMapping("{id}")
public String getPathVariable(@PathVariable String id){
    return "id="+id;
}
```

#### 2 @RequestParam接收参数
使用这个注解需要注意两个点，一是加了这个参数后则请求中必须传递这个参数，二是@RequestParam这个注解可以指定名字，请求参数必须和指定的这个名字相同，如果不指定，则默认为具体参数名。

请求方式：localhost:7001/param/getParam?myId=18

代码示例：
```javascript
@GetMapping("getParam")
public String getRequestParam(@RequestParam("myId") String id){
    return "id="+id;
}
```

#### 3 无注解传参
这种方式和2对比，最大的区别就是这个参数不是必传的，请求路径上可以不传递。

请求方式：localhost:7001/param/getString?id=18

代码示例：
```javascript
@GetMapping("getString")
public String getString(String id){
    return "id="+id;
}
```

#### 4 HttpServletRequest接收参数
请求方式：localhost:7001/param/getRequest?id=18

代码示例：
```javascript
@GetMapping("getRequest")
public String getRequest(HttpServletRequest request){
    String id = request.getParameter("id");
    return "id="+id;
}
```

#### 5 @RequestBody接收请求体参数
这种方式一般用来传递实体对象，加了这个注解后，参数也是必传的。

请求方式：{"id":18}

代码示例：
```javascript
@PostMapping("getBody")
public String getBody(@RequestBody String id){
    return "id="+id;
}
```

#### 6 @RequestHeader接收请求头参数
代码示例：
```javascript
@PostMapping("getHeader")
public String getHeader(@RequestHeader String id){
    return "id="+id;
}
}
```