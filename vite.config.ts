import { defineConfig } from 'vite'
import path from 'path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'


function figmaAssetResolver() {
  return {
    name: 'figma-asset-resolver',
    resolveId(id) {
      if (id.startsWith('figma:asset/')) {
        const filename = id.replace('figma:asset/', '')
        return path.resolve(__dirname, 'src/assets', filename)
      }
    },
  }
}

export default defineConfig({
  plugins: [
    figmaAssetResolver(),
    // The React and Tailwind plugins are both required for Make, even if
    // Tailwind is not being actively used – do not remove them
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      // Alias @ to the src directory
      '@': path.resolve(__dirname, './src'),
    },
  },

  // File types to support raw imports. Never add .css, .tsx, or .ts files to this.
  assetsInclude: ['**/*.svg', '**/*.csv'],

  build: {
    rollupOptions: {
      input: {
        // 2 entry tách biệt: 'main' = hệ quản lý (admin/pos/staff...), 'landing' = trang khách.
        // Bundle landing KHÔNG import App.tsx nên không chứa code quản lý (an toàn với F12).
        main: path.resolve(__dirname, 'index.html'),
        landing: path.resolve(__dirname, 'landing.html'),
      },
      output: {
        // Tách vendor thành chunk riêng để cache tốt (mỗi lần deploy không phải tải lại toàn bộ)
        // và để biểu đồ (recharts/d3) KHÔNG nằm trong đường tải của POS/nhân viên.
        manualChunks: {
          // Biểu đồ (recharts/d3) tách riêng → không nằm trong đường tải POS/nhân viên,
          // chỉ tải khi mở màn Doanh Thu / phân tích CSKH.
          charts: ['recharts'],
        },
      },
    },
  },
  server: {
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/images/uploads': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
      '/uploads': {
        target: 'http://localhost:5005',
        changeOrigin: true,
      },
    }
  }
})
