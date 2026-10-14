/* Grey Flowers: 为代码块注入语言标签标题条 */
(function () {
  function injectCodeLang() {
    document.querySelectorAll('#article-container .highlight').forEach(function (el) {
      if (el.querySelector('.gf-code-lang')) return
      var m = (el.className || '').match(/highlight-([a-z0-9]+)/)
      var lang = m ? m[1] : 'code'
      var tag = document.createElement('span')
      tag.className = 'gf-code-lang'
      tag.textContent = lang
      var tools = el.querySelector('.highlight-tools') || el.querySelector('figcaption')
      if (tools) {
        tools.appendChild(tag)
      } else {
        var cap = document.createElement('div')
        cap.className = 'gf-code-lang'
        cap.textContent = lang
        el.insertBefore(cap, el.firstChild)
      }
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectCodeLang)
  } else {
    injectCodeLang()
  }

  // 伪 SPA 内容替换后复用：重新注入代码块语言标签
  window.__gfCodeLangInject = injectCodeLang
})();

/* 导航栏右侧图标按钮绑定 */
(function () {
  function bindNavIcons() {
    var searchBtn = document.getElementById('nav-search-btn')
    var originSearch = document.getElementById('search-button')
    if (searchBtn && originSearch) {
      searchBtn.addEventListener('click', function (e) {
        e.preventDefault()
        originSearch.click()
      })
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindNavIcons)
  } else {
    bindNavIcons()
  }
})();

/* 导航栏五菜单：按当前路径激活高亮（默认只显图标，激活键显示中文） */
(function () {
  function activateNavMenu() {
    var menus = document.querySelectorAll('#nav .menus_items a.menus_item[data-path]')
    if (!menus.length) return
    var path = window.location.pathname
    if (path.length > 1 && path.slice(-1) !== '/') path += '/'
    // 文章详情页（main 内存在 #post.gf-post-page）归"文章"模块，避免落入主页兜底
    var isPostPage = !!document.querySelector('main#content-inner #post.gf-post-page')
    var matched = false
    menus.forEach(function (a) {
      var dp = a.getAttribute('data-path')
      // 文章模块子页（/articles/tags/ 等）与文章详情页同样命中"文章"菜单
      var hit = dp === path || (dp === '/articles/' && (path.indexOf('/articles/') === 0 || isPostPage))
      if (hit) {
        a.classList.add('active')
        matched = true
      } else {
        a.classList.remove('active')
      }
    })
    // 未命中任何菜单路径：普通页面默认激活主页；文章详情页不落入主页兜底
    if (!matched && !isPostPage) {
      var home = document.querySelector('#nav .menus_items a.menus_item[data-path="/"]')
      if (home) home.classList.add('active')
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', activateNavMenu)
  } else {
    activateNavMenu()
  }

  // 伪 SPA 内容替换后复用：按当前 URL 重新激活菜单
  window.__gfNavMenuActivate = activateNavMenu
})();

/* 伪 SPA：遮罩局部刷新 + history 前进后退 + 菜单点击改写 */
(function () {
  var overlay = null

  function ensureOverlay() {
    if (!overlay) {
      overlay = document.createElement('div')
      overlay.id = 'gf-spa-overlay'
      overlay.innerHTML = ''
      document.body.appendChild(overlay)
    }
    return overlay
  }

  function showOverlay() {
    ensureOverlay().classList.add('gf-spa-active')
  }

  function hideOverlay() {
    ensureOverlay().classList.remove('gf-spa-active')
  }

  function normalize(p) {
    var s = String(p || '')
    if (s.length > 1 && s.slice(-1) !== '/') s += '/'
    return s
  }

  function currentPath() {
    return normalize(window.location.pathname)
  }

  /* 同步 header：随目标页切换 banner（主页 full_page 有 banner，四页 not-top-img 无 banner）
     仅同步 class/style 不够：主页专属元素（#site-info / #scroll-down / #site_social_icons）
     只在主页模板中渲染，从其他模块刷新后切回主页时这些元素缺失，引语无法显示。
     整体对齐 header 内部结构，保证与目标页直接刷新（Ctrl+R）完全一致。
     过渡类 gf-header-enter 需跨同步保留：切回主页时先置透明，同步后再移除触发淡入。 */
  function syncHeader(newDoc) {
    var cur = document.querySelector('header#page-header')
    var next = newDoc.querySelector('header#page-header')
    if (cur && next) {
      var keepEnter = cur.classList.contains('gf-header-enter')
      cur.className = next.className
      if (keepEnter) cur.classList.add('gf-header-enter')
      cur.setAttribute('style', next.getAttribute('style') || '')
      var nh = next.innerHTML
      if (cur.innerHTML !== nh) cur.innerHTML = nh
    }
  }

  function syncTitle(newDoc) {
    var t = newDoc.querySelector('title')
    if (t && t.textContent) document.title = t.textContent
  }

  /* 替换工作区 main#content-inner（导航栏、右侧图标、页脚保持不动）
     同步 className：主页为 layout，文章模块四页为 layout hide-aside，
     只替换 innerHTML 会让 class 残留导致模块样式错位（白卡/居中/侧栏隐藏异常）
     过渡类 gf-main-enter 需跨同步保留：新内容先置透明，替换完成后移除触发淡入 */
  function syncMain(newDoc) {
    var nextMain = newDoc.querySelector('main#content-inner')
    var curMain = document.querySelector('main#content-inner')
    if (nextMain && curMain) {
      var keepEnter = curMain.classList.contains('gf-main-enter')
      if (curMain.className !== nextMain.className) curMain.className = nextMain.className
      if (keepEnter) curMain.classList.add('gf-main-enter')
      curMain.innerHTML = nextMain.innerHTML
    }
  }

  /* SPA 替换后：重注入代码块语言标签 + 按新 URL 重激活菜单 + 三页（动态/关于/链接）初始化 + 主页（rail/相对时间）初始化 + 文章详情页（TOC/方格纸背景）初始化 */
  function afterSwap() {
    if (window.__gfCodeLangInject) window.__gfCodeLangInject()
    if (window.__gfNavMenuActivate) window.__gfNavMenuActivate()
    if (window.__gfGfPageInit) window.__gfGfPageInit()
    if (window.__gfHomeInit) window.__gfHomeInit()
    if (window.__gfRecentlyInit) window.__gfRecentlyInit()
    if (window.__gfPostInit) window.__gfPostInit()
    if (window.__gfPostBg) window.__gfPostBg()
  }

  /* #scroll-down 点击：平滑滚动到内容区。
     header 内部结构随伪 SPA 整体重建后，main.js 直接绑定在旧元素上的监听失效，这里用 document 委托兜底 */
  document.addEventListener('click', function (e) {
    var sd = e.target && e.target.closest ? e.target.closest('#scroll-down') : null
    if (!sd) return
    e.preventDefault()
    var target = document.querySelector('main#content-inner') || document.body
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, true)

  /* minVisible：点击当前激活键重载当前页时，遮罩至少可见的毫秒数，保证有明确的刷新反馈 */
  /* FETCH_TIMEOUT：服务器路由异常导致响应挂起时，超时后放弃局部刷新、整页跳转，避免遮罩永久卡死 */
  var FETCH_TIMEOUT = 8000

  /* 慢 fetch 兜底阈值：超过该时长仍未返回才显示轻量遮罩（无 spinner）；快速切换全程无遮罩 */
  var SLOW_FETCH_MS = 300

  /* banner 渐变过渡：从主页切出时淡出（opacity/height → 0），切回主页时淡入（opacity 0→1）
     FADE_TIMEOUT：transitionend 未触发时的定时兜底，略大于 CSS 0.45s，保证切换不会卡死 */
  var FADE_TIMEOUT = 520

  /* main 工作区内容淡出/淡入（旧页渐隐 0.3s → 替换 → 新页渐现 0.3s）
     MAIN_FADE_TIMEOUT：transitionend 未触发时的定时兜底，略大于 CSS 0.3s */
  var MAIN_FADE_TIMEOUT = 360

  /* navSeq：全局切换序号，每次 navigateTo 递增。旧请求/旧过渡回调发现序号过期即放弃，
     保证快速连续点击时旧过渡被正确打断，不出现旧结果覆盖新结果、闪白或残影 */
  var navSeq = 0

  function headerHasBanner(h) {
    return !!(h && h.classList && h.classList.contains('full_page'))
  }

  function nextHeaderHasBanner(doc) {
    return headerHasBanner(doc.querySelector('header#page-header'))
  }

  /* 等待当前 main 的 opacity 过渡结束（transitionend 优先，超时兜底） */
  function waitForMainFade(cb) {
    var m = document.querySelector('main#content-inner')
    var done = false
    function finish() {
      if (done) return
      done = true
      cb()
    }
    if (m) {
      m.addEventListener('transitionend', function onEnd(ev) {
        if (ev.target === m && ev.propertyName === 'opacity') {
          m.removeEventListener('transitionend', onEnd)
          finish()
        }
      })
    }
    setTimeout(finish, MAIN_FADE_TIMEOUT)
  }

  /* 等待当前 header 的 opacity 过渡结束（transitionend 优先，超时兜底） */
  function waitForHeaderFade(cb) {
    var h = document.querySelector('header#page-header')
    var done = false
    function finish() {
      if (done) return
      done = true
      cb()
    }
    if (h) {
      h.addEventListener('transitionend', function onEnd(ev) {
        if (ev.target === h && ev.propertyName === 'opacity') {
          h.removeEventListener('transitionend', onEnd)
          finish()
        }
      })
    }
    setTimeout(finish, FADE_TIMEOUT)
  }

  /* 核心交换：main 置透明（enter）→ 同步 header/title/main、pushState、重注入、
     遮罩淡出 → 双重 rAF 后移除过渡类触发新内容淡入（0→1） */
  function doSwap(doc, url, usePush, minVisible, t0, afterHeaderSync, seq) {
    var mainEl = document.querySelector('main#content-inner')
    if (mainEl) {
      /* 旧内容已淡出完成，先移除 fadeout；加 enter 让替换后的新内容保持透明（无过渡） */
      mainEl.classList.remove('gf-main-fadeout')
      mainEl.classList.add('gf-main-enter')
    }
    syncHeader(doc)
    syncTitle(doc)
    syncMain(doc)
    if (usePush) history.pushState({}, '', url)
    afterSwap()
    var wait = Math.max(0, (minVisible || 0) - (Date.now() - t0))
    setTimeout(function () {
      /* 序号过期说明已有更新的导航接管，遮罩留给新流程控制，不再操作 DOM */
      if (seq !== navSeq) return
      hideOverlay()
      /* 双重 rAF：确保新内容 opacity:0 已渲染一帧后再移除 enter，触发 0→1 渐变 */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          if (seq !== navSeq) return
          if (mainEl) mainEl.classList.remove('gf-main-enter')
          if (afterHeaderSync) afterHeaderSync()
        })
      })
      // 统一滚动定位：主页回到 banner 顶（scrollTop=0），四页回到导航栏顶（0）
      window.scrollTo(0, 0)
    }, wait)
  }

  function navigateTo(url, usePush, minVisible) {
    var t0 = Date.now()
    var mySeq = ++navSeq

    /* 打断旧过渡：清理可能残留的 banner 过渡类（旧流程被新导航接管时其回调已放弃清理），
       避免 header 卡在透明/收起状态；随后立即启动旧 main 内容淡出（与 fetch 并行） */
    var h0 = document.querySelector('header#page-header')
    if (h0) {
      h0.classList.remove('gf-header-fadeout')
      h0.classList.remove('gf-header-enter')
    }
    var m0 = document.querySelector('main#content-inner')
    if (m0) m0.classList.add('gf-main-fadeout')

    /* 目标 A：加载快时完全不显示遮罩，仅保留旧淡出新淡入；仅当 fetch 超过
       SLOW_FETCH_MS 仍未返回时才显示轻量兜底遮罩（无 spinner） */
    var overlayShown = false
    var slowTimer = setTimeout(function () {
      if (mySeq !== navSeq) return
      overlayShown = true
      showOverlay()
    }, SLOW_FETCH_MS)
    var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null
    var timer = ctrl ? setTimeout(function () { ctrl.abort() }, FETCH_TIMEOUT) : null
    fetch(url, {
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      credentials: 'same-origin',
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status)
        return r.text()
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html')
        if (doc.querySelector('parsererror')) throw new Error('parse error')
        /* fetch 已返回：取消慢加载兜底遮罩计划（若尚未到点，本次切换全程无遮罩） */
        clearTimeout(slowTimer)
        /* 序号过期：已有更新的导航发起，放弃本次结果（不替换 DOM、不动遮罩） */
        if (mySeq !== navSeq) return
        var curH = document.querySelector('header#page-header')
        var curHome = headerHasBanner(curH)
        var nextHome = nextHeaderHasBanner(doc)

        /* 主页 → 四模块：banner 淡出（0.45s）与旧 main 淡出（0.3s）并行，
           等 banner 过渡完成（时间更长，main 必然已淡出）后再替换并淡入新内容 */
        if (curHome && !nextHome) {
          curH.classList.add('gf-header-fadeout')
          waitForHeaderFade(function () {
            if (mySeq !== navSeq) return
            curH.classList.remove('gf-header-fadeout')
            doSwap(doc, url, usePush, minVisible, t0, null, mySeq)
          })
          return
        }

        /* 四模块 → 主页：banner 渐现展开。先置透明并收起 0 高（无过渡，含 syncHeader 后），
           等旧 main 淡出完成后同步内容，双重 rAF 后同时移除 header/main 过渡类：
           header 触发 height 0→40.5vw + opacity 0→1 对称展开，main 触发 0→1 淡入 */
        if (!curHome && nextHome) {
          curH.classList.add('gf-header-enter')
          void curH.offsetHeight
          waitForMainFade(function () {
            if (mySeq !== navSeq) return
            doSwap(doc, url, usePush, minVisible, t0, function () {
              curH.classList.remove('gf-header-enter')
            }, mySeq)
          })
          return
        }

        /* 其余（四模块间 / 主页重载）：无 banner 高度变化，等旧 main 淡出后直接交换淡入 */
        waitForMainFade(function () {
          if (mySeq !== navSeq) return
          doSwap(doc, url, usePush, minVisible, t0, null, mySeq)
        })
      })
      .catch(function () {
        clearTimeout(slowTimer)
        /* 旧请求失败（如被 FETCH_TIMEOUT abort）：若已有更新的导航接管，静默放弃 */
        if (mySeq !== navSeq) return
        hideOverlay()
        window.location.href = url
      })
      .finally(function () {
        if (timer) clearTimeout(timer)
        if (slowTimer) clearTimeout(slowTimer)
      })
  }

  /* 事件委托（捕获阶段，最先执行）：导航栏菜单、文章卡片、详情页上下篇点击走伪 SPA；当前页点击完全无反应 */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a.menus_item[data-path], a.gf-footer-link[data-path], a.gf-am-nav-item, a.gf-home-post-card, a.gf-article-card, a.gf-archive-card, a.gf-post-prev, a.gf-post-next, .gf-am-breadcrumb a, .gf-post-breadcrumb a, a.gf-hana-head-link') : null
    if (!a) return
    var href = a.getAttribute('href') || '/'
    if (href.charAt(0) !== '/') return
    e.preventDefault()
    // 阻止主题 main.js 等后续监听器对本菜单点击的进一步处理（当前无竞争，仅加固）
    e.stopImmediatePropagation()
    var same = normalize(href) === currentPath()
    // 点击当前已处页面：完全无反应（不跳转、不显示遮罩、不刷新、不触发任何后续处理）
    if (same) return
    navigateTo(href, true, 0)
  }, true)

  /* 浏览器前进/后退：按当前 URL 重新 fetch 替换工作区并同步激活 */
  window.addEventListener('popstate', function () {
    navigateTo(window.location.pathname + window.location.search, false)
  })
})();

