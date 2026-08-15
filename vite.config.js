import { resolve } from 'path'
import { defineConfig } from 'vite'

export default defineConfig({
  root: 'src',
  appType: 'mpa',
  publicDir: resolve(__dirname, 'public'),
  plugins: [
    {
      name: 'dir-index',
      configureServer(server) {
        const pages = ['/nozzle', '/examsearch']
        server.middlewares.use((req, res, next) => {
          const pathname = (req.url ?? '/').split('?')[0]
          if (pages.includes(pathname)) {
            res.writeHead(302, { Location: pathname + '/' })
            res.end()
            return
          }
          next()
        })
      },
    },
  ],
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'src/index.html'),
        nozzle: resolve(__dirname, 'src/nozzle/index.html'),
        examsearch: resolve(__dirname, 'src/examsearch/index.html'),
      },
    },
  },
})
