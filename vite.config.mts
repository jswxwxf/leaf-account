import { defineConfig } from 'weapp-vite/config'
import { VantResolver } from 'weapp-vite/auto-import-components/resolvers'
import { UnifiedViteWeappTailwindcssPlugin as uvwt } from 'weapp-tailwindcss/vite'

export default defineConfig({
  weapp: {
    // weapp-vite options
    srcRoot: 'miniprogram',
    enhance: {
      autoImportComponents: {
        resolvers: [
          VantResolver(),
        ],
      },
    },
  },
  resolve: {
    alias: {
      '@': './miniprogram',
    },
  },
  plugins: [
    uvwt({
      rem2rpx: true,
    }),
  ],
})
