import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: true, // listen on 0.0.0.0 so the dev server is reachable from a container
    port: 3000, // matches CORS allow-list in api-gateway (http://localhost:3000)
    strictPort: true,
    // Bind-mounted source on Windows doesn't forward FS events into Docker, so the
    // dev container sets CHOKIDAR_USEPOLLING=true. Native host runs keep event-based
    // watching (no polling) to avoid the extra CPU churn.
    watch:
      process.env.CHOKIDAR_USEPOLLING === "true"
        ? { usePolling: true }
        : undefined,
  },
})
