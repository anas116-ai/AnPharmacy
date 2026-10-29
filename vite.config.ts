import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
       output: {
         manualChunks(id: string) {
           if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/') || id.includes('node_modules/zustand') || id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
             return 'vendor-react';
           }
           if (id.includes('node_modules/recharts')) {
             return 'vendor-charts';
           }
           if (id.includes('node_modules/lucide-react')) {
             return 'vendor-icons';
           }
           if (id.includes('node_modules/jszip') || id.includes('node_modules/xlsx')) {
             return 'vendor-xlsx';
           }
           if (id.includes('node_modules/pdfjs-dist')) {
             return 'vendor-pdf';
           }
           if (id.includes('node_modules/tesseract.js') || id.includes('node_modules/tesseract')) {
             return 'vendor-ocr';
           }
         },
       },
    },
    chunkSizeWarningLimit: 600,
  },
  server: {
    port: 5174,
    strictPort: true,
  },
})
