import { defineConfig } from 'vite'

export default defineConfig({
  base: './',  // リポジトリ名を指定
  build: {
    outDir: 'dist',
  }
})