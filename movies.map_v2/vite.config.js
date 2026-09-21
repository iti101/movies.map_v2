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
    port: 5173,
    strictPort: false,
    proxy: {
      '/novi-api': {
        target: 'https://novi-backend-api-wgsgz.ondigitalocean.app',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/novi-api/, ''),
      },
    },
  },
})
