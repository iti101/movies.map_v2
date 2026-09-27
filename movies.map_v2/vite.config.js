import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    port: 5175,
    strictPort: false, // if 5175 is taken, Vite picks the next free port
    proxy: {
      // Dev-only: AuthModal talks to `/novi-api` so the browser stays same-origin.
      '/novi-api': {
        target: 'https://novi-backend-api-wgsgz.ondigitalocean.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/novi-api/, ''),
      },
    },
  },
})
