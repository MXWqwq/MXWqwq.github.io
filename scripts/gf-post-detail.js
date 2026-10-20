/* Grey Flowers 文章详情页辅助：
   1. before_post_render：所有 post 页强制 top_img=false（无封面 banner，导航吸顶 not-top-img）
      且 aside=false（禁用主题右侧栏，使用模板自建 grey-flowers 风格侧栏，避免重复）
   2. gf_post_desc(post) — 英文副标题（front-matter description 优先，兜底站点 subtitle） */
'use strict';

hexo.extend.filter.register('before_post_render', function (data) {
  if (data.layout === 'post') {
    if (data.top_img === undefined) data.top_img = false;
    if (data.aside === undefined) data.aside = false;
  }
  return data;
});

hexo.extend.helper.register('gf_post_desc', function (post) {
  if (post && post.description) return post.description;
  if (this && this.config && this.config.subtitle) return this.config.subtitle;
  return '';
});