/* QQ 按钮：HTTPS 官方短链直链（https://qm.qq.com/q/A8AhaoFYNU）交由浏览器直接打开，QQ 官方短链会根据平台自动跳转/唤起；不做任何 JS 兜底，避免干扰跳转流程。 */

/* 主题切换：light/dark 弹出框 + localStorage 持久化 + 渐变遮罩过渡（document 级委托加固版） */
(function () {
  var THEME_KEY = 'gf-theme'
  var fade = null

  function ensureFade() {
    if (!fade) {
      fade = document.createElement('div')
      fade.className = 'gf-theme-fade'
      document.body.appendChild(fade)
    }
    return fade
  }

  function currentTheme() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  }

  function updateActive(t) {
    var pop = document.querySelector('.gf-theme-pop')
    if (!pop) return
    pop.querySelectorAll('.gf-theme-option').forEach(function (o) {
      o.classList.toggle('gf-theme-active', o.getAttribute('data-gf-theme') === t)
    })
  }

  /* 已选主题再次点击：无任何反应；否则渐变遮罩淡入 → 切主题 → 保存 → 淡出 */
  function applyTheme(t) {
    if (t !== 'light' && t !== 'dark') t = 'light'
    if (currentTheme() === t) return
    var f = ensureFade()
    f.classList.add('gf-theme-fade-in')
    setTimeout(function () {
      document.documentElement.setAttribute('data-theme', t)
      try { localStorage.setItem(THEME_KEY, t) } catch (e) {}
      updateActive(t)
      setTimeout(function () { f.classList.remove('gf-theme-fade-in') }, 330)
    }, 130)
    closePop()
  }

  function openPop() {
    var pop = document.querySelector('.gf-theme-pop')
    if (pop) pop.classList.add('gf-theme-pop-open')
  }

  function closePop() {
    var pop = document.querySelector('.gf-theme-pop')
    if (pop) pop.classList.remove('gf-theme-pop-open')
  }

  /* 是否命中主题键或其弹出框区域（含子元素） */
  function hitThemeUI(el) {
    return !!(el && el.closest && el.closest('#nav-theme-btn, .gf-theme-pop'))
  }

  function initTheme() {
    var saved = null
    try { saved = localStorage.getItem(THEME_KEY) } catch (e) {}
    if (saved === 'dark' || saved === 'light') {
      document.documentElement.setAttribute('data-theme', saved)
    }
    updateActive(currentTheme())
  }

  /* 悬停显示：mouseover/mouseout 委托（捕获阶段，不依赖按钮上直接绑定，DOM 重建/延迟加载均可用） */
  document.addEventListener('mouseover', function (e) {
    if (hitThemeUI(e.target)) openPop()
  }, true)
  document.addEventListener('mouseout', function (e) {
    if (!hitThemeUI(e.target)) return
    var next = e.relatedTarget
    if (next && next.closest && next.closest('#nav-theme-btn, .gf-theme-pop')) return
    closePop()
  }, true)

  /* 点击委托（捕获阶段）：选项应用 / 按钮开合 / 点击外部关闭 */
  document.addEventListener('click', function (e) {
    var t = e.target
    if (!t || !t.closest) return
    if (t.closest('.gf-theme-option')) {
      e.stopPropagation()
      var opt = t.closest('.gf-theme-option')
      applyTheme(opt.getAttribute('data-gf-theme'))
      return
    }
    if (t.closest('#nav-theme-btn')) {
      e.stopPropagation()
      var pop = document.querySelector('.gf-theme-pop')
      if (pop && pop.classList.contains('gf-theme-pop-open')) closePop()
      else openPop()
      return
    }
    closePop()
  }, true)

  initTheme()
})();

