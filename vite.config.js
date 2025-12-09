import { defineConfig } from 'vite'

// Vite config for a vanilla HTML/CSS/JS project
export default defineConfig({
  // Provide an explicit (empty) PostCSS config to avoid Vite walking
  // up the filesystem and loading a global PostCSS config that requires
  // Tailwind (which may not be installed on this machine).
  css: {
    postcss: {
      plugins: []
    }
  },
  // Disable the full-screen HMR overlay so the browser doesn't show
  // the red PostCSS/Tailwind overlay while we handle the config here.
  server: {
    hmr: {
      overlay: false
    }
  }
})
