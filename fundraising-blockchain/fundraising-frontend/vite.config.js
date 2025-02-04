import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.VITE_PINATA_API_KEY': JSON.stringify('70cdf0c4e363df2b4e55'),
    'process.env.VITE_PINATA_API_SECRET': JSON.stringify('a2d76d50154cf4a5292eee849000eb691b2bdc11a31cd738342efb7335bf11bf')
  }
})