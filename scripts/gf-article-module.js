/* Grey Flowers 文章模块辅助 helper：
   1. gf_word_count(content)  — 统计文章字数（中文字符 + 英文单词数）
   2. gf_excerpt(post, len)   — 提取文章摘要（优先 description / excerpt，否则截断正文）
   3. gf_date_str(post)       — 格式化为 YYYY-MM-DD
   供 themes/butterfly/layout/article-module.pug 使用 */
'use strict';

function stripHtml(html) {
  return String(html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

hexo.extend.helper.register('gf_word_count', function (content) {
  const text = stripHtml(content);
  const cn = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const en = (text.match(/[A-Za-z0-9]+/g) || []).length;
  return cn + en;
});

hexo.extend.helper.register('gf_excerpt', function (post, len) {
  len = len || 120;
  if (post.description) return post.description;
  if (post.excerpt) return post.excerpt;
  const text = stripHtml(post.content);
  return text.length > len ? text.slice(0, len) + '…' : text;
});

hexo.extend.helper.register('gf_search_text', function (content) {
  return stripHtml(content);
});

hexo.extend.helper.register('gf_date_str', function (date) {
  if (!date) return '';
  const d = new Date(date);
  const pad = function (n) { return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
});

hexo.extend.helper.register('gf_cover', function (post) {
  return post.cover || post.top_img || '';
});

const GF_TC_SLOGANS = [
  "The past is never dead, it's not even past",
  'Small steps, gentle words, slow days.',
  'A quiet garden of thoughts & code.',
  'Notes from a misty morning garden.',
  'Let every petal tell its own story.',
  'Where grey meets a touch of blue.'
];

function firstTagName(post) {
  const tags = post.tags && post.tags.toArray ? post.tags.toArray() : (post.tags || []);
  if (tags.length) return String(tags[0].name).toUpperCase();
  return null;
}

hexo.extend.helper.register('gf_tc_kicker', function () {
  return 'MERORY';
});

hexo.extend.helper.register('gf_tc_slogan', function (index) {
  const i = ((index || 0) % GF_TC_SLOGANS.length + GF_TC_SLOGANS.length) % GF_TC_SLOGANS.length;
  return GF_TC_SLOGANS[i];
});