/* 文章模块归档页：年份/月份按钮切换过滤（document 级委托，伪 SPA 替换后同样生效） */
(function () {
  function initArticleArchives() {
    var groups = document.querySelectorAll('.gf-archive-group')
    if (!groups.length) return
    var years = document.querySelectorAll('.gf-archive-year')
    var monthsAll = document.querySelectorAll('.gf-archive-months')
    var curYear = null
    var curMonth = null

    function apply(year, month) {
      years.forEach(function (y) {
        y.classList.toggle('active', y.getAttribute('data-year') === year)
      })
      monthsAll.forEach(function (mCont) {
        var isY = mCont.getAttribute('data-year') === year
        mCont.classList.toggle('active', isY)
        mCont.querySelectorAll('.gf-archive-month').forEach(function (m) {
          m.classList.toggle('active', isY && m.getAttribute('data-month') === month)
        })
      })
      groups.forEach(function (g) {
        g.classList.toggle('show', g.getAttribute('data-year') === year && g.getAttribute('data-month') === month)
      })
    }

    // 初始状态：HTML 已标最新年/最新月为 active，这里同步 state
    var firstActiveYear = document.querySelector('.gf-archive-year.active')
    var firstActiveMonth = document.querySelector('.gf-archive-month.active')
    curYear = firstActiveYear ? firstActiveYear.getAttribute('data-year') : null
    curMonth = firstActiveMonth ? firstActiveMonth.getAttribute('data-month') : null
    if (curYear && curMonth) apply(curYear, curMonth)

    document.addEventListener('click', function (e) {
      var t = e.target
      if (!t || !t.closest) return
      var yEl = t.closest('.gf-archive-year')
      if (yEl) {
        var y = yEl.getAttribute('data-year')
        if (y === curYear) return
        curYear = y
        // 切年份后默认展示该年最新月份
        var mCont = null
        monthsAll.forEach(function (c) {
          if (c.getAttribute('data-year') === y) mCont = c
        })
        var firstM = mCont ? mCont.querySelector('.gf-archive-month') : null
        curMonth = firstM ? firstM.getAttribute('data-month') : null
        if (curMonth) apply(y, curMonth)
        return
      }
      var mEl = t.closest('.gf-archive-month')
      if (mEl) {
        var m = mEl.getAttribute('data-month')
        if (m === curMonth) return
        curMonth = m
        if (curYear) apply(curYear, m)
      }
    }, true)
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initArticleArchives)
  } else {
    initArticleArchives()
  }
  window.__gfArticleArchivesInit = initArticleArchives
})();


/* ============================================================
   Grey Flowers 三页：动态卡片展开 + 关于页欢迎动画
   全部使用 document 级事件委托 / 全局入口，兼容伪 SPA DOM 重建
   ============================================================ */
(function () {
  /* 动态卡片：点击整卡展开/收起正文（排除卡片内链接、音乐块、meta 等可交互区域） */
  document.addEventListener('click', function (e) {
    var card = e.target && e.target.closest ? e.target.closest('.gf-activity-card') : null
    if (!card) return
    if (e.target.closest('a, button, .gf-activity-meta, .gf-activity-music')) return
    card.classList.toggle('gf-open')
  }, true)

  /* 关于页欢迎区：逐行逐字淡入（初始态 opacity:0 / top:12px 由 CSS 提供） */
  function animateChildren(el) {
    var items = Array.prototype.slice.call(el.children)
    items.forEach(function (child, index) {
      setTimeout(function () {
        child.style.transition = 'all .2s ease'
        child.style.opacity = '1'
        child.style.top = '0'
      }, index * 40)
    })
  }

  function initGfAbout() {
    var about = document.getElementById('gf-about')
    if (!about) return
    var lines = about.querySelectorAll('.gf-ab-line')
    Array.prototype.forEach.call(lines, function (line) {
      animateChildren(line)
    })
    var sns = about.querySelector('.gf-about-sns')
    if (sns) {
      setTimeout(function () {
        sns.style.transition = 'opacity .35s ease'
        sns.style.opacity = '1'
      }, lines.length * 40 + 120)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGfAbout)
  } else {
    initGfAbout()
  }
  window.__gfGfPageInit = initGfAbout
})();

