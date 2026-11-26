import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Served at gaotianrun1.github.io/desk/ beside the Jekyll site.
export default defineConfig({
  base: '/desk/',
  plugins: [react()],
})
