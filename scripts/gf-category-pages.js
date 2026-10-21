/*
 * Use Grey Flowers article-module pages for category browsing.
 * The default Butterfly category archive is intentionally disabled so Hexo
 * does not emit a second, unused category layout under /categories/.
 */
'use strict';

hexo.extend.generator.register('category', function () {
  return [];
});

hexo.extend.generator.register('gf-article-category', function (locals) {
  const categoryInfo = Object.create(null);
  const registeredCategories = locals.data && locals.data.categories;
  if (Array.isArray(registeredCategories)) {
    registeredCategories.forEach(function (item) {
      const name = typeof item === 'string' ? item : item && item.name;
      if (name && typeof item === 'object') {
        categoryInfo[String(name)] = {
          description: item.description ? String(item.description) : '',
          cover: item.cover ? String(item.cover) : ''
        };
      } else if (name) {
        categoryInfo[String(name)] = { description: '', cover: '' };
      }
    });
  }

  return locals.categories
    .sort('name')
    .toArray()
    .filter(function (category) { return category.length > 0; })
    .map(function (category, index) {
      const slug = String(category.slug || '').replace(/^\/+|\/+$/g, '');
      if (!slug) return null;

      return {
        path: 'articles/categories/' + slug + '/index.html',
        layout: 'article-module',
        data: {
          layout: 'article-module',
          aside: false,
          title: category.name + ' - 目录',
          amType: 'category-detail',
          amCategory: category.name,
          amCategorySlug: slug,
          amCategoryIndex: index,
          amCategoryDescription: categoryInfo[String(category.name)] ? categoryInfo[String(category.name)].description : '',
          amCategoryCover: categoryInfo[String(category.name)] ? categoryInfo[String(category.name)].cover : '',
          amCategoryPosts: category.posts.sort('date', -1).toArray()
        }
      };
    })
    .filter(Boolean);
});