/* ============================================================
   Grey Flowers 主页：最近动态 rail 拖拽滚动 + 相对时间
   全部使用全局入口（window.__gfHomeInit），兼容伪 SPA DOM 重建
   ============================================================ */
(function () {
  /* 相对时间：刚刚 / N 分钟前 / N 小时前 / N 天前 / N 周前 / MM-DD */
  function formatRelative(dateStr) {
    if (!dateStr) return ''
    var t = new Date(dateStr.replace(/-/g, '/'))
    if (isNaN(t.getTime())) return dateStr
    var diff = Math.floor((Date.now() - t.getTime()) / 1000)
    if (diff < 60) return '刚刚'
    var min = Math.floor(diff / 60)
    if (min < 60) return min + ' 分钟前'
    var hr = Math.floor(diff / 3600)
    if (hr < 24) return hr + ' 小时前'
    var day = Math.floor(diff / 86400)
    if (day < 7) return day + ' 天前'
    if (day < 30) return Math.floor(day / 7) + ' 周前'
    var m = t.getMonth() + 1
    var d = t.getDate()
    return (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d
  }

  function fillRelativeTimes(root) {
    var els = root.querySelectorAll('[data-gf-date]')
    Array.prototype.forEach.call(els, function (el) {
      var rel = formatRelative(el.getAttribute('data-gf-date'))
      if (rel) el.textContent = rel
    })
  }

  /* rail 指针拖拽滚动 + 惯性（鼠标按住拖动；触摸板双指横滑走浏览器原生 overflow-x） */
  function initRail(root) {
    var rails = root.querySelectorAll('.gf-home-rail')
    Array.prototype.forEach.call(rails, function (rail) {
      if (rail.__gfRailBound) return
      rail.__gfRailBound = true
      var pressed = false
      var dragging = false
      var startX = 0
      var startScroll = 0
      var moved = 0
      var vel = 0
      var lastX = 0
      var lastT = 0
      var raf = null

      /* 速度 EMA 平滑：抑制单帧抖动，松手时获得稳定末速度 */
      function updateVelocity(x, t) {
        var dt = t - lastT
        if (dt > 0 && dt < 150) {
          var inst = ((x - lastX) / dt) * 16 /* px/帧（16ms） */
          vel = vel === 0 ? inst : vel * 0.7 + inst * 0.3
        }
        lastX = x
        lastT = t
      }

      /* 惯性滑行：按末速度逐帧衰减 scrollLeft，帧率归一化 + 边界钳制 */
      function startInertia() {
        var speed = vel
        if (Math.abs(speed) < 0.15) return
        cancelAnimationFrame(raf)
        var lastTs = performance.now()
        function step(ts) {
          if (Math.abs(speed) < 0.05) return
          var dt = Math.min(ts - lastTs, 40) / 16.67
          lastTs = ts
          var prev = rail.scrollLeft
          var next = prev - speed * dt
          var max = rail.scrollWidth - rail.clientWidth
          if (next < 0) next = 0
          if (next > max) next = max
          if (next === prev || Math.abs(next - prev) < 0.05) return
          rail.scrollLeft = next
          speed *= Math.pow(0.94, dt)
          raf = requestAnimationFrame(step)
        }
        raf = requestAnimationFrame(step)
      }

      function stop() {
        if (!pressed) return
        pressed = false
        dragging = false
        rail.classList.remove('gf-dragging')
        startInertia()
      }

      rail.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return
        pressed = true
        dragging = false
        moved = 0
        startX = e.clientX
        startScroll = rail.scrollLeft
        vel = 0
        lastX = e.clientX
        lastT = Date.now()
        cancelAnimationFrame(raf)
      })

      rail.addEventListener('pointermove', function (e) {
        if (!pressed) return
        var dx = e.clientX - startX
        moved = Math.max(moved, Math.abs(dx))
        /* 位移超过阈值才进入拖拽态：避免真实单击时卡片被 pointer-events:none 吞掉 click */
        if (!dragging && Math.abs(dx) > 5) {
          dragging = true
          rail.classList.add('gf-dragging')
          if (rail.setPointerCapture) rail.setPointerCapture(e.pointerId)
        }
        if (dragging) {
          updateVelocity(e.clientX, Date.now())
          rail.scrollLeft = startScroll - dx
        }
      })

      function end() {
        if (!pressed) return
        if (moved > 8) {
          var suppressClick = function (ev) {
            ev.preventDefault()
            ev.stopImmediatePropagation()
            document.removeEventListener('click', suppressClick, true)
          }
          document.addEventListener('click', suppressClick, true)
        }
        stop()
      }

      rail.addEventListener('pointerup', end)
      rail.addEventListener('pointercancel', end)
      rail.addEventListener('pointerleave', function (e) {
        if (pressed && e.pointerType === 'mouse') end()
      })
    })
  }

  function initGfHome() {
    var home = document.getElementById('gf-home')
    if (!home) return
    fillRelativeTimes(home)
    initRail(home)
    initLoadMore(home)
  }

  /* ============ rail 分页加载（对标 Grey Flowers loadMoreObserver + LoaderCircle） ============ */
  var GF_HOME_PAGE_SIZE = 10

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  /* 生成与 index.pug 模板完全一致的活动卡片 HTML */
  function activityCardHTML(act, total, idx) {
    var hasImgs = Number(act.images || 0) > 0
    var hasMusic = !!(act.music && act.music.title)
    var typeLabel = hasImgs ? '图片' : (hasMusic ? '音乐' : '随记')
    var typeIcon = hasImgs ? 'fa-image' : (hasMusic ? 'fa-music' : 'fa-comment-dots')
    var typeCls = hasImgs ? 'gf-act-img' : (hasMusic ? 'gf-act-music' : 'gf-act-note')
    var date = String(act.date || '')
    var datePart = date.length > 5 ? date.slice(5) : date
    var content = escapeHtml(act.content)
    var comment = Number(act.comment_count || 0)
    var like = act.like_count !== undefined ? Number(act.like_count) : (total - idx) * 3 + 4
    var h = '<article class="gf-home-act-card ' + typeCls + '" data-gf-tl-idx="' + idx + '" data-gf-src="gf-home-activities" role="button" tabindex="0">'
    h += '<div class="gf-activity-top">'
    h += '<div class="gf-activity-ident">'
    h += '<span class="gf-activity-type-ico"><i class="fas fa-fw ' + typeIcon + '"></i></span>'
    h += '<div class="gf-activity-ident-text">'
    h += '<p class="gf-activity-type">' + typeLabel + '</p>'
    h += '<time class="gf-activity-date" data-gf-date="' + escapeHtml(date) + '">' + escapeHtml(date) + '</time>'
    h += '</div></div>'
    h += '<span class="gf-activity-compact">' + escapeHtml(datePart) + '</span>'
    h += '</div>'
    h += '<div class="gf-activity-body">'
    h += '<p class="gf-activity-text">' + content + '</p>'
    if (hasImgs) {
      h += '<div class="gf-activity-images">'
      var imgN = Math.min(Number(act.images), 3)
      for (var k = 0; k < imgN; k++) {
        h += '<div class="gf-activity-ph gf-ph-' + (k % 3) + '"></div>'
      }
      h += '</div>'
      h += '<span class="gf-activity-badge"><i class="fas fa-images fa-fw"></i> ' + Number(act.images) + '</span>'
    } else if (hasMusic) {
      h += '<div class="gf-activity-music">'
      h += '<span class="gf-activity-music-ico"><i class="fas fa-music fa-fw"></i></span>'
      h += '<div class="gf-activity-music-text">'
      h += '<p class="gf-activity-music-title">' + escapeHtml(act.music.title) + '</p>'
      h += '<p class="gf-activity-music-artist">' + escapeHtml(act.music.artist || '') + '</p>'
      h += '</div>'
      h += '<span class="gf-activity-music-count">1 首歌</span>'
      h += '</div>'
    } else {
      h += '<div class="gf-activity-footnote"><i class="fas fa-feather fa-fw"></i><span>Something to remember</span></div>'
    }
    h += '<div class="gf-activity-meta">'
    h += '<span class="gf-activity-meta-item gf-home-like"><i class="fas fa-heart fa-fw"></i> ' + like + ' 赞</span>'
    h += '<span class="gf-activity-meta-item"><i class="fas fa-comment-dots fa-fw"></i> ' + comment + ' 评论</span>'
    if (hasImgs) {
      h += '<span class="gf-activity-meta-item"><i class="fas fa-image fa-fw"></i> ' + Number(act.images) + ' 张图</span>'
    }
    if (hasMusic) {
      h += '<span class="gf-activity-meta-item"><i class="fas fa-music fa-fw"></i> 1 首歌</span>'
    }
    h += '</div></div></article>'
    return h
  }

  /* 分页加载：IntersectionObserver 观察 rail 末尾触发器，接近末尾自动追加下一批 10 条 */
  function initLoadMore(home) {
    var dataEl = document.getElementById('gf-home-activities')
    var all = []
    if (dataEl) {
      try { all = JSON.parse(dataEl.textContent || '[]') } catch (e) { all = [] }
    }
    window.__gfActivities = all
    var rails = home.querySelectorAll('.gf-home-rail[data-gf-rail]')
    Array.prototype.forEach.call(rails, function (rail) {
      if (rail.__gfLoadMoreBound) return
      rail.__gfLoadMoreBound = true
      var trigger = rail.querySelector('.gf-load-more-trigger')
      if (!trigger) return
      var page = 1
      var loading = false
      var done = page * GF_HOME_PAGE_SIZE >= all.length

      function finish() {
        if (rail.__gfLoadMoreIo) {
          rail.__gfLoadMoreIo.disconnect()
          rail.__gfLoadMoreIo = null
        }
        trigger.classList.remove('gf-loading')
        trigger.classList.add('gf-done')
      }

      if (done || !('IntersectionObserver' in window)) {
        finish()
        return
      }

      function loadNext() {
        if (loading || done) return
        loading = true
        trigger.classList.add('gf-loading')
        var start = page * GF_HOME_PAGE_SIZE
        var batch = all.slice(start, start + GF_HOME_PAGE_SIZE)
        if (!batch.length) {
          done = true
          finish()
          return
        }
        /* 先让 spinner 渲染一帧，再追加卡片，保留加载反馈 */
        requestAnimationFrame(function () {
          var frag = document.createDocumentFragment()
          batch.forEach(function (act, bi) {
            var wrap = document.createElement('div')
            wrap.innerHTML = activityCardHTML(act, all.length, start + bi).trim()
            var node = wrap.firstChild
            if (node) frag.appendChild(node)
          })
          rail.insertBefore(frag, trigger)
          page++
          loading = false
          done = page * GF_HOME_PAGE_SIZE >= all.length
          /* 新卡片补齐相对时间 */
          fillRelativeTimes(rail)
          if (done) finish()
        })
      }

      var io = new IntersectionObserver(function (entries) {
        var entry = entries[0]
        if (entry && entry.isIntersecting) loadNext()
      }, { root: rail, rootMargin: '0px 240px 0px 0px', threshold: 0 })
      rail.__gfLoadMoreIo = io
      io.observe(trigger)
    })
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGfHome)
  } else {
    initGfHome()
  }
  window.__gfHomeInit = initGfHome
})();

