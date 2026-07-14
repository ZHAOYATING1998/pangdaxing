import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 胖大星 Vite 配置 — 脱离妙搭平台预设
// - 用 alias 把 @lark-apaas/client-toolkit 指向空 stub
// - 客户端 SPA 构建到 dist/client

export default defineConfig({
  root: path.resolve(__dirname, 'client'),
  plugins: [react()],
  build: {
    outDir: path.resolve(__dirname, 'dist/client'),
    emptyOutDir: true,
    sourcemap: false,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'client/src'),
      '@client/src': path.resolve(__dirname, 'client/src'),
      // 妙搭平台 SDK — 全部替换为空 stub
      '@lark-apaas/client-toolkit': path.resolve(
        __dirname,
        'client/src/stubs/lark-apaas-client-toolkit.ts',
      ),
      '@lark-apaas/client-toolkit/logger': path.resolve(
        __dirname,
        'client/src/stubs/lark-apaas-client-toolkit.ts',
      ),
      '@lark-apaas/client-toolkit/components/AppContainer': path.resolve(
        __dirname,
        'client/src/stubs/lark-apaas-client-toolkit.ts',
      ),
      '@lark-apaas/client-toolkit/components/ErrorRender': path.resolve(
        __dirname,
        'client/src/stubs/lark-apaas-client-toolkit.ts',
      ),
      '@lark-apaas/client-toolkit/components/NotFoundRender': path.resolve(
        __dirname,
        'client/src/stubs/lark-apaas-client-toolkit.ts',
      ),
      '@lark-apaas/client-toolkit/utils/getAxiosForBackend': path.resolve(
        __dirname,
        'client/src/stubs/lark-apaas-client-toolkit.ts',
      ),
      '@lark-apaas/client-toolkit/utils/getEnv': path.resolve(
        __dirname,
        'client/src/stubs/lark-apaas-client-toolkit.ts',
      ),
      '@lark-apaas/client-toolkit/tools/services': path.resolve(
        __dirname,
        'client/src/stubs/lark-apaas-client-toolkit.ts',
      ),
      '@lark-apaas/client-toolkit/tools/storage': path.resolve(
        __dirname,
        'client/src/stubs/lark-apaas-client-toolkit.ts',
      ),
      '@lark-apaas/client-toolkit/dataloom': path.resolve(
        __dirname,
        'client/src/stubs/lark-apaas-client-toolkit.ts',
      ),
    },
  },
  define: {
    'process.env.CLIENT_BASE_PATH': JSON.stringify('/'),
  },
});
