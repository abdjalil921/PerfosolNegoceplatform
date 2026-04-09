import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

// Plugin to copy .htaccess to dist after build
const copyHtaccess = () => ({
  name: 'copy-htaccess',
  closeBundle() {
    try {
      copyFileSync(
        resolve(__dirname, 'public/.htaccess'),
        resolve(__dirname, 'dist/.htaccess')
      )
      console.log('✓ .htaccess copied to dist/')
    } catch (e) {
      console.warn('Could not copy .htaccess:', e.message)
    }
  }
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), copyHtaccess()],
})