/* 文章详情页初始化（grey-flowers 风格）：TOC 折叠切换 + 平滑滚动 + 滚动高亮。
   伪 SPA 替换 main 后由 afterSwap 重新调用（每次重建 DOM 均重新绑定）。 */
(function () {
  window.__gfPostInit = function () {
    var page = document.querySelector('#post.gf-post-page')
    if (!page) return

    /* TOC 折叠 */
    var toggle = page.querySelector('.gf-post-toc-toggle')
    var tocBody = page.querySelector('.gf-post-toc-body')
    if (toggle && tocBody) {
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') === 'true'
        toggle.setAttribute('aria-expanded', String(!open))
        tocBody.classList.toggle('gf-post-toc-collapsed', open)
      })
    }

    /* TOC 链接平滑滚动（避开吸顶导航） */
    var links = Array.prototype.slice.call(page.querySelectorAll('.gf-post-toc-body a.toc-link'))
    links.forEach(function (l) {
      l.addEventListener('click', function (ev) {
        var id = l.getAttribute('href')
        if (!id || id.charAt(0) !== '#') return
        var target = document.getElementById(id.slice(1))
        if (target) {
          ev.preventDefault()
          var y = target.getBoundingClientRect().top + window.scrollY - 80
          window.scrollTo({ top: y, behavior: 'smooth' })
        }
      })
    })

    /* 滚动高亮：正文标题进入视口时激活对应 TOC 项 */
    var headings = Array.prototype.slice.call(page.querySelectorAll('#article-container h2, #article-container h3'))
    if (headings.length && links.length) {
      var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return
          links.forEach(function (l) {
            l.classList.toggle('gf-toc-active', l.getAttribute('href') === '#' + en.target.id)
          })
        })
      }, { rootMargin: '-80px 0px -70% 0px' })
      headings.forEach(function (h) { obs.observe(h) })
    }
  }
})();

/* 详情页方格纸背景：新 main 含 .gf-post-page 时 body 加 gf-post-bg，否则移除。
   伪 SPA afterSwap 与整页加载 DOMContentLoaded 均调用，保证两种入口效果一致。 */
(function () {
  window.__gfPostBg = function () {
    var hasPost = !!(document.querySelector('main#content-inner #post.gf-post-page'))
    document.body.classList.toggle('gf-post-bg', hasPost)
  }

  function bootPost() {
    if (window.__gfPostBg) window.__gfPostBg()
    if (window.__gfPostInit) window.__gfPostInit()
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootPost)
  } else {
    bootPost()
  }
})();

/* ============================================================
   Grey Flowers 动态页：时间线卡片滚动加载 + 滚动进度指示器
   复刻 /recently：IntersectionObserver 分批追加 + 右下角圆形百分比回顶按钮
   全局入口（window.__gfRecentlyInit），兼容伪 SPA DOM 重建
   ============================================================ */
