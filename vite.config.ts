import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Add any path aliases if needed
    }
  },
  css: {
    // Point directly to the PostCSS config file
    postcss: './postcss.config.js',
  }
})