/* Keep article tags inside the Grey Flowers article module. */
'use strict';

hexo.extend.generator.register('gf-article-tag', function (locals) {
  return locals.tags
    .sort('name')
    .toArray()
    .filter(function (tag) { return tag.length > 0; })
    .map(function (tag) {
      const slug = String(tag.slug || '').replace(/^\/+|\/+$/g, '');
      if (!slug) return null;

      return {
        path: 'articles/tags/' + slug + '/index.html',
        layout: 'article-module',
        data: {
          layout: 'article-module',
          aside: false,
          title: tag.name + ' - 标签',
          amType: 'tag-detail',
          amTag: tag.name,
          amTagSlug: slug,
          amTagPosts: tag.posts.sort('date', -1).toArray()
        }
      };
    })
    .filter(Boolean);
});