(function () {
  var GF_TL_PAGE_SIZE = 10

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
  }

  /* 生成与 gf-recently.pug 完全一致的时间线卡片 HTML（idx 为全局序号，total 为总条数） */
  function gfTlItemHTML(act, idx, total) {
    var hasImgs = Number(act.images || 0) > 0
    var hasMusic = !!(act.music && act.music.title)
    var content = escapeHtml(act.content)
    var like = act.like_count !== undefined ? Number(act.like_count) : (total - idx) * 3 + 4
    var comment = Number(act.comment_count || 0)
    var h = '<li class="gf-tl-item" data-gf-tl-idx="' + idx + '">'
    h += '<article class="gf-tl-card">'
    h += '<header class="gf-tl-head">'
    h += '<div class="gf-tl-ident">'
    h += '<img class="gf-tl-avatar" src="/img/avatar.jpg" alt="avatar" loading="lazy">'
    h += '<div class="gf-tl-ident-text">'
    h += '<span class="gf-tl-user">MXWqwq</span>'
    h += '<time class="gf-tl-time"><i class="far fa-clock fa-fw"></i> ' + escapeHtml(act.date) + '</time>'
    h += '</div></div>'
    h += '<span class="gf-tl-share" title="分享"><i class="fas fa-external-link-alt fa-fw"></i></span>'
    h += '</header>'
    h += '<div class="gf-tl-body">'
    h += '<p class="gf-tl-text">' + content + '</p>'
    if (hasImgs) {
      h += '<div class="gf-activity-images">'
      var imgN = Math.min(Number(act.images), 3)
      for (var k = 0; k < imgN; k++) {
        h += '<div class="gf-activity-ph gf-ph-' + (k % 3) + '"></div>'
      }
      h += '</div>'
      h += '<span class="gf-activity-badge"><i class="fas fa-images fa-fw"></i> ' + Number(act.images) + '</span>'
    } else if (hasMusic) {
      h += '<div class="gf-activity-music">'
      h += '<span class="gf-activity-music-ico"><i class="fas fa-music fa-fw"></i></span>'
      h += '<div class="gf-activity-music-text">'
      h += '<p class="gf-activity-music-title">' + escapeHtml(act.music.title) + '</p>'
      h += '<p class="gf-activity-music-artist">' + escapeHtml(act.music.artist || '') + '</p>'
      h += '</div>'
      h += '<span class="gf-activity-music-count">1 首歌</span>'
      h += '</div>'
    } else {
      h += '<div class="gf-activity-footnote"><i class="fas fa-feather fa-fw"></i><span>Something to remember</span></div>'
    }
    h += '</div>'
    h += '<footer class="gf-tl-meta">'
    h += '<span class="gf-tl-meta-item gf-tl-like"><i class="fas fa-heart fa-fw"></i> ' + like + '</span>'
    h += '<span class="gf-tl-meta-item gf-tl-comment"><i class="far fa-comment-dots fa-fw"></i> ' + comment + '</span>'
    h += '</footer></article></li>'
    return h
  }

  function updateTlProgress(root, loaded, total) {
    var num = root.querySelector('.gf-scroll-progress-num')
    if (!num) return
    num.textContent = (total ? Math.min(100, Math.ceil(loaded / total * 100)) : 0) + '%'
  }

  /* 时间线滚动加载：IntersectionObserver 观察末尾触发器，接近末尾自动追加下一批 10 条 */
  function initGfRecently() {
    var root = document.getElementById('gf-recently')
    if (!root || root.__gfTlBound) return
    root.__gfTlBound = true

    var dataEl = document.getElementById('gf-recently-activities')
    var all = []
    if (dataEl) {
      try { all = JSON.parse(dataEl.textContent || '[]') } catch (e) { all = [] }
    }
    var list = root.querySelector('.gf-tl-list')
    var trigger = root.querySelector('.gf-tl-more')
    if (!list || !trigger || !all.length) return

    var rendered = list.querySelectorAll('.gf-tl-item').length
    var loading = false
    var done = rendered >= all.length
    var io = null
    updateTlProgress(root, rendered, all.length)

    function finish() {
      if (io) { io.disconnect(); io = null }
      trigger.classList.remove('gf-loading')
      trigger.classList.add('gf-done')
    }

    if (done || !('IntersectionObserver' in window)) {
      finish()
      return
    }

    function loadNext() {
      if (loading || done) return
      loading = true
      trigger.classList.add('gf-loading')
      var batch = all.slice(rendered, rendered + GF_TL_PAGE_SIZE)
      if (!batch.length) {
        done = true
        finish()
        return
      }
      /* 先让 spinner 渲染一帧，再追加卡片，保留加载反馈 */
      requestAnimationFrame(function () {
        var frag = document.createDocumentFragment()
        batch.forEach(function (act) {
          var wrap = document.createElement('div')
          wrap.innerHTML = gfTlItemHTML(act, rendered, all.length).trim()
          var node = wrap.firstChild
          if (node) frag.appendChild(node)
          rendered++
        })
        list.appendChild(frag)
        loading = false
        updateTlProgress(root, rendered, all.length)
        done = rendered >= all.length
        if (done) finish()
      })
    }

    io = new IntersectionObserver(function (entries) {
      var entry = entries[0]
      if (entry && entry.isIntersecting) loadNext()
    }, { rootMargin: '200px 0px 0px 0px', threshold: 0 })
    io.observe(trigger)
  }

  /* 滚动进度指示器（复刻 ScrollTop：滚动百分比 + hover 箭头 + 点击回顶） */
  function initScrollProgress() {
    var btn = document.querySelector('.gf-scroll-progress')
    if (!btn || btn.__gfSpBound) return
    btn.__gfSpBound = true
    var num = btn.querySelector('.gf-scroll-progress-num')
    function update() {
      if (!num) return
      var doc = document.documentElement
      var total = doc.scrollHeight - doc.clientHeight
      if (total <= 0) { num.textContent = '0%'; return }
      var y = window.scrollY || doc.scrollTop || 0
      num.textContent = Math.min(100, Math.ceil(y / total * 100)) + '%'
    }
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update, { passive: true })
    update()
    btn.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  /* ============ 动态详情弹窗（复刻 Grey Flowers DetailDialog / HanaDialog） ============
     点击时间线卡片打开居中模态：深灰磨砂遮罩 + 白卡 + 右上角 × + 标题"动态详情"；
     内容 = 头像/用户名/时间 + 正文 + 图片/音乐 + 点赞评论 meta + 底部评论输入框（"评论 N"）；
     点击遮罩 / × / ESC 关闭；打开时锁定页面滚动；document 级委托兼容伪 SPA 重建 */
  /* 生成弹窗详情内容 HTML（数据字段与 gfTlItemHTML 完全一致） */
  function gfTlDetailHTML(act, total, idx) {
    var hasImgs = Number(act.images || 0) > 0
    var hasMusic = !!(act.music && act.music.title)
    var content = escapeHtml(act.content)
    var like = act.like_count !== undefined ? Number(act.like_count) : (total - idx) * 3 + 4
    var comment = Number(act.comment_count || 0)
    var h = ''
    h += '<div class="gf-tl-dialog-ident">'
    h += '<img class="gf-tl-avatar" src="/img/avatar.jpg" alt="avatar" loading="lazy">'
    h += '<div class="gf-tl-dialog-ident-text">'
    h += '<span class="gf-tl-user">MXWqwq</span>'
    h += '<span class="gf-tl-time"><i class="far fa-clock fa-fw"></i> ' + escapeHtml(act.date) + '</span>'
    h += '</div></div>'
    h += '<div class="gf-tl-dialog-content">'
    h += '<p class="gf-tl-text">' + content + '</p>'
    if (hasImgs) {
      h += '<div class="gf-activity-images">'
      var imgN = Math.min(Number(act.images), 3)
      for (var k = 0; k < imgN; k++) {
        h += '<div class="gf-activity-ph gf-ph-' + (k % 3) + '"></div>'
      }
      h += '</div>'
      h += '<span class="gf-activity-badge"><i class="fas fa-images fa-fw"></i> ' + Number(act.images) + '</span>'
    } else if (hasMusic) {
      h += '<div class="gf-activity-music">'
      h += '<span class="gf-activity-music-ico"><i class="fas fa-music fa-fw"></i></span>'
      h += '<div class="gf-activity-music-text">'
      h += '<p class="gf-activity-music-title">' + escapeHtml(act.music.title) + '</p>'
      h += '<p class="gf-activity-music-artist">' + escapeHtml(act.music.artist || '') + '</p>'
      h += '</div>'
      h += '<span class="gf-activity-music-count">1 首歌</span>'
      h += '</div>'
    } else {
      h += '<div class="gf-activity-footnote"><i class="fas fa-feather fa-fw"></i><span>Something to remember</span></div>'
    }
    h += '</div>'
    h += '<div class="gf-tl-dialog-meta">'
    h += '<span class="gf-tl-meta-item gf-tl-like"><i class="fas fa-heart fa-fw"></i> ' + like + ' 赞</span>'
    h += '<span class="gf-tl-meta-item"><i class="fas fa-comment-dots fa-fw"></i> ' + comment + ' 评论</span>'
    if (hasImgs) {
      h += '<span class="gf-tl-meta-item"><i class="fas fa-image fa-fw"></i> ' + Number(act.images) + ' 张图</span>'
    }
    if (hasMusic) {
      h += '<span class="gf-tl-meta-item"><i class="fas fa-music fa-fw"></i> 1 首歌</span>'
    }
    h += '</div>'
    h += '<div class="gf-tl-dialog-comment">'
    h += '<input class="gf-tl-dialog-input" type="text" placeholder="评论 ' + comment + '" maxlength="2048">'
    h += '<button class="gf-tl-dialog-send" type="button" aria-label="发送评论"><i class="fas fa-paper-plane fa-fw"></i></button>'
    h += '</div>'
    return h
  }

  /* 打开详情：按 data-gf-tl-idx 从注入数据取动态并渲染进弹窗骨架（srcId 缺省为最近动态页数据源） */
  function openGfTlDialog(idx, srcId) {
    var dialog = document.querySelector('.gf-tl-dialog')
    if (!dialog) return
    var dataEl = document.getElementById(srcId || 'gf-recently-activities')
    var all = []
    if (dataEl) {
      try { all = JSON.parse(dataEl.textContent || '[]') } catch (e) { all = [] }
    }
    var act = all[Number(idx)]
    if (!act) return
    var body = dialog.querySelector('.gf-tl-dialog-body')
    if (body) body.innerHTML = gfTlDetailHTML(act, all.length, Number(idx))
    dialog.classList.add('gf-tl-dialog-open')
    dialog.setAttribute('aria-hidden', 'false')
    document.body.classList.add('gf-dialog-lock')
  }

  function closeGfTlDialog() {
    var dialog = document.querySelector('.gf-tl-dialog')
    if (!dialog) return
    dialog.classList.remove('gf-tl-dialog-open')
    dialog.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('gf-dialog-lock')
  }

  /* 弹窗初始化：伪 SPA 重建后强制回到关闭态（防滚动锁残留）；委托只绑一次 */
  function initGfTlDialog() {
    var dialog = document.querySelector('.gf-tl-dialog')
    if (!dialog) return
    dialog.classList.remove('gf-tl-dialog-open')
    dialog.setAttribute('aria-hidden', 'true')
    document.body.classList.remove('gf-dialog-lock')
    if (document.__gfTlDialogBound) return
    document.__gfTlDialogBound = true

    /* 点击：关闭钮 / 遮罩关闭；发送按钮清空输入；卡片打开详情（排除分享钮与链接） */
    document.addEventListener('click', function (e) {
      var t = e.target
      if (!t || !t.closest) return
      if (t.closest('.gf-tl-dialog-close') || t.closest('.gf-tl-dialog-mask')) {
        closeGfTlDialog()
        return
      }
      if (t.closest('.gf-tl-dialog-send')) {
        var box = t.closest('.gf-tl-dialog-comment')
        var input = box ? box.querySelector('.gf-tl-dialog-input') : null
        if (input) input.value = ''
        return
      }
      var item = t.closest('.gf-tl-item') || t.closest('.gf-home-act-card')
      if (item) {
        if (t.closest('.gf-tl-share, a, button')) return
        openGfTlDialog(item.getAttribute('data-gf-tl-idx'), item.getAttribute('data-gf-src'))
      }
    }, true)

    /* 键盘：ESC 关闭详情；Enter/Space 在可聚焦卡片上打开详情 */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        var d = document.querySelector('.gf-tl-dialog')
        if (d && d.classList.contains('gf-tl-dialog-open')) closeGfTlDialog()
        return
      }
      if (e.key === 'Enter' || e.key === ' ') {
        var item = e.target && e.target.closest ? (e.target.closest('.gf-tl-item') || e.target.closest('.gf-home-act-card')) : null
        if (item && item.getAttribute('role') === 'button') {
          e.preventDefault()
          openGfTlDialog(item.getAttribute('data-gf-tl-idx'), item.getAttribute('data-gf-src'))
        }
      }
    }, true)
  }

  window.__gfRecentlyInit = function () {
    initGfRecently()
    initScrollProgress()
    initGfTlDialog()
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.__gfRecentlyInit)
  } else {
    window.__gfRecentlyInit()
  }
})();

