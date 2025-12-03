import indexHtml from './index.html'

Bun.serve({
  port: 4123,
  routes: {
    '/': indexHtml,
  },
  development: {
    hmr: true,
  },
})

console.log('Server running at http://localhost:4123')
