import { defineConfig } from 'vite'

export default defineConfig({
  css: {
    postcss: {
      plugins: []
    }
  },
  server: {
    hmr: {
      overlay: false
    }
  }
})