/* ===== 音乐播放器（body 级挂载，伪SPA跳转不中断） ===== */
(function () {
  if (window.__gfMusicInited) return
  window.__gfMusicInited = true

  var audio = document.getElementById('gf-music-audio')
  var btn = document.getElementById('gf-music-btn')
  var panel = document.getElementById('gf-music-panel')
  if (!audio || !btn || !panel) return

  var toggleBtn = panel.querySelector('.gf-music-toggle')
  var toggleIcon = toggleBtn ? toggleBtn.querySelector('i') : null
  var curEl = panel.querySelector('.gf-music-cur')
  var totalEl = panel.querySelector('.gf-music-total')
  var volRange = panel.querySelector('.gf-music-vol')
  var progressBar = panel.querySelector('.gf-music-progress-bar')
  var volBtn = panel.querySelector('.gf-music-vol-btn')
  var volIcon = volBtn ? volBtn.querySelector('i') : null
  if (!toggleBtn || !toggleIcon || !curEl || !totalEl || !volRange || !progressBar || !volBtn || !volIcon) return
  var UNLOCK_TYPES = ['click', 'touchstart', 'keydown']
  var draggingProgress = false
  var lastVol = 0.5

  function clamp (v, min, max) { return Math.max(min, Math.min(max, v)) }

  /* 音量：同步 audio.volume / 竖向条填充 / 按钮四档图标（静音-低-中-高） */
  function setVolumePct (v) {
    var vv = clamp(v, 0, 100)
    audio.volume = vv / 100
    volRange.value = vv
    volRange.style.setProperty('--gf-vol-pct', vv + '%')
    var cls = vv <= 0 ? 'fa-volume-xmark' : (vv <= 33 ? 'fa-volume-low' : (vv <= 66 ? 'fa-volume-up' : 'fa-volume-high'))
    volIcon.className = 'fas ' + cls
  }

  /* 进度条填充百分比（0-100） */
  function setProgressPct (pct) {
    var v = clamp(pct, 0, 100)
    progressBar.value = v
    progressBar.style.setProperty('--gf-progress-pct', v + '%')
  }

  /* 默认音量 50/100 */
  setVolumePct(50)

  function fmtTime (t) {
    if (!isFinite(t) || t < 0) t = 0
    var m = Math.floor(t / 60)
    var s = Math.floor(t % 60)
    return m + ':' + (s < 10 ? '0' : '') + s
  }

  function setPlaying (playing) {
    toggleIcon.className = 'fas fa-' + (playing ? 'pause' : 'play')
    btn.classList.toggle('gf-music-playing', playing)
    btn.classList.toggle('gf-playing', playing)
    panel.classList.toggle('gf-music-playing', playing)
  }

  /* 自动播放策略 v4（用户需求：刷新/进入页面后 3 秒自动播放）：
     时序：
     t=0   立即以 muted 静音启动播放（muted autoplay 浏览器总是允许）——保证此刻起就处于播放状态
           （进度走动、UI 显示播放中）；同时绑定 window 捕获阶段解锁监听（click/touchstart/keydown，
           先于伪 SPA 的 document 捕获委托执行、不受其 stopImmediatePropagation 影响），
           并独立启动 3 秒有声定时器。
     t=3s  尝试有声播放（取消静音 + play()）：成功则直接有声并移除解锁监听；
           被拒则保持静音播放状态（浏览器 autoplay 策略兜底），解锁监听保留，等待任意交互恢复有声。
     任意  首次交互（window 捕获阶段）立即尝试有声：成功则恢复有声并移除监听；失败保持静音播放继续等待。
     交互
     fetch  http 源全量转 Blob 后无缝切换 src（保证 seek），切换期间维持播放状态：
           播放中则按当前 muted 状态恢复 play()（muted 必成功；有声被拒则回退静音播放）；
           暂停中则保持暂停（尊重用户手动暂停）。 */
  var gfAutoplayUnlocked = false
  var gfAutoplayTimer = null
  var GF_AUTOPLAY_DELAY_MS = 3000

  /* 单曲循环：自然播放结束（ended）后 5s 自动重播同一曲 */
  var gfLoopTimer = null
  var gfLoopPending = false
  var GF_LOOP_REPLAY_DELAY_MS = 5000

  function gfRemoveUnlockListeners () {
    UNLOCK_TYPES.forEach(function (t) { window.removeEventListener(t, gfUnlockHandler, true) })
  }

  /* 以 muted 方式启动播放（浏览器允许静音自动播放），保证进入页面即处于播放状态 */
  function gfStartMuted () {
    audio.muted = true
    var p = audio.play()
    if (p && p.catch) {
      p.then(function () { setPlaying(true) }).catch(function () { setPlaying(false) })
    } else {
      setPlaying(true)
    }
  }

  /* 恢复播放（保持当前 muted 状态）：仅当播放被中断/暂停时调用；有声被拒则回退静音播放 */
  function gfResumePlay () {
    if (!audio.paused) return
    var p = audio.play()
    if (p && p.catch) {
      p.then(function () { setPlaying(true) }).catch(function () {
        if (!audio.muted) {
          audio.muted = true
          audio.play().then(function () { setPlaying(true) }).catch(function () { setPlaying(false) })
        } else {
          setPlaying(false)
        }
      })
    } else {
      setPlaying(true)
    }
  }

  /* 尝试恢复有声：成功则解锁并移除监听；被拒则回退静音播放（浏览器策略兜底），保持"播放中"不中断 */
  function gfTryUnmute () {
    if (gfAutoplayUnlocked) return true
    audio.muted = false
    var p = audio.play()
    if (p && p.catch) {
      p.then(function () {
        gfAutoplayUnlocked = true
        gfRemoveUnlockListeners()
        setPlaying(true)
      }).catch(function () {
        if (audio.paused) {
          audio.muted = true
          audio.play().then(function () { setPlaying(true) }).catch(function () { setPlaying(false) })
        } else {
          audio.muted = true
        }
      })
      return false
    }
    gfAutoplayUnlocked = true
    gfRemoveUnlockListeners()
    setPlaying(true)
    return true
  }

  /* 3 秒定时：尝试有声播放（此时浏览器可能已允许有声 autoplay） */
  function gfScheduleUnmuteAt3s () {
    gfAutoplayTimer = setTimeout(function () {
      gfAutoplayTimer = null
      gfTryUnmute()
    }, GF_AUTOPLAY_DELAY_MS)
  }

  /* 首次用户交互解锁：取消静音恢复有声；仅成功有声播放后才移除监听 */
  function gfUnlockHandler () {
    gfTryUnmute()
  }

  /* 单曲循环重播：回到开头尝试有声播放，被浏览器策略拦截则 muted 兜底；
     继续沿用既有解锁监听（未移除则保留，首次交互立即有声）；成功即恢复播放中视觉 */
  function gfLoopReplay () {
    clearTimeout(gfLoopTimer)
    gfLoopTimer = null
    gfLoopPending = false
    audio.currentTime = 0
    if (audio.muted) audio.muted = false
    var p = audio.play()
    if (p && p.catch) {
      p.then(function () { setPlaying(true) }).catch(function () {
        if (!audio.muted) {
          audio.muted = true
          audio.play().then(function () { setPlaying(true) }).catch(function () { setPlaying(false) })
        } else {
          setPlaying(false)
        }
      })
    } else {
      setPlaying(true)
    }
  }

  /* 自动播放流水线（t=0 muted 启动 + 解锁监听 + 3 秒有声定时器），独立启动不依赖 fetch */
  function startAutoplayPipeline () {
    gfStartMuted()
    UNLOCK_TYPES.forEach(function (t) { window.addEventListener(t, gfUnlockHandler, true) })
    gfScheduleUnmuteAt3s()
  }

  btn.addEventListener('click', function () {
    var open = panel.classList.toggle('gf-music-open')
    panel.setAttribute('aria-hidden', open ? 'false' : 'true')
  })

  toggleBtn.addEventListener('click', function () {
    /* 手动操作（含 5s 重播窗口期）即取消待重播定时器，防止叠加 */
    clearTimeout(gfLoopTimer)
    gfLoopTimer = null
    gfLoopPending = false
    if (audio.paused) {
      audio.play().then(function () { setPlaying(true) }).catch(function () {})
    } else {
      audio.pause()
      setPlaying(false)
    }
  })

  panel.querySelector('.gf-music-rewind').addEventListener('click', function () {
    audio.currentTime = Math.max(0, audio.currentTime - 10)
  })

  panel.querySelector('.gf-music-forward').addEventListener('click', function () {
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10)
  })

  volRange.addEventListener('input', function () {
    setVolumePct(parseFloat(volRange.value))
  })

  /* 音量按钮：点击在静音与上次音量间切换（悬停弹出竖向音量条由 CSS hover 控制） */
  volBtn.addEventListener('click', function () {
    if (audio.volume > 0) {
      lastVol = audio.volume
      setVolumePct(0)
    } else {
      setVolumePct(lastVol * 100)
    }
  })

  /* 播放进度条：拖动时实时预览时间与填充，松手（change）才真正跳转 */
  progressBar.addEventListener('input', function () {
    draggingProgress = true
    var d = audio.duration || 0
    var pct = parseFloat(progressBar.value)
    curEl.textContent = fmtTime(d ? (pct / 100) * d : 0)
    progressBar.style.setProperty('--gf-progress-pct', pct + '%')
  })

  progressBar.addEventListener('change', function () {
    var d = audio.duration || 0
    var pct = parseFloat(progressBar.value)
    if (d) audio.currentTime = clamp((pct / 100) * d, 0, d)
    draggingProgress = false
  })

  audio.addEventListener('timeupdate', function () {
    if (draggingProgress) return
    curEl.textContent = fmtTime(audio.currentTime)
    var d = audio.duration || 0
    if (d) setProgressPct(audio.currentTime / d * 100)
  })

  audio.addEventListener('loadedmetadata', function () {
    totalEl.textContent = fmtTime(audio.duration)
  })

  audio.addEventListener('durationchange', function () {
    totalEl.textContent = fmtTime(audio.duration)
  })

  audio.addEventListener('play', function () { setPlaying(true) })
  audio.addEventListener('pause', function () {
    /* 自然结束引发的 pause（重播窗口期）不覆盖播放中视觉；手动暂停正常恢复暂停态 */
    if (gfLoopPending) return
    setPlaying(false)
  })

  audio.addEventListener('ended', function () {
    /* 单曲循环：仅自然播放结束触发——停止 5s 后自动重播，窗口期保持播放中动态提示 */
    clearTimeout(gfLoopTimer)
    gfLoopTimer = null
    gfLoopPending = true
    curEl.textContent = fmtTime(audio.duration || 0)
    gfLoopTimer = setTimeout(gfLoopReplay, GF_LOOP_REPLAY_DELAY_MS)
    setPlaying(true)
  })

  /* 自动播放启动：立即以 muted 播放（不等待 fetch，保证刷新后马上处于播放状态，3 秒后尝试有声） */
  startAutoplayPipeline()

  var gfRawSrc = audio.src || audio.getAttribute('src')
  if (gfRawSrc && !/^blob:/i.test(gfRawSrc)) {
    fetch(gfRawSrc).then(function (resp) {
      if (!resp.ok) throw new Error('fetch ' + resp.status)
      return resp.blob()
    }).then(function (blob) {
      var wasPlaying = !audio.paused
      audio.src = URL.createObjectURL(blob)
      // 换 src 会中断播放：播放中则按当前 muted 状态恢复（muted 必成功，有声被拒自动回退静音）
      if (wasPlaying) {
        gfResumePlay()
      }
    }).catch(function () {})
  }
})();
