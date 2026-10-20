'use strict';

// Hexo's index generator returns no page when there are no posts. Keep the
// custom homepage available in that state; normal post pagination remains the
// source of the homepage as soon as an article is added again.
hexo.extend.generator.register('gf-empty-home', function (locals) {
  const posts = locals.posts;
  if (!posts || posts.length > 0) return [];

  const path = (this.config.index_generator && this.config.index_generator.path) || '';
  const currentUrl = path ? `/${path.replace(/^\/+|\/+$/g, '')}/` : '/';

  return {
    path,
    layout: ['index', 'archive'],
    data: {
      base: path,
      total: 1,
      current: 1,
      current_url: currentUrl,
      posts,
      prev: 0,
      prev_link: '',
      next: 0,
      next_link: '',
      __index: true
    }
  };
});
