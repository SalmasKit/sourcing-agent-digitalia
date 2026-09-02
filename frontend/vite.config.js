import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load .env variables server-side so the agent-service URL never appears
  // in the browser bundle. Only VITE_* vars are exposed to the browser by
  // Vite — VITE_AGENT_SERVICE_URL is intentionally read only here.
  const env = loadEnv(mode, process.cwd(), '');
  const agentServiceTarget = env.VITE_AGENT_SERVICE_URL || 'http://localhost:8001';

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 3000,
      proxy: {
        // Spring Boot backend — carries JWT via apiClient interceptor
        '/api': {
          target: 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
        },
        // Python agent-service — carries JWT via agentClient interceptor.
        // In production, replace this proxy with a Spring Boot reverse-proxy
        // route so the agent-service is never directly reachable from the internet.
        '/agent-api': {
          target: agentServiceTarget,
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/agent-api/, ''),
        },
      },
    },
  };
})


