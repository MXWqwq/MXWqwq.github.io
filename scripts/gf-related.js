/* Grey Flowers 文章详情页相关推荐与简介 helper：
   1. gf_post_intro(post)   — 文章简介（front-matter description / excerpt 优先，无则返回空，
                              后续 blogtool 上传文章会补充简介字段）
   2. gf_related_posts(current, all, limit) — 同标签优先动态推荐，不足 limit 用最近文章兜底；
      输出 Grey Flowers 风格卡片（有封面展示封面图，无封面用主题色渐变占位） */
'use strict';

function gfStripTags(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

hexo.extend.helper.register('gf_post_intro', function (post) {
  if (!post) return '';
  if (post.description) return post.description;
  if (post.excerpt) return post.excerpt;
  return '';
});

// 文章标题已在详情页头部展示；正文若以同名标题开头，则只去掉这一处重复标题。
hexo.extend.helper.register('gf_post_content', function (post) {
  const content = String(post && post.content || '');
  const firstHeading = content.match(/^\s*<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/i);
  if (!firstHeading) return content;

  const headingText = firstHeading[2]
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
  const title = String(post.title || '').replace(/\s+/g, ' ').trim();

  return headingText === title ? content.replace(firstHeading[0], '') : content;
});

hexo.extend.helper.register('gf_related_posts', function (currentPost, allPosts, limit) {
  limit = limit || 6;
  const self = currentPost;
  const pool = allPosts && allPosts.toArray ? allPosts.toArray() : [];
  const selfPath = self.path;
  const selfTags = self.tags && self.tags.toArray ? self.tags.toArray() : [];
  const selfTagNames = selfTags.map(function (t) { return t.name; });

  // 同标签权重：与本文共享标签数越多越靠前
  const weightMap = new Map();
  selfTags.forEach(function (tag) {
    const tagPosts = tag.posts && tag.posts.toArray ? tag.posts.toArray() : (tag.posts || []);
    tagPosts.forEach(function (p) {
      if (p.path === selfPath) return;
      weightMap.set(p.path, (weightMap.get(p.path) || 0) + 1);
    });
  });

  const related = [];
  weightMap.forEach(function (w, path) {
    const p = pool.find(function (x) { return x.path === path; });
    if (p) related.push({ post: p, weight: w });
  });
  related.sort(function (a, b) { return b.weight - a.weight; });

  // 兜底：不足 limit 时用全站最近文章补齐（排除本文与已选）
  if (related.length < limit) {
    const chosen = new Set(related.map(function (r) { return r.post.path; }));
    const rest = pool
      .filter(function (p) { return p.path !== selfPath && !chosen.has(p.path); })
      .sort(function (a, b) {
        const da = a.date ? +new Date(a.date) : 0;
        const db = b.date ? +new Date(b.date) : 0;
        return db - da;
      });
    for (let i = 0; i < rest.length && related.length < limit; i++) {
      related.push({ post: rest[i], weight: 0 });
    }
  }

  if (!related.length) {
    return '<section class="gf-related"><h2 class="gf-related-title">相关推荐</h2>' +
      '<p class="gf-related-empty">暂无相关文章，晚点再来看看。</p></section>';
  }

  const dateFmt = hexo.config.date_format || 'YYYY-MM-DD';
  let html = '<section class="gf-related"><h2 class="gf-related-title">相关推荐</h2><div class="gf-related-grid">';

  related.slice(0, limit).forEach(function (item) {
    const p = item.post;
    const title = String(p.title || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const cover = p.cover || p.top_img || '';
    const hasCover = !!cover;
    const isTag = (p.tags && p.tags.toArray ? p.tags.toArray() : [])
      .some(function (t) { return selfTagNames.indexOf(t.name) >= 0; });
    const created = p.date ? this.date(p.date, dateFmt) : '';
    html += '<a class="gf-related-card' + (hasCover ? '' : ' gf-related-card--nopost') +
      (isTag ? ' gf-related-card--tag' : '') + '" href="' + this.url_for(p.path) + '" title="' + title + '">';
    if (hasCover) {
      html += '<span class="gf-related-cover" style="background-image:url(\'' + this.url_for(cover) + '\')"></span>';
    } else {
      html += '<span class="gf-related-cover gf-related-cover--grad"></span>';
    }
    html += '<span class="gf-related-meta">' + created + '</span>';
    html += '<span class="gf-related-name">' + title + '</span>';
    html += '</a>';
  }, this);

  html += '</div></section>';
  return html;
});
