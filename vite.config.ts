import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from 'kimi-plugin-inspect-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
    allowedHosts: [
      'archive-tri-played-powerful.trycloudflare.com',
      'marriage-physician-hundred-songs.trycloudflare.com',
      'helen-inclusive-constantly-pope.trycloudflare.com',
      'floppy-steaks-love.loca.lt',
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
