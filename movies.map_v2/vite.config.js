import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import { defineConfig } from 'vite'

// React Compiler via Babel. Dev server prefers 5175, then the next free port.
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    port: 5175,
    strictPort: false, // if 5175 is taken, Vite picks the next free port
  },
})
