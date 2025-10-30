import { defineConfig } from 'vite'

export default defineConfig({
  base: '/image_tool/',  // リポジトリ名を指定
  build: {
    outDir: 'dist',
  }
})